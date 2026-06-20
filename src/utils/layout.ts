import type { Automaton, State } from '../engine/types';
import { getStartStateId, getStateById } from '../engine/utils';

interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
}

export function layoutAutomaton(
  automaton: Automaton,
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const {
    horizontalSpacing = 150,
    verticalSpacing = 100,
    startX = 0,
    startY = 0,
  } = options;

  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<number, string[]>();

  const startId = getStartStateId(automaton);
  if (!startId) {
    automaton.states.forEach((s, i) => {
      positions.set(s.id, { x: startX + i * horizontalSpacing, y: startY });
    });
    return positions;
  }

  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [{ id: startId, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(id);

    for (const t of automaton.transitions) {
      if (t.from === id && !visited.has(t.to)) {
        queue.push({ id: t.to, level: level + 1 });
      }
    }
  }

  for (const s of automaton.states) {
    if (!visited.has(s.id)) {
      const maxLevel = levels.size > 0 ? Math.max(...levels.keys()) : -1;
      const nextLevel = maxLevel + 1;
      if (!levels.has(nextLevel)) {
        levels.set(nextLevel, []);
      }
      levels.get(nextLevel)!.push(s.id);
    }
  }

  const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);

  for (const [level, stateIds] of sortedLevels) {
    const count = stateIds.length;
    const totalHeight = (count - 1) * verticalSpacing;
    const startYPos = startY - totalHeight / 2;

    stateIds.sort();
    stateIds.forEach((id, i) => {
      positions.set(id, {
        x: startX + level * horizontalSpacing,
        y: startYPos + i * verticalSpacing,
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
    horizontalSpacing: 120,
    verticalSpacing: 90,
    startX: -200,
    startY: 0,
  });
}

export function layoutSubsetDFA(
  automaton: Automaton,
  startX: number = 100,
  startY: number = 0
): Automaton {
  return applyLayout(automaton, {
    horizontalSpacing: 180,
    verticalSpacing: 120,
    startX,
    startY,
  });
}
