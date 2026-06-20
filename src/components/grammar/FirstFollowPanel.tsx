import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward, RefreshCw, AlertTriangle } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import type { FirstFollowStep } from '../../engine/grammar/types';

export function FirstFollowPanel() {
  const parsedGrammar = useGrammarStore((s) => s.parsedGrammar);
  const firstFollowSteps = useGrammarStore((s) => s.firstFollowSteps);
  const ffCurrentStep = useGrammarStore((s) => s.ffCurrentStep);
  const ffIsPlaying = useGrammarStore((s) => s.ffIsPlaying);
  const ffSpeed = useGrammarStore((s) => s.ffSpeed);
  const buildFirstFollow = useGrammarStore((s) => s.buildFirstFollow);
  const setFFStep = useGrammarStore((s) => s.setFFStep);
  const setFFPlaying = useGrammarStore((s) => s.setFFPlaying);
  const setFFSpeed = useGrammarStore((s) => s.setFFSpeed);

  const animationRef = useRef<number>();

  useEffect(() => {
    if (firstFollowSteps.length === 0) {
      buildFirstFollow();
    }
  }, [parsedGrammar]);

  useEffect(() => {
    if (!ffIsPlaying || ffCurrentStep >= firstFollowSteps.length - 1) {
      if (ffCurrentStep >= firstFollowSteps.length - 1) {
        setFFPlaying(false);
      }
      return;
    }

    const stepDuration = 1500 / ffSpeed;
    let lastTime = performance.now();
    let progress = 0;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      progress += delta / stepDuration;

      if (progress >= 1) {
        progress = 0;
        if (ffCurrentStep < firstFollowSteps.length - 1) {
          setFFStep(ffCurrentStep + 1);
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ffIsPlaying, ffCurrentStep, firstFollowSteps.length, ffSpeed, setFFStep, setFFPlaying]);

  const currentStep: FirstFollowStep | null = firstFollowSteps[ffCurrentStep] || null;

  const handlePlayPause = () => {
    if (ffCurrentStep >= firstFollowSteps.length - 1) {
      setFFStep(0);
    }
    setFFPlaying(!ffIsPlaying);
  };

  const handleReset = () => {
    buildFirstFollow();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <h3 className="font-semibold text-slate-200 mb-3">First / Follow 集</h3>

        {firstFollowSteps.length > 0 && (
          <div className="mb-3">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-cyan-500 transition-all duration-200"
                style={{
                  width: `${((ffCurrentStep + 1) / firstFollowSteps.length) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>步骤 {ffCurrentStep + 1} / {firstFollowSteps.length}</span>
              <span>{currentStep?.isComplete ? '✓ 完成' : currentStep?.type === 'first' ? '计算First集' : '计算Follow集'}</span>
            </div>
            <input
              type="range"
              min={0}
              max={firstFollowSteps.length - 1}
              value={ffCurrentStep}
              onChange={(e) => setFFStep(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-1">
          <button
            onClick={handleReset}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="重新计算"
          >
            <RefreshCw className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => setFFStep(0)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="回到开始"
          >
            <SkipBack className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => setFFStep(Math.max(0, ffCurrentStep - 1))}
            disabled={ffCurrentStep === 0}
            className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
            title="上一步"
          >
            <StepBack className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-cyan-600 hover:bg-cyan-700 rounded-full transition-colors"
            title={ffIsPlaying ? '暂停' : '播放'}
          >
            {ffIsPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={() => setFFStep(Math.min(firstFollowSteps.length - 1, ffCurrentStep + 1))}
            disabled={ffCurrentStep >= firstFollowSteps.length - 1}
            className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
            title="下一步"
          >
            <StepForward className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => setFFStep(firstFollowSteps.length - 1)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="跳到结尾"
          >
            <SkipForward className="w-4 h-4 text-slate-300" />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">速度:</span>
            <select
              value={ffSpeed}
              onChange={(e) => setFFSpeed(parseFloat(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </div>
        </div>
      </div>

      {currentStep && (
        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
          <div className="text-sm text-slate-300">
            <span className={`font-medium ${currentStep.type === 'first' ? 'text-cyan-400' : 'text-purple-400'}`}>
              {currentStep.type === 'first' ? 'First' : 'Follow'}
            </span>
            <span className="mx-2">·</span>
            {currentStep.nonTerminal && (
              <>
                <span className="font-mono text-amber-400">{currentStep.nonTerminal}</span>
                <span className="mx-2">·</span>
              </>
            )}
            {currentStep.addedSymbols.length > 0 && (
              <span className="text-green-400 font-mono">
                新增: {currentStep.addedSymbols.join(', ')}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">{currentStep.description}</div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium w-24">非终结符</th>
              <th className="text-left py-2 px-3 text-slate-400 font-medium">First 集</th>
              <th className="text-left py-2 px-3 text-slate-400 font-medium">Follow 集</th>
            </tr>
          </thead>
          <tbody>
            {parsedGrammar.nonTerminals.map((nt) => {
              const firstSet = currentStep?.firstSets.get(nt) || new Set<string>();
              const followSet = currentStep?.followSets.get(nt) || new Set<string>();
              const isHighlighted = currentStep?.nonTerminal === nt;
              const hasLeftRecursion = parsedGrammar.hasLeftRecursion.includes(nt);
              const addedFirst = currentStep?.nonTerminal === nt && currentStep?.type === 'first'
                ? currentStep.addedSymbols
                : [];
              const addedFollow = currentStep?.nonTerminal === nt && currentStep?.type === 'follow'
                ? currentStep.addedSymbols
                : [];

              return (
                <tr
                  key={nt}
                  className={`border-b border-slate-800 transition-colors ${
                    isHighlighted ? 'bg-slate-800/80' : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300 font-semibold">{nt}</span>
                      {hasLeftRecursion && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-amber-900/50 text-amber-400 border border-amber-600/50"
                          title="该非终结符存在左递归,可能影响LL(1)分析"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          左递归
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-slate-300">
                      {'{'}
                      {Array.from(firstSet).map((s, i) => (
                        <span
                          key={i}
                          className={addedFirst.includes(s) ? 'text-green-400 font-bold animate-pulse' : ''}
                        >
                          {s}
                          {i < firstSet.size - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {'}'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-slate-300">
                      {'{'}
                      {Array.from(followSet).map((s, i) => (
                        <span
                          key={i}
                          className={addedFollow.includes(s) ? 'text-green-400 font-bold animate-pulse' : ''}
                        >
                          {s}
                          {i < followSet.size - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {'}'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {parsedGrammar.nonTerminals.length === 0 && (
          <div className="text-center text-slate-500 py-8">请先输入文法规则</div>
        )}
      </div>
    </div>
  );
}
