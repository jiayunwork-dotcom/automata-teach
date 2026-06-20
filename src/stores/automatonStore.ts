import { create } from 'zustand';
import type { Automaton, State, Transition, SavedAutomaton } from '../engine/types';
import { generateId, getNextStateLabel, deriveAlphabet, isDFA } from '../engine/utils';

interface AutomatonState {
  automaton: Automaton;
  savedAutomatons: SavedAutomaton[];
  customAlphabet: string[] | null;
  useCustomAlphabet: boolean;

  addState: (x: number, y: number) => void;
  removeState: (id: string) => void;
  updateState: (id: string, updates: Partial<State>) => void;
  moveState: (id: string, x: number, y: number) => void;
  setStartState: (id: string) => void;
  toggleAcceptState: (id: string) => void;

  addTransition: (from: string, to: string, symbols: string[]) => void;
  removeTransition: (id: string) => void;
  updateTransitionSymbols: (id: string, symbols: string[]) => void;

  setAutomaton: (automaton: Automaton) => void;
  clearAutomaton: () => void;
  updateType: () => void;

  setCustomAlphabet: (alphabet: string[] | null) => void;
  setUseCustomAlphabet: (use: boolean) => void;

  saveAutomaton: (name: string) => void;
  loadAutomaton: (id: string) => void;
  deleteSavedAutomaton: (id: string) => void;

  loadFromJSON: (data: Automaton) => void;
}

function createInitialAutomaton(): Automaton {
  return {
    states: [
      { id: 'q0', label: 'q0', x: -200, y: 0, isStart: true, isAccept: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
      { id: 't2', from: 'q1', to: 'q2', symbols: ['b'] },
      { id: 't3', from: 'q1', to: 'q1', symbols: ['a'] },
      { id: 't4', from: 'q2', to: 'q2', symbols: ['a', 'b'] },
    ],
    alphabet: ['a', 'b'],
    type: 'DFA',
  };
}

const initialAutomaton: Automaton = createInitialAutomaton();

function loadSavedFromStorage(): SavedAutomaton[] {
  try {
    const raw = localStorage.getItem('automata_saved');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedToStorage(saved: SavedAutomaton[]) {
  try {
    localStorage.setItem('automata_saved', JSON.stringify(saved));
  } catch {
    // ignore
  }
}

export const useAutomatonStore = create<AutomatonState>((set, get) => ({
  automaton: initialAutomaton,
  savedAutomatons: loadSavedFromStorage(),
  customAlphabet: null,
  useCustomAlphabet: false,

  addState: (x, y) => {
    const { automaton } = get();
    const label = getNextStateLabel(automaton.states);
    const newState: State = {
      id: label,
      label,
      x,
      y,
      isStart: automaton.states.length === 0,
      isAccept: false,
    };
    const newStates = [...automaton.states, newState];
    const newAlphabet = deriveAlphabet(automaton.transitions);
    set({
      automaton: {
        ...automaton,
        states: newStates,
        alphabet: newAlphabet,
      },
    });
  },

  removeState: (id) => {
    const { automaton } = get();
    const newStates = automaton.states.filter((s) => s.id !== id);
    const newTransitions = automaton.transitions.filter(
      (t) => t.from !== id && t.to !== id
    );
    const wasStart = automaton.states.find((s) => s.id === id)?.isStart;
    if (wasStart && newStates.length > 0) {
      newStates[0].isStart = true;
    }
    const newAlphabet = deriveAlphabet(newTransitions);
    set({
      automaton: {
        ...automaton,
        states: newStates,
        transitions: newTransitions,
        alphabet: newAlphabet,
        type: isDFA({ ...automaton, states: newStates, transitions: newTransitions }) ? 'DFA' : 'NFA',
      },
    });
  },

  updateState: (id, updates) => {
    const { automaton } = get();
    const newStates = automaton.states.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    set({
      automaton: { ...automaton, states: newStates },
    });
  },

  moveState: (id, x, y) => {
    const { automaton } = get();
    const newStates = automaton.states.map((s) =>
      s.id === id ? { ...s, x, y } : s
    );
    set({
      automaton: { ...automaton, states: newStates },
    });
  },

  setStartState: (id) => {
    const { automaton } = get();
    const newStates = automaton.states.map((s) => ({
      ...s,
      isStart: s.id === id,
    }));
    set({
      automaton: { ...automaton, states: newStates },
    });
  },

  toggleAcceptState: (id) => {
    const { automaton } = get();
    const newStates = automaton.states.map((s) =>
      s.id === id ? { ...s, isAccept: !s.isAccept } : s
    );
    set({
      automaton: { ...automaton, states: newStates },
    });
  },

  addTransition: (from, to, symbols) => {
    const { automaton } = get();
    const existing = automaton.transitions.find(
      (t) => t.from === from && t.to === to
    );
    let newTransitions: Transition[];
    if (existing) {
      const mergedSymbols = Array.from(new Set([...existing.symbols, ...symbols]));
      newTransitions = automaton.transitions.map((t) =>
        t.id === existing.id ? { ...t, symbols: mergedSymbols } : t
      );
    } else {
      const newT: Transition = {
        id: generateId('t'),
        from,
        to,
        symbols,
      };
      newTransitions = [...automaton.transitions, newT];
    }
    const newAlphabet = deriveAlphabet(newTransitions);
    const newAuto = { ...automaton, transitions: newTransitions, alphabet: newAlphabet };
    newAuto.type = isDFA(newAuto) ? 'DFA' : 'NFA';
    set({ automaton: newAuto });
  },

  removeTransition: (id) => {
    const { automaton } = get();
    const newTransitions = automaton.transitions.filter((t) => t.id !== id);
    const newAlphabet = deriveAlphabet(newTransitions);
    const newAuto = { ...automaton, transitions: newTransitions, alphabet: newAlphabet };
    newAuto.type = isDFA(newAuto) ? 'DFA' : 'NFA';
    set({ automaton: newAuto });
  },

  updateTransitionSymbols: (id, symbols) => {
    const { automaton } = get();
    const newTransitions = automaton.transitions.map((t) =>
      t.id === id ? { ...t, symbols } : t
    );
    const newAlphabet = deriveAlphabet(newTransitions);
    const newAuto = { ...automaton, transitions: newTransitions, alphabet: newAlphabet };
    newAuto.type = isDFA(newAuto) ? 'DFA' : 'NFA';
    set({ automaton: newAuto });
  },

  setAutomaton: (automaton) => {
    const newAlphabet = deriveAlphabet(automaton.transitions);
    const newAuto = { ...automaton, alphabet: newAlphabet };
    newAuto.type = isDFA(newAuto) ? 'DFA' : 'NFA';
    set({ automaton: newAuto });
  },

  clearAutomaton: () => {
    set({ automaton: { ...initialAutomaton } });
  },

  updateType: () => {
    const { automaton } = get();
    set({
      automaton: {
        ...automaton,
        type: isDFA(automaton) ? 'DFA' : 'NFA',
      },
    });
  },

  setCustomAlphabet: (alphabet) => {
    set({ customAlphabet: alphabet });
  },

  setUseCustomAlphabet: (use) => {
    set({ useCustomAlphabet: use });
  },

  saveAutomaton: (name) => {
    const { automaton, savedAutomatons } = get();
    const saved: SavedAutomaton = {
      id: generateId('saved'),
      name,
      automaton: JSON.parse(JSON.stringify(automaton)),
      savedAt: Date.now(),
    };
    let newSaved = [...savedAutomatons, saved];
    if (newSaved.length > 5) {
      newSaved = newSaved.slice(-5);
    }
    saveSavedToStorage(newSaved);
    set({ savedAutomatons: newSaved });
  },

  loadAutomaton: (id) => {
    const { savedAutomatons } = get();
    const saved = savedAutomatons.find((s) => s.id === id);
    if (saved) {
      get().setAutomaton(JSON.parse(JSON.stringify(saved.automaton)));
    }
  },

  deleteSavedAutomaton: (id) => {
    const { savedAutomatons } = get();
    const newSaved = savedAutomatons.filter((s) => s.id !== id);
    saveSavedToStorage(newSaved);
    set({ savedAutomatons: newSaved });
  },

  loadFromJSON: (data) => {
    get().setAutomaton(data);
  },
}));
