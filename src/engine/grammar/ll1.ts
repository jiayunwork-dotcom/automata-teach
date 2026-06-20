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

export function buildLL1AnalysisSteps(
  grammar: ParsedGrammar,
  table: LL1Table,
  input: string
): LL1AnalysisStep[] {
  const steps: LL1AnalysisStep[] = [];
  let stepIndex = 0;

  if (!grammar.startSymbol) {
    return steps;
  }

  const initialStack: GrammarSymbol[] = [
    { value: END_MARKER, isTerminal: true },
    { value: grammar.startSymbol, isTerminal: false },
  ];

  const initialInput = input + END_MARKER;

  steps.push({
    stepIndex: stepIndex++,
    stack: [...initialStack],
    remainingInput: initialInput,
    appliedProduction: null,
    action: 'start',
    matchedChar: null,
    errorMessage: null,
    description: `开始分析, 栈: $${grammar.startSymbol}, 输入: ${input || 'ε'}$`,
  });

  let stack = [...initialStack];
  let remaining = initialInput;
  let maxSteps = 1000;
  let currentStep = 0;

  while (currentStep < maxSteps) {
    currentStep++;

    if (stack.length === 0) {
      break;
    }

    const stackTop = stack[stack.length - 1];
    const currentChar = remaining.length > 0 ? remaining[0] : '';

    if (stackTop.value === END_MARKER && currentChar === END_MARKER) {
      steps.push({
        stepIndex: stepIndex++,
        stack: [...stack],
        remainingInput: remaining,
        appliedProduction: null,
        action: 'accept',
        matchedChar: null,
        errorMessage: null,
        description: '分析成功: 栈和输入都只剩$,字符串被接受',
      });
      break;
    }

    if (stackTop.isTerminal) {
      if (stackTop.value === currentChar && currentChar !== END_MARKER) {
        stack = stack.slice(0, -1);
        const matched = remaining[0];
        remaining = remaining.slice(1);

        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remaining,
          appliedProduction: null,
          action: 'match',
          matchedChar: matched,
          errorMessage: null,
          description: `匹配成功: 弹出栈顶 '${matched}', 输入指针前移`,
        });
      } else if (stackTop.value === EPSILON) {
        stack = stack.slice(0, -1);
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remaining,
          appliedProduction: null,
          action: 'match',
          matchedChar: EPSILON,
          errorMessage: null,
          description: '弹出ε',
        });
      } else {
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remaining,
          appliedProduction: null,
          action: 'error',
          matchedChar: null,
          errorMessage: `匹配失败: 栈顶 '${stackTop.value}' 与当前输入 '${currentChar}' 不匹配`,
          description: `匹配失败: 栈顶 '${stackTop.value}' 与当前输入 '${currentChar}' 不匹配`,
        });
        break;
      }
    } else {
      const cell = getLL1Cell(table, stackTop.value, currentChar);

      if (!cell || cell.productions.length === 0) {
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remaining,
          appliedProduction: null,
          action: 'error',
          matchedChar: null,
          errorMessage: `预测分析表中 M[${stackTop.value}, ${currentChar}] 为空,无法展开`,
          description: `预测分析表中 M[${stackTop.value}, ${currentChar}] 为空,无法展开`,
        });
        break;
      }

      if (cell.hasConflict) {
        steps.push({
          stepIndex: stepIndex++,
          stack: [...stack],
          remainingInput: remaining,
          appliedProduction: cell.productions[0],
          action: 'error',
          matchedChar: null,
          errorMessage: `预测分析表冲突: M[${stackTop.value}, ${currentChar}] 有多个产生式`,
          description: `预测分析表冲突: M[${stackTop.value}, ${currentChar}] 有多个产生式,使用第一个`,
        });
      }

      const p = cell.productions[0];
      stack = stack.slice(0, -1);

      const rightToPush = [...p.right].reverse().filter((s) => s.value !== EPSILON);
      stack = [...stack, ...rightToPush];

      steps.push({
        stepIndex: stepIndex++,
        stack: [...stack],
        remainingInput: remaining,
        appliedProduction: p,
        action: 'expand',
        matchedChar: null,
        errorMessage: null,
        description: `展开: ${productionToString(p)}`,
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
