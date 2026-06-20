import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { thompsonToAutomaton, buildThompsonSteps } from '../../engine/regexp';
import { layoutThompsonNFA } from '../../utils/layout';

export function RegexDialog() {
  const showRegexDialog = useUIStore((s) => s.showRegexDialog);
  const setShowRegexDialog = useUIStore((s) => s.setShowRegexDialog);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);

  const [regex, setRegex] = useState('(a|b)*abb');
  const [error, setError] = useState<string | null>(null);

  const handleConvert = () => {
    try {
      const auto = thompsonToAutomaton(regex.trim());
      if (auto) {
        const laidOut = layoutThompsonNFA(auto);
        setAutomaton(laidOut);
        setShowRegexDialog(false);
      } else {
        setError('转换失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败');
    }
  };

  if (!showRegexDialog) return null;

  return (
    <Dialog title="正则表达式 → NFA" onClose={() => setShowRegexDialog(false)}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">正则表达式</label>
          <input
            type="text"
            value={regex}
            onChange={(e) => {
              setRegex(e.target.value);
              setError(null);
            }}
            placeholder="例如: (a|b)*abb"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">支持的语法：</p>
          <p>• <code className="text-purple-400">a</code> - 单个字符</p>
          <p>• <code className="text-purple-400">ab</code> - 连接</p>
          <p>• <code className="text-purple-400">a|b</code> - 并运算</p>
          <p>• <code className="text-purple-400">a*</code> - Kleene星号</p>
          <p>• <code className="text-purple-400">(a|b)*</code> - 括号</p>
          <p>• <code className="text-purple-400">e</code> 或 ε - 空串</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded">{error}</p>
        )}

        <button
          className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          onClick={handleConvert}
          disabled={!regex.trim()}
        >
          <Sparkles className="w-4 h-4" />
          转换为 NFA (Thompson构造法)
        </button>
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
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">{title}</h3>
          <button
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
