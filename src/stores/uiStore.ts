import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  rightPanelOpen: boolean;
  rightPanelTab: 'transitionTable' | 'executionTree' | 'info';
  leftPanelOpen: boolean;
  grammarPanelOpen: boolean;
  showSaveDialog: boolean;
  showImportDialog: boolean;
  showExportDialog: boolean;
  showRegexDialog: boolean;
  showLevelsDialog: boolean;
  showOperationsDialog: boolean;
  showBatchTestDialog: boolean;
  toasts: Toast[];

  toggleRightPanel: () => void;
  setRightPanelTab: (tab: 'transitionTable' | 'executionTree' | 'info') => void;
  toggleLeftPanel: () => void;
  toggleGrammarPanel: () => void;
  setGrammarPanelOpen: (open: boolean) => void;

  setShowSaveDialog: (show: boolean) => void;
  setShowImportDialog: (show: boolean) => void;
  setShowExportDialog: (show: boolean) => void;
  setShowRegexDialog: (show: boolean) => void;
  setShowLevelsDialog: (show: boolean) => void;
  setShowOperationsDialog: (show: boolean) => void;
  setShowBatchTestDialog: (show: boolean) => void;

  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: (id: string) => void;

  activeTool: 'select' | 'addState' | 'addTransition' | 'delete';
  setActiveTool: (tool: 'select' | 'addState' | 'addTransition' | 'delete') => void;

  subsetConstructionActive: boolean;
  minimizationActive: boolean;
  thompsonActive: boolean;

  setSubsetConstructionActive: (active: boolean) => void;
  setMinimizationActive: (active: boolean) => void;
  setThompsonActive: (active: boolean) => void;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  rightPanelOpen: true,
  rightPanelTab: 'transitionTable',
  leftPanelOpen: true,
  grammarPanelOpen: false,
  showSaveDialog: false,
  showImportDialog: false,
  showExportDialog: false,
  showRegexDialog: false,
  showLevelsDialog: false,
  showOperationsDialog: false,
  showBatchTestDialog: false,
  toasts: [],

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleGrammarPanel: () =>
    set((state) => ({ grammarPanelOpen: !state.grammarPanelOpen })),
  setGrammarPanelOpen: (open) => set({ grammarPanelOpen: open }),

  setShowSaveDialog: (show) => set({ showSaveDialog: show }),
  setShowImportDialog: (show) => set({ showImportDialog: show }),
  setShowExportDialog: (show) => set({ showExportDialog: show }),
  setShowRegexDialog: (show) => set({ showRegexDialog: show }),
  setShowLevelsDialog: (show) => set({ showLevelsDialog: show }),
  setShowOperationsDialog: (show) => set({ showOperationsDialog: show }),
  setShowBatchTestDialog: (show) => set({ showBatchTestDialog: show }),

  showToast: (message, type = 'info') => {
    const id = `toast_${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().hideToast(id);
    }, 3000);
  },
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  subsetConstructionActive: false,
  minimizationActive: false,
  thompsonActive: false,

  setSubsetConstructionActive: (active) =>
    set({ subsetConstructionActive: active }),
  setMinimizationActive: (active) =>
    set({ minimizationActive: active }),
  setThompsonActive: (active) => set({ thompsonActive: active }),
}));
