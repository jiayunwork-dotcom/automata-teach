import type { Level, Automaton } from '../engine/types';

function generateTestCases(
  positiveCount: number,
  negativeCount: number,
  isPositive: (s: string) => boolean,
  alphabet: string[],
  maxLength: number = 8
): { input: string; accept: boolean }[] {
  const cases: { input: string; accept: boolean }[] = [];
  const seen = new Set<string>();

  let attempts = 0;
  while (cases.filter((c) => c.accept).length < positiveCount && attempts < 1000) {
    const len = Math.floor(Math.random() * maxLength);
    let str = '';
    for (let i = 0; i < len; i++) {
      str += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!seen.has(str) && isPositive(str)) {
      seen.add(str);
      cases.push({ input: str, accept: true });
    }
    attempts++;
  }

  attempts = 0;
  while (cases.filter((c) => !c.accept).length < negativeCount && attempts < 1000) {
    const len = Math.floor(Math.random() * maxLength);
    let str = '';
    for (let i = 0; i < len; i++) {
      str += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!seen.has(str) && !isPositive(str)) {
      seen.add(str);
      cases.push({ input: str, accept: false });
    }
    attempts++;
  }

  for (let i = cases.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cases[i], cases[j]] = [cases[j], cases[i]];
  }

  return cases;
}

const level1TestCases = [
  { input: '', accept: true },
  { input: 'a', accept: true },
  { input: 'b', accept: false },
  { input: 'aa', accept: false },
  { input: 'ab', accept: false },
  { input: 'aaa', accept: false },
  { input: 'aba', accept: false },
  { input: 'baa', accept: false },
  { input: 'aab', accept: false },
  { input: 'bbbb', accept: false },
  { input: 'b', accept: false },
  { input: 'bb', accept: false },
  { input: 'bbb', accept: false },
  { input: 'abba', accept: false },
  { input: 'babb', accept: false },
  { input: 'aaaa', accept: false },
  { input: 'baba', accept: false },
  { input: 'abab', accept: false },
  { input: 'baab', accept: false },
  { input: 'a', accept: true },
];

export const levels: Level[] = [
  {
    id: 1,
    title: '认识字母表和状态',
    description: '学习自动机的基本组成：字母表、状态和转移。创建一个只接受空串和"a"的简单自动机。',
    type: 'construct',
    targetLanguage: '以"a"开头或空串',
    hints: [
      '双击画布可以创建状态节点',
      '从一个状态拖拽到另一个状态创建转移边',
      '右键状态可以设置起始/接受状态',
      '起始状态用绿色双圈表示，接受状态用红色双圈表示',
    ],
    testCases: level1TestCases,
  },
  {
    id: 2,
    title: '构建你的第一个DFA',
    description: '构造一个DFA，接受所有以"a"开头的字符串（字母表{a, b}）。',
    type: 'construct',
    targetLanguage: '所有以a开头的字符串',
    hints: [
      '需要至少2个状态：起始状态和接受状态',
      '起始状态读入a后转移到接受状态',
      '接受状态可以继续读入任意字符',
      '记住：DFA每个状态对每个输入符号恰好有一个转移',
    ],
    testCases: generateTestCases(
      10,
      10,
      (s) => s.length > 0 && s[0] === 'a',
      ['a', 'b'],
      6
    ),
  },
  {
    id: 3,
    title: '认识NFA和空串转移',
    description: '学习NFA的不确定性和epsilon空串转移。构造一个NFA接受"ab"或"cd"。',
    type: 'construct',
    targetLanguage: '字符串ab或cd',
    hints: [
      'NFA中一个状态对同一个符号可以有多个转移',
      'epsilon转移用字母e表示，输入时写e',
      'epsilon转移不消耗输入字符',
      '可以用并行路径来表示"或"的关系',
    ],
    testCases: [
      { input: 'ab', accept: true },
      { input: 'cd', accept: true },
      { input: 'a', accept: false },
      { input: 'b', accept: false },
      { input: 'c', accept: false },
      { input: 'd', accept: false },
      { input: 'abc', accept: false },
      { input: 'cdc', accept: false },
      { input: 'ac', accept: false },
      { input: 'bd', accept: false },
      { input: '', accept: false },
      { input: 'abab', accept: false },
      { input: 'cdcd', accept: false },
      { input: 'abd', accept: false },
      { input: 'ca', accept: false },
      { input: 'db', accept: false },
      { input: 'abcd', accept: false },
      { input: 'cdab', accept: false },
      { input: 'aaa', accept: false },
      { input: 'ddd', accept: false },
    ],
  },
  {
    id: 4,
    title: '正则表达式基础',
    description: '了解正则表达式的三种基本运算：连接、并、Kleene星号。',
    type: 'quiz',
    hints: [
      '连接：ab 表示a后面跟b',
      '并：a|b 表示a或b',
      '星号：a* 表示零个或多个a',
      '优先级：星号 > 连接 > 并',
    ],
  },
  {
    id: 5,
    title: '子集构造法',
    description: '学习如何将NFA转换为等价的DFA。理解epsilon闭包和状态子集的概念。',
    type: 'demo',
    hints: [
      '子集构造法将NFA的状态集合作为DFA的状态',
      '首先计算起始状态的epsilon闭包',
      '对每个状态子集和每个输入符号，计算后继状态集',
      '新发现的状态子集加入待处理队列',
    ],
  },
  {
    id: 6,
    title: 'DFA最小化',
    description: '使用Hopcroft算法将DFA最小化，理解等价类和状态划分。',
    type: 'demo',
    hints: [
      '初始划分为接受状态和非接受状态两组',
      '不断细分等价类，直到无法再分为止',
      '每个等价类中的状态行为完全相同',
      '最小DFA状态数最少且语言不变',
    ],
  },
  {
    id: 7,
    title: '语言运算',
    description: '学习正则语言的三种基本运算：并集、连接和Kleene闭包。',
    type: 'construct',
    targetLanguage: '所有包含偶数个a的字符串',
    hints: [
      '并集：两个语言的所有字符串合并',
      '连接：一个语言的字符串接在另一个后面',
      '闭包：零次或多次连接自身',
      '可以用保存的自动机进行运算',
    ],
    testCases: generateTestCases(
      10,
      10,
      (s) => (s.match(/a/g) || []).length % 2 === 0,
      ['a', 'b'],
      8
    ),
  },
  {
    id: 8,
    title: '泵引理反证',
    description: '理解泵引理，用它来证明某些语言不是正则语言。',
    type: 'demo',
    hints: [
      '泵引理是正则语言的必要条件',
      '如果一个语言不满足泵引理，它一定不是正则的',
      '常用反证法：假设是正则的，推出矛盾',
      '经典例子：a^n b^n 不是正则语言',
    ],
  },
];

export function getLevelById(id: number): Level | undefined {
  return levels.find((l) => l.id === id);
}
