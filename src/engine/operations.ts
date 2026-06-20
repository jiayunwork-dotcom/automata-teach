import type { Automaton, State, Transition } from './types';
import { generateId, getStartStateId, getAcceptStateIds } from './utils';

function offsetStates(
  states: State[],
  transitions: Transition[],
  dx: number,
  dy: number,
  prefix: string
): { states: State[]; transitions: Transition[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();

  const newStates = states.map((s) => {
    const newId = `${prefix}_${s.id}`;
    idMap.set(s.id, newId);
    return {
      ...s,
      id: newId,
      label: newId,
      x: s.x + dx,
      y: s.y + dy,
      isStart: false,
      isAccept: false,
    };
  });

  const newTransitions = transitions.map((t) => ({
    ...t,
    id: generateId(prefix + '_t'),
    from: idMap.get(t.from) || t.from,
    to: idMap.get(t.to) || t.to,
  }));

  return { states: newStates, transitions: newTransitions, idMap };
}

export function unionAutomata(a: Automaton, b: Automaton): Automaton {
  const offsetA = offsetStates(a.states, a.transitions, -150, -100, 'a');
  const offsetB = offsetStates(b.states, b.transitions, -150, 100, 'b');

  const startState: State = {
    id: 'union_start',
    label: 'qs',
    x: -300,
    y: 0,
    isStart: true,
    isAccept: false,
  };

  const acceptState: State = {
    id: 'union_accept',
    label: 'qa',
    x: 150,
    y: 0,
    isStart: false,
    isAccept: true,
  };

  const aStartId = offsetA.idMap.get(getStartStateId(a) || '');
  const bStartId = offsetB.idMap.get(getStartStateId(b) || '');
  const aAcceptIds = getAcceptStateIds(a).map((id) => offsetA.idMap.get(id) || '').filter(Boolean);
  const bAcceptIds = getAcceptStateIds(b).map((id) => offsetB.idMap.get(id) || '').filter(Boolean);

  const epsilonTransitions: Transition[] = [];

  if (aStartId) {
    epsilonTransitions.push({
      id: generateId('ue'),
      from: startState.id,
      to: aStartId,
      symbols: ['ε'],
    });
  }
  if (bStartId) {
    epsilonTransitions.push({
      id: generateId('ue'),
      from: startState.id,
      to: bStartId,
      symbols: ['ε'],
    });
  }

  for (const aid of aAcceptIds) {
    epsilonTransitions.push({
      id: generateId('ue'),
      from: aid,
      to: acceptState.id,
      symbols: ['ε'],
    });
  }
  for (const bid of bAcceptIds) {
    epsilonTransitions.push({
      id: generateId('ue'),
      from: bid,
      to: acceptState.id,
      symbols: ['ε'],
    });
  }

  const states = [startState, ...offsetA.states, ...offsetB.states, acceptState];
  const transitions = [...offsetA.transitions, ...offsetB.transitions, ...epsilonTransitions];

  const alphabet = Array.from(new Set([...a.alphabet, ...b.alphabet])).sort();

  return {
    states,
    transitions,
    alphabet,
    type: 'NFA',
  };
}

export function concatAutomata(a: Automaton, b: Automaton): Automaton {
  const offsetA = offsetStates(a.states, a.transitions, -200, 0, 'a');
  const offsetB = offsetStates(b.states, b.transitions, 100, 0, 'b');

  const aAcceptIds = getAcceptStateIds(a).map((id) => offsetA.idMap.get(id) || '').filter(Boolean);
  const bStartId = offsetB.idMap.get(getStartStateId(b) || '');

  const epsilonTransitions: Transition[] = [];
  if (bStartId) {
    for (const aid of aAcceptIds) {
      epsilonTransitions.push({
        id: generateId('ce'),
        from: aid,
        to: bStartId,
        symbols: ['ε'],
      });
    }
  }

  const states = [...offsetA.states, ...offsetB.states];

  for (const s of states) {
    const originalAStart = getStartStateId(a);
    if (originalAStart && offsetA.idMap.get(originalAStart) === s.id) {
      s.isStart = true;
    }
    const originalBAccepts = getAcceptStateIds(b);
    for (const oid of originalBAccepts) {
      if (offsetB.idMap.get(oid) === s.id) {
        s.isAccept = true;
      }
    }
  }

  const transitions = [...offsetA.transitions, ...offsetB.transitions, ...epsilonTransitions];
  const alphabet = Array.from(new Set([...a.alphabet, ...b.alphabet])).sort();

  return {
    states,
    transitions,
    alphabet,
    type: 'NFA',
  };
}

export function kleeneStar(a: Automaton): Automaton {
  const offset = offsetStates(a.states, a.transitions, 0, 0, 'k');

  const startState: State = {
    id: 'star_start',
    label: 'qs',
    x: -150,
    y: 0,
    isStart: true,
    isAccept: false,
  };

  const acceptState: State = {
    id: 'star_accept',
    label: 'qa',
    x: 250,
    y: 0,
    isStart: false,
    isAccept: true,
  };

  const aStartId = offset.idMap.get(getStartStateId(a) || '');
  const aAcceptIds = getAcceptStateIds(a).map((id) => offset.idMap.get(id) || '').filter(Boolean);

  const epsilonTransitions: Transition[] = [];

  if (aStartId) {
    epsilonTransitions.push({
      id: generateId('se'),
      from: startState.id,
      to: aStartId,
      symbols: ['ε'],
    });
  }

  epsilonTransitions.push({
    id: generateId('se'),
    from: startState.id,
    to: acceptState.id,
    symbols: ['ε'],
  });

  for (const aid of aAcceptIds) {
    epsilonTransitions.push({
      id: generateId('se'),
      from: aid,
      to: acceptState.id,
      symbols: ['ε'],
    });
    if (aStartId) {
      epsilonTransitions.push({
        id: generateId('se'),
        from: aid,
        to: aStartId,
        symbols: ['ε'],
      });
    }
  }

  const states = [startState, ...offset.states, acceptState];
  const transitions = [...offset.transitions, ...epsilonTransitions];

  return {
    states,
    transitions,
    alphabet: [...a.alphabet],
    type: 'NFA',
  };
}
