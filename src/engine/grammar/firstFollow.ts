import type {
  ParsedGrammar,
  Production,
  GrammarSymbol,
  FirstFollowStep,
  FirstFollowResult,
} from './types';
import { EPSILON, END_MARKER } from './types';

function cloneMapSet(map: Map<string, Set<string>>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [k, v] of map) {
    result.set(k, new Set(v));
  }
  return result;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function mapsEqual(a: Map<string, Set<string>>, b: Map<string, Set<string>>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (!bv || !setsEqual(v, bv)) return false;
  }
  return true;
}

export function computeFirstOfString(
  symbols: GrammarSymbol[],
  firstSets: Map<string, Set<string>>
): Set<string> {
  const result = new Set<string>();

  if (symbols.length === 0) {
    result.add(EPSILON);
    return result;
  }

  let allHaveEpsilon = true;

  for (const sym of symbols) {
    if (sym.isTerminal) {
      if (sym.value === EPSILON) {
        continue;
      }
      result.add(sym.value);
      allHaveEpsilon = false;
      break;
    } else {
      const ntFirst = firstSets.get(sym.value) || new Set<string>();
      for (const t of ntFirst) {
        if (t !== EPSILON) {
          result.add(t);
        }
      }
      if (!ntFirst.has(EPSILON)) {
        allHaveEpsilon = false;
        break;
      }
    }
  }

  if (allHaveEpsilon) {
    result.add(EPSILON);
  }

  return result;
}

export function computeFirstFollow(grammar: ParsedGrammar): FirstFollowResult {
  const steps = buildFirstFollowSteps(grammar);
  const lastStep = steps[steps.length - 1];
  return {
    firstSets: lastStep.firstSets,
    followSets: lastStep.followSets,
  };
}

export function buildFirstFollowSteps(grammar: ParsedGrammar): FirstFollowStep[] {
  const steps: FirstFollowStep[] = [];
  let stepIndex = 0;

  const firstSets = new Map<string, Set<string>>();
  const followSets = new Map<string, Set<string>>();

  for (const nt of grammar.nonTerminals) {
    firstSets.set(nt, new Set<string>());
    followSets.set(nt, new Set<string>());
  }

  if (grammar.startSymbol) {
    followSets.get(grammar.startSymbol)!.add(END_MARKER);
  }

  steps.push({
    stepIndex: stepIndex++,
    type: 'first',
    nonTerminal: '',
    productionId: null,
    addedSymbols: [],
    description: '初始化: 所有First/Follow集为空,起始符号的Follow集加入$',
    firstSets: cloneMapSet(firstSets),
    followSets: cloneMapSet(followSets),
    isComplete: false,
  });

  let changed = true;
  let maxIterations = 100;
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (const p of grammar.productions) {
      const prevFirst = cloneMapSet(firstSets);
      const prevFollow = cloneMapSet(followSets);

      const firstOfRight = computeFirstOfString(p.right, firstSets);
      const leftFirst = firstSets.get(p.left)!;
      const addedFirst: string[] = [];

      for (const t of firstOfRight) {
        if (!leftFirst.has(t)) {
          leftFirst.add(t);
          addedFirst.push(t);
          changed = true;
        }
      }

      if (addedFirst.length > 0) {
        steps.push({
          stepIndex: stepIndex++,
          type: 'first',
          nonTerminal: p.left,
          productionId: p.id,
          addedSymbols: addedFirst,
          description: `处理产生式 ${p.originalText}: First(${p.left}) 加入 {${addedFirst.join(', ')}}`,
          firstSets: cloneMapSet(firstSets),
          followSets: cloneMapSet(followSets),
          isComplete: false,
        });
      }

      if (!mapsEqual(prevFirst, firstSets)) {
        // First集有变化已经记录
      }

      for (let i = 0; i < p.right.length; i++) {
        const B = p.right[i];
        if (B.isTerminal) continue;

        const beta = p.right.slice(i + 1);
        const firstBeta = computeFirstOfString(beta, firstSets);
        const BFollow = followSets.get(B.value)!;
        const addedFollow: string[] = [];

        for (const t of firstBeta) {
          if (t !== EPSILON && !BFollow.has(t)) {
            BFollow.add(t);
            addedFollow.push(t);
            changed = true;
          }
        }

        if (addedFollow.length > 0) {
          steps.push({
            stepIndex: stepIndex++,
            type: 'follow',
            nonTerminal: B.value,
            productionId: p.id,
            addedSymbols: addedFollow,
            description: `处理产生式 ${p.originalText} 中的 ${B.value}: First(${beta.length > 0 ? beta.map((s) => s.value).join('') : 'ε'}) 加入 Follow(${B.value}), 新增 {${addedFollow.join(', ')}}`,
            firstSets: cloneMapSet(firstSets),
            followSets: cloneMapSet(followSets),
            isComplete: false,
          });
        }

        if (firstBeta.has(EPSILON) || beta.length === 0) {
          const AFollow = followSets.get(p.left)!;
          const addedFollow2: string[] = [];
          for (const t of AFollow) {
            if (!BFollow.has(t)) {
              BFollow.add(t);
              addedFollow2.push(t);
              changed = true;
            }
          }
          if (addedFollow2.length > 0) {
            steps.push({
              stepIndex: stepIndex++,
              type: 'follow',
              nonTerminal: B.value,
              productionId: p.id,
              addedSymbols: addedFollow2,
              description: `处理产生式 ${p.originalText} 中的 ${B.value}: ${beta.length > 0 ? 'β可推导出ε, ' : ''}Follow(${p.left}) 加入 Follow(${B.value}), 新增 {${addedFollow2.join(', ')}}`,
              firstSets: cloneMapSet(firstSets),
              followSets: cloneMapSet(followSets),
              isComplete: false,
            });
          }
        }

        if (!mapsEqual(prevFollow, followSets)) {
          // Follow集变化已记录
        }
      }
    }
  }

  const finalStep = steps[steps.length - 1];
  steps.push({
    stepIndex: stepIndex,
    type: 'first',
    nonTerminal: '',
    productionId: null,
    addedSymbols: [],
    description: '计算完成',
    firstSets: cloneMapSet(finalStep.firstSets),
    followSets: cloneMapSet(finalStep.followSets),
    isComplete: true,
  });

  return steps;
}

export function getProductionById(
  grammar: ParsedGrammar,
  id: string
): Production | undefined {
  return grammar.productions.find((p) => p.id === id);
}
