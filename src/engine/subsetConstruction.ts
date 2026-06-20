import type { Automaton, State, Transition, SubsetConstructionStep } from './types';
import { epsilonClosure, move, subsetKey, generateId, getStartStateId, getAcceptStateIds } from './utils';

export function buildSubsetConstructionSteps(nfa: Automaton): SubsetConstructionStep[] {
  const steps: SubsetConstructionStep[] = [];

  const startId = getStartStateId(nfa);
  if (!startId) {
    return [
      {
        stepIndex: 0,
        currentSubset: [],
        epsilonClosure: [],
        transitions: [],
        dfaStates: [],
        dfaTransitions: [],
        isComplete: true,
      },
    ];
  }

  const startClosure = epsilonClosure(nfa, [startId]);
  const acceptIds = new Set(getAcceptStateIds(nfa));

  const dfaStatesMap = new Map<string, { id: string; nfaSubset: string[]; isStart: boolean; isAccept: boolean }>();
  const dfaTransitions: Transition[] = [];

  const startDfaId = 'd0';
  dfaStatesMap.set(subsetKey(startClosure), {
    id: startDfaId,
    nfaSubset: startClosure,
    isStart: true,
    isAccept: startClosure.some((s) => acceptIds.has(s)),
  });

  const unprocessed: string[][] = [startClosure];
  const alphabet = nfa.alphabet.filter((s) => s !== 'ε');

  steps.push({
    stepIndex: 0,
    currentSubset: startClosure,
    epsilonClosure: startClosure,
    transitions: [],
    dfaStates: Array.from(dfaStatesMap.values()),
    dfaTransitions: [...dfaTransitions],
    isComplete: false,
  });

  let stepIdx = 1;

  while (unprocessed.length > 0) {
    const currentSubset = unprocessed.shift()!;
    const currentKey = subsetKey(currentSubset);
    const currentDfaState = dfaStatesMap.get(currentKey)!;

    const transResults: { symbol: string; targetSubset: string[]; isNew: boolean }[] = [];

    for (const sym of alphabet) {
      const afterMove = move(nfa, currentSubset, sym);
      const afterClosure = epsilonClosure(nfa, afterMove);
      const targetKey = subsetKey(afterClosure);

      let isNew = false;
      if (!dfaStatesMap.has(targetKey) && afterClosure.length > 0) {
        isNew = true;
        const newDfaId = `d${dfaStatesMap.size}`;
        dfaStatesMap.set(targetKey, {
          id: newDfaId,
          nfaSubset: afterClosure,
          isStart: false,
          isAccept: afterClosure.some((s) => acceptIds.has(s)),
        });
        unprocessed.push(afterClosure);
      }

      if (afterClosure.length > 0) {
        const targetDfaState = dfaStatesMap.get(targetKey)!;
        dfaTransitions.push({
          id: generateId('dt'),
          from: currentDfaState.id,
          to: targetDfaState.id,
          symbols: [sym],
        });
      }

      transResults.push({
        symbol: sym,
        targetSubset: afterClosure,
        isNew,
      });
    }

    steps.push({
      stepIndex: stepIdx++,
      currentSubset,
      epsilonClosure: currentSubset,
      transitions: transResults,
      dfaStates: Array.from(dfaStatesMap.values()),
      dfaTransitions: [...dfaTransitions],
      isComplete: unprocessed.length === 0,
    });
  }

  return steps;
}

export function buildDfaFromSteps(
  steps: SubsetConstructionStep[],
  layout?: (states: string[]) => Map<string, { x: number; y: number }>
): Automaton {
  const lastStep = steps[steps.length - 1];
  const states: State[] = lastStep.dfaStates.map((ds) => {
    return {
      id: ds.id,
      label: ds.id,
      x: 0,
      y: 0,
      isStart: ds.isStart,
      isAccept: ds.isAccept,
    };
  });

  if (layout) {
    const posMap = layout(states.map((s) => s.id));
    for (const s of states) {
      const pos = posMap.get(s.id);
      if (pos) {
        s.x = pos.x;
        s.y = pos.y;
      }
    }
  } else {
    const cols = Math.ceil(Math.sqrt(states.length));
    const spacing = 120;
    states.forEach((s, i) => {
      s.x = (i % cols) * spacing - ((cols - 1) * spacing) / 2;
      s.y = Math.floor(i / cols) * spacing - (Math.ceil(states.length / cols) - 1) * spacing / 2;
    });
  }

  return {
    states,
    transitions: lastStep.dfaTransitions,
    alphabet: [...new Set(lastStep.dfaTransitions.flatMap((t) => t.symbols))].sort(),
    type: 'DFA',
  };
}

export function findUnreachableStates(dfa: Automaton): string[] {
  const startId = dfa.states.find((s) => s.isStart)?.id;
  if (!startId) return dfa.states.map((s) => s.id);

  const reachable = new Set<string>();
  const stack = [startId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    for (const t of dfa.transitions) {
      if (t.from === current && !reachable.has(t.to)) {
        stack.push(t.to);
      }
    }
  }

  return dfa.states.filter((s) => !reachable.has(s.id)).map((s) => s.id);
}
