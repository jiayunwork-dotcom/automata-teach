import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Download,
  Upload,
  Save,
  Layers,
  Zap,
  Minimize2,
  BookOpen,
  MousePointer2,
  CirclePlus,
  ArrowRightLeft,
  Trash2,
  Gauge,
  ListChecks,
  GitBranch,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { executeDFA, executeNFA, checkAccept } from '../../engine/execution';
import type { PlaybackSpeed, EditorMode } from '../../engine/types';

export function TopToolbar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);

  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const inputString = useExecutionStore((s) => s.inputString);
  const setInputString = useExecutionStore((s) => s.setInputString);
  const speed = useExecutionStore((s) => s.speed);
  const setSpeed = useExecutionStore((s) => s.setSpeed);
  const mode = useExecutionStore((s) => s.mode);
  const setMode = useExecutionStore((s) => s.setMode);
  const isPlaying = useExecutionStore((s) => s.isPlaying);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);
  const resumeExecution = useExecutionStore((s) => s.resumeExecution);
  const stopExecution = useExecutionStore((s) => s.stopExecution);
  const nextStep = useExecutionStore((s) => s.nextStep);
  const prevStep = useExecutionStore((s) => s.prevStep);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const steps = useExecutionStore((s) => s.steps);
  const setFinished = useExecutionStore((s) => s.setFinished);
  const result = useExecutionStore((s) => s.result);

  const automaton = useAutomatonStore((s) => s.automaton);
  const clearAutomaton = useAutomatonStore((s) => s.clearAutomaton);

  const setShowSaveDialog = useUIStore((s) => s.setShowSaveDialog);
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog);
  const setShowImportDialog = useUIStore((s) => s.setShowImportDialog);
  const setShowRegexDialog = useUIStore((s) => s.setShowRegexDialog);
  const setShowLevelsDialog = useUIStore((s) => s.setShowLevelsDialog);
  const setShowOperationsDialog = useUIStore((s) => s.setShowOperationsDialog);
  const setShowBatchTestDialog = useUIStore((s) => s.setShowBatchTestDialog);
  const grammarPanelOpen = useUIStore((s) => s.grammarPanelOpen);
  const setGrammarPanelOpen = useUIStore((s) => s.setGrammarPanelOpen);
  const setSubsetConstructionActive = useUIStore(
    (s) => s.setSubsetConstructionActive
  );
  const setMinimizationActive = useUIStore(
    (s) => s.setMinimizationActive
  );

  const handlePlay = () => {
    if (steps.length === 0) {
      const execSteps =
        mode === 'DFA'
          ? executeDFA(automaton, inputString)
          : executeNFA(automaton, inputString);
      startExecution(execSteps);
    } else if (isPlaying) {
      pauseExecution();
    } else {
      resumeExecution();
    }
  };

  const handleStop = () => {
    stopExecution();
  };

  const handleStepForward = () => {
    if (steps.length === 0) {
      const execSteps =
        mode === 'DFA'
          ? executeDFA(automaton, inputString)
          : executeNFA(automaton, inputString);
      startExecution(execSteps);
    } else {
      nextStep();
      if (currentStepIndex + 1 >= steps.length - 1) {
        const accept = checkAccept(automaton, steps);
        setFinished(accept ? 'accept' : 'reject');
      }
    }
  };

  const handleStepBack = () => {
    prevStep();
  };

  const handleReset = () => {
    stopExecution();
  };

  const speeds: PlaybackSpeed[] = [0.5, 1, 2, 3];
  const modes: Array<{ value: EditorMode; label: string }> = [
    { value: 'edit', label: '编辑' },
    { value: 'test', label: '测试' },
    { value: 'convert', label: '转换' },
  ];

  const toggleGrammarPanel = () => {
    setGrammarPanelOpen(!grammarPanelOpen);
  };

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4 text-slate-200">
      <div className="flex items-center gap-2">
        <Layers className="w-6 h-6 text-cyan-400" />
        <span className="font-bold text-lg text-cyan-400">自动机教学</span>
      </div>

      <div className="h-8 w-px bg-slate-600" />

      <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
        {modes.map((m) => (
          <button
            key={m.value}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editorMode === m.value
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setEditorMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {editorMode === 'edit' && (
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
          <ToolButton
            active={activeTool === 'select'}
            onClick={() => setActiveTool('select')}
            icon={<MousePointer2 className="w-4 h-4" />}
            label="选择"
          />
          <ToolButton
            active={activeTool === 'addState'}
            onClick={() => setActiveTool('addState')}
            icon={<CirclePlus className="w-4 h-4" />}
            label="添加状态"
          />
          <ToolButton
            active={activeTool === 'addTransition'}
            onClick={() => setActiveTool('addTransition')}
            icon={<ArrowRightLeft className="w-4 h-4" />}
            label="添加转移"
          />
          <ToolButton
            active={activeTool === 'delete'}
            onClick={() => setActiveTool('delete')}
            icon={<Trash2 className="w-4 h-4" />}
            label="删除"
          />
        </div>
      )}

      {editorMode === 'test' && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputString}
              onChange={(e) => setInputString(e.target.value)}
              placeholder="输入测试字符串..."
              className="w-48 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500 font-mono"
            />
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
              <button
                className={`px-2 py-1 rounded text-xs ${
                  mode === 'DFA'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setMode('DFA')}
              >
                DFA
              </button>
              <button
                className={`px-2 py-1 rounded text-xs ${
                  mode === 'NFA'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setMode('NFA')}
              >
                NFA
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <IconButton onClick={handleReset} title="重置">
              <SkipBack className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={handleStepBack} title="上一步">
              <StepBack className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={handlePlay} title={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </IconButton>
            <IconButton onClick={handleStepForward} title="下一步">
              <StepForward className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={handleStop} title="停止">
              <SkipForward className="w-4 h-4" />
            </IconButton>
          </div>

          <div className="flex items-center gap-1">
            <Gauge className="w-4 h-4 text-slate-400" />
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value) as PlaybackSpeed)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none"
            >
              {speeds.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </div>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded text-sm font-medium transition-colors"
            onClick={() => setShowBatchTestDialog(true)}
          >
            <ListChecks className="w-4 h-4" />
            批量测试
          </button>

          {result && (
            <div
              className={`px-3 py-1.5 rounded font-bold text-sm ${
                result === 'accept'
                  ? 'bg-green-900/50 text-green-400 border border-green-600'
                  : 'bg-red-900/50 text-red-400 border border-red-600'
              }`}
            >
              {result === 'accept' ? '✓ 接受' : '✗ 拒绝'}
            </div>
          )}
        </>
      )}

      {editorMode === 'convert' && (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors"
            onClick={() => setSubsetConstructionActive(true)}
          >
            <Zap className="w-4 h-4" />
            子集构造
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium transition-colors"
            onClick={() => setMinimizationActive(true)}
          >
            <Minimize2 className="w-4 h-4" />
            DFA最小化
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 rounded text-sm font-medium transition-colors"
            onClick={() => setShowRegexDialog(true)}
          >
            <ArrowRightLeft className="w-4 h-4" />
            正则→NFA
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm font-medium transition-colors"
            onClick={() => setShowOperationsDialog(true)}
          >
            <Layers className="w-4 h-4" />
            语言运算
          </button>
        </div>
      )}

      <div className="flex-1" />

      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
          grammarPanelOpen
            ? 'bg-violet-600 hover:bg-violet-700'
            : 'hover:bg-slate-700'
        }`}
        onClick={toggleGrammarPanel}
        title="语法分析可视化"
      >
        <GitBranch className="w-4 h-4" />
        语法分析
      </button>

      <button
        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded text-sm transition-colors"
        onClick={() => setShowLevelsDialog(true)}
      >
        <BookOpen className="w-4 h-4" />
        关卡
      </button>

      <div className="h-6 w-px bg-slate-600" />

      <IconButton onClick={() => setShowSaveDialog(true)} title="保存">
        <Save className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={() => setShowImportDialog(true)} title="导入">
        <Upload className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={() => setShowExportDialog(true)} title="导出">
        <Download className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={() => clearAutomaton()} title="清空">
        <Trash2 className="w-4 h-4" />
      </IconButton>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors ${
        active
          ? 'bg-cyan-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="p-2 hover:bg-slate-700 rounded transition-colors"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
