import { create } from 'zustand';
import type { ExecutionStep, PlaybackSpeed, ExecutionMode } from '../engine/types';

interface ExecutionState {
  inputString: string;
  currentStepIndex: number;
  steps: ExecutionStep[];
  isPlaying: boolean;
  speed: PlaybackSpeed;
  mode: ExecutionMode;
  isFinished: boolean;
  result: 'accept' | 'reject' | null;
  flashingTransitionIds: string[];
  animationProgress: number;
  deadStateChar: string | null;
  deadStateSourceIds: string[];

  setInputString: (s: string) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setMode: (mode: ExecutionMode) => void;

  startExecution: (steps: ExecutionStep[]) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  resetExecution: () => void;

  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  setAnimationProgress: (p: number) => void;
  setFlashingTransitions: (ids: string[]) => void;

  setFinished: (result: 'accept' | 'reject') => void;
  setDeadStateInfo: (char: string | null, sourceIds: string[]) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  inputString: '',
  currentStepIndex: 0,
  steps: [],
  isPlaying: false,
  speed: 1,
  mode: 'DFA',
  isFinished: false,
  result: null,
  flashingTransitionIds: [],
  animationProgress: 0,
  deadStateChar: null,
  deadStateSourceIds: [],

  setInputString: (s) => set({ inputString: s }),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),

  startExecution: (steps) => {
    set({
      steps,
      currentStepIndex: 0,
      isPlaying: true,
      isFinished: false,
      result: null,
      animationProgress: 0,
      flashingTransitionIds: [],
      deadStateChar: null,
      deadStateSourceIds: [],
    });
  },

  pauseExecution: () => set({ isPlaying: false }),
  resumeExecution: () => set({ isPlaying: true }),

  stopExecution: () => {
    set({
      isPlaying: false,
      isFinished: false,
      result: null,
      currentStepIndex: 0,
      steps: [],
      flashingTransitionIds: [],
      animationProgress: 0,
      deadStateChar: null,
      deadStateSourceIds: [],
    });
  },

  resetExecution: () => {
    set({
      currentStepIndex: 0,
      isPlaying: false,
      isFinished: false,
      result: null,
      flashingTransitionIds: [],
      animationProgress: 0,
      deadStateChar: null,
      deadStateSourceIds: [],
    });
  },

  goToStep: (index) => {
    const { steps } = get();
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[clamped];
    set({
      currentStepIndex: clamped,
      animationProgress: 0,
      flashingTransitionIds: step?.transitionIds || [],
      deadStateChar: step?.isDead && step.consumedChar ? step.consumedChar : null,
      deadStateSourceIds: step?.isDead && step.consumedChar
        ? (steps[clamped - 1]?.activeStates || [])
        : [],
      isFinished: false,
      result: null,
    });
  },

  nextStep: () => {
    const { steps, currentStepIndex } = get();
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const nextStepItem = steps[nextIdx];
      const isDead = nextStepItem.isDead && nextStepItem.consumedChar !== null;
      set({
        currentStepIndex: nextIdx,
        animationProgress: 0,
        flashingTransitionIds: nextStepItem.transitionIds,
        deadStateChar: isDead ? nextStepItem.consumedChar : null,
        deadStateSourceIds: isDead ? (steps[currentStepIndex]?.activeStates || []) : [],
      });
    }
  },

  prevStep: () => {
    const { steps, currentStepIndex } = get();
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      set({
        currentStepIndex: prevIdx,
        animationProgress: 0,
        flashingTransitionIds: steps[prevIdx].transitionIds,
        isFinished: false,
        result: null,
        deadStateChar: null,
        deadStateSourceIds: [],
      });
    }
  },

  setAnimationProgress: (p) => set({ animationProgress: p }),
  setFlashingTransitions: (ids) => set({ flashingTransitionIds: ids }),

  setFinished: (result) => {
    set({ isFinished: true, result, isPlaying: false });
  },
  setDeadStateInfo: (char, sourceIds) => {
    set({ deadStateChar: char, deadStateSourceIds: sourceIds });
  },
}));
