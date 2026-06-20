export interface GrammarSymbol {
  value: string;
  isTerminal: boolean;
}

export interface Production {
  id: string;
  left: string;
  right: GrammarSymbol[];
  originalText: string;
}

export interface GrammarLineError {
  line: number;
  message: string;
}

export interface ParsedGrammar {
  productions: Production[];
  nonTerminals: string[];
  terminals: string[];
  startSymbol: string | null;
  errors: GrammarLineError[];
  hasLeftRecursion: string[];
}

export interface FirstFollowResult {
  firstSets: Map<string, Set<string>>;
  followSets: Map<string, Set<string>>;
}

export interface FirstFollowStep {
  stepIndex: number;
  type: 'first' | 'follow';
  nonTerminal: string;
  productionId: string | null;
  addedSymbols: string[];
  description: string;
  firstSets: Map<string, Set<string>>;
  followSets: Map<string, Set<string>>;
  isComplete: boolean;
}

export interface LL1TableCell {
  productions: Production[];
  hasConflict: boolean;
}

export interface LL1Table {
  nonTerminals: string[];
  terminals: string[];
  cells: Map<string, LL1TableCell>;
  isLL1: boolean;
}

export interface LL1AnalysisStep {
  stepIndex: number;
  stack: GrammarSymbol[];
  remainingInput: string;
  appliedProduction: Production | null;
  action: 'match' | 'expand' | 'accept' | 'error' | 'start' | 'recover';
  matchedChar: string | null;
  errorMessage: string | null;
  description: string;
  skippedSymbols?: string[];
  isRecoveryPoint?: boolean;
  recoveryCount?: number;
}

export interface PDAState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface PDATransition {
  id: string;
  from: string;
  to: string;
  inputSymbol: string;
  stackTop: string;
  pushSymbols: string[];
}

export interface PDA {
  states: PDAState[];
  transitions: PDATransition[];
  startStackSymbol: string;
}

export interface PDARunStep {
  stepIndex: number;
  currentState: string;
  stack: string[];
  remainingInput: string;
  transitionId: string | null;
  action: string;
  isAccept: boolean;
  isError: boolean;
}

export const EPSILON = '\u03B5';
export const EPSILON_INPUT = 'e';
export const END_MARKER = '$';
