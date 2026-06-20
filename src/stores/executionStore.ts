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
    });
  },

  goToStep: (index) => {
    const { steps } = get();
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    set({
      currentStepIndex: clamped,
      animationProgress: 0,
      flashingTransitionIds: steps[clamped]?.transitionIds || [],
    });
  },

  nextStep: () => {
    const { steps, currentStepIndex, isFinished } = get();
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      set({
        currentStepIndex: nextIdx,
        animationProgress: 0,
        flashingTransitionIds: steps[nextIdx].transitionIds,
      });
      if (nextIdx === steps.length - 1) {
        const lastStep = steps[nextIdx];
        const hasAccept = lastStep.activeStates.some((sid) => {
          // This is checked later, we set result from outside
          return false;
        });
      }
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
      });
    }
  },

  setAnimationProgress: (p) => set({ animationProgress: p }),
  setFlashingTransitions: (ids) => set({ flashingTransitionIds: ids }),

  setFinished: (result) => {
    set({ isFinished: true, result, isPlaying: false });
  },
}));
