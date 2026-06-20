import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward, PlayCircle } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import { productionToString } from '../../engine/grammar/parser';
import type { LL1AnalysisStep, GrammarSymbol } from '../../engine/grammar/types';
import { END_MARKER } from '../../engine/grammar/types';

export function LL1AnalysisPanel() {
  const parsedGrammar = useGrammarStore((s) => s.parsedGrammar);
  const ll1Input = useGrammarStore((s) => s.ll1Input);
  const setLL1Input = useGrammarStore((s) => s.setLL1Input);
  const ll1Steps = useGrammarStore((s) => s.ll1Steps);
  const ll1CurrentStep = useGrammarStore((s) => s.ll1CurrentStep);
  const ll1IsPlaying = useGrammarStore((s) => s.ll1IsPlaying);
  const ll1Speed = useGrammarStore((s) => s.ll1Speed);
  const runLL1Analysis = useGrammarStore((s) => s.runLL1Analysis);
  const setLL1Step = useGrammarStore((s) => s.setLL1Step);
  const setLL1Playing = useGrammarStore((s) => s.setLL1Playing);
  const setLL1Speed = useGrammarStore((s) => s.setLL1Speed);

  const animationRef = useRef<number>();

  useEffect(() => {
    if (!ll1IsPlaying || ll1CurrentStep >= ll1Steps.length - 1) {
      if (ll1CurrentStep >= ll1Steps.length - 1) {
        setLL1Playing(false);
      }
      return;
    }

    const stepDuration = 1200 / ll1Speed;
    let lastTime = performance.now();
    let progress = 0;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      progress += delta / stepDuration;

      if (progress >= 1) {
        progress = 0;
        if (ll1CurrentStep < ll1Steps.length - 1) {
          setLL1Step(ll1CurrentStep + 1);
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
  }, [ll1IsPlaying, ll1CurrentStep, ll1Steps.length, ll1Speed, setLL1Step, setLL1Playing]);

  const currentStep: LL1AnalysisStep | null = ll1Steps[ll1CurrentStep] || null;
  const appliedProductions = ll1Steps
    .slice(0, ll1CurrentStep + 1)
    .filter((s) => s.appliedProduction)
    .map((s) => s.appliedProduction!);

  const handlePlayPause = () => {
    if (ll1Steps.length === 0) {
      runLL1Analysis();
      return;
    }
    if (ll1CurrentStep >= ll1Steps.length - 1) {
      setLL1Step(0);
    }
    setLL1Playing(!ll1IsPlaying);
  };

  const renderSymbol = (sym: GrammarSymbol, isStackTop: boolean, isError: boolean) => (
    <span
      key={`${sym.value}-${isStackTop}`}
      className={`inline-flex items-center justify-center px-2 py-1 mx-0.5 rounded font-mono text-sm transition-all ${
        isStackTop
          ? isError
            ? 'bg-red-600 text-white ring-2 ring-red-400 scale-110'
            : 'bg-cyan-600 text-white ring-2 ring-cyan-400 scale-110'
          : sym.isTerminal
          ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
          : 'bg-slate-700 text-slate-200 border border-slate-600'
      }`}
    >
      {sym.value}
    </span>
  );

  const renderStack = (stack: GrammarSymbol[], isError: boolean) => {
    const reversed = [...stack].reverse();
    return (
      <div className="flex flex-col-reverse items-center gap-1 py-2">
        {reversed.map((sym, i) => (
          <div
            key={i}
            className={`w-16 h-8 flex items-center justify-center font-mono text-sm rounded border transition-all ${
              i === 0
                ? isError
                  ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-300'
                  : 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-300'
                : sym.isTerminal
                ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                : 'bg-slate-700 text-slate-200 border-slate-600'
            }`}
            style={{ zIndex: reversed.length - i }}
          >
            {sym.value}
          </div>
        ))}
        <div className="w-20 h-1 bg-slate-600 rounded" />
      </div>
    );
  };

  const isError = currentStep?.action === 'error';
  const isAccept = currentStep?.action === 'accept';

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-200">LL(1) 分析过程</h3>
          <div className="flex-1" />
          <input
            type="text"
            value={ll1Input}
            onChange={(e) => setLL1Input(e.target.value)}
            placeholder="输入待分析字符串..."
            className="w-40 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={runLL1Analysis}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            执行
          </button>
        </div>

        {ll1Steps.length > 0 && (
          <>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-200 ${
                  isError ? 'bg-red-500' : isAccept ? 'bg-green-500' : 'bg-cyan-500'
                }`}
                style={{
                  width: `${((ll1CurrentStep + 1) / ll1Steps.length) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>步骤 {ll1CurrentStep + 1} / {ll1Steps.length}</span>
              <span
                className={
                  isError
                    ? 'text-red-400 font-semibold'
                    : isAccept
                    ? 'text-green-400 font-semibold'
                    : ''
                }
              >
                {currentStep?.description}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={ll1Steps.length - 1}
              value={ll1CurrentStep}
              onChange={(e) => setLL1Step(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />

            <div className="flex items-center justify-center gap-1 mt-3">
              <button
                onClick={() => setLL1Step(0)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                title="回到开始"
              >
                <SkipBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => setLL1Step(Math.max(0, ll1CurrentStep - 1))}
                disabled={ll1CurrentStep === 0}
                className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
                title="上一步"
              >
                <StepBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={handlePlayPause}
                className={`p-3 rounded-full transition-colors ${
                  isError
                    ? 'bg-red-600 hover:bg-red-700'
                    : isAccept
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
                title={ll1IsPlaying ? '暂停' : '播放'}
              >
                {ll1IsPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={() => setLL1Step(Math.min(ll1Steps.length - 1, ll1CurrentStep + 1))}
                disabled={ll1CurrentStep >= ll1Steps.length - 1}
                className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
                title="下一步"
              >
                <StepForward className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => setLL1Step(ll1Steps.length - 1)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                title="跳到结尾"
              >
                <SkipForward className="w-4 h-4 text-slate-300" />
              </button>
              <div className="ml-4 flex items-center gap-2">
                <span className="text-xs text-slate-500">速度:</span>
                <select
                  value={ll1Speed}
                  onChange={(e) => setLL1Speed(parseFloat(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {ll1Steps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          输入字符串后点击"执行"开始分析
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col items-center p-4 border-r border-slate-700">
            <h4 className="text-sm font-medium text-slate-400 mb-2">分析栈 (栈顶在上)</h4>
            <div className="flex-1 flex items-end">
              {currentStep && renderStack(currentStep.stack, isError)}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center p-4 border-r border-slate-700">
            <h4 className="text-sm font-medium text-slate-400 mb-2">剩余输入串</h4>
            <div className="flex-1 flex items-center">
              {currentStep && (
                <div className="font-mono text-xl flex items-center">
                  {currentStep.remainingInput.split('').map((ch, i) => {
                    const isCurrent = i === 0 && ch !== END_MARKER;
                    const isEnd = ch === END_MARKER;
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-8 h-10 mx-0.5 rounded transition-all ${
                          isCurrent
                            ? isError
                              ? 'bg-red-600 text-white ring-2 ring-red-400 scale-110'
                              : currentStep.action === 'match'
                              ? 'bg-green-600 text-white ring-2 ring-green-400'
                              : 'bg-cyan-600 text-white ring-2 ring-cyan-400 scale-110'
                            : isEnd
                            ? 'bg-slate-700 text-slate-400 border border-slate-600 italic'
                            : 'bg-amber-900/40 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {currentStep?.matchedChar && currentStep.action === 'match' && (
              <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                ✓ 匹配成功: <span className="font-mono">{currentStep.matchedChar}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <h4 className="text-sm font-medium text-slate-400 mb-2">已应用的产生式</h4>
            <div className="flex-1 overflow-auto space-y-1">
              {appliedProductions.length === 0 && (
                <div className="text-slate-600 text-sm italic">暂无</div>
              )}
              {appliedProductions.map((p, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded text-sm font-mono transition-all ${
                    i === appliedProductions.length - 1
                      ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-600 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span className="text-slate-500 mr-2">{i + 1}.</span>
                  {productionToString(p)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
