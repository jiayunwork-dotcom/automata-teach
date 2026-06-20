import { useMemo, useRef, useEffect } from 'react';
import { useExecutionStore } from '../../stores/executionStore';
import { useAutomatonStore } from '../../stores/automatonStore';
import { getStateById } from '../../engine/utils';
import type { ExecutionBranch } from '../../engine/types';

interface TreeNodeLayout {
  branch: ExecutionBranch;
  x: number;
  y: number;
  level: number;
  parentX?: number;
  parentY?: number;
}

interface LayoutNodeInternal extends TreeNodeLayout {
  _parentIdx?: number;
}

export function ExecutionTree() {
  const steps = useExecutionStore((s) => s.steps);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const mode = useExecutionStore((s) => s.mode);
  const inputString = useExecutionStore((s) => s.inputString);
  const goToStep = useExecutionStore((s) => s.goToStep);
  const scrollRef = useRef<HTMLDivElement>(null);

  const automaton = useAutomatonStore((s) => s.automaton);

  const allBranches = useMemo(() => {
    const levels: ExecutionBranch[][] = [];
    for (const step of steps) {
      if (step.branches && step.branches.length > 0) {
        levels.push(step.branches);
      }
    }
    return levels;
  }, [steps]);

  const layout = useMemo(() => {
    if (allBranches.length === 0) return { nodes: [] as TreeNodeLayout[], width: 0, height: 0 };

    const NODE_W = 110;
    const NODE_H = 56;
    const H_GAP = 16;
    const V_GAP = 60;
    const LEVEL_PAD = 40;

    const levelCount = allBranches.length;
    const nodesByLevel: (LayoutNodeInternal | null)[][] = [];

    for (let level = 0; level < levelCount; level++) {
      const branches = allBranches[level];
      const levelNodes: (LayoutNodeInternal | null)[] = [];
      nodesByLevel.push(levelNodes);

      if (level === 0) {
        branches.forEach((b) => {
          levelNodes.push({
            branch: b,
            x: 0,
            y: 0,
            level,
          });
        });
      } else {
        const prevLevel = nodesByLevel[level - 1];
        branches.forEach((b) => {
          const parentIdx = prevLevel.findIndex((n) => n && n.branch.id === b.parentId);
          const newNode: LayoutNodeInternal = {
            branch: b,
            x: 0,
            y: 0,
            level,
            _parentIdx: parentIdx,
          };
          levelNodes.push(newNode);
        });
      }
    }

    const levelWidths: number[] = [];
    for (let level = 0; level < levelCount; level++) {
      const count = nodesByLevel[level].length;
      levelWidths.push(count * NODE_W + (count - 1) * H_GAP);
    }

    const maxWidth = Math.max(...levelWidths);
    const totalWidth = Math.max(maxWidth + LEVEL_PAD * 2, 300);
    const totalHeight = levelCount * NODE_H + (levelCount - 1) * V_GAP + LEVEL_PAD * 2;

    for (let level = 0; level < levelCount; level++) {
      const count = nodesByLevel[level].length;
      const lvlW = count * NODE_W + (count - 1) * H_GAP;
      const startX = (totalWidth - lvlW) / 2;
      const y = LEVEL_PAD + level * (NODE_H + V_GAP);

      nodesByLevel[level].forEach((n, idx) => {
        if (!n) return;
        n.x = startX + idx * (NODE_W + H_GAP) + NODE_W / 2;
        n.y = y + NODE_H / 2;
      });
    }

    for (let level = 1; level < levelCount; level++) {
      const nodes = nodesByLevel[level];
      const prevLevel = nodesByLevel[level - 1];
      nodes.forEach((n) => {
        if (!n) return;
        const pIdx = n._parentIdx;
        if (pIdx !== undefined && pIdx >= 0 && prevLevel[pIdx]) {
          n.parentX = prevLevel[pIdx]!.x;
          n.parentY = prevLevel[pIdx]!.y;
        } else {
          const prevNodes = prevLevel.filter(Boolean) as LayoutNodeInternal[];
          if (prevNodes.length > 0) {
            let closest: LayoutNodeInternal = prevNodes[0];
            let minDist = Math.abs(prevNodes[0].x - n.x);
            for (const pn of prevNodes) {
              const d = Math.abs(pn.x - n.x);
              if (d < minDist) { minDist = d; closest = pn; }
            }
            n.parentX = closest.x;
            n.parentY = closest.y;
          }
        }
      });
    }

    const flatNodes: TreeNodeLayout[] = [];
    for (const level of nodesByLevel) {
      for (const n of level) {
        if (n) flatNodes.push(n);
      }
    }

    return { nodes: flatNodes, width: totalWidth, height: totalHeight };
  }, [allBranches]);

  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentStepIndex, steps.length]);

  if (steps.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">执行树</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          <div className="text-center">
            <p>输入字符串并点击执行</p>
            <p className="text-xs mt-1 text-slate-600">
              {mode === 'NFA' ? 'NFA模式展示所有并行路径' : 'DFA模式展示单一路径'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <h3 className="font-semibold text-slate-200">执行树</h3>
        <p className="text-xs text-slate-500 mt-1">
          输入: <span className="font-mono text-cyan-400">{inputString || 'ε'}</span>
          <span className="ml-2 text-slate-600">|</span>
          <span className="ml-2">{mode === 'NFA' ? 'NFA分支视图' : 'DFA步骤视图'}</span>
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        {mode === 'NFA' && layout.nodes.length > 0 ? (
          <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: '100%' }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {layout.nodes.map((n, i) => {
                const px = n.parentX;
                const py = n.parentY;
                if (px == null || py == null) return null;
                const isActive = n.branch.depth <= currentStepIndex;
                const strokeColor = n.branch.isDead
                  ? '#ef4444'
                  : n.branch.isAccept && n.branch.depth === currentStepIndex
                  ? '#22c55e'
                  : isActive
                  ? '#06b6d4'
                  : '#475569';
                return (
                  <line
                    key={`l-${i}`}
                    x1={px}
                    y1={py + 28}
                    x2={n.x}
                    y2={n.y - 28}
                    stroke={strokeColor}
                    strokeWidth={isActive ? 2 : 1.5}
                    strokeDasharray={n.branch.isDead ? '4 3' : undefined}
                    opacity={isActive ? 0.9 : 0.5}
                  />
                );
              })}
            </svg>

            {layout.nodes.map((n, i) => {
              const isCurrentLevel = n.branch.depth === currentStepIndex;
              const isPastLevel = n.branch.depth < currentStepIndex;
              const stateLabels = n.branch.stateIds
                .map((sid) => {
                  const s = getStateById(automaton, sid);
                  return s?.label || sid;
                })
                .join(', ');

              let bgClass = 'bg-slate-800 border-slate-600';
              let textClass = 'text-slate-300';

              if (n.branch.isDead) {
                bgClass = 'bg-red-900/40 border-red-500';
                textClass = 'text-red-300';
              } else if (n.branch.isAccept && isCurrentLevel) {
                bgClass = 'bg-green-900/40 border-green-500';
                textClass = 'text-green-300';
              } else if (n.branch.isAccept && isPastLevel) {
                bgClass = 'bg-green-900/20 border-green-700/60';
                textClass = 'text-green-400/80';
              } else if (isCurrentLevel) {
                bgClass = 'bg-cyan-900/40 border-cyan-500';
                textClass = 'text-cyan-200';
              } else if (isPastLevel) {
                bgClass = 'bg-slate-800/70 border-slate-600/60';
              }

              return (
                <button
                  key={`n-${i}`}
                  data-active={isCurrentLevel ? 'true' : 'false'}
                  onClick={() => goToStep(n.branch.depth)}
                  className={`absolute flex flex-col items-center justify-center rounded-lg border transition-all ${bgClass} ${
                    isCurrentLevel ? 'shadow-lg scale-105 ring-2 ring-offset-1 ring-offset-slate-900 ring-cyan-400/60' : ''
                  } hover:scale-105 cursor-pointer`}
                  style={{
                    left: n.x - 55,
                    top: n.y - 28,
                    width: 110,
                    height: 56,
                  }}
                  title={`步骤 ${n.branch.depth} - 点击跳转`}
                >
                  {n.branch.consumedChar !== null && (
                    <div className={`text-[10px] font-mono ${textClass} opacity-80 leading-tight`}>
                      '{n.branch.consumedChar}'
                    </div>
                  )}
                  <div className={`text-xs font-mono font-bold ${textClass} leading-tight mt-0.5`}>
                    {stateLabels || '∅'}
                  </div>
                  {n.branch.isDead && (
                    <div className="text-[9px] text-red-400 font-semibold leading-tight">死路</div>
                  )}
                  {n.branch.isAccept && !n.branch.isDead && (
                    <div className="text-[9px] text-green-400 font-semibold leading-tight">接受</div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              const stateLabels = step.activeStates
                .map((sid) => {
                  const s = getStateById(automaton, sid);
                  return s?.label || sid;
                })
                .sort()
                .join(', ');

              const hasAccept = step.activeStates.some((sid) => {
                const s = getStateById(automaton, sid);
                return s?.isAccept;
              });

              return (
                <button
                  key={idx}
                  data-active={isActive ? 'true' : 'false'}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                      : isPast
                      ? 'bg-slate-800/50 border-slate-700'
                      : 'bg-slate-800/30 border-slate-700/50'
                  } hover:border-cyan-600/60`}
                  onClick={() => goToStep(idx)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      步骤 {idx}
                      {step.consumedChar && (
                        <span className="ml-2 font-mono text-cyan-400">
                          '{step.consumedChar}'
                        </span>
                      )}
                    </span>
                    {step.isDead && (
                      <span className="text-xs text-red-400">死状态</span>
                    )}
                    {!step.isDead && hasAccept && (
                      <span className="text-xs text-green-400">含接受态</span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-sm">
                    {step.activeStates.length > 0 ? (
                      <span className={hasAccept ? 'text-green-300' : 'text-slate-300'}>
                        {'{'}{stateLabels}{'}'}
                      </span>
                    ) : (
                      <span className="text-red-400">∅</span>
                    )}
                  </div>
                  {step.epsilonClosure && step.epsilonClosure.length > step.activeStates.length && (
                    <div className="mt-1 text-xs text-purple-400">
                      ε-闭包: {step.epsilonClosure.map((sid) => getStateById(automaton, sid)?.label || sid).sort().join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(mode === 'NFA' || layout.nodes.length > 0) && (
        <div className="px-4 py-2 border-t border-slate-700 text-[11px] text-slate-500 flex-shrink-0 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-cyan-900/40 border border-cyan-500" />
            当前步骤
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-green-900/40 border border-green-500" />
            接受态
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-900/40 border border-red-500" />
            死路
          </span>
          <span className="ml-auto text-slate-600">点击节点可跳转</span>
        </div>
      )}
    </div>
  );
}
