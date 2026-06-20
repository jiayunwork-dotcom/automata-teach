import type {
  ParsedGrammar,
  PDA,
  PDAState,
  PDATransition,
  PDARunStep,
  Production,
} from './types';
import { EPSILON, END_MARKER } from './types';
import { generateId } from '../utils';
import { productionToString } from './parser';

export function buildPDAFromGrammar(grammar: ParsedGrammar): PDA {
  const states: PDAState[] = [
    { id: 'q0', label: 'q0', x: -250, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 250, y: 0, isStart: false, isAccept: true },
  ];

  const transitions: PDATransition[] = [];
  const startStackSymbol = grammar.startSymbol || 'S';

  transitions.push({
    id: generateId('pda'),
    from: 'q0',
    to: 'q1',
    inputSymbol: EPSILON,
    stackTop: END_MARKER,
    pushSymbols: [startStackSymbol, END_MARKER],
  });

  for (const p of grammar.productions) {
    const pushSyms = p.right
      .map((s) => s.value)
      .filter((v) => v !== EPSILON);

    transitions.push({
      id: generateId('pda'),
      from: 'q1',
      to: 'q1',
      inputSymbol: EPSILON,
      stackTop: p.left,
      pushSymbols: pushSyms,
    });
  }

  for (const t of grammar.terminals) {
    transitions.push({
      id: generateId('pda'),
      from: 'q1',
      to: 'q1',
      inputSymbol: t,
      stackTop: t,
      pushSymbols: [],
    });
  }

  transitions.push({
    id: generateId('pda'),
    from: 'q1',
    to: 'q2',
    inputSymbol: END_MARKER,
    stackTop: END_MARKER,
    pushSymbols: [],
  });

  return {
    states,
    transitions,
    startStackSymbol: END_MARKER,
  };
}

export function buildPDARunSteps(
  pda: PDA,
  grammar: ParsedGrammar,
  input: string,
  productions: Production[]
): PDARunStep[] {
  const steps: PDARunStep[] = [];
  let stepIndex = 0;

  if (!grammar.startSymbol) {
    return steps;
  }

  const fullInput = input + END_MARKER;
  let currentState = 'q0';
  let stack: string[] = [END_MARKER];
  let remaining = fullInput;

  steps.push({
    stepIndex: stepIndex++,
    currentState,
    stack: [...stack],
    remainingInput: remaining,
    transitionId: null,
    action: '初始化: 起始状态q0, 栈: $, 输入: ' + (input || 'ε') + '$',
    isAccept: false,
    isError: false,
  });

  const initTransition = pda.transitions.find(
    (t) => t.from === 'q0' && t.to === 'q1'
  );
  if (initTransition) {
    currentState = 'q1';
    stack = [...initTransition.pushSymbols];
    steps.push({
      stepIndex: stepIndex++,
      currentState,
      stack: [...stack],
      remainingInput: remaining,
      transitionId: initTransition.id,
      action: `转移到q1: ε, $/${initTransition.pushSymbols.join('')}`,
      isAccept: false,
      isError: false,
    });
  }

  let maxSteps = 500;
  let safety = 0;

  while (safety < maxSteps) {
    safety++;

    if (currentState === 'q2') {
      steps[steps.length - 1].isAccept = true;
      steps[steps.length - 1].action += ' → 接受!';
      break;
    }

    if (stack.length === 0) {
      steps.push({
        stepIndex: stepIndex++,
        currentState,
        stack: [],
        remainingInput: remaining,
        transitionId: null,
        action: '错误: 栈为空但未到达接受状态',
        isAccept: false,
        isError: true,
      });
      break;
    }

    const stackTop = stack[stack.length - 1];
    const currentChar = remaining.length > 0 ? remaining[0] : '';

    if (/^[A-Z][A-Za-z0-9_]*$/.test(stackTop)) {
      let found = false;
      for (const t of pda.transitions) {
        if (
          t.from === currentState &&
          t.to === currentState &&
          t.stackTop === stackTop &&
          t.inputSymbol === EPSILON
        ) {
          const prod = productions.find(
            (p) =>
              p.left === stackTop &&
              p.right.map((s) => s.value).filter((v) => v !== EPSILON).join('') ===
                t.pushSymbols.join('')
          );

          stack = stack.slice(0, -1);
          const pushReversed = [...t.pushSymbols].reverse();
          stack = [...stack, ...pushReversed];

          const prodStr = prod
            ? productionToString(prod)
            : `${stackTop}->${t.pushSymbols.join('') || EPSILON}`;

          steps.push({
            stepIndex: stepIndex++,
            currentState,
            stack: [...stack],
            remainingInput: remaining,
            transitionId: t.id,
            action: `展开: ${prodStr} (ε, ${stackTop}/${t.pushSymbols.join('') || EPSILON})`,
            isAccept: false,
            isError: false,
          });
          found = true;
          break;
        }
      }
      if (!found) {
        steps.push({
          stepIndex: stepIndex++,
          currentState,
          stack: [...stack],
          remainingInput: remaining,
          transitionId: null,
          action: `错误: 无法展开非终结符 ${stackTop}`,
          isAccept: false,
          isError: true,
        });
        break;
      }
      continue;
    }

    if (stackTop === currentChar && currentChar !== END_MARKER) {
      const matchTransition = pda.transitions.find(
        (t) =>
          t.from === currentState &&
          t.stackTop === stackTop &&
          t.inputSymbol === currentChar
      );

      stack = stack.slice(0, -1);
      remaining = remaining.slice(1);

      steps.push({
        stepIndex: stepIndex++,
        currentState,
        stack: [...stack],
        remainingInput: remaining,
        transitionId: matchTransition ? matchTransition.id : null,
        action: `匹配: '${currentChar}' (${currentChar}, ${stackTop}/ε)`,
        isAccept: false,
        isError: false,
      });
      continue;
    }

    if (stackTop === END_MARKER && currentChar === END_MARKER) {
      const acceptTransition = pda.transitions.find(
        (t) =>
          t.from === 'q1' &&
          t.to === 'q2' &&
          t.stackTop === END_MARKER &&
          t.inputSymbol === END_MARKER
      );

      currentState = 'q2';
      stack = stack.slice(0, -1);
      remaining = remaining.slice(1);

      steps.push({
        stepIndex: stepIndex++,
        currentState,
        stack: [...stack],
        remainingInput: remaining,
        transitionId: acceptTransition ? acceptTransition.id : null,
        action: `接受: 栈顶$匹配输入$ ($, $/ε) → q2`,
        isAccept: true,
        isError: false,
      });
      break;
    }

    steps.push({
      stepIndex: stepIndex++,
      currentState,
      stack: [...stack],
      remainingInput: remaining,
      transitionId: null,
      action: `错误: 栈顶 '${stackTop}' 与当前输入 '${currentChar}' 不匹配`,
      isAccept: false,
      isError: true,
    });
    break;
  }

  return steps;
}

export function formatPDATransitionLabel(t: PDATransition): string {
  const pushStr = t.pushSymbols.length > 0 ? t.pushSymbols.join('') : EPSILON;
  return `${t.inputSymbol}, ${t.stackTop}/${pushStr}`;
}
