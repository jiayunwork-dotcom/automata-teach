import type { Automaton, State, Transition } from '../types';
import type { ParsedGrammar, Production, GrammarSymbol } from './types';
import { EPSILON, EPSILON_INPUT } from './types';
import { generateId } from '../utils';
import { parseGrammar, resetProductionIdCounter } from './parser';

export function automatonToRegularGrammar(automaton: Automaton): string {
  const lines: string[] = [];
  const stateToNt = new Map<string, string>();

  let ntCounter = 0;
  function getNextNt(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (ntCounter < letters.length) {
      const nt = letters[ntCounter];
      ntCounter++;
      return nt;
    }
    return `N${ntCounter++}`;
  }

  for (const s of automaton.states) {
    stateToNt.set(s.id, getNextNt());
  }

  const startState = automaton.states.find((s) => s.isStart);
  if (startState && stateToNt.get(startState.id) !== 'S') {
    const oldStart = stateToNt.get(startState.id)!;
    for (const [sid, nt] of stateToNt) {
      if (nt === 'S') {
        stateToNt.set(sid, oldStart);
      }
    }
    stateToNt.set(startState.id, 'S');
  }

  const productions = new Map<string, string[]>();

  for (const s of automaton.states) {
    const leftNt = stateToNt.get(s.id)!;
    if (!productions.has(leftNt)) {
      productions.set(leftNt, []);
    }

    if (s.isAccept) {
      productions.get(leftNt)!.push('e');
    }

    for (const t of automaton.transitions) {
      if (t.from === s.id) {
        const rightNt = stateToNt.get(t.to)!;
        for (const sym of t.symbols) {
          const symbol = sym === 'ε' ? EPSILON : sym;
          productions.get(leftNt)!.push(`${symbol}${rightNt}`);
        }
      }
    }
  }

  for (const [nt, prods] of productions) {
    if (prods.length > 0) {
      lines.push(`${nt}->${prods.join('|')}`);
    }
  }

  return lines.join('\n');
}

export function regularGrammarToAutomaton(grammar: ParsedGrammar): Automaton {
  const states: State[] = [];
  const transitions: Transition[] = [];
  const alphabet = new Set<string>();

  const acceptState: State = {
    id: 'q_accept',
    label: 'qf',
    x: 300,
    y: 0,
    isStart: false,
    isAccept: true,
  };
  states.push(acceptState);

  const ntToState = new Map<string, State>();

  let stateCounter = 0;
  grammar.nonTerminals.forEach((nt, idx) => {
    const isStart = nt === grammar.startSymbol;
    const s: State = {
      id: `q_${nt}`,
      label: `q${idx}`,
      x: -100 + idx * 150,
      y: 0,
      isStart,
      isAccept: false,
    };
    states.push(s);
    ntToState.set(nt, s);
    stateCounter++;
  });

  for (const p of grammar.productions) {
    const fromState = ntToState.get(p.left);
    if (!fromState) continue;

    const right = p.right;

    if (right.length === 1 && right[0].isTerminal && right[0].value === EPSILON) {
      fromState.isAccept = true;
      continue;
    }

    let terminal: string | null = null;
    let nonTerminal: string | null = null;

    for (const sym of right) {
      if (sym.isTerminal) {
        terminal = sym.value;
      } else {
        nonTerminal = sym.value;
      }
    }

    if (terminal !== null) {
      alphabet.add(terminal);
      const toState = nonTerminal
        ? ntToState.get(nonTerminal) || acceptState
        : acceptState;

      const existing = transitions.find(
        (t) => t.from === fromState.id && t.to === toState.id
      );
      if (existing) {
        if (!existing.symbols.includes(terminal)) {
          existing.symbols.push(terminal);
        }
      } else {
        transitions.push({
          id: generateId('t'),
          from: fromState.id,
          to: toState.id,
          symbols: [terminal],
        });
      }
    } else if (nonTerminal !== null) {
      const toState = ntToState.get(nonTerminal);
      if (toState) {
        const existing = transitions.find(
          (t) => t.from === fromState.id && t.to === toState.id
        );
        if (existing) {
          if (!existing.symbols.includes('ε')) {
            existing.symbols.push('ε');
          }
        } else {
          transitions.push({
            id: generateId('t'),
            from: fromState.id,
            to: toState.id,
            symbols: ['ε'],
          });
        }
      }
    }
  }

  return {
    states,
    transitions,
    alphabet: Array.from(alphabet).sort(),
    type: 'NFA',
  };
}

export function _testParseGrammar(text: string): ParsedGrammar {
  return parseGrammar(text);
}

function generateNewNonTerminal(base: string, existing: Set<string>): string {
  let candidate = base + "'";
  while (existing.has(candidate)) {
    candidate += "'";
  }
  return candidate;
}

function symbolsToText(symbols: GrammarSymbol[]): string {
  if (symbols.length === 0 || (symbols.length === 1 && symbols[0].value === EPSILON)) {
    return EPSILON_INPUT;
  }
  return symbols.map(s => {
    if (s.isTerminal && s.value.length > 1) {
      return `'${s.value}'`;
    }
    return s.value;
  }).join('');
}

function productionsToText(productions: Production[], startSymbol: string | null): string {
  const ntGroups = new Map<string, string[]>();
  const orderedNTs: string[] = [];

  for (const p of productions) {
    if (!ntGroups.has(p.left)) {
      ntGroups.set(p.left, []);
      if (p.left === startSymbol) {
        orderedNTs.unshift(p.left);
      } else {
        orderedNTs.push(p.left);
      }
    }
    ntGroups.get(p.left)!.push(symbolsToText(p.right));
  }

  const lines: string[] = [];
  const seen = new Set<string>();
  if (startSymbol && ntGroups.has(startSymbol)) {
    const alts = ntGroups.get(startSymbol)!;
    lines.push(`${startSymbol}->${alts.join('|')}`);
    seen.add(startSymbol);
  }
  for (const nt of orderedNTs) {
    if (seen.has(nt)) continue;
    seen.add(nt);
    const alts = ntGroups.get(nt)!;
    lines.push(`${nt}->${alts.join('|')}`);
  }
  return lines.join('\n');
}

export function hasDirectLeftRecursion(grammar: ParsedGrammar): boolean {
  for (const nt of grammar.nonTerminals) {
    const ntProds = grammar.productions.filter(p => p.left === nt);
    for (const p of ntProds) {
      if (p.right.length > 0 && !p.right[0].isTerminal && p.right[0].value === nt) {
        return true;
      }
    }
  }
  return false;
}

export function eliminateLeftRecursion(grammar: ParsedGrammar): string {
  resetProductionIdCounter();
  const newProductions: Production[] = [];
  const existingNTs = new Set(grammar.nonTerminals);

  for (const nt of grammar.nonTerminals) {
    const ntProds = grammar.productions.filter(p => p.left === nt);
    const recursiveAlts: GrammarSymbol[][] = [];
    const nonRecursiveAlts: GrammarSymbol[][] = [];

    for (const p of ntProds) {
      if (p.right.length > 0 && !p.right[0].isTerminal && p.right[0].value === nt) {
        recursiveAlts.push(p.right.slice(1));
      } else {
        nonRecursiveAlts.push(p.right);
      }
    }

    if (recursiveAlts.length === 0) {
      newProductions.push(...ntProds);
      continue;
    }

    const newNt = generateNewNonTerminal(nt, existingNTs);
    existingNTs.add(newNt);

    for (const alt of nonRecursiveAlts) {
      const newRight = [...alt, { value: newNt, isTerminal: false }];
      newProductions.push({
        id: `p_${newProductions.length + 1}`,
        left: nt,
        right: newRight,
        originalText: `${nt}->${symbolsToText(newRight)}`,
      });
    }

    if (nonRecursiveAlts.length === 0) {
      newProductions.push({
        id: `p_${newProductions.length + 1}`,
        left: nt,
        right: [{ value: newNt, isTerminal: false }],
        originalText: `${nt}->${newNt}`,
      });
    }

    for (const alt of recursiveAlts) {
      const newRight = [...alt, { value: newNt, isTerminal: false }];
      newProductions.push({
        id: `p_${newProductions.length + 1}`,
        left: newNt,
        right: newRight,
        originalText: `${newNt}->${symbolsToText(newRight)}`,
      });
    }

    newProductions.push({
      id: `p_${newProductions.length + 1}`,
      left: newNt,
      right: [{ value: EPSILON, isTerminal: true }],
      originalText: `${newNt}->${EPSILON_INPUT}`,
    });
  }

  return productionsToText(newProductions, grammar.startSymbol);
}

export function hasLeftCommonFactor(grammar: ParsedGrammar): boolean {
  for (const nt of grammar.nonTerminals) {
    const ntProds = grammar.productions.filter(p => p.left === nt);
    if (ntProds.length < 2) continue;

    const altRights = ntProds.map(p => p.right);
    for (let i = 0; i < altRights.length; i++) {
      for (let j = i + 1; j < altRights.length; j++) {
        const prefix = getCommonPrefix(altRights[i], altRights[j]);
        if (prefix.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function getCommonPrefix(a: GrammarSymbol[], b: GrammarSymbol[]): GrammarSymbol[] {
  const prefix: GrammarSymbol[] = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i].value === b[i].value && a[i].isTerminal === b[i].isTerminal) {
      prefix.push({ ...a[i] });
    } else {
      break;
    }
  }
  return prefix;
}

function getLongestCommonPrefixGroup(alts: GrammarSymbol[][]): { prefix: GrammarSymbol[]; indices: number[] } | null {
  let bestPrefix: GrammarSymbol[] = [];
  let bestIndices: number[] = [];

  for (let i = 0; i < alts.length; i++) {
    for (let j = i + 1; j < alts.length; j++) {
      const prefix = getCommonPrefix(alts[i], alts[j]);
      if (prefix.length > bestPrefix.length) {
        bestPrefix = prefix;
        bestIndices = [i, j];
      } else if (prefix.length === bestPrefix.length && prefix.length > 0) {
        const matches = [i, j];
        for (let k = 0; k < alts.length; k++) {
          if (k === i || k === j) continue;
          if (alts[k].length >= prefix.length) {
            let match = true;
            for (let p = 0; p < prefix.length; p++) {
              if (alts[k][p].value !== prefix[p].value || alts[k][p].isTerminal !== prefix[p].isTerminal) {
                match = false;
                break;
              }
            }
            if (match) matches.push(k);
          }
        }
        if (matches.length > bestIndices.length) {
          bestIndices = matches;
        }
      }
    }
  }

  if (bestPrefix.length === 0) return null;

  const allIndices = new Set<number>();
  for (const idx of bestIndices) allIndices.add(idx);
  for (let i = 0; i < alts.length; i++) {
    if (allIndices.has(i)) continue;
    if (alts[i].length >= bestPrefix.length) {
      let match = true;
      for (let p = 0; p < bestPrefix.length; p++) {
        if (alts[i][p].value !== bestPrefix[p].value || alts[i][p].isTerminal !== bestPrefix[p].isTerminal) {
          match = false;
          break;
        }
      }
      if (match) allIndices.add(i);
    }
  }

  return { prefix: bestPrefix, indices: Array.from(allIndices).sort((a, b) => a - b) };
}

export function extractLeftCommonFactor(grammar: ParsedGrammar): string {
  resetProductionIdCounter();
  const finalProductions: Production[] = [];
  const existingNTs = new Set(grammar.nonTerminals);

  for (const nt of grammar.nonTerminals) {
    const ntProds = grammar.productions.filter(p => p.left === nt);
    let alts = ntProds.map(p => [...p.right]);

    while (true) {
      const group = getLongestCommonPrefixGroup(alts);
      if (!group) break;

      const { prefix, indices } = group;
      const newNt = generateNewNonTerminal(nt, existingNTs);
      existingNTs.add(newNt);

      const newAlts: GrammarSymbol[][] = [];
      const factoredAlts: GrammarSymbol[][] = [];

      for (let i = 0; i < alts.length; i++) {
        if (indices.includes(i)) {
          const remaining = alts[i].slice(prefix.length);
          if (remaining.length === 0) {
            factoredAlts.push([{ value: EPSILON, isTerminal: true }]);
          } else {
            factoredAlts.push(remaining);
          }
        } else {
          newAlts.push(alts[i]);
        }
      }

      newAlts.push([...prefix, { value: newNt, isTerminal: false }]);
      alts = newAlts;

      for (const factoredAlt of factoredAlts) {
        finalProductions.push({
          id: `p_${finalProductions.length + 1}`,
          left: newNt,
          right: factoredAlt,
          originalText: `${newNt}->${symbolsToText(factoredAlt)}`,
        });
      }
    }

    for (const alt of alts) {
      finalProductions.push({
        id: `p_${finalProductions.length + 1}`,
        left: nt,
        right: alt,
        originalText: `${nt}->${symbolsToText(alt)}`,
      });
    }
  }

  return productionsToText(finalProductions, grammar.startSymbol);
}
