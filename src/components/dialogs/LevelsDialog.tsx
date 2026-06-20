import { useState } from 'react';
import { X, CheckCircle, Circle, Play, Lightbulb, Target } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { useExecutionStore } from '../../stores/executionStore';
import { levels, getLevelById } from '../../levels/levelData';
import { executeDFA, executeNFA, checkAccept } from '../../engine/execution';

export function LevelsDialog() {
  const showLevelsDialog = useUIStore((s) => s.showLevelsDialog);
  const setShowLevelsDialog = useUIStore((s) => s.setShowLevelsDialog);
  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const stopExecution = useExecutionStore((s) => s.stopExecution);

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [testResults, setTestResults] = useState<boolean[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  const level = selectedLevel ? getLevelById(selectedLevel) : null;

  const handleStartLevel = (levelId: number) => {
    setSelectedLevel(levelId);
    setShowHint(false);
    setTestResults(null);
    setShowResults(false);
    stopExecution();
    const lvl = getLevelById(levelId);
    if (lvl?.starterAutomaton) {
      setAutomaton(lvl.starterAutomaton);
    } else {
      setAutomaton({ states: [], transitions: [], alphabet: [], type: 'DFA' });
    }
  };

  const handleRunTests = () => {
    if (!level?.testCases) return;

    const results: boolean[] = [];
    for (const tc of level.testCases) {
      const steps =
        automaton.type === 'DFA'
          ? executeDFA(automaton, tc.input)
          : executeNFA(automaton, tc.input);
      const accept = checkAccept(automaton, steps);
      results.push(accept === tc.accept);
    }

    setTestResults(results);
    setShowResults(true);
  };

  const passedCount = testResults ? testResults.filter(Boolean).length : 0;
  const totalCount = level?.testCases?.length || 0;
  const allPassed = testResults && testResults.length > 0 && testResults.every(Boolean);

  if (!showLevelsDialog) return null;

  return (
    <Dialog title="教学关卡" onClose={() => setShowLevelsDialog(false)}>
      <div className="space-y-4">
        {!selectedLevel ? (
          <div className="grid grid-cols-2 gap-3">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                className="p-3 text-left bg-slate-900 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-cyan-500 transition-colors"
                onClick={() => handleStartLevel(lvl.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 flex items-center justify-center bg-cyan-600 rounded-full text-xs font-bold">
                    {lvl.id}
                  </span>
                  <span className="text-sm font-medium text-slate-200">{lvl.title}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{lvl.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              className="text-sm text-cyan-400 hover:text-cyan-300"
              onClick={() => setSelectedLevel(null)}
            >
              ← 返回关卡列表
            </button>

            <div>
              <h3 className="text-lg font-semibold text-slate-200">
                第{level?.id}关: {level?.title}
              </h3>
              <p className="text-sm text-slate-400 mt-1">{level?.description}</p>
            </div>

            {level?.targetLanguage && (
              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">目标语言</span>
                </div>
                <p className="text-sm text-slate-300">{level.targetLanguage}</p>
              </div>
            )}

            {level?.hints && level.hints.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm"
                  onClick={() => setShowHint(!showHint)}
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? '隐藏提示' : '显示提示'}
                </button>
                {showHint && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-400 list-disc list-inside">
                    {level.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {level?.type === 'construct' && level?.testCases && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    测试用例: {totalCount}个
                  </span>
                  {showResults && (
                    <span
                      className={`text-sm font-medium ${
                        allPassed ? 'text-green-400' : 'text-amber-400'
                      }`}
                    >
                      {passedCount}/{totalCount} 通过
                    </span>
                  )}
                </div>

                <button
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded font-medium flex items-center justify-center gap-2"
                  onClick={handleRunTests}
                >
                  <Play className="w-4 h-4" />
                  运行测试
                </button>

                {showResults && testResults && level.testCases && (
                  <div className="max-h-48 overflow-auto space-y-1">
                    {level.testCases.map((tc, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                          testResults[i]
                            ? 'bg-green-900/30'
                            : 'bg-red-900/30'
                        }`}
                      >
                        <span className="font-mono">
                          {tc.input || 'ε'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            期望: {tc.accept ? '接受' : '拒绝'}
                          </span>
                          {testResults[i] ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {allPassed && (
                  <div className="text-center py-3 bg-green-900/30 border border-green-600 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 font-medium">恭喜通关！</p>
                  </div>
                )}
              </div>
            )}

            {level?.type === 'quiz' && (
              <div className="text-center py-8 text-slate-500">
                <p>问答题型正在开发中...</p>
              </div>
            )}

            {level?.type === 'demo' && (
              <div className="text-center py-8 text-slate-500">
                <p>演示关卡请在转换模式中体验</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">{title}</h3>
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
