import { create } from 'zustand';

interface UIState {
  rightPanelOpen: boolean;
  rightPanelTab: 'transitionTable' | 'executionTree' | 'info';
  leftPanelOpen: boolean;
  showSaveDialog: boolean;
  showImportDialog: boolean;
  showExportDialog: boolean;
  showRegexDialog: boolean;
  showLevelsDialog: boolean;
  showOperationsDialog: boolean;

  toggleRightPanel: () => void;
  setRightPanelTab: (tab: 'transitionTable' | 'executionTree' | 'info') => void;
  toggleLeftPanel: () => void;

  setShowSaveDialog: (show: boolean) => void;
  setShowImportDialog: (show: boolean) => void;
  setShowExportDialog: (show: boolean) => void;
  setShowRegexDialog: (show: boolean) => void;
  setShowLevelsDialog: (show: boolean) => void;
  setShowOperationsDialog: (show: boolean) => void;

  activeTool: 'select' | 'addState' | 'addTransition' | 'delete';
  setActiveTool: (tool: 'select' | 'addState' | 'addTransition' | 'delete') => void;

  subsetConstructionActive: boolean;
  minimizationActive: boolean;
  thompsonActive: boolean;

  setSubsetConstructionActive: (active: boolean) => void;
  setMinimizationActive: (active: boolean) => void;
  setThompsonActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  rightPanelOpen: true,
  rightPanelTab: 'transitionTable',
  leftPanelOpen: true,
  showSaveDialog: false,
  showImportDialog: false,
  showExportDialog: false,
  showRegexDialog: false,
  showLevelsDialog: false,
  showOperationsDialog: false,

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  setShowSaveDialog: (show) => set({ showSaveDialog: show }),
  setShowImportDialog: (show) => set({ showImportDialog: show }),
  setShowExportDialog: (show) => set({ showExportDialog: show }),
  setShowRegexDialog: (show) => set({ showRegexDialog: show }),
  setShowLevelsDialog: (show) => set({ showLevelsDialog: show }),
  setShowOperationsDialog: (show) => set({ showOperationsDialog: show }),

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
