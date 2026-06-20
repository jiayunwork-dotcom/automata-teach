import type { Automaton, MinimizationStep, State, Transition } from './types';
import { generateId, getStateById } from './utils';

export function buildMinimizationSteps(dfa: Automaton): MinimizationStep[] {
  const steps: MinimizationStep[] = [];

  if (dfa.states.length === 0) {
    return [
      {
        stepIndex: 0,
        partitions: [],
        currentGroupIndex: 0,
        currentSymbol: '',
        checkingPair: null,
        isSplitting: false,
        isComplete: true,
      },
    ];
  }

  const acceptSet = new Set(dfa.states.filter((s) => s.isAccept).map((s) => s.id));
  const nonAcceptSet = new Set(dfa.states.filter((s) => !s.isAccept).map((s) => s.id));

  let partitions: string[][] = [];
  if (nonAcceptSet.size > 0) partitions.push([...nonAcceptSet]);
  if (acceptSet.size > 0) partitions.push([...acceptSet]);

  const alphabet = dfa.alphabet.filter((s) => s !== 'ε');

  steps.push({
    stepIndex: 0,
    partitions: partitions.map((p) => [...p]),
    currentGroupIndex: 0,
    currentSymbol: '',
    checkingPair: null,
    isSplitting: false,
    isComplete: false,
  });

  let stepIdx = 1;
  let changed = true;
  const worklist = partitions.map((_, i) => i).filter((i) => partitions[i].length > 1);

  while (worklist.length > 0) {
    const groupIdx = worklist.shift()!;
    const group = partitions[groupIdx];
    if (!group || group.length <= 1) continue;

    for (const sym of alphabet) {
      const transitionMap = new Map<string, string>();
      for (const sid of group) {
        let target: string | null = null;
        for (const t of dfa.transitions) {
          if (t.from === sid && t.symbols.includes(sym)) {
            target = t.to;
            break;
          }
        }

        let targetGroup = '-1';
        if (target) {
          for (let i = 0; i < partitions.length; i++) {
            if (partitions[i].includes(target)) {
              targetGroup = String(i);
              break;
            }
          }
        }
        transitionMap.set(sid, targetGroup);
      }

      const groupsMap = new Map<string, string[]>();
      for (const sid of group) {
        const g = transitionMap.get(sid) || 'dead';
        if (!groupsMap.has(g)) {
          groupsMap.set(g, []);
        }
        groupsMap.get(g)!.push(sid);
      }

      if (groupsMap.size > 1) {
        const newGroups = [...groupsMap.values()];
        partitions[groupIdx] = newGroups[0];
        for (let i = 1; i < newGroups.length; i++) {
          partitions.push(newGroups[i]);
          if (newGroups[i].length > 1) {
            worklist.push(partitions.length - 1);
          }
        }

        steps.push({
          stepIndex: stepIdx++,
          partitions: partitions.map((p) => [...p]),
          currentGroupIndex: groupIdx,
          currentSymbol: sym,
          checkingPair: group.length >= 2 ? [group[0], group[1]] : null,
          isSplitting: true,
          splitResult: newGroups.map((g) => [...g]),
          isComplete: false,
        });

        if (newGroups[0].length > 1) {
          worklist.push(groupIdx);
        }

        break;
      } else {
        steps.push({
          stepIndex: stepIdx++,
          partitions: partitions.map((p) => [...p]),
          currentGroupIndex: groupIdx,
          currentSymbol: sym,
          checkingPair: group.length >= 2 ? [group[0], group[1]] : null,
          isSplitting: false,
          isComplete: false,
        });
      }
    }
  }

  const minDfa = buildMinimizedDfa(dfa, partitions);

  steps.push({
    stepIndex: stepIdx,
    partitions: partitions.map((p) => [...p]),
    currentGroupIndex: -1,
    currentSymbol: '',
    checkingPair: null,
    isSplitting: false,
    isComplete: true,
    minDfa,
  });

  return steps;
}

export function buildMinimizedDfa(
  dfa: Automaton,
  partitions: string[][]
): Automaton {
  const stateToGroup = new Map<string, number>();
  for (let i = 0; i < partitions.length; i++) {
    for (const sid of partitions[i]) {
      stateToGroup.set(sid, i);
    }
  }

  const states: State[] = partitions.map((group, i) => {
    const firstState = getStateById(dfa, group[0]);
    const isStart = group.some((sid) => {
      const s = getStateById(dfa, sid);
      return s?.isStart;
    });
    const isAccept = group.some((sid) => {
      const s = getStateById(dfa, sid);
      return s?.isAccept;
    });

    return {
      id: `m${i}`,
      label: `{${group.map((sid) => getStateById(dfa, sid)?.label || sid).sort().join(',')}}`,
      x: firstState?.x || 0,
      y: firstState?.y || 0,
      isStart,
      isAccept,
    };
  });

  const transitions: Transition[] = [];
  const seenTransitions = new Set<string>();

  for (const group of partitions) {
    const firstId = group[0];
    const fromGroupIdx = stateToGroup.get(firstId)!;
    const fromState = states[fromGroupIdx];

    for (const t of dfa.transitions) {
      if (t.from === firstId) {
        const toGroupIdx = stateToGroup.get(t.to);
        if (toGroupIdx !== undefined) {
          const toState = states[toGroupIdx];
          const key = `${fromState.id}-${toState.id}-${t.symbols.join(',')}`;
          if (!seenTransitions.has(key)) {
            seenTransitions.add(key);
            transitions.push({
              id: generateId('mt'),
              from: fromState.id,
              to: toState.id,
              symbols: [...t.symbols],
            });
          }
        }
      }
    }
  }

  return {
    states,
    transitions,
    alphabet: [...dfa.alphabet],
    type: 'DFA',
  };
}
