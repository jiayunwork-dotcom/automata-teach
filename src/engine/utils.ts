import type { Automaton, State, Transition, EPSILON } from './types';

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getNextStateLabel(states: State[]): string {
  let maxNum = -1;
  for (const s of states) {
    const match = s.id.match(/^q(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `q${maxNum + 1}`;
}

export function getStateById(automaton: Automaton, id: string): State | undefined {
  return automaton.states.find((s) => s.id === id);
}

export function getTransitionById(automaton: Automaton, id: string): Transition | undefined {
  return automaton.transitions.find((t) => t.id === id);
}

export function deriveAlphabet(transitions: Transition[]): string[] {
  const set = new Set<string>();
  for (const t of transitions) {
    for (const sym of t.symbols) {
      if (sym !== 'ε') {
        set.add(sym);
      }
    }
  }
  return Array.from(set).sort();
}

export function epsilonClosure(automaton: Automaton, stateIds: string[]): string[] {
  const closure = new Set<string>(stateIds);
  const stack = [...stateIds];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const t of automaton.transitions) {
      if (t.from === current && t.symbols.includes('ε')) {
        if (!closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      }
    }
  }

  return Array.from(closure).sort();
}

export function move(automaton: Automaton, stateIds: string[], symbol: string): string[] {
  const result = new Set<string>();
  for (const sid of stateIds) {
    for (const t of automaton.transitions) {
      if (t.from === sid && t.symbols.includes(symbol)) {
        result.add(t.to);
      }
    }
  }
  return Array.from(result).sort();
}

export function isDFA(automaton: Automaton): boolean {
  const alphabet = deriveAlphabet(automaton.transitions);
  if (automaton.states.filter((s) => s.isStart).length !== 1) return false;

  for (const state of automaton.states) {
    for (const sym of alphabet) {
      const outTrans = automaton.transitions.filter(
        (t) => t.from === state.id && t.symbols.includes(sym)
      );
      if (outTrans.length > 1) return false;
    }
    const epsilonTrans = automaton.transitions.filter(
      (t) => t.from === state.id && t.symbols.includes('ε')
    );
    if (epsilonTrans.length > 0) return false;
  }
  return true;
}

export function getTransitionsFromState(
  automaton: Automaton,
  stateId: string
): Transition[] {
  return automaton.transitions.filter((t) => t.from === stateId);
}

export function getTransitionsToState(
  automaton: Automaton,
  stateId: string
): Transition[] {
  return automaton.transitions.filter((t) => t.to === stateId);
}

export function hasSelfLoop(automaton: Automaton, stateId: string): boolean {
  return automaton.transitions.some((t) => t.from === stateId && t.to === stateId);
}

export function countTransitionsBetween(
  automaton: Automaton,
  from: string,
  to: string
): number {
  return automaton.transitions.filter((t) => t.from === from && t.to === to).length;
}

export function cloneAutomaton(automaton: Automaton): Automaton {
  return {
    type: automaton.type,
    alphabet: [...automaton.alphabet],
    states: automaton.states.map((s) => ({ ...s })),
    transitions: automaton.transitions.map((t) => ({ ...t, symbols: [...t.symbols] })),
  };
}

export function getStartStateId(automaton: Automaton): string | null {
  const start = automaton.states.find((s) => s.isStart);
  return start ? start.id : null;
}

export function getAcceptStateIds(automaton: Automaton): string[] {
  return automaton.states.filter((s) => s.isAccept).map((s) => s.id);
}

export function subsetKey(states: string[]): string {
  return [...states].sort().join(',');
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return distance(px, py, xx, yy);
}
