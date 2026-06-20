import { X, GitBranch, Table2, PlaySquare, Layers } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import { useUIStore } from '../../stores/uiStore';
import { GrammarEditor } from './GrammarEditor';
import { FirstFollowPanel } from './FirstFollowPanel';
import { LL1TablePanel } from './LL1TablePanel';
import { LL1AnalysisPanel } from './LL1AnalysisPanel';
import { PDAPanel } from './PDAPanel';
import type { GrammarTab } from '../../stores/grammarStore';

const TABS: { id: GrammarTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'firstFollow', label: 'First/Follow', icon: GitBranch },
  { id: 'll1Table', label: 'LL(1)表', icon: Table2 },
  { id: 'll1Analysis', label: 'LL(1)分析', icon: PlaySquare },
  { id: 'pda', label: '下推自动机', icon: Layers },
];

export function GrammarPanel() {
  const grammarPanelOpen = useUIStore((s) => s.grammarPanelOpen);
  const setGrammarPanelOpen = useUIStore((s) => s.setGrammarPanelOpen);
  const activeTab = useGrammarStore((s) => s.activeTab);
  const setActiveTab = useGrammarStore((s) => s.setActiveTab);

  if (!grammarPanelOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex bg-slate-900 flex-col">
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-slate-200">语法分析可视化</span>
        </div>
        <div className="h-6 w-px bg-slate-600 mx-2" />
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setGrammarPanelOpen(false)}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          title="关闭语法分析面板"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0">
          <GrammarEditor />
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'firstFollow' && <FirstFollowPanel />}
          {activeTab === 'll1Table' && <LL1TablePanel />}
          {activeTab === 'll1Analysis' && <LL1AnalysisPanel />}
          {activeTab === 'pda' && <PDAPanel />}
        </div>
      </div>
    </div>
  );
}
