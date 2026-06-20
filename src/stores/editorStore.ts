import { create } from 'zustand';
import type { ViewTransform, DragState, ContextMenuState, EditorMode } from '../engine/types';

interface EditorState {
  editorMode: EditorMode;
  view: ViewTransform;
  dragState: DragState;
  contextMenu: ContextMenuState | null;
  hoveredStateId: string | null;
  hoveredTransitionId: string | null;
  selectedStateId: string | null;
  selectedTransitionId: string | null;

  setEditorMode: (mode: EditorMode) => void;
  setView: (view: ViewTransform) => void;
  setOffset: (x: number, y: number) => void;
  setScale: (scale: number) => void;
  zoomAt: (clientX: number, clientY: number, delta: number, canvasWidth: number, canvasHeight: number) => void;

  setDragState: (state: DragState) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;

  setHoveredState: (id: string | null) => void;
  setHoveredTransition: (id: string | null) => void;
  setSelectedState: (id: string | null) => void;
  setSelectedTransition: (id: string | null) => void;

  screenToWorld: (sx: number, sy: number, canvasWidth: number, canvasHeight: number) => { x: number; y: number };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editorMode: 'edit',
  view: { offsetX: 0, offsetY: 0, scale: 1 },
  dragState: { type: 'idle' },
  contextMenu: null,
  hoveredStateId: null,
  hoveredTransitionId: null,
  selectedStateId: null,
  selectedTransitionId: null,

  setEditorMode: (mode) => set({ editorMode: mode }),

  setView: (view) => set({ view }),

  setOffset: (offsetX, offsetY) =>
    set((state) => ({ view: { ...state.view, offsetX, offsetY } })),

  setScale: (scale) =>
    set((state) => ({ view: { ...state.view, scale: Math.max(0.1, Math.min(5, scale)) } })),

  zoomAt: (clientX, clientY, delta, canvasWidth, canvasHeight) => {
    const { view } = get();
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, view.scale * zoomFactor));

    const rectCenterX = canvasWidth / 2;
    const rectCenterY = canvasHeight / 2;

    const mouseWorldX = (clientX - rectCenterX - view.offsetX) / view.scale;
    const mouseWorldY = (clientY - rectCenterY - view.offsetY) / view.scale;

    const newOffsetX = clientX - rectCenterX - mouseWorldX * newScale;
    const newOffsetY = clientY - rectCenterY - mouseWorldY * newScale;

    set({
      view: {
        offsetX: newOffsetX,
        offsetY: newOffsetY,
        scale: newScale,
      },
    });
  },

  setDragState: (state) => set({ dragState: state }),

  setContextMenu: (menu) => set({ contextMenu: menu }),

  setHoveredState: (id) => set({ hoveredStateId: id }),
  setHoveredTransition: (id) => set({ hoveredTransitionId: id }),
  setSelectedState: (id) => set({ selectedStateId: id, selectedTransitionId: id ? null : null }),
  setSelectedTransition: (id) => set({ selectedTransitionId: id, selectedStateId: id ? null : null }),

  screenToWorld: (sx, sy, canvasWidth, canvasHeight) => {
    const { view } = get();
    const rectCenterX = canvasWidth / 2;
    const rectCenterY = canvasHeight / 2;
    return {
      x: (sx - rectCenterX - view.offsetX) / view.scale,
      y: (sy - rectCenterY - view.offsetY) / view.scale,
    };
  },
}));
