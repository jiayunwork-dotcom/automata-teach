import { useEffect } from 'react';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { AutomatonCanvas } from '../components/canvas/AutomatonCanvas';
import { RightPanel } from '../components/panels/RightPanel';
import { ConversionPanel } from '../components/panels/ConversionPanel';
import { ContextMenu } from '../components/common/ContextMenu';
import { ImportExportDialog } from '../components/dialogs/ImportExportDialog';
import { RegexDialog } from '../components/dialogs/RegexDialog';
import { OperationsDialog } from '../components/dialogs/OperationsDialog';
import { LevelsDialog } from '../components/dialogs/LevelsDialog';
import { useExecutionStore } from '../stores/executionStore';
import { useAutomatonStore } from '../stores/automatonStore';
import { checkAccept } from '../engine/execution';

export function EditorPage() {
  const isPlaying = useExecutionStore((s) => s.isPlaying);
  const speed = useExecutionStore((s) => s.speed);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const steps = useExecutionStore((s) => s.steps);
  const nextStep = useExecutionStore((s) => s.nextStep);
  const setFinished = useExecutionStore((s) => s.setFinished);
  const setAnimationProgress = useExecutionStore((s) => s.setAnimationProgress);

  const automaton = useAutomatonStore((s) => s.automaton);

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
  }, [isPlaying, speed, currentStepIndex, steps.length, nextStep, setFinished, setAnimationProgress, automaton]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex relative overflow-hidden">
        <AutomatonCanvas />
        <RightPanel />
        <ConversionPanel />
      </div>

      <ContextMenu />
      <ImportExportDialog />
      <RegexDialog />
      <OperationsDialog />
      <LevelsDialog />
    </div>
  );
}
