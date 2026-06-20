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
  return /^[A-Z][A-Za-z0-9_]*'*$/.test(symbol);
}

function isTerminal(symbol: string): boolean {
  if (symbol === EPSILON || symbol === EPSILON_INPUT) return true;
  if (symbol.length === 1) {
    return /^[a-z0-9+\-*/^(),.;:!@#%&=<>?[\]{}|~]$/.test(symbol);
  }
  return symbol.length > 1;
}

function parseRightSide(
  rightStr: string,
  lineNum: number,
  knownNonTerminals: Set<string>
): { symbols: GrammarSymbol[]; error: string | null } {
  const symbols: GrammarSymbol[] = [];
  let i = 0;

  if (rightStr.trim() === '' || rightStr.trim() === EPSILON || rightStr.trim() === EPSILON_INPUT) {
    return {
      symbols: [{ value: EPSILON, isTerminal: true }],
      error: null,
    };
  }

  const sortedNTs = Array.from(knownNonTerminals).sort((a, b) => b.length - a.length);

  while (i < rightStr.length) {
    const ch = rightStr[i];

    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    if (/[A-Z]/.test(ch)) {
      let matched: string | null = null;
      for (const nt of sortedNTs) {
        if (rightStr.startsWith(nt, i)) {
          matched = nt;
          break;
        }
      }
      if (matched) {
        symbols.push({ value: matched, isTerminal: false });
        i += matched.length;
      } else {
        const single = rightStr[i];
        if (isNonTerminal(single)) {
          symbols.push({ value: single, isTerminal: false });
          i += 1;
        } else {
          return { symbols: [], error: `无法识别的符号 '${single}'` };
        }
      }
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

interface RawLine {
  lineNum: number;
  left: string;
  rightPart: string;
}

export function parseGrammar(input: string, startSymbolOverride?: string): ParsedGrammar {
  resetProductionIdCounter();
  const productions: Production[] = [];
  const errors: GrammarLineError[] = [];
  const nonTerminalSet = new Set<string>();
  const terminalSet = new Set<string>();

  const lines = input.split('\n');
  let firstNonTerminal: string | null = null;
  const rawLines: RawLine[] = [];

  // 第一遍:解析左侧,收集所有已声明的非终结符
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return;
    }

    const arrowMatch = trimmed.match(/^([A-Z][A-Za-z0-9_]*'*)\s*(?:->|→|::=)\s*(.*)$/);
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
    rawLines.push({ lineNum, left, rightPart });
  });

  // 第二遍:基于已收集的非终结符,解析右侧产生式
  for (const raw of rawLines) {
    const { lineNum, left, rightPart } = raw;
    const alternatives = rightPart.split('|').map((a) => a.trim());

    for (const alt of alternatives) {
      const { symbols, error } = parseRightSide(alt, lineNum, nonTerminalSet);
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
  }

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

    if (hasIndirectRecursion(nt, productions)) {
      recursive.push(nt);
    }
  }

  return recursive;
}

function hasIndirectRecursion(
  startNt: string,
  productions: Production[]
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

function formatSymbol(s: GrammarSymbol): string {
  if (s.value === EPSILON) return EPSILON;
  if (s.isTerminal && s.value.length > 1) {
    return `'${s.value}'`;
  }
  return s.value;
}

export function productionToString(p: Production): string {
  const rightStr = p.right.map(formatSymbol).join('');
  return `${p.left}->${rightStr || EPSILON}`;
}

export function symbolsToString(symbols: GrammarSymbol[]): string {
  return symbols.map(formatSymbol).join('');
}
