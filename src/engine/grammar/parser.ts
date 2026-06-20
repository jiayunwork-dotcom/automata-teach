import type {
  GrammarSymbol,
  Production,
  GrammarLineError,
  ParsedGrammar,
} from './types';
import { EPSILON, EPSILON_INPUT } from './types';

let productionIdCounter = 0;

function generateProductionId(): string {
  productionIdCounter++;
  return `p_${productionIdCounter}`;
}

export function resetProductionIdCounter(): void {
  productionIdCounter = 0;
}

function isNonTerminal(symbol: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(symbol);
}

function isTerminal(symbol: string): boolean {
  if (symbol === EPSILON || symbol === EPSILON_INPUT) return true;
  return /^[a-z0-9+\-*/^(),.;:!@#%&=<>?[\]{}|~]$/.test(symbol);
}

function parseRightSide(rightStr: string, lineNum: number): { symbols: GrammarSymbol[]; error: string | null } {
  const symbols: GrammarSymbol[] = [];
  let i = 0;

  if (rightStr.trim() === '' || rightStr.trim() === EPSILON || rightStr.trim() === EPSILON_INPUT) {
    return {
      symbols: [{ value: EPSILON, isTerminal: true }],
      error: null,
    };
  }

  while (i < rightStr.length) {
    const ch = rightStr[i];

    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    if (/[A-Z]/.test(ch)) {
      let j = i + 1;
      while (j < rightStr.length && /[A-Za-z0-9_]/.test(rightStr[j])) {
        j++;
      }
      const symbol = rightStr.slice(i, j);
      if (!isNonTerminal(symbol)) {
        return { symbols: [], error: `无效的非终结符 '${symbol}'` };
      }
      symbols.push({ value: symbol, isTerminal: false });
      i = j;
    } else if (isTerminal(ch)) {
      const value = ch === EPSILON_INPUT ? EPSILON : ch;
      symbols.push({ value, isTerminal: true });
      i++;
    } else if (ch === "'") {
      let j = i + 1;
      while (j < rightStr.length && rightStr[j] !== "'") {
        j++;
      }
      if (j >= rightStr.length) {
        return { symbols: [], error: `引号未闭合` };
      }
      const quoted = rightStr.slice(i + 1, j);
      if (quoted.length === 0) {
        return { symbols: [], error: `空的引号内容` };
      }
      symbols.push({ value: quoted, isTerminal: true });
      i = j + 1;
    } else {
      return { symbols: [], error: `无法识别的符号 '${ch}'` };
    }
  }

  if (symbols.length === 0) {
    return {
      symbols: [{ value: EPSILON, isTerminal: true }],
      error: null,
    };
  }

  return { symbols, error: null };
}

export function parseGrammar(input: string, startSymbolOverride?: string): ParsedGrammar {
  resetProductionIdCounter();
  const productions: Production[] = [];
  const errors: GrammarLineError[] = [];
  const nonTerminalSet = new Set<string>();
  const terminalSet = new Set<string>();

  const lines = input.split('\n');
  let firstNonTerminal: string | null = null;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return;
    }

    const arrowMatch = trimmed.match(/^([A-Z][A-Za-z0-9_]*)\s*(?:->|→|::=)\s*(.*)$/);
    if (!arrowMatch) {
      errors.push({
        line: lineNum,
        message: `格式错误,应为: 非终结符 -> 产生式 (例如 S->aSb|e)`,
      });
      return;
    }

    const left = arrowMatch[1];
    const rightPart = arrowMatch[2].trim();

    if (!isNonTerminal(left)) {
      errors.push({
        line: lineNum,
        message: `左侧必须是非终结符(大写字母开头)`,
      });
      return;
    }

    if (firstNonTerminal === null) {
      firstNonTerminal = left;
    }
    nonTerminalSet.add(left);

    const alternatives = rightPart.split('|').map((a) => a.trim());

    for (const alt of alternatives) {
      const { symbols, error } = parseRightSide(alt, lineNum);
      if (error) {
        errors.push({ line: lineNum, message: error });
        continue;
      }

      for (const sym of symbols) {
        if (sym.isTerminal && sym.value !== EPSILON) {
          terminalSet.add(sym.value);
        }
        if (!sym.isTerminal) {
          nonTerminalSet.add(sym.value);
        }
      }

      productions.push({
        id: generateProductionId(),
        left,
        right: symbols,
        originalText: `${left}->${alt || EPSILON}`,
      });
    }
  });

  const nonTerminals = Array.from(nonTerminalSet).sort();
  const terminals = Array.from(terminalSet).sort();
  const startSymbol = startSymbolOverride && nonTerminalSet.has(startSymbolOverride)
    ? startSymbolOverride
    : firstNonTerminal;

  const hasLeftRecursion = detectLeftRecursion(productions, nonTerminals);

  return {
    productions,
    nonTerminals,
    terminals,
    startSymbol,
    errors,
    hasLeftRecursion,
  };
}

function detectLeftRecursion(productions: Production[], nonTerminals: string[]): string[] {
  const recursive: string[] = [];

  for (const nt of nonTerminals) {
    const ntProductions = productions.filter((p) => p.left === nt);
    let hasDirect = false;

    for (const p of ntProductions) {
      if (p.right.length > 0 && !p.right[0].isTerminal && p.right[0].value === nt) {
        hasDirect = true;
        break;
      }
    }

    if (hasDirect) {
      recursive.push(nt);
      continue;
    }

    if (hasIndirectRecursion(nt, productions, nonTerminals)) {
      recursive.push(nt);
    }
  }

  return recursive;
}

function hasIndirectRecursion(
  startNt: string,
  productions: Production[],
  _nonTerminals: string[]
): boolean {
  const visited = new Set<string>();
  const stack = [startNt];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const currentProds = productions.filter((p) => p.left === current);
    for (const p of currentProds) {
      if (p.right.length > 0 && !p.right[0].isTerminal) {
        const firstNt = p.right[0].value;
        if (firstNt === startNt && visited.size > 1) {
          return true;
        }
        if (!visited.has(firstNt)) {
          stack.push(firstNt);
        }
      }
    }
  }

  return false;
}

export function isRegularGrammar(grammar: ParsedGrammar): boolean {
  if (grammar.productions.length === 0) return false;

  for (const p of grammar.productions) {
    const nonTerminalsInRight = p.right.filter((s) => !s.isTerminal);

    if (nonTerminalsInRight.length > 1) {
      return false;
    }

    if (nonTerminalsInRight.length === 1) {
      const lastSymbol = p.right[p.right.length - 1];
      if (lastSymbol.isTerminal || !nonTerminalsInRight.includes(lastSymbol)) {
        return false;
      }
    }
  }

  return true;
}

export function productionToString(p: Production): string {
  const rightStr = p.right.map((s) => s.value).join('');
  return `${p.left}->${rightStr || EPSILON}`;
}

export function symbolsToString(symbols: GrammarSymbol[]): string {
  return symbols.map((s) => s.value).join('');
}
