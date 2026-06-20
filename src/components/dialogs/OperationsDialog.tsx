import { useState } from 'react';
import { X, Merge, Link2, Asterisk, Play } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { unionAutomata, concatAutomata, kleeneStar } from '../../engine/operations';

export function OperationsDialog() {
  const showOperationsDialog = useUIStore((s) => s.showOperationsDialog);
  const setShowOperationsDialog = useUIStore((s) => s.setShowOperationsDialog);
  const savedAutomatons = useAutomatonStore((s) => s.savedAutomatons);
  const setAutomaton = useAutomatonStore((s) => s.setAutomaton);
  const automaton = useAutomatonStore((s) => s.automaton);

  const [operation, setOperation] = useState<'union' | 'concat' | 'star'>('union');
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');

  const handleExecute = () => {
    const a = savedAutomatons.find((s) => s.id === selectedA);
    const b = savedAutomatons.find((s) => s.id === selectedB);

    if (operation === 'star') {
      if (!a) return;
      const result = kleeneStar(a.automaton);
      setAutomaton(result);
    } else {
      if (!a || !b) return;
      if (operation === 'union') {
        const result = unionAutomata(a.automaton, b.automaton);
        setAutomaton(result);
      } else if (operation === 'concat') {
        const result = concatAutomata(a.automaton, b.automaton);
        setAutomaton(result);
      }
    }

    setShowOperationsDialog(false);
  };

  if (!showOperationsDialog) return null;

  const canExecute = operation === 'star' ? !!selectedA : !!(selectedA && selectedB);

  return (
    <Dialog title="语言运算" onClose={() => setShowOperationsDialog(false)}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <OpButton
            active={operation === 'union'}
            onClick={() => setOperation('union')}
            icon={<Merge className="w-5 h-5" />}
            label="并集"
            description="A ∪ B"
          />
          <OpButton
            active={operation === 'concat'}
            onClick={() => setOperation('concat')}
            icon={<Link2 className="w-5 h-5" />}
            label="连接"
            description="A · B"
          />
          <OpButton
            active={operation === 'star'}
            onClick={() => setOperation('star')}
            icon={<Asterisk className="w-5 h-5" />}
            label="闭包"
            description="A*"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">自动机 A</label>
          <select
            value={selectedA}
            onChange={(e) => setSelectedA(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">选择自动机...</option>
            <option value="__current__">当前画布</option>
            {savedAutomatons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {operation !== 'star' && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">自动机 B</label>
            <select
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">选择自动机...</option>
              <option value="__current__">当前画布</option>
              {savedAutomatons.map((s) => (
                <option key={s.id} value={s.id}>
                {s.name}
              </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400">
          {operation === 'union' && (
            <p>并集运算：新建起始状态，用ε分别连到A和B的起始状态；新建接受状态，A和B的接受状态用ε连到它。</p>
          )}
          {operation === 'concat' && (
            <p>连接运算：A的每个接受状态用ε连到B的起始状态。A的起始状态仍是起始，B的接受状态仍是接受。</p>
          )}
          {operation === 'star' && (
            <p>Kleene闭包：新建起始和接受状态，起始用ε连到原起始和新接受；原接受用ε连回原起始和新接受。</p>
          )}
        </div>

        {savedAutomatons.length === 0 && (
          <p className="text-sm text-amber-400 text-center">
            提示：先保存一些自动机再进行运算
          </p>
        )}

        <button
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExecute}
          disabled={!canExecute}
        >
          <Play className="w-4 h-4" />
          执行运算
        </button>
      </div>
    </Dialog>
  );
}

function OpButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      className={`flex-1 py-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
        active
          ? 'border-teal-500 bg-teal-900/20 text-teal-400'
          : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-70 font-mono">{description}</span>
    </button>
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
