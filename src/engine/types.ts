export interface State {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  symbols: string[];
}

export interface Automaton {
  states: State[];
  transitions: Transition[];
  alphabet: string[];
  type: 'DFA' | 'NFA';
}

export interface ExecutionStep {
  stepIndex: number;
  activeStates: string[];
  consumedChar: string | null;
  transitionIds: string[];
  isDead: boolean;
  epsilonClosure?: string[];
}

export type EditorMode = 'edit' | 'test' | 'convert';

export type ExecutionMode = 'DFA' | 'NFA';

export type PlaybackSpeed = 0.5 | 1 | 2 | 3;

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export type DragState =
  | { type: 'idle' }
  | { type: 'draggingState'; stateId: string; offsetX: number; offsetY: number }
  | { type: 'draggingCanvas'; startX: number; startY: number; origOffsetX: number; origOffsetY: number }
  | { type: 'drawingTransition'; fromStateId: string; mouseX: number; mouseY: number };

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'state' | 'transition' | 'canvas';
  targetId?: string;
}

export interface SubsetConstructionStep {
  stepIndex: number;
  currentSubset: string[];
  epsilonClosure: string[];
  transitions: { symbol: string; targetSubset: string[]; isNew: boolean }[];
  dfaStates: { id: string; nfaSubset: string[]; isStart: boolean; isAccept: boolean }[];
  dfaTransitions: Transition[];
  isComplete: boolean;
}

export interface MinimizationStep {
  stepIndex: number;
  partitions: string[][];
  currentGroupIndex: number;
  currentSymbol: string;
  checkingPair: [string, string] | null;
  isSplitting: boolean;
  splitResult?: string[][];
  isComplete: boolean;
  minDfa?: Automaton;
}

export interface ThompsonStep {
  stepIndex: number;
  operation: 'char' | 'concat' | 'union' | 'star';
  description: string;
  automaton: Automaton;
  isComplete: boolean;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  type: 'construct' | 'quiz' | 'demo';
  targetLanguage?: string;
  testCases?: { input: string; accept: boolean }[];
  hints: string[];
  starterAutomaton?: Automaton;
}

export interface SavedAutomaton {
  id: string;
  name: string;
  automaton: Automaton;
  savedAt: number;
}

export const EPSILON = '\u03B5';

export const STATE_RADIUS = 35;
