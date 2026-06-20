import type { Automaton, ThompsonStep, State, Transition } from './types';
import { generateId } from './utils';

function createBasicAutomaton(symbol: string, nextId: () => number): { auto: Automaton; start: string; accept: string } {
  const startId = `q${nextId()}`;
  const acceptId = `q${nextId()}`;

  const states: State[] = [
    { id: startId, label: startId, x: 0, y: 0, isStart: true, isAccept: false },
    { id: acceptId, label: acceptId, x: 100, y: 0, isStart: false, isAccept: true },
  ];

  const transitions: Transition[] = [
    {
      id: generateId('t'),
      from: startId,
      to: acceptId,
      symbols: [symbol === 'e' ? 'ε' : symbol],
    },
  ];

  return {
    auto: { states, transitions, alphabet: [symbol === 'e' ? 'ε' : symbol], type: 'NFA' },
    start: startId,
    accept: acceptId,
  };
}

function createEmptyAutomaton(nextId: () => number): { auto: Automaton; start: string; accept: string } {
  const startId = `q${nextId()}`;

  const states: State[] = [
    { id: startId, label: startId, x: 0, y: 0, isStart: true, isAccept: true },
  ];

  return {
    auto: { states, transitions: [], alphabet: [], type: 'NFA' },
    start: startId,
    accept: startId,
  };
}

function concatAutomata(
  a: { auto: Automaton; start: string; accept: string },
  b: { auto: Automaton; start: string; accept: string },
  offsetY: number
): { auto: Automaton; start: string; accept: string } {
  const aStates = a.auto.states.map((s) => ({ ...s, x: s.x, y: s.y - offsetY }));
  const bStates = b.auto.states.map((s) => ({ ...s, x: s.x + 200, y: s.y + offsetY }));

  const states = [...aStates, ...bStates];
  const transitions = [
    ...a.auto.transitions,
    ...b.auto.transitions.map((t) => ({ ...t })),
    {
      id: generateId('t'),
      from: a.accept,
      to: b.start,
      symbols: ['ε'],
    },
  ];

  for (const s of states) {
    s.isStart = s.id === a.start;
    s.isAccept = s.id === b.accept;
  }

  const alphabet = Array.from(new Set([...a.auto.alphabet, ...b.auto.alphabet])).sort();

  return {
    auto: { states, transitions, alphabet, type: 'NFA' as const },
    start: a.start,
    accept: b.accept,
  };
}

function unionAutomata(
  a: { auto: Automaton; start: string; accept: string },
  b: { auto: Automaton; start: string; accept: string },
  nextId: () => number
): { auto: Automaton; start: string; accept: string } {
  const newStartId = `q${nextId()}`;
  const newAcceptId = `q${nextId()}`;

  const aStates = a.auto.states.map((s) => ({ ...s, x: s.x + 100, y: s.y - 80 }));
  const bStates = b.auto.states.map((s) => ({ ...s, x: s.x + 100, y: s.y + 80 }));

  const states: State[] = [
    { id: newStartId, label: newStartId, x: 0, y: 0, isStart: true, isAccept: false },
    ...aStates.map((s) => ({ ...s, isStart: false })),
    ...bStates.map((s) => ({ ...s, isStart: false })),
    { id: newAcceptId, label: newAcceptId, x: 300, y: 0, isStart: false, isAccept: true },
  ];

  for (const s of states) {
    s.isAccept = s.id === newAcceptId;
  }

  const transitions = [
    ...a.auto.transitions,
    ...b.auto.transitions,
    {
      id: generateId('t'),
      from: newStartId,
      to: a.start,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: newStartId,
      to: b.start,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: a.accept,
      to: newAcceptId,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: b.accept,
      to: newAcceptId,
      symbols: ['ε'],
    },
  ];

  const alphabet = Array.from(new Set([...a.auto.alphabet, ...b.auto.alphabet])).sort();

  return {
    auto: { states, transitions, alphabet, type: 'NFA' as const },
    start: newStartId,
    accept: newAcceptId,
  };
}

function starAutomaton(
  a: { auto: Automaton; start: string; accept: string },
  nextId: () => number
): { auto: Automaton; start: string; accept: string } {
  const newStartId = `q${nextId()}`;
  const newAcceptId = `q${nextId()}`;

  const states: State[] = [
    { id: newStartId, label: newStartId, x: 0, y: 0, isStart: true, isAccept: false },
    ...a.auto.states.map((s) => ({ ...s, x: s.x + 100, y: s.y, isStart: false, isAccept: false })),
    { id: newAcceptId, label: newAcceptId, x: 300, y: 0, isStart: false, isAccept: true },
  ];

  const transitions = [
    ...a.auto.transitions,
    {
      id: generateId('t'),
      from: newStartId,
      to: a.start,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: newStartId,
      to: newAcceptId,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: a.accept,
      to: a.start,
      symbols: ['ε'],
    },
    {
      id: generateId('t'),
      from: a.accept,
      to: newAcceptId,
      symbols: ['ε'],
    },
  ];

  const alphabet = [...a.auto.alphabet];

  return {
    auto: { states, transitions, alphabet, type: 'NFA' as const },
    start: newStartId,
    accept: newAcceptId,
  };
}

interface RegexNode {
  type: 'char' | 'concat' | 'union' | 'star' | 'empty';
  value?: string;
  left?: RegexNode;
  right?: RegexNode;
  child?: RegexNode;
}

class RegexParser {
  private pos: number = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  parse(): RegexNode {
    this.pos = 0;
    const node = this.parseUnion();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character at position ${this.pos}`);
    }
    return node;
  }

  private parseUnion(): RegexNode {
    let left = this.parseConcat();

    while (this.pos < this.input.length && this.input[this.pos] === '|') {
      this.pos++;
      const right = this.parseConcat();
      left = { type: 'union', left, right };
    }

    return left;
  }

  private parseConcat(): RegexNode {
    let left = this.parseStar();

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === '|' || ch === ')') {
        break;
      }
      const right = this.parseStar();
      left = { type: 'concat', left, right };
    }

    return left;
  }

  private parseStar(): RegexNode {
    let node = this.parseAtom();

    while (this.pos < this.input.length && this.input[this.pos] === '*') {
      this.pos++;
      node = { type: 'star', child: node };
    }

    return node;
  }

  private parseAtom(): RegexNode {
    if (this.pos >= this.input.length) {
      return { type: 'empty' };
    }

    const ch = this.input[this.pos];

    if (ch === '(') {
      this.pos++;
      const node = this.parseUnion();
      if (this.pos >= this.input.length || this.input[this.pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      this.pos++;
      return node;
    }

    if (ch === 'e' || ch === 'ε') {
      this.pos++;
      return { type: 'char', value: 'e' };
    }

    if (/[a-zA-Z0-9]/.test(ch)) {
      this.pos++;
      return { type: 'char', value: ch };
    }

    throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
  }
}

export function parseRegex(input: string): RegexNode {
  const parser = new RegexParser(input);
  return parser.parse();
}

export function buildThompsonSteps(regex: string): ThompsonStep[] {
  const steps: ThompsonStep[] = [];
  let idCounter = 0;
  const nextId = () => idCounter++;

  try {
    const ast = parseRegex(regex);
    const result = buildThompsonFromAst(ast, steps, nextId);

    steps.push({
      stepIndex: steps.length,
      operation: 'char',
      description: '构造完成',
      automaton: result.auto,
      isComplete: true,
    });
  } catch (e) {
    console.error('Parse error:', e);
  }

  return steps;
}

function buildThompsonFromAst(
  node: RegexNode,
  steps: ThompsonStep[],
  nextId: () => number
): { auto: Automaton; start: string; accept: string } {
  switch (node.type) {
    case 'char': {
      const result = createBasicAutomaton(node.value || 'a', nextId);
      steps.push({
        stepIndex: steps.length,
        operation: 'char',
        description: `基本字符 ${node.value}`,
        automaton: result.auto,
        isComplete: false,
      });
      return result;
    }

    case 'empty': {
      const result = createEmptyAutomaton(nextId);
      steps.push({
        stepIndex: steps.length,
        operation: 'char',
        description: '空串 ε',
        automaton: result.auto,
        isComplete: false,
      });
      return result;
    }

    case 'concat': {
      const left = node.left
        ? buildThompsonFromAst(node.left, steps, nextId)
        : createEmptyAutomaton(nextId);
      const right = node.right
        ? buildThompsonFromAst(node.right, steps, nextId)
        : createEmptyAutomaton(nextId);

      const result = concatAutomata(left, right, 0);
      steps.push({
        stepIndex: steps.length,
        operation: 'concat',
        description: '连接运算',
        automaton: result.auto,
        isComplete: false,
      });
      return result;
    }

    case 'union': {
      const left = node.left
        ? buildThompsonFromAst(node.left, steps, nextId)
        : createEmptyAutomaton(nextId);
      const right = node.right
        ? buildThompsonFromAst(node.right, steps, nextId)
        : createEmptyAutomaton(nextId);

      const result = unionAutomata(left, right, nextId);
      steps.push({
        stepIndex: steps.length,
        operation: 'union',
        description: '并运算',
        automaton: result.auto,
        isComplete: false,
      });
      return result;
    }

    case 'star': {
      const child = node.child
        ? buildThompsonFromAst(node.child, steps, nextId)
        : createEmptyAutomaton(nextId);

      const result = starAutomaton(child, nextId);
      steps.push({
        stepIndex: steps.length,
        operation: 'star',
        description: 'Kleene星号',
        automaton: result.auto,
        isComplete: false,
      });
      return result;
    }
  }
}

export function thompsonToAutomaton(regex: string): Automaton | null {
  try {
    const steps = buildThompsonSteps(regex);
    if (steps.length === 0) return null;
    return steps[steps.length - 1].automaton;
  } catch {
    return null;
  }
}
