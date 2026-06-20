import { ChevronLeft, ChevronRight, Table, GitBranch, Info } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { TransitionTable } from './TransitionTable';
import { ExecutionTree } from './ExecutionTree';
import { useEditorStore } from '../../stores/editorStore';

export function RightPanel() {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const rightPanelTab = useUIStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  const editorMode = useEditorStore((s) => s.editorMode);

  const tabs = [
    { id: 'transitionTable' as const, label: '转换表', icon: Table },
    { id: 'executionTree' as const, label: '执行树', icon: GitBranch },
    { id: 'info' as const, label: '信息', icon: Info },
  ];

  return (
    <>
      {!rightPanelOpen && (
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-slate-800 hover:bg-slate-700 p-1.5 rounded-l-lg border border-r-0 border-slate-600 transition-colors"
          onClick={toggleRightPanel}
          title="展开面板"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
      )}

      <div
        className={`bg-slate-800 border-l border-slate-700 flex flex-col transition-all duration-300 ${
          rightPanelOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`p-2 rounded transition-colors ${
                  rightPanelTab === tab.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setRightPanelTab(tab.id)}
                title={tab.label}
              >
                <tab.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            onClick={toggleRightPanel}
            title="收起面板"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {rightPanelTab === 'transitionTable' && <TransitionTable />}
          {rightPanelTab === 'executionTree' && <ExecutionTree />}
          {rightPanelTab === 'info' && <InfoPanel />}
        </div>
      </div>
    </>
  );
}

function InfoPanel() {
  return (
    <div className="h-full flex flex-col p-4 text-sm text-slate-300 overflow-auto">
      <h3 className="font-semibold text-lg text-slate-200 mb-3">使用说明</h3>

      <div className="space-y-4">
        <section>
          <h4 className="font-medium text-cyan-400 mb-1">编辑模式</h4>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• 双击画布添加状态</li>
            <li>• 拖拽状态移动位置</li>
            <li>• 从状态边缘拖拽到另一状态创建转移边</li>
            <li>• 右键打开上下文菜单</li>
            <li>• 滚轮缩放，空白拖拽平移</li>
          </ul>
        </section>

        <section>
          <h4 className="font-medium text-cyan-400 mb-1">转移符号</h4>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• 单个字符如 <code className="text-purple-400">a</code></li>
            <li>• 多个符号用逗号分隔：<code className="text-purple-400">a,b,c</code></li>
            <li>• NFA支持空串转移：输入 <code className="text-purple-400">e</code> 表示ε</li>
          </ul>
        </section>

        <section>
          <h4 className="font-medium text-cyan-400 mb-1">测试模式</h4>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• 输入字符串后点击播放</li>
            <li>• 支持单步和连续模式</li>
            <li>• 点击执行树步骤可跳转</li>
            <li>• DFA/NFA 模式可切换</li>
          </ul>
        </section>

        <section>
          <h4 className="font-medium text-cyan-400 mb-1">转换模式</h4>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• 子集构造：NFA → DFA</li>
            <li>• DFA最小化：Hopcroft算法</li>
            <li>• 正则→NFA：Thompson构造</li>
            <li>• 语言运算：并/连接/闭包</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
