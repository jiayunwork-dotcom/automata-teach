import type { Automaton, ExecutionStep } from './types';
import { epsilonClosure, move, getStartStateId, getStateById } from './utils';

export function executeDFA(automaton: Automaton, input: string): ExecutionStep[] {
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
      },
    ];
  }

  steps.push({
    stepIndex: 0,
    activeStates: [startId],
    consumedChar: null,
    transitionIds: [],
    isDead: false,
  });

  let currentState = startId;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    let nextState: string | null = null;
    let transitionId: string | null = null;
    let isDead = false;

    for (const t of automaton.transitions) {
      if (t.from === currentState && t.symbols.includes(char)) {
        nextState = t.to;
        transitionId = t.id;
        break;
      }
    }

    if (!nextState) {
      isDead = true;
    }

    steps.push({
      stepIndex: steps.length,
      activeStates: nextState ? [nextState] : [],
      consumedChar: char,
      transitionIds: transitionId ? [transitionId] : [],
      isDead,
    });

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
      },
    ];
  }

  const startClosure = epsilonClosure(automaton, [startId]);
  steps.push({
    stepIndex: 0,
    activeStates: startClosure,
    consumedChar: null,
    transitionIds: [],
    isDead: false,
    epsilonClosure: startClosure,
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
