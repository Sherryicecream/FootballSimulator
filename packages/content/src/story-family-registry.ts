import type { EventDefinition, EventChoice } from '@football/contracts';

type EventCategory = EventDefinition['category'];
type YouthEventTheme = NonNullable<EventDefinition['theme']>;

export type StoryFamilyDomain =
  | 'youth-rivalry'
  | 'professional-trajectory'
  | 'injury-recovery'
  | 'contract-promise'
  | 'stay-transfer'
  | 'overseas-adaptation'
  | 'national-team'
  | 'retirement';

export type StoryPhase = 'youth' | 'professional' | 'retirement';

export interface StoryFamilyDefinition {
  familyId: string;
  domain: StoryFamilyDomain;
  phaseCoverage: readonly StoryPhase[];
  minNodes: number;
  distinctResolutions: number;
  nodeEventIds: readonly string[];
  terminalEventIds: readonly string[];
}

interface StoryFamilySpec {
  familyId: string;
  domain: StoryFamilyDomain;
  phaseCoverage: readonly StoryPhase[];
  category: EventCategory;
  theme: YouthEventTheme;
  title: string;
  nodeTitles: readonly [string, string, string];
  choiceTexts: readonly [string, string];
}

const FAMILY_SPECS: readonly StoryFamilySpec[] = [
  {
    familyId: 'youth-rivalry-position',
    domain: 'youth-rivalry',
    phaseCoverage: ['youth'],
    category: 'dressing-room',
    theme: 'relationships',
    title: '位置竞争',
    nodeTitles: ['同位置的目光', '训练场的比较', '轮换顺序的答案'],
    choiceTexts: ['正面回应竞争', '把竞争变成合作'],
  },
  {
    familyId: 'youth-rivalry-captain',
    domain: 'youth-rivalry',
    phaseCoverage: ['youth'],
    category: 'dressing-room',
    theme: 'relationships',
    title: '队长的标准',
    nodeTitles: ['队长提出要求', '关键训练的示范', '是否接过标准'],
    choiceTexts: ['接受更高标准', '先守住自己的节奏'],
  },
  {
    familyId: 'youth-rivalry-selection',
    domain: 'youth-rivalry',
    phaseCoverage: ['youth'],
    category: 'china-youth',
    theme: 'trajectory',
    title: '名单边缘',
    nodeTitles: ['名单之前的信号', '合练中的窗口', '最后一次证明'],
    choiceTexts: ['主动争取位置', '等待更合适的机会'],
  },
  {
    familyId: 'youth-rivalry-room',
    domain: 'youth-rivalry',
    phaseCoverage: ['youth'],
    category: 'dressing-room',
    theme: 'relationships',
    title: '更衣室的站位',
    nodeTitles: ['一句话引发误会', '队友之间的沉默', '留下解释还是离开'],
    choiceTexts: ['把话说明白', '用行动重新建立信任'],
  },
  {
    familyId: 'professional-bench-route',
    domain: 'professional-trajectory',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '替补席的路线',
    nodeTitles: ['等待进入名单', '短暂出场的考验', '替补还是轮换'],
    choiceTexts: ['把每分钟踢出价值', '请求更明确的角色'],
  },
  {
    familyId: 'professional-form-rise',
    domain: 'professional-trajectory',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '状态上升',
    nodeTitles: ['连续表现被看见', '首发机会到来', '如何守住上升势头'],
    choiceTexts: ['保持稳定输出', '承担更大的比赛风险'],
  },
  {
    familyId: 'professional-form-fall',
    domain: 'professional-trajectory',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '状态下滑',
    nodeTitles: ['失误后的第二天', '信心进入低谷', '重建比赛感觉'],
    choiceTexts: ['回到基础训练', '用下一场比赛回应'],
  },
  {
    familyId: 'professional-peak-expectation',
    domain: 'professional-trajectory',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'match',
    title: '巅峰之后',
    nodeTitles: ['最佳表现后的期待', '对手开始研究你', '顶住新的标准'],
    choiceTexts: ['继续扩大优势', '调整方式保持长久'],
  },
  {
    familyId: 'injury-first-warning',
    domain: 'injury-recovery',
    phaseCoverage: ['youth', 'professional'],
    category: 'china-youth',
    theme: 'health',
    title: '第一次伤情警报',
    nodeTitles: ['身体发出信号', '恢复计划开始', '重新回到对抗'],
    choiceTexts: ['严格执行恢复', '尽快证明自己还能踢'],
  },
  {
    familyId: 'injury-rehab-return',
    domain: 'injury-recovery',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'health',
    title: '漫长复出',
    nodeTitles: ['康复室的日程', '训练负荷逐步增加', '复出后的第一场'],
    choiceTexts: ['接受循序渐进', '提前申请回到名单'],
  },
  {
    familyId: 'injury-recurrence',
    domain: 'injury-recovery',
    phaseCoverage: ['youth', 'professional'],
    category: 'china-youth',
    theme: 'health',
    title: '旧伤的回声',
    nodeTitles: ['熟悉的不适出现', '队医重新评估', '是否改变踢法'],
    choiceTexts: ['先保护身体', '调整动作继续竞争'],
  },
  {
    familyId: 'injury-load-boundary',
    domain: 'injury-recovery',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'health',
    title: '负荷的边界',
    nodeTitles: ['密集赛程逼近', '疲劳影响动作', '做出休息决定'],
    choiceTexts: ['主动降低负荷', '带着风险完成任务'],
  },
  {
    familyId: 'contract-first-promise',
    domain: 'contract-promise',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '合同里的承诺',
    nodeTitles: ['经纪人带来方案', '承诺开始被检验', '续约前的选择'],
    choiceTexts: ['坚持谈清角色', '先用表现换取空间'],
  },
  {
    familyId: 'contract-role-dispute',
    domain: 'contract-promise',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'relationships',
    title: '角色没有兑现',
    nodeTitles: ['承诺与现实出现差距', '更衣室开始议论', '是否公开分歧'],
    choiceTexts: ['直接要求解释', '保持职业态度等待窗口'],
  },
  {
    familyId: 'contract-agent-trust',
    domain: 'contract-promise',
    phaseCoverage: ['professional'],
    category: 'off-pitch',
    theme: 'off-pitch',
    title: '经纪人的路线',
    nodeTitles: ['经纪人描绘未来', '报价带来诱惑', '决定信任谁'],
    choiceTexts: ['相信长期计划', '只接受确定的条件'],
  },
  {
    familyId: 'contract-renewal-pressure',
    domain: 'contract-promise',
    phaseCoverage: ['professional'],
    category: 'off-pitch',
    theme: 'trajectory',
    title: '续约倒计时',
    nodeTitles: ['合同进入最后阶段', '外界猜测增加', '续约还是离开'],
    choiceTexts: ['留下争取更高位置', '保留离队的主动权'],
  },
  {
    familyId: 'transfer-stay-loyalty',
    domain: 'stay-transfer',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'relationships',
    title: '留下的理由',
    nodeTitles: ['新报价送到桌面', '队友希望你留下', '忠诚是否值得'],
    choiceTexts: ['回应俱乐部信任', '把未来交给更大舞台'],
  },
  {
    familyId: 'transfer-window-choice',
    domain: 'stay-transfer',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '窗口里的选择',
    nodeTitles: ['转会窗口开启', '传闻逐渐具体', '做出最终决定'],
    choiceTexts: ['主动寻找转会', '留队完成当前目标'],
  },
  {
    familyId: 'transfer-loan-path',
    domain: 'stay-transfer',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'trajectory',
    title: '租借的岔路',
    nodeTitles: ['租借方案出现', '新球队提出保证', '回母队还是留下'],
    choiceTexts: ['接受稳定出场', '留在原队继续竞争'],
  },
  {
    familyId: 'transfer-homecoming',
    domain: 'stay-transfer',
    phaseCoverage: ['professional'],
    category: 'asia-career',
    theme: 'relationships',
    title: '回到熟悉的地方',
    nodeTitles: ['家乡球队发来邀请', '旧关系重新出现', '归来意味着什么'],
    choiceTexts: ['用经验帮助球队', '坚持寻找新的挑战'],
  },
  {
    familyId: 'overseas-language',
    domain: 'overseas-adaptation',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'off-pitch',
    title: '语言的第一道门',
    nodeTitles: ['听懂训练指令', '表达自己的需求', '用当地语言带队'],
    choiceTexts: ['每天主动学习', '先依靠熟悉的队友'],
  },
  {
    familyId: 'overseas-tactics',
    domain: 'overseas-adaptation',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'training',
    title: '战术文化的差异',
    nodeTitles: ['新的站位习惯', '录像里的不同答案', '找到自己的位置'],
    choiceTexts: ['彻底融入体系', '保留原有的强项'],
  },
  {
    familyId: 'overseas-living',
    domain: 'overseas-adaptation',
    phaseCoverage: ['professional'],
    category: 'asia-career',
    theme: 'off-pitch',
    title: '城市里的日常',
    nodeTitles: ['陌生城市的第一晚', '生活节奏逐步稳定', '真正把这里当家'],
    choiceTexts: ['主动认识新的生活', '把注意力留给足球'],
  },
  {
    familyId: 'overseas-media',
    domain: 'overseas-adaptation',
    phaseCoverage: ['professional'],
    category: 'europe-career',
    theme: 'relationships',
    title: '外来者的标签',
    nodeTitles: ['当地媒体给出定义', '队友询问你的背景', '你要留下什么印象'],
    choiceTexts: ['坦然讲述自己的来路', '只用场上表现回答'],
  },
  {
    familyId: 'national-call-up',
    domain: 'national-team',
    phaseCoverage: ['professional'],
    category: 'national-team',
    theme: 'trajectory',
    title: '国家队的来信',
    nodeTitles: ['入选通知抵达', '第一次合练', '争取正式出场'],
    choiceTexts: ['把握每次训练机会', '先适应国家队节奏'],
  },
  {
    familyId: 'national-omission',
    domain: 'national-team',
    phaseCoverage: ['professional'],
    category: 'national-team',
    theme: 'trajectory',
    title: '落选之后',
    nodeTitles: ['名单没有你的名字', '媒体追问原因', '下一次窗口前'],
    choiceTexts: ['用俱乐部表现回应', '接受现状继续成长'],
  },
  {
    familyId: 'national-captaincy',
    domain: 'national-team',
    phaseCoverage: ['professional'],
    category: 'national-team',
    theme: 'relationships',
    title: '国家队的责任',
    nodeTitles: ['老队员交来袖标', '更衣室等待你的声音', '如何定义带队'],
    choiceTexts: ['主动承担责任', '用稳定表现影响队友'],
  },
  {
    familyId: 'retirement-last-season',
    domain: 'retirement',
    phaseCoverage: ['retirement'],
    category: 'off-pitch',
    theme: 'trajectory',
    title: '最后一个赛季',
    nodeTitles: ['身体开始提醒你', '年轻人接近位置', '为告别做准备'],
    choiceTexts: ['把经验交给下一代', '再为自己争取一次'],
  },
  {
    familyId: 'retirement-next-role',
    domain: 'retirement',
    phaseCoverage: ['retirement'],
    category: 'off-pitch',
    theme: 'off-pitch',
    title: '退役后的方向',
    nodeTitles: ['新的生活开始敲门', '旧队友邀请你留下', '决定下一种身份'],
    choiceTexts: ['回到熟悉的足球岗位', '尝试完全不同的生活'],
  },
  {
    familyId: 'retirement-review',
    domain: 'retirement',
    phaseCoverage: ['retirement'],
    category: 'off-pitch',
    theme: 'relationships',
    title: '人们如何记住你',
    nodeTitles: ['最后一次回看履历', '重要的人说起往事', '给自己的生涯落款'],
    choiceTexts: ['记住共同走过的人', '接受属于自己的答案'],
  },
];

const makeChoice = (
  family: StoryFamilySpec,
  nodeIndex: number,
  choiceIndex: 0 | 1,
): EventChoice => ({
  id: `${family.familyId}-choice-${nodeIndex + 1}-${choiceIndex + 1}`,
  text: family.choiceTexts[choiceIndex],
  riskLabel: choiceIndex === 0 ? 'medium' : 'low',
  effects: choiceIndex === 0 ? { confidence: 2 } : { coachTrust: 2 },
  response:
    choiceIndex === 0
      ? `${family.title}让你选择站出来，决定会留下新的评价。`
      : `${family.title}让你选择保留余地，关系和节奏都因此改变。`,
  followUp: nodeIndex < 2 ? '下一幕会根据你的选择继续展开。' : '这条经历会成为生涯记录的一部分。',
});

export const storyFamilyEvents: readonly EventDefinition[] = FAMILY_SPECS.flatMap((family) =>
  family.nodeTitles.map((nodeTitle, nodeIndex) => {
    const eventId = `${family.familyId}-node-${nodeIndex + 1}`;
    return {
      id: eventId,
      version: 1,
      category: family.category,
      rarity: 'uncommon',
      theme: family.theme,
      interaction: 'decision',
      baseWeight: 8,
      title: nodeTitle,
      description: `${family.title}进入新的阶段，你需要在这一节点做出判断。`,
      condition: {
        ...(family.phaseCoverage.includes('professional') ? { requireOverseas: true } : {}),
        ...(nodeIndex === 0
          ? { excludeStoryId: `${family.familyId}-node-3` }
          : { requireStoryId: `${family.familyId}-node-${nodeIndex}` }),
      },
      participantRoles: family.category === 'off-pitch' ? ['family'] : ['youth-coach'],
      storyId: `${family.familyId}-node-${nodeIndex + 1}`,
      storyFamilyId: family.familyId,
      nextEvents: nodeIndex < 2 ? [`${family.familyId}-node-${nodeIndex + 2}`] : undefined,
      choices: [makeChoice(family, nodeIndex, 0), makeChoice(family, nodeIndex, 1)],
      cooldownWeeks: 16,
    } satisfies EventDefinition;
  }),
);

export const storyFamilyRegistry: readonly StoryFamilyDefinition[] = FAMILY_SPECS.map((family) => ({
  familyId: family.familyId,
  domain: family.domain,
  phaseCoverage: family.phaseCoverage,
  minNodes: 3,
  distinctResolutions: 2,
  nodeEventIds: family.nodeTitles.map((_, nodeIndex) => `${family.familyId}-node-${nodeIndex + 1}`),
  terminalEventIds: [`${family.familyId}-node-3`],
}));

export interface StoryFamilyCoverage {
  familyId: string;
  nodeCount: number;
  resolutionCount: number;
  missingEventIds: string[];
}

export interface StoryFamilyCoverageSummary {
  familyCount: number;
  families: StoryFamilyCoverage[];
  missingEventIds: string[];
}

export const countFamilies = (
  events: readonly EventDefinition[] = storyFamilyEvents,
): StoryFamilyCoverageSummary => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const families = storyFamilyRegistry.map((family) => {
    const missingEventIds = family.nodeEventIds.filter((eventId) => !eventsById.has(eventId));
    const resolutionCount = family.terminalEventIds.reduce(
      (count, eventId) => count + (eventsById.get(eventId)?.choices.length ?? 0),
      0,
    );
    return {
      familyId: family.familyId,
      nodeCount: family.nodeEventIds.length - missingEventIds.length,
      resolutionCount,
      missingEventIds,
    };
  });
  return {
    familyCount: families.length,
    families,
    missingEventIds: families.flatMap(({ missingEventIds }) => missingEventIds),
  };
};

export const familiesBelowThreshold = (
  options: { minNodes: number; minResolutions: number },
  events: readonly EventDefinition[] = storyFamilyEvents,
): StoryFamilyCoverage[] =>
  countFamilies(events).families.filter(
    ({ nodeCount, resolutionCount }) =>
      nodeCount < options.minNodes || resolutionCount < options.minResolutions,
  );

export const countFamiliesByDomain = (
  events: readonly EventDefinition[] = storyFamilyEvents,
): Record<StoryFamilyDomain, number> =>
  storyFamilyRegistry
    .filter((family) =>
      family.nodeEventIds.every((eventId) => events.some((event) => event.id === eventId)),
    )
    .reduce(
      (counts, family) => ({
        ...counts,
        [family.domain]: (counts[family.domain] ?? 0) + 1,
      }),
      {} as Record<StoryFamilyDomain, number>,
    );
