import { useExecutionStore } from '../../stores/executionStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { getStateById } from '../../engine/utils';

export function ExecutionTree() {
  const steps = useExecutionStore((s) => s.steps);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const mode = useExecutionStore((s) => s.mode);
  const inputString = useExecutionStore((s) => s.inputString);
  const goToStep = useExecutionStore((s) => s.goToStep);

  const automaton = useAutomatonStore((s) => s.automaton);

  if (steps.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">执行树</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          <div className="text-center">
            <p>输入字符串并点击执行</p>
            <p className="text-xs mt-1 text-slate-600">
              {mode === 'NFA' ? 'NFA模式展示所有并行路径' : 'DFA模式展示单一路径'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="font-semibold text-slate-200">执行树</h3>
        <p className="text-xs text-slate-500 mt-1">
          输入: <span className="font-mono text-cyan-400">{inputString || 'ε'}</span>
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isPast = idx < currentStepIndex;
          const stateLabels = step.activeStates
            .map((sid) => {
              const s = getStateById(automaton, sid);
              return s?.label || sid;
            })
            .sort()
            .join(', ');

          const hasAccept = step.activeStates.some((sid) => {
            const s = getStateById(automaton, sid);
            return s?.isAccept;
          });

          return (
            <button
              key={idx}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isActive
                  ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : isPast
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-slate-800/30 border-slate-700/50'
              }`}
              onClick={() => goToStep(idx)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  步骤 {idx}
                  {step.consumedChar && (
                    <span className="ml-2 font-mono text-cyan-400">
                      '{step.consumedChar}'
                    </span>
                  )}
                </span>
                {step.isDead && (
                  <span className="text-xs text-red-400">死状态</span>
                )}
                {!step.isDead && hasAccept && (
                  <span className="text-xs text-green-400">含接受态</span>
                )}
              </div>
              <div className="mt-1 font-mono text-sm">
                {step.activeStates.length > 0 ? (
                  <span className={hasAccept ? 'text-green-300' : 'text-slate-300'}>
                    {'{'}{stateLabels}{'}'}
                  </span>
                ) : (
                  <span className="text-red-400">∅</span>
                )}
              </div>
              {step.epsilonClosure && step.epsilonClosure.length > step.activeStates.length && (
                <div className="mt-1 text-xs text-purple-400">
                  ε-闭包: {step.epsilonClosure.map((sid) => getStateById(automaton, sid)?.label || sid).sort().join(', ')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
