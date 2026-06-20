import { useState } from 'react';
import { X, Download, Upload, FileJson, FileCode } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import type { Automaton } from '../../engine/types';

export function ImportExportDialog() {
  const showExportDialog = useUIStore((s) => s.showExportDialog);
  const showImportDialog = useUIStore((s) => s.showImportDialog);
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog);
  const setShowImportDialog = useUIStore((s) => s.setShowImportDialog);

  const automaton = useAutomatonStore((s) => s.automaton);
  const loadFromJSON = useAutomatonStore((s) => s.loadFromJSON);

  const [exportFormat, setExportFormat] = useState<'json' | 'tikz'>('json');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialogState] = useState(false);
  const [saveName, setSaveName] = useState('');

  const isOpen = showExportDialog || showImportDialog || showSaveDialog;
  const mode = showSaveDialog ? 'save' : showExportDialog ? 'export' : 'import';

  const handleClose = () => {
    setShowExportDialog(false);
    setShowImportDialog(false);
    setShowSaveDialogState(false);
    setImportError(null);
    setImportText('');
    setSaveName('');
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(automaton, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automaton.json';
    a.click();
    URL.revokeObjectURL(url);
    handleClose();
  };

  const handleExportTikZ = () => {
    const tikz = generateTikZ(automaton);
    const blob = new Blob([tikz], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automaton.tikz.tex';
    a.click();
    URL.revokeObjectURL(url);
    handleClose();
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText) as Automaton;
      if (!data.states || !data.transitions) {
        throw new Error('无效的自动机数据');
      }
      loadFromJSON(data);
      handleClose();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '解析失败');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const savedAutomatons = useAutomatonStore((s) => s.savedAutomatons);
  const saveAutomaton = useAutomatonStore((s) => s.saveAutomaton);
  const loadAutomaton = useAutomatonStore((s) => s.loadAutomaton);
  const deleteSavedAutomaton = useAutomatonStore((s) => s.deleteSavedAutomaton);
  const setShowSaveDialogStore = useUIStore((s) => s.setShowSaveDialog);
  const showSaveDialogStore = useUIStore((s) => s.showSaveDialog);

  if (showSaveDialogStore) {
    return (
      <Dialog title="保存自动机" onClose={() => setShowSaveDialogStore(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">名称</label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="输入自动机名称..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">已保存 ({savedAutomatons.length}/5)</p>
            <div className="space-y-1 max-h-40 overflow-auto">
              {savedAutomatons.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between p-2 bg-slate-900 rounded"
                >
                  <span className="text-sm truncate">{saved.name}</span>
                  <div className="flex gap-1">
                    <button
                      className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 rounded"
                      onClick={() => {
                        loadAutomaton(saved.id);
                        setShowSaveDialogStore(false);
                      }}
                    >
                      加载
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                      onClick={() => deleteSavedAutomaton(saved.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {savedAutomatons.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">暂无保存</p>
              )}
            </div>
          </div>
          <button
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!saveName.trim() || savedAutomatons.length >= 5}
            onClick={() => {
              if (saveName.trim()) {
                saveAutomaton(saveName.trim());
                setSaveName('');
              }
            }}
          >
            保存当前自动机
          </button>
        </div>
      </Dialog>
    );
  }

  if (showExportDialog) {
    return (
      <Dialog title="导出自动机" onClose={handleClose}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              className={`flex-1 py-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                exportFormat === 'json'
                  ? 'border-cyan-500 bg-cyan-900/20'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => setExportFormat('json')}
            >
              <FileJson className="w-6 h-6 text-cyan-400" />
              <span className="text-sm font-medium">JSON</span>
            </button>
            <button
              className={`flex-1 py-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                exportFormat === 'tikz'
                  ? 'border-cyan-500 bg-cyan-900/20'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => setExportFormat('tikz')}
            >
              <FileCode className="w-6 h-6 text-purple-400" />
              <span className="text-sm font-medium">LaTeX TikZ</span>
            </button>
          </div>

          {exportFormat === 'json' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">JSON 数据预览</p>
              <pre className="p-3 bg-slate-900 rounded text-xs overflow-auto max-h-60 font-mono text-slate-300">
                {JSON.stringify(automaton, null, 2)}
              </pre>
            </div>
          )}

          {exportFormat === 'tikz' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">TikZ 代码预览</p>
              <pre className="p-3 bg-slate-900 rounded text-xs overflow-auto max-h-60 font-mono text-slate-300">
                {generateTikZ(automaton)}
              </pre>
            </div>
          )}

          <button
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded font-medium flex items-center justify-center gap-2"
            onClick={exportFormat === 'json' ? handleExportJSON : handleExportTikZ}
          >
            <Download className="w-4 h-4" />
            下载文件
          </button>
        </div>
      </Dialog>
    );
  }

  if (showImportDialog) {
    return (
      <Dialog title="导入自动机" onClose={handleClose}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">从文件导入</label>
            <label className="block w-full py-3 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg text-center cursor-pointer transition-colors">
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <span className="text-sm text-slate-400">点击选择 JSON 文件</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileImport}
              />
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-slate-800 text-xs text-slate-500">或粘贴JSON</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">JSON 数据</label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"states": [...], "transitions": [...]}'
              rows={6}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {importError && (
            <p className="text-sm text-red-400">{importError}</p>
          )}

          <button
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!importText.trim()}
            onClick={handleImport}
          >
            导入
          </button>
        </div>
      </Dialog>
    );
  }

  return null;
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

function generateTikZ(automaton: Automaton): string {
  const lines: string[] = [];
  lines.push('\\documentclass{article}');
  lines.push('\\usepackage{tikz}');
  lines.push('\\usetikzlibrary{automata,positioning}');
  lines.push('');
  lines.push('\\begin{document}');
  lines.push('');
  lines.push('\\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]');
  lines.push('');

  for (let i = 0; i < automaton.states.length; i++) {
    const s = automaton.states[i];
    const opts: string[] = ['state'];
    if (s.isAccept) opts.push('accepting');
    if (s.isStart) opts.push('initial');

    let pos = '';
    if (i > 0) {
      pos = `[right of=${automaton.states[i - 1].label}]`;
    }

    lines.push(`  \\node[${opts.join(',')}] ${pos} (${s.label}) {$q_{${s.label.slice(1)}}$};`);
  }

  lines.push('');

  for (const t of automaton.transitions) {
    const fromState = automaton.states.find((s) => s.id === t.from);
    const toState = automaton.states.find((s) => s.id === t.to);
    if (!fromState || !toState) continue;

    const label = t.symbols.map((s) => (s === 'ε' ? '$\\varepsilon$' : `$${s}$`)).join(', ');

    if (t.from === t.to) {
      lines.push(`  \\path[->] (${fromState.label}) edge [loop above] node {${label}} (${fromState.label});`);
    } else {
      lines.push(`  \\path[->] (${fromState.label}) edge node {${label}} (${toState.label});`);
    }
  }

  lines.push('');
  lines.push('\\end{tikzpicture}');
  lines.push('');
  lines.push('\\end{document}');

  return lines.join('\n');
}
