import type { Automaton, State } from '../engine/types';
import { getStartStateId, getStateById } from '../engine/utils';

interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
  useEpsilonForLayout?: boolean;
}

export function layoutAutomaton(
  automaton: Automaton,
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const {
    horizontalSpacing = 150,
    verticalSpacing = 100,
    useEpsilonForLayout = false,
  } = options;

  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<number, string[]>();

  const startId = getStartStateId(automaton);
  if (!startId) {
    automaton.states.forEach((s, i) => {
      positions.set(s.id, { x: i * horizontalSpacing, y: 0 });
    });
    return positions;
  }

  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const deque: { id: string; d: number }[] = [{ id: startId, d: 0 }];

  while (deque.length > 0) {
    const { id, d } = deque.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    depth.set(id, d);

    for (const t of automaton.transitions) {
      if (t.from === id && !visited.has(t.to)) {
        const allEpsilon = t.symbols.every((s) => s === 'ε' || s === 'e');

        if (useEpsilonForLayout || !allEpsilon) {
          deque.push({ id: t.to, d: d + 1 });
        } else {
          deque.unshift({ id: t.to, d });
        }
      }
    }
  }

  for (const s of automaton.states) {
    if (!visited.has(s.id)) {
      const maxDepth = depth.size > 0 ? Math.max(...depth.values()) : -1;
      depth.set(s.id, maxDepth + 1);
    }
  }

  for (const [id, d] of depth) {
    if (!levels.has(d)) {
      levels.set(d, []);
    }
    levels.get(d)!.push(id);
  }

  const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
  const numLevels = sortedLevels.length;
  const totalWidth = (numLevels - 1) * horizontalSpacing;
  const offsetX = (options.startX || 0) - totalWidth / 2;
  const offsetY = options.startY || 0;

  let maxStatesInLevel = 0;
  for (const [, stateIds] of sortedLevels) {
    maxStatesInLevel = Math.max(maxStatesInLevel, stateIds.length);
  }
  const totalHeight = (maxStatesInLevel - 1) * verticalSpacing;
  const baseY = offsetY - totalHeight / 2;

  for (const [level, stateIds] of sortedLevels) {
    const count = stateIds.length;
    const levelHeight = (count - 1) * verticalSpacing;
    const levelStartY = baseY + (totalHeight - levelHeight) / 2;

    stateIds.sort();
    stateIds.forEach((id, i) => {
      positions.set(id, {
        x: offsetX + level * horizontalSpacing,
        y: levelStartY + i * verticalSpacing,
      });
    });
  }

  return positions;
}

export function applyLayout(automaton: Automaton, options?: LayoutOptions): Automaton {
  const positions = layoutAutomaton(automaton, options);
  const newStates = automaton.states.map((s) => {
    const pos = positions.get(s.id);
    return pos ? { ...s, x: pos.x, y: pos.y } : s;
  });
  return { ...automaton, states: newStates };
}

export function layoutThompsonNFA(automaton: Automaton): Automaton {
  return applyLayout(automaton, {
    horizontalSpacing: 140,
    verticalSpacing: 100,
  });
}

export function layoutSubsetDFA(
  automaton: Automaton
): Automaton {
  return applyLayout(automaton, {
    horizontalSpacing: 180,
    verticalSpacing: 120,
  });
}
