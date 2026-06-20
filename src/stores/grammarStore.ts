import { create } from 'zustand';
import type {
  ParsedGrammar,
  FirstFollowStep,
  LL1Table,
  LL1AnalysisStep,
  PDA,
  PDARunStep,
} from '../engine/grammar/types';
import { parseGrammar, isRegularGrammar } from '../engine/grammar/parser';
import { buildFirstFollowSteps } from '../engine/grammar/firstFollow';
import { buildLL1Table, buildLL1AnalysisSteps } from '../engine/grammar/ll1';
import { buildPDAFromGrammar, buildPDARunSteps } from '../engine/grammar/pda';

export type GrammarTab = 'firstFollow' | 'll1Table' | 'll1Analysis' | 'pda';

interface GrammarStore {
  grammarText: string;
  startSymbol: string | null;
  parsedGrammar: ParsedGrammar;
  isRegular: boolean;

  activeTab: GrammarTab;
  setActiveTab: (tab: GrammarTab) => void;

  setGrammarText: (text: string) => void;
  setStartSymbol: (symbol: string | null) => void;
  reparse: () => void;

  firstFollowSteps: FirstFollowStep[];
  ffCurrentStep: number;
  ffIsPlaying: boolean;
  ffSpeed: number;
  buildFirstFollow: () => void;
  setFFStep: (step: number) => void;
  setFFPlaying: (playing: boolean) => void;
  setFFSpeed: (speed: number) => void;

  ll1Table: LL1Table | null;
  buildLL1Table: () => void;

  ll1Input: string;
  ll1Steps: LL1AnalysisStep[];
  ll1CurrentStep: number;
  ll1IsPlaying: boolean;
  ll1Speed: number;
  setLL1Input: (input: string) => void;
  runLL1Analysis: () => void;
  setLL1Step: (step: number) => void;
  setLL1Playing: (playing: boolean) => void;
  setLL1Speed: (speed: number) => void;

  pda: PDA | null;
  pdaInput: string;
  pdaSteps: PDARunStep[];
  pdaCurrentStep: number;
  pdaIsPlaying: boolean;
  pdaSpeed: number;
  pdaOffsetX: number;
  pdaOffsetY: number;
  pdaScale: number;
  buildPDA: () => void;
  setPDAInput: (input: string) => void;
  runPDA: () => void;
  setPDAStep: (step: number) => void;
  setPDAPlaying: (playing: boolean) => void;
  setPDASpeed: (speed: number) => void;
  setPDAView: (offsetX: number, offsetY: number, scale: number) => void;
  movePDAState: (id: string, x: number, y: number) => void;
}

const DEFAULT_GRAMMAR = `S->aSb|e`;

function createEmptyGrammar(): ParsedGrammar {
  return {
    productions: [],
    nonTerminals: [],
    terminals: [],
    startSymbol: null,
    errors: [],
    hasLeftRecursion: [],
  };
}

export const useGrammarStore = create<GrammarStore>((set, get) => {
  const initialText = DEFAULT_GRAMMAR;
  const initialParsed = parseGrammar(initialText);

  return {
    grammarText: initialText,
    startSymbol: initialParsed.startSymbol,
    parsedGrammar: initialParsed,
    isRegular: isRegularGrammar(initialParsed),

    activeTab: 'firstFollow',
    setActiveTab: (tab) => set({ activeTab: tab }),

    setGrammarText: (text) => {
      const parsed = parseGrammar(text, get().startSymbol || undefined);
      set({
        grammarText: text,
        parsedGrammar: parsed,
        startSymbol: parsed.startSymbol,
        isRegular: isRegularGrammar(parsed),
        firstFollowSteps: [],
        ffCurrentStep: 0,
        ll1Table: null,
        ll1Steps: [],
        ll1CurrentStep: 0,
        pda: null,
        pdaSteps: [],
        pdaCurrentStep: 0,
      });
    },

    setStartSymbol: (symbol) => {
      const parsed = parseGrammar(get().grammarText, symbol || undefined);
      set({
        startSymbol: symbol,
        parsedGrammar: parsed,
        isRegular: isRegularGrammar(parsed),
        firstFollowSteps: [],
        ffCurrentStep: 0,
        ll1Table: null,
        ll1Steps: [],
        ll1CurrentStep: 0,
        pda: null,
        pdaSteps: [],
        pdaCurrentStep: 0,
      });
    },

    reparse: () => {
      const parsed = parseGrammar(get().grammarText, get().startSymbol || undefined);
      set({
        parsedGrammar: parsed,
        isRegular: isRegularGrammar(parsed),
      });
    },

    firstFollowSteps: [],
    ffCurrentStep: 0,
    ffIsPlaying: false,
    ffSpeed: 1,
    buildFirstFollow: () => {
      const steps = buildFirstFollowSteps(get().parsedGrammar);
      set({
        firstFollowSteps: steps,
        ffCurrentStep: 0,
        ffIsPlaying: false,
      });
    },
    setFFStep: (step) => set({ ffCurrentStep: step, ffIsPlaying: false }),
    setFFPlaying: (playing) => set({ ffIsPlaying: playing }),
    setFFSpeed: (speed) => set({ ffSpeed: speed }),

    ll1Table: null,
    buildLL1Table: () => {
      const table = buildLL1Table(get().parsedGrammar);
      set({ ll1Table: table });
    },

    ll1Input: '',
    ll1Steps: [],
    ll1CurrentStep: 0,
    ll1IsPlaying: false,
    ll1Speed: 1,
    setLL1Input: (input) => set({ ll1Input: input }),
    runLL1Analysis: () => {
      const table = get().ll1Table || buildLL1Table(get().parsedGrammar);
      const steps = buildLL1AnalysisSteps(get().parsedGrammar, table, get().ll1Input);
      set({
        ll1Table: table,
        ll1Steps: steps,
        ll1CurrentStep: 0,
        ll1IsPlaying: false,
      });
    },
    setLL1Step: (step) => set({ ll1CurrentStep: step, ll1IsPlaying: false }),
    setLL1Playing: (playing) => set({ ll1IsPlaying: playing }),
    setLL1Speed: (speed) => set({ ll1Speed: speed }),

    pda: null,
    pdaInput: '',
    pdaSteps: [],
    pdaCurrentStep: 0,
    pdaIsPlaying: false,
    pdaSpeed: 1,
    pdaOffsetX: 0,
    pdaOffsetY: 0,
    pdaScale: 1,
    buildPDA: () => {
      const pda = buildPDAFromGrammar(get().parsedGrammar);
      set({
        pda,
        pdaSteps: [],
        pdaCurrentStep: 0,
      });
    },
    setPDAInput: (input) => set({ pdaInput: input }),
    runPDA: () => {
      const pda = get().pda || buildPDAFromGrammar(get().parsedGrammar);
      const steps = buildPDARunSteps(pda, get().parsedGrammar, get().pdaInput, get().parsedGrammar.productions);
      set({
        pda,
        pdaSteps: steps,
        pdaCurrentStep: 0,
        pdaIsPlaying: false,
      });
    },
    setPDAStep: (step) => set({ pdaCurrentStep: step, pdaIsPlaying: false }),
    setPDAPlaying: (playing) => set({ pdaIsPlaying: playing }),
    setPDASpeed: (speed) => set({ pdaSpeed: speed }),
    setPDAView: (offsetX, offsetY, scale) =>
      set({ pdaOffsetX: offsetX, pdaOffsetY: offsetY, pdaScale: scale }),
    movePDAState: (id, x, y) => {
      const pda = get().pda;
      if (!pda) return;
      const newStates = pda.states.map((s) =>
        s.id === id ? { ...s, x, y } : s
      );
      set({ pda: { ...pda, states: newStates } });
    },
  };
});
