import { useState, useMemo } from 'react';
import { AlertTriangle, ArrowRightLeft, Trash2, GitMerge } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { automatonToRegularGrammar, regularGrammarToAutomaton, hasDirectLeftRecursion, eliminateLeftRecursion, hasLeftCommonFactor, extractLeftCommonFactor } from '../../engine/grammar/conversion';
import { parseGrammar } from '../../engine/grammar/parser';

export function GrammarEditor() {
  const grammarText = useGrammarStore((s) => s.grammarText);
  const setGrammarText = useGrammarStore((s) => s.setGrammarText);
  const startSymbol = useGrammarStore((s) => s.startSymbol);
  const setStartSymbol = useGrammarStore((s) => s.setStartSymbol);
  const parsedGrammar = useGrammarStore((s) => s.parsedGrammar);
  const isRegular = useGrammarStore((s) => s.isRegular);

  const automaton = useAutomatonStore((s) => s.automaton);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);

  const showToast = useUIStore((s) => s.showToast);

  const [focusedLine, setFocusedLine] = useState<number | null>(null);

  const hasLeftRecursion = useMemo(() => hasDirectLeftRecursion(parsedGrammar), [parsedGrammar]);
  const hasCommonFactor = useMemo(() => hasLeftCommonFactor(parsedGrammar), [parsedGrammar]);

  const handleEliminateLeftRecursion = () => {
    if (!hasLeftRecursion) {
      return;
    }
    const newGrammarText = eliminateLeftRecursion(parsedGrammar);
    setGrammarText(newGrammarText);
    const parsed = parseGrammar(newGrammarText);
    setStartSymbol(parsed.startSymbol);
    showToast('已消除左递归', 'success');
  };

  const handleExtractLeftFactor = () => {
    if (!hasCommonFactor) {
      return;
    }
    const newGrammarText = extractLeftCommonFactor(parsedGrammar);
    setGrammarText(newGrammarText);
    const parsed = parseGrammar(newGrammarText);
    setStartSymbol(parsed.startSymbol);
    showToast('已提取左公因子', 'success');
  };

  const lines = useMemo(() => grammarText.split('\n'), [grammarText]);

  const lineErrors = useMemo(() => {
    const map = new Map<number, string>();
    for (const err of parsedGrammar.errors) {
      map.set(err.line, err.message);
    }
    return map;
  }, [parsedGrammar.errors]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGrammarText(e.target.value);
  };

  const handleLineClick = (lineNum: number) => {
    setFocusedLine(lineNum === focusedLine ? null : lineNum);
  };

  const handleAutomatonToGrammar = () => {
    const grammarStr = automatonToRegularGrammar(automaton);
    setGrammarText(grammarStr);
    const parsed = parseGrammar(grammarStr);
    setStartSymbol(parsed.startSymbol);
  };

  const handleGrammarToAutomaton = () => {
    if (!isRegular) {
      alert('当前文法不是正则文法(右线性文法),无法转换为NFA');
      return;
    }
    const auto = regularGrammarToAutomaton(parsedGrammar);
    setAutomaton(auto);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 border-r border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200">文法编辑器</h3>
          <div className="flex gap-1">
            <button
              onClick={handleAutomatonToGrammar}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
              title="从主画布自动机生成正则文法"
            >
              <ArrowRightLeft className="w-3 h-3" />
              自动机→文法
            </button>
            <button
              onClick={handleGrammarToAutomaton}
              disabled={!isRegular}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isRegular
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
              title={isRegular ? '转换为NFA并在主画布展示' : '当前不是正则文法'}
            >
              <ArrowRightLeft className="w-3 h-3" />
              文法→NFA
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-3">
          <button
            onClick={handleEliminateLeftRecursion}
            disabled={!hasLeftRecursion || parsedGrammar.errors.length > 0}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors flex-1 ${
              hasLeftRecursion && parsedGrammar.errors.length === 0
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
            title={hasLeftRecursion && parsedGrammar.errors.length === 0 ? '消除直接左递归' : '当前文法无左递归'}
          >
            <Trash2 className="w-3 h-3" />
            消除左递归
          </button>
          <button
            onClick={handleExtractLeftFactor}
            disabled={!hasCommonFactor || parsedGrammar.errors.length > 0}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors flex-1 ${
              hasCommonFactor && parsedGrammar.errors.length === 0
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
            title={hasCommonFactor && parsedGrammar.errors.length === 0 ? '提取左公因子' : '当前文法无公共前缀'}
          >
            <GitMerge className="w-3 h-3" />
            提取左公因子
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">起始符号:</label>
          <select
            value={startSymbol || ''}
            onChange={(e) => setStartSymbol(e.target.value || null)}
            className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">-- 选择 --</option>
            {parsedGrammar.nonTerminals.map((nt) => (
              <option key={nt} value={nt}>
                {nt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-500">
            非终结符: <span className="text-cyan-400 font-mono">{parsedGrammar.nonTerminals.join(', ') || '无'}</span>
          </span>
          <span className="text-slate-500">
            终结符: <span className="text-amber-400 font-mono">{parsedGrammar.terminals.join(', ') || '无'}</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-10 flex-shrink-0 bg-slate-900/50 border-r border-slate-700 overflow-hidden">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const hasError = lineErrors.has(lineNum);
            return (
              <div
                key={idx}
                onClick={() => handleLineClick(lineNum)}
                className={`h-6 flex items-center justify-end pr-2 text-xs font-mono cursor-pointer select-none transition-colors ${
                  hasError
                    ? 'text-red-400 bg-red-900/20'
                    : focusedLine === lineNum
                    ? 'text-cyan-300 bg-slate-700/50'
                    : 'text-slate-500 hover:bg-slate-700/30'
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <div className="flex-1 relative overflow-auto">
          <div className="absolute inset-0 pointer-events-none">
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const error = lineErrors.get(lineNum);
              const hasLeftRecursion = parsedGrammar.productions.some(
                (p) =>
                  line.startsWith(p.left + '->') &&
                  parsedGrammar.hasLeftRecursion.includes(p.left)
              );
              return (
                <div
                  key={idx}
                  className={`h-6 flex items-center px-2 ${
                    error
                      ? 'bg-red-900/20 border-b border-red-800/30'
                      : hasLeftRecursion
                      ? 'bg-amber-900/10 border-b border-slate-700/30'
                      : 'border-b border-slate-700/30'
                  }`}
                >
                  <span className="text-transparent font-mono text-sm whitespace-pre">{line || ' '}</span>
                  {error && (
                    <span className="ml-2 text-xs text-red-400 whitespace-nowrap">
                      ⚠ {error}
                    </span>
                  )}
                  {hasLeftRecursion && !error && (
                    <span className="ml-2 text-xs text-amber-400 whitespace-nowrap flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      左递归
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <textarea
            value={grammarText}
            onChange={handleTextareaChange}
            className="absolute inset-0 w-full h-full bg-transparent text-slate-200 font-mono text-sm p-2 resize-none focus:outline-none leading-6 caret-cyan-400"
            spellCheck={false}
            placeholder="S->aSb|e
A->aA|b"
          />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
        {'格式: 非终结符->产生式1|产生式2|... 用 e 表示ε, 多字符终结符用引号(如\'id\'), 非终结符可带撇号(如E\')'}
      </div>
    </div>
  );
}
