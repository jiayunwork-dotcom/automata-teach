import { useEditorStore } from '../../stores/editorStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { useUIStore } from '../../stores/uiStore';

export function ContextMenu() {
  const contextMenu = useEditorStore((s) => s.contextMenu);
  const setContextMenu = useEditorStore((s) => s.setContextMenu);

  const setStartState = useAutomatonStore((s) => s.setStartState);
  const toggleAcceptState = useAutomatonStore((s) => s.toggleAcceptState);
  const removeState = useAutomatonStore((s) => s.removeState);
  const updateTransitionSymbols = useAutomatonStore(
    (s) => s.updateTransitionSymbols
  );
  const removeTransition = useAutomatonStore((s) => s.removeTransition);
  const addState = useAutomatonStore((s) => s.addState);

  const automaton = useAutomatonStore((s) => s.automaton);
  const screenToWorld = useEditorStore((s) => s.screenToWorld);

  if (!contextMenu) return null;

  const handleSetStart = () => {
    if (contextMenu.targetId) {
      setStartState(contextMenu.targetId);
    }
    setContextMenu(null);
  };

  const handleToggleAccept = () => {
    if (contextMenu.targetId) {
      toggleAcceptState(contextMenu.targetId);
    }
    setContextMenu(null);
  };

  const handleDeleteState = () => {
    if (contextMenu.targetId) {
      removeState(contextMenu.targetId);
    }
    setContextMenu(null);
  };

  const handleEditTransition = () => {
    if (contextMenu.targetId) {
      const trans = automaton.transitions.find(
        (t) => t.id === contextMenu.targetId
      );
      if (trans) {
        const current = trans.symbols
          .map((s) => (s === 'ε' ? 'e' : s))
          .join(',');
        const input = prompt('输入转移符号（逗号分隔，e表示epsilon）：', current);
        if (input !== null) {
          const symList = input
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((s) => (s === 'e' ? 'ε' : s));
          updateTransitionSymbols(contextMenu.targetId, symList);
        }
      }
    }
    setContextMenu(null);
  };

  const handleDeleteTransition = () => {
    if (contextMenu.targetId) {
      removeTransition(contextMenu.targetId);
    }
    setContextMenu(null);
  };

  const handleAddState = () => {
    if (contextMenu.type === 'canvas') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const world = screenToWorld(
          contextMenu.x - rect.left,
          contextMenu.y - rect.top,
          rect.width,
          rect.height
        );
        addState(world.x, world.y);
      }
    }
    setContextMenu(null);
  };

  const handleClose = () => setContextMenu(null);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: contextMenu.x,
    top: contextMenu.y,
    zIndex: 1000,
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={handleClose} />
      <div
        className="fixed z-50 min-w-[160 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-sm text-slate-200"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.type === 'state' && (
          <>
            <button
              className="w-full px-4 py-2 text-left hover:bg-slate-700 text-green-400"
              onClick={handleSetStart}
            >
              设为起始状态
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-slate-700 text-red-400"
              onClick={handleToggleAccept}
            >
              切换接受状态
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button
              className="w-full px-4 py-2 text-left hover:bg-slate-700 text-red-500"
              onClick={handleDeleteState}
            >
              删除状态
            </button>
          </>
        )}
        {contextMenu.type === 'transition' && (
          <>
            <button
              className="w-full px-4 py-2 text-left hover:bg-slate-700 text-cyan-400"
              onClick={handleEditTransition}
            >
              编辑转移符号
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button
              className="w-full px-4 py-2 text-left hover:bg-slate-700 text-red-500"
              onClick={handleDeleteTransition}
            >
              删除转移边
            </button>
          </>
        )}
        {contextMenu.type === 'canvas' && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-slate-700 text-cyan-400"
            onClick={handleAddState}
          >
            添加状态
          </button>
        )}
      </div>
    </>
  );
}
