import type { Automaton, ExecutionStep, ExecutionBranch } from './types';
import { epsilonClosure, move, getStartStateId, getStateById, deriveAlphabet } from './utils';

function buildBranchesNFA(
  automaton: Automaton,
  input: string
): ExecutionBranch[][] {
  const startId = getStartStateId(automaton);
  if (!startId) return [];

  const startClosure = epsilonClosure(automaton, [startId]);
  const levels: ExecutionBranch[][] = [];

  let branchCounter = 0;
  const makeId = () => `b_${branchCounter++}`;

  const rootBranches: ExecutionBranch[] = startClosure.map((sid) => ({
    id: makeId(),
    stateIds: [sid],
    consumedChar: null,
    isDead: false,
    isAccept: !!getStateById(automaton, sid)?.isAccept,
    parentId: null,
    depth: 0,
  }));
  levels.push(rootBranches);

  let currentStateIds = startClosure;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const prevLevel = levels[levels.length - 1];
    const nextBranches: ExecutionBranch[] = [];

    for (const sid of currentStateIds) {
      const movedStates: string[] = [];
      for (const t of automaton.transitions) {
        if (t.from === sid && t.symbols.includes(char)) {
          movedStates.push(t.to);
        }
      }

      if (movedStates.length === 0) {
        const parentBranch = prevLevel.find((b) => b.stateIds.includes(sid));
        nextBranches.push({
          id: makeId(),
          stateIds: [],
          consumedChar: char,
          isDead: true,
          isAccept: false,
          parentId: parentBranch?.id || null,
          depth: i + 1,
        });
      } else {
        const closureMap = new Map<string, string[]>();
        for (const msid of movedStates) {
          closureMap.set(msid, epsilonClosure(automaton, [msid]));
        }

        for (const msid of movedStates) {
          const closure = closureMap.get(msid) || [msid];
          const parentBranch = prevLevel.find((b) => b.stateIds.includes(sid));
          for (const csid of closure) {
            nextBranches.push({
              id: makeId(),
              stateIds: [csid],
              consumedChar: char,
              isDead: false,
              isAccept: !!getStateById(automaton, csid)?.isAccept,
              parentId: parentBranch?.id || null,
              depth: i + 1,
            });
          }
        }
      }
    }

    levels.push(nextBranches);

    const afterMove = move(automaton, currentStateIds, char);
    const afterClosure = epsilonClosure(automaton, afterMove);
    if (afterClosure.length === 0) break;
    currentStateIds = afterClosure;
  }

  return levels;
}

export function executeDFA(automaton: Automaton, input: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const startId = getStartStateId(automaton);
  const alphabet = deriveAlphabet(automaton.transitions);

  let branchCounter = 0;
  const makeId = () => `b_${branchCounter++}`;

  if (!startId) {
    return [
      {
        stepIndex: 0,
        activeStates: [],
        consumedChar: null,
        transitionIds: [],
        isDead: true,
        branches: [],
      },
    ];
  }

  const startState = getStateById(automaton, startId);
  steps.push({
    stepIndex: 0,
    activeStates: [startId],
    consumedChar: null,
    transitionIds: [],
    isDead: false,
    branches: [
      {
        id: makeId(),
        stateIds: [startId],
        consumedChar: null,
        isDead: false,
        isAccept: !!startState?.isAccept,
        parentId: null,
        depth: 0,
      },
    ],
  });

  let currentState = startId;
  let prevBranchId: string | null = (steps[0].branches?.[0]?.id) || null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    let nextState: string | null = null;
    let transitionId: string | null = null;
    let isDead = false;
    const invalidChar = !alphabet.includes(char);

    for (const t of automaton.transitions) {
      if (t.from === currentState && t.symbols.includes(char)) {
        nextState = t.to;
        transitionId = t.id;
        break;
      }
    }

    if (!nextState || invalidChar) {
      isDead = true;
    }

    steps.push({
      stepIndex: steps.length,
      activeStates: nextState ? [nextState] : [],
      consumedChar: char,
      transitionIds: transitionId ? [transitionId] : [],
      isDead,
      branches: [
        {
          id: makeId(),
          stateIds: nextState ? [nextState] : [],
          consumedChar: char,
          isDead,
          isAccept: nextState ? !!getStateById(automaton, nextState)?.isAccept : false,
          parentId: prevBranchId,
          depth: i + 1,
        },
      ],
    });

    prevBranchId = steps[steps.length - 1].branches?.[0]?.id || null;

    if (isDead) {
      break;
    }

    currentState = nextState!;
  }

  return steps;
}

export function executeNFA(automaton: Automaton, input: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const startId = getStartStateId(automaton);

  if (!startId) {
    return [
      {
        stepIndex: 0,
        activeStates: [],
        consumedChar: null,
        transitionIds: [],
        isDead: true,
        branches: [],
      },
    ];
  }

  const allBranches = buildBranchesNFA(automaton, input);

  const startClosure = epsilonClosure(automaton, [startId]);
  steps.push({
    stepIndex: 0,
    activeStates: startClosure,
    consumedChar: null,
    transitionIds: [],
    isDead: false,
    epsilonClosure: startClosure,
    branches: allBranches[0] || [],
  });

  let currentStates = startClosure;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const afterMove = move(automaton, currentStates, char);
    const afterClosure = epsilonClosure(automaton, afterMove);

    const transitionIds: string[] = [];
    for (const fromState of currentStates) {
      for (const t of automaton.transitions) {
        if (t.from === fromState && t.symbols.includes(char)) {
          transitionIds.push(t.id);
        }
      }
    }

    const isDead = afterClosure.length === 0;

    steps.push({
      stepIndex: steps.length,
      activeStates: afterClosure,
      consumedChar: char,
      transitionIds,
      isDead,
      epsilonClosure: afterClosure,
      branches: allBranches[steps.length] || [],
    });

    if (isDead) {
      break;
    }

    currentStates = afterClosure;
  }

  return steps;
}

export function checkAccept(automaton: Automaton, steps: ExecutionStep[]): boolean {
  if (steps.length === 0) return false;
  const lastStep = steps[steps.length - 1];
  if (lastStep.isDead) return false;

  for (const stateId of lastStep.activeStates) {
    const state = getStateById(automaton, stateId);
    if (state?.isAccept) return true;
  }
  return false;
}

export function getActiveStateOpacity(
  stateId: string,
  activeStates: string[],
  mode: 'DFA' | 'NFA'
): number {
  if (mode === 'DFA') {
    return activeStates.includes(stateId) ? 1 : 0.4;
  }
  return activeStates.includes(stateId) ? 1 : 0.25;
}
