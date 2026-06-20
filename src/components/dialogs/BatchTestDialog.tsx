import { useState, useMemo } from 'react';
import { X, Play, Trash2, Download, ListChecks } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { useExecutionStore } from '../../stores/executionStore';
import { executeDFA, executeNFA, checkAccept } from '../../engine/execution';

interface BatchResult {
  input: string;
  result: 'accept' | 'reject';
  steps: number;
}

export function BatchTestDialog() {
  const show = useUIStore((s) => s.showBatchTestDialog);
  const setShow = useUIStore((s) => s.setShowBatchTestDialog);
  const automaton = useAutomatonStore((s) => s.automaton);
  const execMode = useExecutionStore((s) => s.mode);

  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const inputs = useMemo(() => {
    return inputText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [inputText]);

  const handleRun = () => {
    if (inputs.length === 0) return;
    setIsRunning(true);

    const newResults: BatchResult[] = [];

    for (const input of inputs) {
      const steps =
        execMode === 'DFA'
          ? executeDFA(automaton, input)
          : executeNFA(automaton, input);
      const accept = checkAccept(automaton, steps);
      newResults.push({
        input,
        result: accept ? 'accept' : 'reject',
        steps: Math.max(steps.length - 1, 0),
      });
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ['输入字符串', '结果', '步数'];
    const rows = results.map((r) => [
      r.input,
      r.result === 'accept' ? '接受' : '拒绝',
      String(r.steps),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const escaped = cell.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-test-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const accept = results.filter((r) => r.result === 'accept').length;
    const reject = results.length - accept;
    return { accept, reject, total: results.length };
  }, [results]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setShow(false)}
      />
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200">批量测试</h3>
            <span className="text-xs text-slate-500 ml-1">
              ({execMode}模式)
            </span>
          </div>
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            onClick={() => setShow(false)}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 overflow-auto space-y-4 flex-1">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              测试字符串 <span className="text-slate-600">(一行一个)</span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={'abba\naabb\naba\nbabba\n...'}
              rows={6}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs text-slate-500">
                共 {inputs.length} 条待测试
              </span>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors text-slate-300"
                  onClick={handleClear}
                  disabled={isRunning || (!inputText && results.length === 0)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleRun}
                  disabled={inputs.length === 0 || isRunning}
                >
                  <Play className="w-3.5 h-3.5" />
                  运行测试
                </button>
              </div>
            </div>
          </div>

          {stats && (
            <div className="flex gap-3 text-xs">
              <div className="flex-1 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700">
                <div className="text-slate-500">总计</div>
                <div className="text-lg font-bold text-slate-200 mt-0.5">
                  {stats.total}
                </div>
              </div>
              <div className="flex-1 bg-green-900/20 rounded-lg px-3 py-2 border border-green-800/50">
                <div className="text-green-500">接受</div>
                <div className="text-lg font-bold text-green-400 mt-0.5">
                  {stats.accept}
                  <span className="text-xs ml-1 font-normal text-green-600">
                    ({((stats.accept / stats.total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-red-900/20 rounded-lg px-3 py-2 border border-red-800/50">
                <div className="text-red-500">拒绝</div>
                <div className="text-lg font-bold text-red-400 mt-0.5">
                  {stats.reject}
                  <span className="text-xs ml-1 font-normal text-red-600">
                    ({((stats.reject / stats.total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">
                  测试结果
                </span>
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors text-slate-300"
                  onClick={handleExportCSV}
                >
                  <Download className="w-3.5 h-3.5" />
                  导出 CSV
                </button>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left px-3 py-2 font-medium w-12">
                        #
                      </th>
                      <th className="text-left px-3 py-2 font-medium">
                        输入字符串
                      </th>
                      <th className="text-left px-3 py-2 font-medium w-20">
                        结果
                      </th>
                      <th className="text-right px-3 py-2 font-medium w-16">
                        步数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 ${
                          r.result === 'accept'
                            ? 'bg-green-950/20'
                            : 'bg-red-950/10'
                        }`}
                      >
                        <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-200">
                          {r.input || (
                            <span className="text-purple-400 italic text-xs">
                              ε
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.result === 'accept' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/40 text-green-400 rounded text-xs font-medium border border-green-800/50">
                              ✓ 接受
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/40 text-red-400 rounded text-xs font-medium border border-red-800/50">
                              ✗ 拒绝
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400 text-xs">
                          {r.steps}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
