import { useRef, useEffect, useCallback } from 'react';
import { Renderer } from './Renderer';
import { useAutomatonStore } from '../../stores/automatonStore';
import { useEditorStore } from '../../stores/editorStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useUIStore } from '../../stores/uiStore';

export function AutomatonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const automaton = useAutomatonStore((s) => s.automaton);
  const addState = useAutomatonStore((s) => s.addState);
  const moveState = useAutomatonStore((s) => s.moveState);
  const addTransition = useAutomatonStore((s) => s.addTransition);

  const view = useEditorStore((s) => s.view);
  const dragState = useEditorStore((s) => s.dragState);
  const setDragState = useEditorStore((s) => s.setDragState);
  const setContextMenu = useEditorStore((s) => s.setContextMenu);
  const setHoveredState = useEditorStore((s) => s.setHoveredState);
  const setHoveredTransition = useEditorStore((s) => s.setHoveredTransition);
  const hoveredStateId = useEditorStore((s) => s.hoveredStateId);
  const hoveredTransitionId = useEditorStore((s) => s.hoveredTransitionId);
  const selectedStateId = useEditorStore((s) => s.selectedStateId);
  const selectedTransitionId = useEditorStore((s) => s.selectedTransitionId);
  const highlightedStateIds = useEditorStore((s) => s.highlightedStateIds);
  const highlightColor = useEditorStore((s) => s.highlightColor);
  const zoomAt = useEditorStore((s) => s.zoomAt);
  const setOffset = useEditorStore((s) => s.setOffset);
  const screenToWorld = useEditorStore((s) => s.screenToWorld);
  const editorMode = useEditorStore((s) => s.editorMode);

  const steps = useExecutionStore((s) => s.steps);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const flashingTransitionIds = useExecutionStore((s) => s.flashingTransitionIds);
  const mode = useExecutionStore((s) => s.mode);
  const animationProgress = useExecutionStore((s) => s.animationProgress);

  const activeTool = useUIStore((s) => s.activeTool);

  const getActiveStates = useCallback(() => {
    if (steps.length === 0 || editorMode !== 'test') return [];
    const step = steps[Math.min(currentStepIndex, steps.length - 1)];
    return step?.activeStates || [];
  }, [steps, currentStepIndex, editorMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new Renderer(ctx);

    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas || !rendererRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      rendererRef.current.setSize(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const render = () => {
      if (!rendererRef.current) return;

      const drawingTransition =
        dragState.type === 'drawingTransition'
          ? {
              fromStateId: dragState.fromStateId,
              mouseX: dragState.mouseX,
              mouseY: dragState.mouseY,
            }
          : null;

      rendererRef.current.render(automaton, view, {
        hoveredStateId,
        hoveredTransitionId,
        selectedStateId,
        selectedTransitionId,
        activeStates: getActiveStates(),
        flashingTransitionIds,
        executionMode: mode,
        animationProgress,
        drawingTransition,
        highlightStates: highlightedStateIds,
        highlightColor,
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    automaton,
    view,
    dragState,
    hoveredStateId,
    hoveredTransitionId,
    selectedStateId,
    selectedTransitionId,
    highlightedStateIds,
    highlightColor,
    flashingTransitionIds,
    mode,
    animationProgress,
    getActiveStates,
  ]);

  const getWorldCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      return screenToWorld(sx, sy, rect.width, rect.height);
    },
    [screenToWorld]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const renderer = rendererRef.current;
    if (!renderer) return;

    const hitState = renderer.getStateAtPosition(automaton, world.x, world.y);
    const hitTransition = renderer.getTransitionAtPosition(automaton, world.x, world.y);

    setContextMenu(null);

    if (activeTool === 'addState') {
      addState(world.x, world.y);
      return;
    }

    if (activeTool === 'delete') {
      if (hitState) {
        useAutomatonStore.getState().removeState(hitState.id);
      } else if (hitTransition) {
        useAutomatonStore.getState().removeTransition(hitTransition.id);
      }
      return;
    }

    if (activeTool === 'addTransition') {
      if (hitState) {
        setDragState({
          type: 'drawingTransition',
          fromStateId: hitState.id,
          mouseX: world.x,
          mouseY: world.y,
        });
      }
      return;
    }

    if (hitState) {
      setDragState({
        type: 'draggingState',
        stateId: hitState.id,
        offsetX: world.x - hitState.x,
        offsetY: world.y - hitState.y,
      });
      useEditorStore.getState().setSelectedState(hitState.id);
    } else {
      setDragState({
        type: 'draggingCanvas',
        startX: e.clientX,
        startY: e.clientY,
        origOffsetX: view.offsetX,
        origOffsetY: view.offsetY,
      });
      useEditorStore.getState().setSelectedState(null);
      useEditorStore.getState().setSelectedTransition(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const renderer = rendererRef.current;
    if (!renderer) return;

    if (dragState.type === 'draggingState') {
      const newX = world.x - dragState.offsetX;
      const newY = world.y - dragState.offsetY;
      moveState(dragState.stateId, newX, newY);
      return;
    }

    if (dragState.type === 'draggingCanvas') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setOffset(dragState.origOffsetX + dx, dragState.origOffsetY + dy);
      return;
    }

    if (dragState.type === 'drawingTransition') {
      setDragState({
        ...dragState,
        mouseX: world.x,
        mouseY: world.y,
      });
      return;
    }

    const hitState = renderer.getStateAtPosition(automaton, world.x, world.y);
    const hitTransition = renderer.getTransitionAtPosition(automaton, world.x, world.y);

    if (hitState) {
      setHoveredState(hitState.id);
      setHoveredTransition(null);
      canvas.style.cursor = activeTool === 'addTransition' ? 'crosshair' : 'grab';
    } else if (hitTransition) {
      setHoveredTransition(hitTransition.id);
      setHoveredState(null);
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredState(null);
      setHoveredTransition(null);
      canvas.style.cursor = activeTool === 'addState' ? 'crosshair' : 'default';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const renderer = rendererRef.current;

    if (dragState.type === 'drawingTransition' && renderer) {
      const targetState = renderer.getStateAtPosition(automaton, world.x, world.y);
      if (targetState) {
        const symbols = prompt('输入转移符号（逗号分隔，e表示epsilon）：', 'a');
        if (symbols !== null) {
          const symList = symbols
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((s) => (s === 'e' ? 'ε' : s));
          if (symList.length > 0) {
            addTransition(dragState.fromStateId, targetState.id, symList);
          }
        }
      }
    }

    if (dragState.type !== 'idle') {
      setDragState({ type: 'idle' });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeTool !== 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const renderer = rendererRef.current;
    if (!renderer) return;

    const hitState = renderer.getStateAtPosition(automaton, world.x, world.y);
    if (!hitState) {
      addState(world.x, world.y);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    zoomAt(sx, sy, e.deltaY, rect.width, rect.height);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, rect.width, rect.height);

    const renderer = rendererRef.current;
    if (!renderer) return;

    const hitState = renderer.getStateAtPosition(automaton, world.x, world.y);
    const hitTransition = renderer.getTransitionAtPosition(automaton, world.x, world.y);

    if (hitState) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'state',
        targetId: hitState.id,
      });
    } else if (hitTransition) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'transition',
        targetId: hitTransition.id,
      });
    } else {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'canvas',
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
    setHoveredTransition(null);
    if (dragState.type !== 'idle') {
      setDragState({ type: 'idle' });
    }
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-900">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ cursor: dragState.type === 'draggingCanvas' ? 'grabbing' : undefined }}
      />
    </div>
  );
}
