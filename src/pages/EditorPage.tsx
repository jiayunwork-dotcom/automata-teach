import { useEffect, useRef, useCallback, useState } from 'react';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { AutomatonCanvas } from '../components/canvas/AutomatonCanvas';
import { RightPanel } from '../components/panels/RightPanel';
import { ConversionPanel } from '../components/panels/ConversionPanel';
import { ContextMenu } from '../components/common/ContextMenu';
import { ImportExportDialog } from '../components/dialogs/ImportExportDialog';
import { RegexDialog } from '../components/dialogs/RegexDialog';
import { OperationsDialog } from '../components/dialogs/OperationsDialog';
import { LevelsDialog } from '../components/dialogs/LevelsDialog';
import { BatchTestDialog } from '../components/dialogs/BatchTestDialog';
import { useExecutionStore } from '../stores/executionStore';
import { useAutomatonStore } from '../stores/automatonStore';
import { useEditorStore } from '../stores/editorStore';
import { checkAccept } from '../engine/execution';
import { getStateById } from '../engine/utils';
import { STATE_RADIUS } from '../engine/types';

interface BubbleInfo {
  id: number;
  x: number;
  y: number;
  text: string;
  stateId: string;
}

export function EditorPage() {
  const isPlaying = useExecutionStore((s) => s.isPlaying);
  const speed = useExecutionStore((s) => s.speed);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const steps = useExecutionStore((s) => s.steps);
  const nextStep = useExecutionStore((s) => s.nextStep);
  const setFinished = useExecutionStore((s) => s.setFinished);
  const setAnimationProgress = useExecutionStore((s) => s.setAnimationProgress);
  const deadStateChar = useExecutionStore((s) => s.deadStateChar);
  const deadStateSourceIds = useExecutionStore((s) => s.deadStateSourceIds);

  const automaton = useAutomatonStore((s) => s.automaton);
  const view = useEditorStore((s) => s.view);
  const editorMode = useEditorStore((s) => s.editorMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<BubbleInfo[]>([]);
  const bubbleIdRef = useRef(0);
  const bubbleTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearBubble = useCallback((id: number) => {
    const timeout = bubbleTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      bubbleTimeoutsRef.current.delete(id);
    }
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    if (editorMode !== 'test') return;
    if (!deadStateChar || deadStateSourceIds.length === 0) return;

    setBubbles((prev) => {
      const newBubbles: BubbleInfo[] = [];
      const existingStateIds = new Set(prev.map((b) => b.stateId));
      const container = containerRef.current;
      if (!container) return prev;
      const rect = container.getBoundingClientRect();

      for (const sid of deadStateSourceIds) {
        if (existingStateIds.has(sid)) continue;
        const state = getStateById(automaton, sid);
        if (!state) continue;

        const screenX =
          rect.width / 2 + view.offsetX + state.x * view.scale;
        const screenY =
          rect.height / 2 + view.offsetY + (state.y - STATE_RADIUS - 20) * view.scale;

        const id = ++bubbleIdRef.current;
        newBubbles.push({
          id,
          x: screenX,
          y: screenY,
          text: `无转移: ${deadStateChar}`,
          stateId: sid,
        });

        const timeout = setTimeout(() => clearBubble(id), 3000);
        bubbleTimeoutsRef.current.set(id, timeout);
      }

      return [...prev, ...newBubbles];
    });

    return () => {};
  }, [deadStateChar, deadStateSourceIds, editorMode, automaton, view, clearBubble]);

  useEffect(() => {
    if (!deadStateChar) {
      setBubbles([]);
      for (const [id, t] of bubbleTimeoutsRef.current) {
        clearTimeout(t);
        bubbleTimeoutsRef.current.delete(id);
      }
    }
  }, [deadStateChar]);

  useEffect(() => {
    if (!isPlaying) return;

    const stepDuration = 1000 / speed;
    let lastTime = performance.now();
    let progress = 0;
    let animationId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      progress += delta / stepDuration;

      if (progress >= 1) {
        progress = 0;
        if (currentStepIndex < steps.length - 1) {
          nextStep();
          if (currentStepIndex + 1 >= steps.length - 1) {
            const accept = checkAccept(automaton, steps);
            setFinished(accept ? 'accept' : 'reject');
            return;
          }
        } else {
          const accept = checkAccept(automaton, steps);
          setFinished(accept ? 'accept' : 'reject');
          return;
        }
      }

      setAnimationProgress(progress);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, speed, currentStepIndex, steps, nextStep, setFinished, setAnimationProgress, automaton]);

  return (
    <div ref={containerRef} className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex relative overflow-hidden">
        <AutomatonCanvas />

        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute z-30 pointer-events-none animate-[fadeInBubble_0.3s_ease-out]"
            style={{
              left: b.x,
              top: b.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="relative bg-red-500/95 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-red-900/50 text-xs font-semibold whitespace-nowrap border border-red-400">
              {b.text}
              <div
                className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-red-500/95 border-r border-b border-red-400"
                style={{ transform: 'translateX(-50%) rotate(45deg)' }}
              />
            </div>
          </div>
        ))}

        <RightPanel />
        <ConversionPanel />
      </div>

      <ContextMenu />
      <ImportExportDialog />
      <RegexDialog />
      <OperationsDialog />
      <LevelsDialog />
      <BatchTestDialog />
    </div>
  );
}
