import type {
  ParsedGrammar,
  LL1Table,
  LL1TableCell,
  LL1AnalysisStep,
  GrammarSymbol,
  Production,
  FirstFollowResult,
} from './types';
import { EPSILON, END_MARKER } from './types';
import { computeFirstOfString, computeFirstFollow } from './firstFollow';
import { productionToString } from './parser';

function getCellKey(nonTerminal: string, terminal: string): string {
  return `${nonTerminal}#${terminal}`;
}

export function buildLL1Table(grammar: ParsedGrammar): LL1Table {
  const cells = new Map<string, LL1TableCell>();
  let isLL1 = true;

  if (grammar.productions.length === 0 || !grammar.startSymbol) {
    return {
      nonTerminals: grammar.nonTerminals,
      terminals: [...grammar.terminals, END_MARKER],
      cells,
      isLL1: false,
    };
  }

  const ff: FirstFollowResult = computeFirstFollow(grammar);
  const { firstSets, followSets } = ff;

  const columns = [...grammar.terminals, END_MARKER];

  for (const nt of grammar.nonTerminals) {
    for (const t of columns) {
      cells.set(getCellKey(nt, t), { productions: [], hasConflict: false });
    }
  }

  for (const p of grammar.productions) {
    const firstOfRight = computeFirstOfString(p.right, firstSets);

    for (const t of firstOfRight) {
      if (t === EPSILON) continue;

      const key = getCellKey(p.left, t);
      const cell = cells.get(key)!;

      if (cell.productions.length > 0 && !cell.productions.some((cp) => cp.id === p.id)) {
        cell.hasConflict = true;
        isLL1 = false;
      }
      if (!cell.productions.some((cp) => cp.id === p.id)) {
        cell.productions.push(p);
      }
    }

    if (firstOfRight.has(EPSILON)) {
      const followOfA = followSets.get(p.left) || new Set<string>();
      for (const t of followOfA) {
        const key = getCellKey(p.left, t);
        const cell = cells.get(key)!;

        if (cell.productions.length > 0 && !cell.productions.some((cp) => cp.id === p.id)) {
          cell.hasConflict = true;
          isLL1 = false;
        }
        if (!cell.productions.some((cp) => cp.id === p.id)) {
          cell.productions.push(p);
        }
      }
    }
  }

  return {
    nonTerminals: grammar.nonTerminals,
    terminals: columns,
    cells,
    isLL1,
  };
}

export function getLL1Cell(
  table: LL1Table,
  nonTerminal: string,
  terminal: string
): LL1TableCell | undefined {
  return table.cells.get(getCellKey(nonTerminal, terminal));
}

function tokenizeInput(input: string, terminals: string[], endMarker: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const sortedTerminals = [...terminals].sort((a, b) => b.length - a.length);

  while (i < input.length) {
    let matched = false;
    for (const t of sortedTerminals) {
      if (input.startsWith(t, i) && t !== endMarker) {
        tokens.push(t);
        i += t.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(input[i]);
      i++;
    }
  }
  tokens.push(endMarker);
  return tokens;
}

function getCurrentToken(remainingTokens: string[]): string {
  return remainingTokens.length > 0 ? remainingTokens[0] : '';
}

function remainingInputToString(remainingTokens: string[]): string {
  return remainingTokens.join('');
}

export function buildLL1AnalysisSteps(
  grammar: ParsedGrammar,
  table: LL1Table,
  input: string
): LL1AnalysisStep[] {
  const steps: LL1AnalysisStep[] = [];
  let stepIndex = 0;
  let recoveryCount = 0;

  if (!grammar.startSymbol) {
    return steps;
  }

  const initialStack: GrammarSymbol[] = [
    { value: END_MARKER, isTerminal: true },
    { value: grammar.startSymbol, isTerminal: false },
  ];

  const tokens = tokenizeInput(input, grammar.terminals, END_MARKER);

  steps.push({
    stepIndex: stepIndex++,
    stack: [...initialStack],
    remainingInput: remainingInputToString(tokens),
    appliedProduction: null,
    action: 'start',
    matchedChar: null,
    errorMessage: null,
    description: `开始分析, 栈: $${grammar.startSymbol}, 输入: ${input || 'ε'}$`,
    recoveryCount: 0,
  });

  let stack = [...initialStack];
  let remainingTokens = [...tokens];
  const maxSteps = 1000;
  let currentStep = 0;

  while (currentStep < maxSteps) {
    currentStep++;

    if (stack.length === 0) {
      break;
    }

    const stackTop = stack[stack.length - 1];
    const currentToken = getCurrentToken(remainingTokens);

    if (stackTop.value === END_MARKER && currentToken === END_MARKER) {
      const finalDesc = recoveryCount > 0
        ? `分析完成(含${recoveryCount}处错误恢复): 栈和输入都只剩$,字符串被接受`
        : '分析成功: 栈和输入都只剩$,字符串被接受';
      steps.push({
        stepIndex: stepIndex++,
        stack: [...stack],
        remainingInput: remainingInputToString(remainingTokens),
        appliedProduction: null,
        action: 'accept',
        matchedChar: null,
        errorMessage: null,
        description: finalDesc,
        recoveryCount,
      });
      break;
    }

    if (stackTop.isTerminal) {
      if (stackTop.value === currentToken && currentToken !== END_MARKER) {
        stack = stack.slice(0, -1);
        const matched = remainingTokens[0];
        remainingTokens = remainingTokens.slice(1);

        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remainingInputToString(remainingTokens),
          appliedProduction: null,
          action: 'match',
          matchedChar: matched,
          errorMessage: null,
          description: `匹配成功: 弹出栈顶 '${matched}', 输入指针前移`,
          recoveryCount,
        });
      } else if (stackTop.value === EPSILON) {
        stack = stack.slice(0, -1);
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remainingInputToString(remainingTokens),
          appliedProduction: null,
          action: 'match',
          matchedChar: EPSILON,
          errorMessage: null,
          description: '弹出ε',
          recoveryCount,
        });
      } else {
        const ff = computeFirstFollow(grammar);
        const followOfTop = ff.followSets.get(stackTop.value) || new Set<string>();
        const skipped: string[] = [];
        let foundSync = false;

        while (remainingTokens.length > 0 && !foundSync) {
          const tok = remainingTokens[0];
          if (tok === END_MARKER || followOfTop.has(tok)) {
            foundSync = true;
          } else {
            skipped.push(tok);
            remainingTokens = remainingTokens.slice(1);
          }
        }

        if (skipped.length > 0) {
          recoveryCount++;
          steps.push({
            stepIndex: stepIndex++,
            stack: [...stack],
            remainingInput: remainingInputToString(remainingTokens),
            appliedProduction: null,
            action: 'recover',
            matchedChar: null,
            errorMessage: `匹配失败: 栈顶 '${stackTop.value}' 与当前输入 '${currentToken}' 不匹配, 跳过 {${skipped.join(', ')}}`,
            description: `错误恢复(Panic Mode): 栈顶 '${stackTop.value}' 与输入 '${currentToken}' 不匹配, 跳过符号 {${skipped.join(', ')}} 直到遇到 Follow(${stackTop.value}) 中的符号`,
            skippedSymbols: skipped,
            isRecoveryPoint: true,
            recoveryCount,
          });
        }

        if (remainingTokens.length === 0) {
          steps.push({
            stepIndex: stepIndex++,
            stack: [...stack],
            remainingInput: '',
            appliedProduction: null,
            action: 'error',
            matchedChar: null,
            errorMessage: '输入耗尽,无法恢复',
            description: '错误: 输入耗尽,无法继续恢复',
            recoveryCount,
          });
          break;
        }

        if (stackTop.value === getCurrentToken(remainingTokens)) {
          stack = stack.slice(0, -1);
          const matched = remainingTokens[0];
          remainingTokens = remainingTokens.slice(1);
          steps.push({
            stepIndex: stepIndex++,
            stack: [...stack],
            remainingInput: remainingInputToString(remainingTokens),
            appliedProduction: null,
            action: 'match',
            matchedChar: matched,
            errorMessage: null,
            description: `恢复后匹配: 弹出栈顶 '${matched}', 输入指针前移`,
            recoveryCount,
          });
        } else {
          stack = stack.slice(0, -1);
          steps.push({
            stepIndex: stepIndex++,
            stack: [...stack],
            remainingInput: remainingInputToString(remainingTokens),
            appliedProduction: null,
            action: 'recover',
            matchedChar: null,
            errorMessage: null,
            description: `弹出栈顶 '${stackTop.value}' 继续分析`,
            isRecoveryPoint: true,
            recoveryCount,
          });
        }
      }
    } else {
      const cell = getLL1Cell(table, stackTop.value, currentToken);

      if (!cell || cell.productions.length === 0) {
        const ff = computeFirstFollow(grammar);
        const followOfTop = ff.followSets.get(stackTop.value) || new Set<string>();
        const skipped: string[] = [];
        let foundSync = false;

        while (remainingTokens.length > 0 && !foundSync) {
          const tok = remainingTokens[0];
          if (tok === END_MARKER || followOfTop.has(tok)) {
            foundSync = true;
          } else {
            skipped.push(tok);
            remainingTokens = remainingTokens.slice(1);
          }
        }

        recoveryCount++;
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remainingInputToString(remainingTokens),
          appliedProduction: null,
          action: 'recover',
          matchedChar: null,
          errorMessage: `预测分析表中 M[${stackTop.value}, ${currentToken}] 为空`,
          description: `错误恢复(Panic Mode): M[${stackTop.value}, ${currentToken}] 为空, 跳过符号 {${skipped.join(', ')}} 直到遇到 Follow(${stackTop.value}) 中的符号`,
          skippedSymbols: skipped,
          isRecoveryPoint: true,
          recoveryCount,
        });

        if (remainingTokens.length === 0) {
          steps.push({
            stepIndex: stepIndex++,
            stack: [...stack],
            remainingInput: '',
            appliedProduction: null,
            action: 'error',
            matchedChar: null,
            errorMessage: '输入耗尽,无法恢复',
            description: '错误: 输入耗尽,无法继续恢复',
            recoveryCount,
          });
          break;
        }

        stack = stack.slice(0, -1);
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remainingInputToString(remainingTokens),
          appliedProduction: null,
          action: 'recover',
          matchedChar: null,
          errorMessage: null,
          description: `弹出栈顶非终结符 '${stackTop.value}' 继续分析`,
          recoveryCount,
        });
        continue;
      }

      if (cell.hasConflict) {
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remainingInputToString(remainingTokens),
          appliedProduction: cell.productions[0],
          action: 'error',
          matchedChar: null,
          errorMessage: `预测分析表冲突: M[${stackTop.value}, ${currentToken}] 有多个产生式`,
          description: `预测分析表冲突: M[${stackTop.value}, ${currentToken}] 有多个产生式,使用第一个`,
          recoveryCount,
        });
      }

      const p = cell.productions[0];
      stack = stack.slice(0, -1);

      const rightToPush = [...p.right].reverse().filter((s) => s.value !== EPSILON);
      stack = [...stack, ...rightToPush];

      steps.push({
        stepIndex: stepIndex++,
        stack: [...stack],
        remainingInput: remainingInputToString(remainingTokens),
        appliedProduction: p,
        action: 'expand',
        matchedChar: null,
        errorMessage: null,
        description: `展开: ${productionToString(p)}`,
        recoveryCount,
      });
    }
  }

  return steps;
}

export function getConflictProductions(table: LL1Table): Map<string, Production[]> {
  const result = new Map<string, Production[]>();
  for (const [key, cell] of table.cells) {
    if (cell.hasConflict) {
      result.set(key, cell.productions);
    }
  }
  return result;
}
