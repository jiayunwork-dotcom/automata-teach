import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { useEditorStore } from '../../stores/editorStore';
import { buildSubsetConstructionSteps, buildDfaFromSteps, findUnreachableStates } from '../../engine/subsetConstruction';
import { buildMinimizationSteps } from '../../engine/minimization';
import type { SubsetConstructionStep, MinimizationStep } from '../../engine/types';
import { layoutSubsetDFA } from '../../utils/layout';

type ConversionType = 'subset' | 'minimize' | null;

export function ConversionPanel() {
  const subsetActive = useUIStore((s) => s.subsetConstructionActive);
  const minimizationActive = useUIStore((s) => s.minimizationActive);
  const setSubsetActive = useUIStore((s) => s.setSubsetConstructionActive);
  const setMinimizationActive = useUIStore((s) => s.setMinimizationActive);
  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const setHighlightedStates = useEditorStore((s) => s.setHighlightedStates);

  const [expanded, setExpanded] = useState(true);
  const [currentType, setCurrentType] = useState<ConversionType>(null);
  const [steps, setSteps] = useState<SubsetConstructionStep[] | MinimizationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [highlightStates, setHighlightStates] = useState<string[]>([]);

  const animationRef = useRef<number>();

  useEffect(() => {
    if (subsetActive) {
      initSubsetConstruction();
      setCurrentType('subset');
      setSubsetActive(false);
    }
  }, [subsetActive]);

  useEffect(() => {
    if (minimizationActive) {
      initMinimization();
      setCurrentType('minimize');
      setMinimizationActive(false);
    }
  }, [minimizationActive]);

  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length - 1) {
      return;
    }

    const stepDuration = 1500 / speed;
    let lastTime = performance.now();
    let progress = 0;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      progress += delta / stepDuration;

      if (progress >= 1) {
        progress = 0;
        if (currentStep < steps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          return;
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
  }, [isPlaying, currentStep, steps.length, speed]);

  useEffect(() => {
    if (steps.length === 0 || currentType === null) return;

    if (currentType === 'subset') {
      const step = steps[currentStep] as SubsetConstructionStep;
      setHighlightStates(step.currentSubset || []);
    } else if (currentType === 'minimize') {
      const step = steps[currentStep] as MinimizationStep;
      if (step.checkingPair) {
        setHighlightStates(step.checkingPair);
      } else if (step.partitions.length > 0) {
        setHighlightStates([]);
      }
    }
  }, [currentStep, currentType, steps]);

  useEffect(() => {
    const color = currentType === 'subset' ? '#06b6d4' : '#f97316';
    setHighlightedStates(highlightStates, color);
  }, [highlightStates, currentType, setHighlightedStates]);

  const initSubsetConstruction = () => {
    if (automaton.states.length === 0) {
      alert('请先创建一个自动机');
      return;
    }
    const newSteps = buildSubsetConstructionSteps(automaton);
    setSteps(newSteps);
    setCurrentStep(0);
    setIsPlaying(false);
    setExpanded(true);
  };

  const initMinimization = () => {
    if (automaton.states.length === 0) {
      alert('请先创建一个DFA');
      return;
    }
    if (automaton.type !== 'DFA') {
      alert('最小化只适用于DFA，请先转换为DFA');
      return;
    }
    const newSteps = buildMinimizationSteps(automaton);
    setSteps(newSteps);
    setCurrentStep(0);
    setIsPlaying(false);
    setExpanded(true);
  };

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleSkipToEnd = () => {
    setCurrentStep(steps.length - 1);
    setIsPlaying(false);
  };

  const handleApplyResult = () => {
    if (currentType === 'subset') {
      const lastStep = steps[steps.length - 1] as SubsetConstructionStep;
      if (lastStep.isComplete) {
        const dfa = buildDfaFromSteps(steps as SubsetConstructionStep[]);
        const laidOut = layoutSubsetDFA(dfa);
        setAutomaton(laidOut);
        handleClose();
      }
    } else if (currentType === 'minimize') {
      const lastStep = steps[steps.length - 1] as MinimizationStep;
      if (lastStep.isComplete && lastStep.minDfa) {
        setAutomaton(lastStep.minDfa);
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setCurrentType(null);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
    setHighlightStates([]);
    setHighlightedStates([]);
  };

  if (!currentType) return null;

  const currentStepData = steps[currentStep];
  const isComplete =
    'isComplete' in currentStepData ? currentStepData.isComplete : false;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[600px] max-w-[90vw]">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {currentType === 'subset' ? '子集构造法' : 'DFA最小化'}
            </span>
            <span className="text-xs text-slate-400">
              步骤 {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 hover:bg-slate-600 rounded transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              className="p-1.5 hover:bg-slate-600 rounded transition-colors"
              onClick={handleClose}
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4">
            <div className="mb-4 h-24 bg-slate-900/50 rounded-lg p-3 overflow-auto text-sm">
              <StepContent type={currentType} step={currentStepData} stepIndex={currentStep} />
            </div>

            <div className="mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-200"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                value={currentStep}
                onChange={(e) => {
                  setCurrentStep(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full mt-2 accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                onClick={handleReset}
                title="回到开始"
              >
                <SkipBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                onClick={handleStepBack}
                disabled={currentStep === 0}
                title="上一步"
              >
                <StepBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                className="p-3 bg-cyan-600 hover:bg-cyan-700 rounded-full transition-colors"
                onClick={handlePlayPause}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                onClick={handleStepForward}
                disabled={currentStep >= steps.length - 1}
                title="下一步"
              >
                <StepForward className="w-4 h-4 text-slate-300" />
              </button>
              <button
                className="p-2 hover:bg-slate-700 rounded transition-colors"
                onClick={handleSkipToEnd}
                title="跳到结尾"
              >
                <SkipForward className="w-4 h-4 text-slate-300" />
              </button>

              <div className="ml-4 flex items-center gap-2">
                <span className="text-xs text-slate-500">速度:</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>

            {isComplete && (
              <button
                className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors"
                onClick={handleApplyResult}
              >
                应用结果到画布
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepContent({
  type,
  step,
  stepIndex,
}: {
  type: ConversionType;
  step: SubsetConstructionStep | MinimizationStep;
  stepIndex: number;
}) {
  if (type === 'subset') {
    const s = step as SubsetConstructionStep;
    return (
      <div className="space-y-2">
        <p className="text-cyan-400 font-medium">
          步骤 {stepIndex + 1}: 处理状态子集 {'{'}
          {s.currentSubset.join(', ')} {'}'}
        </p>
        {s.epsilonClosure.length > 0 && (
          <p className="text-purple-400 text-xs">
            ε-闭包: {'{'}{s.epsilonClosure.join(', ')}{'}'}
          </p>
        )}
        <div className="space-y-1">
          {s.transitions.length > 0 ? (
            s.transitions.map((t, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span className="text-amber-400 font-mono">输入 {t.symbol}:</span>
                <span className="text-slate-300 font-mono">
                  {'{'}{t.targetSubset.join(', ') || '∅'}{'}'}
                </span>
                {t.isNew && (
                  <span className="text-green-400 text-xs bg-green-900/30 px-1.5 py-0.5 rounded">
                    新状态
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-xs">正在初始化...</p>
          )}
        </div>
        <p className="text-slate-500 text-xs">
          已发现 DFA 状态: {s.dfaStates.length} 个
        </p>
        {s.isComplete && (
          <p className="text-green-400 text-sm font-medium mt-2">✓ 构造完成！</p>
        )}
      </div>
    );
  }

  if (type === 'minimize') {
    const s = step as MinimizationStep;
    return (
      <div className="space-y-2">
        <p className="text-orange-400 font-medium">
          步骤 {stepIndex + 1}
          {s.currentSymbol && (
            <span className="text-slate-400 ml-2">
              检查符号: <span className="font-mono text-amber-400">{s.currentSymbol}</span>
            </span>
          )}
        </p>
        <div className="space-y-1">
          <p className="text-xs text-slate-400">等价类划分 ({s.partitions.length} 组):</p>
          <div className="flex flex-wrap gap-1.5">
            {s.partitions.map((group, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  i === s.currentGroupIndex
                    ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-500'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {'{'}{group.join(', ')}{'}'}
              </span>
            ))}
          </div>
        </div>
        {s.checkingPair && (
          <p className="text-xs text-amber-400">
            正在检查: {s.checkingPair[0]} ↔ {s.checkingPair[1]}
          </p>
        )}
        {s.isSplitting && s.splitResult && (
          <p className="text-xs text-red-400">
            → 分裂为 {s.splitResult.length} 组
          </p>
        )}
        {!s.isSplitting && s.currentSymbol && stepIndex > 0 && (
          <p className="text-xs text-green-400">该组在此符号下不可区分</p>
        )}
        {s.isComplete && (
          <p className="text-green-400 text-sm font-medium mt-2">✓ 最小化完成！</p>
        )}
      </div>
    );
  }

  return null;
}
