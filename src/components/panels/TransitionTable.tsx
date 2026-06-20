import { useAutomatonStore } from '../../stores/automatonStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useEditorStore } from '../../stores/editorStore';
import { getStateById, deriveAlphabet, move, epsilonClosure, getStartStateId } from '../../engine/utils';

export function TransitionTable() {
  const automaton = useAutomatonStore((s) => s.automaton);
  const useCustomAlphabet = useAutomatonStore((s) => s.useCustomAlphabet);
  const customAlphabet = useAutomatonStore((s) => s.customAlphabet);

  const alphabet = useCustomAlphabet && customAlphabet ? customAlphabet : automaton.alphabet;
  const hasEpsilon = automaton.transitions.some((t) => t.symbols.includes('ε'));

  const symbols = hasEpsilon && automaton.type === 'NFA' ? [...alphabet, 'ε'] : alphabet;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="font-semibold text-slate-200">状态转换表</h3>
        <p className="text-xs text-slate-500 mt-1">
          类型: <span className="text-cyan-400">{automaton.type}</span>
          {' | '}
          状态: {automaton.states.length}
          {' | '}
          转移: {automaton.transitions.length}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {automaton.states.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p>暂无状态</p>
            <p className="text-xs mt-1">双击画布添加状态</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 px-2 border-b border-slate-700">状态</th>
                {symbols.map((sym) => (
                  <th
                    key={sym}
                    className="text-center py-2 px-2 border-b border-slate-700 font-mono"
                  >
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {automaton.states.map((state) => (
                <tr key={state.id} className="hover:bg-slate-800/50">
                  <td className="py-2 px-2 border-b border-slate-700/50">
                    <span className="font-mono">
                      {state.isStart && <span className="text-green-400">→</span>}
                      {state.label}
                      {state.isAccept && <span className="text-red-400">*</span>}
                    </span>
                  </td>
                  {symbols.map((sym) => {
                    const targets: string[] = [];
                    for (const t of automaton.transitions) {
                      if (t.from === state.id && t.symbols.includes(sym)) {
                        const toState = getStateById(automaton, t.to);
                        if (toState) {
                          targets.push(toState.label);
                        }
                      }
                    }
                    return (
                      <td
                        key={sym}
                        className="text-center py-2 px-2 border-b border-slate-700/50 font-mono text-slate-300"
                      >
                        {targets.length > 0
                          ? `{${targets.sort().join(',')}}`
                          : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {alphabet.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              字母表: <span className="font-mono text-slate-400">{`{${alphabet.join(', ')}}`}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
