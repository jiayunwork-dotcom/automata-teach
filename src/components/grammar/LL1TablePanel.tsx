import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import { productionToString } from '../../engine/grammar/parser';
import type { LL1TableCell } from '../../engine/grammar/types';

export function LL1TablePanel() {
  const parsedGrammar = useGrammarStore((s) => s.parsedGrammar);
  const ll1Table = useGrammarStore((s) => s.ll1Table);
  const buildLL1Table = useGrammarStore((s) => s.buildLL1Table);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!ll1Table && parsedGrammar.productions.length > 0) {
      buildLL1Table();
    }
  }, [parsedGrammar]);

  const getCellKey = (nt: string, t: string) => `${nt}#${t}`;

  if (!ll1Table) {
    return (
      <div className="h-full flex flex-col bg-slate-900 items-center justify-center">
        <p className="text-slate-500 mb-4">请先输入文法规则</p>
        <button
          onClick={buildLL1Table}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          生成LL(1)分析表
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-200">LL(1) 预测分析表</h3>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              ll1Table.isLL1
                ? 'bg-green-900/50 text-green-400 border border-green-600'
                : 'bg-red-900/50 text-red-400 border border-red-600'
            }`}
          >
            {ll1Table.isLL1 ? '✓ 该文法是LL(1)文法' : '✗ 该文法不是LL(1)文法'}
          </span>
          <button
            onClick={buildLL1Table}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="重新生成"
          >
            <RefreshCw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="inline-block min-w-full relative">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-slate-800 border border-slate-700 px-3 py-2 text-slate-400 font-medium">
                  非终结符 \ 终结符
                </th>
                {ll1Table.terminals.map((t) => (
                  <th
                    key={t}
                    className="sticky top-0 z-10 bg-slate-800 border border-slate-700 px-3 py-2 text-amber-400 font-mono font-medium min-w-24"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ll1Table.nonTerminals.map((nt) => (
                <tr key={nt}>
                  <td className="sticky left-0 z-10 bg-slate-800 border border-slate-700 px-3 py-2 text-cyan-300 font-mono font-semibold">
                    {nt}
                  </td>
                  {ll1Table.terminals.map((t) => {
                    const cell: LL1TableCell | undefined = ll1Table.cells.get(getCellKey(nt, t));
                    const isHovered = hoveredCell === getCellKey(nt, t);
                    const hasContent = cell && cell.productions.length > 0;

                    return (
                      <td
                        key={t}
                        className={`border border-slate-700 px-2 py-2 min-w-24 relative cursor-pointer transition-colors ${
                          cell?.hasConflict
                            ? 'bg-red-900/30 hover:bg-red-900/50'
                            : hasContent
                            ? 'bg-slate-800/50 hover:bg-slate-700/50'
                            : 'bg-slate-900/50 hover:bg-slate-800/30'
                        }`}
                        onMouseEnter={(e) => {
                          setHoveredCell(getCellKey(nt, t));
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {cell?.hasConflict && (
                          <span className="absolute top-0.5 right-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          </span>
                        )}
                        {cell?.hasConflict ? (
                          <span className="text-red-400 font-mono text-xs font-semibold">
                            冲突
                          </span>
                        ) : hasContent ? (
                          <span className="text-slate-200 font-mono text-xs">
                            {cell!.productions.map((p) => productionToString(p)).join(', ')}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {hoveredCell && (() => {
            const [nt, t] = hoveredCell.split('#');
            const cell = ll1Table.cells.get(hoveredCell);
            if (!cell || cell.productions.length === 0) return null;

            return (
              <div
                className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl p-3 max-w-xs pointer-events-none"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y - 10,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="text-xs text-slate-400 mb-1">
                  M[<span className="text-cyan-400 font-mono">{nt}</span>,{' '}
                  <span className="text-amber-400 font-mono">{t}</span>]
                </div>
                {cell.hasConflict && (
                  <div className="text-xs text-red-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    存在冲突 - 多个产生式
                  </div>
                )}
                <div className="space-y-1">
                  {cell.productions.map((p, i) => (
                    <div key={i} className="text-sm font-mono text-slate-200">
                      {productionToString(p)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
