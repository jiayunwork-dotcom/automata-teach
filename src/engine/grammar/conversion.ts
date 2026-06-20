import type { Automaton, State, Transition } from '../types';
import type { ParsedGrammar, Production, GrammarSymbol } from './types';
import { EPSILON } from './types';
import { generateId } from '../utils';
import { parseGrammar } from './parser';

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
