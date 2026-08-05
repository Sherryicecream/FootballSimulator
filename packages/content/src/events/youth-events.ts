import type { EventDefinition } from '@football/contracts';

export const youthEvents: EventDefinition[] = [
  {
    id: 'coach-praise',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '教练的表扬',
    description:
      '今天的训练结束后，教练单独把你叫到一边，对你的表现表示了肯定。"这段时间进步很大，继续保持。"教练说道。',
    condition: {},
    choices: [
      {
        id: 'cp-humble',
        text: '感谢教练，我会继续努力',
        riskLabel: 'low',
        effects: { morale: 5, coachTrust: 3 },
      },
      {
        id: 'cp-confident',
        text: '是的，我感觉自己越来越好了',
        riskLabel: 'low',
        effects: { morale: 3, coachTrust: 5 },
      },
    ],
    cooldownWeeks: 4,
    narrativeTemplate: '## {title}\n\n{description}',
  },
  {
    id: 'late-to-training',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '训练迟到',
    description:
      '今早你睡过了头，赶到训练场时大家已经开始热身了。教练皱着眉头看了你一眼，没有说话。',
    condition: {},
    choices: [
      {
        id: 'lt-apologize',
        text: '诚恳道歉，解释原因',
        riskLabel: 'low',
        effects: { coachTrust: -2, morale: -2 },
      },
      {
        id: 'lt-quiet',
        text: '默默加入训练，用表现说话',
        riskLabel: 'medium',
        effects: { coachTrust: -5, morale: -1 },
      },
    ],
    cooldownWeeks: 8,
  },
  {
    id: 'team-invite',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '队友的邀请',
    description:
      '训练结束后，几个队友商量着周末一起去吃火锅，他们热情地邀请你一起参加。',
    condition: {},
    choices: [
      {
        id: 'ti-go',
        text: '当然去，和大家增进感情',
        riskLabel: 'low',
        effects: { morale: 5, fatigue: 3 },
      },
      {
        id: 'ti-rest',
        text: '婉拒，周末想休息一下',
        riskLabel: 'low',
        effects: { morale: 1, fatigue: -3 },
      },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'minor-injury',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '轻微不适',
    description:
      '训练中你感到小腿有些酸痛，队医建议你休息几天，但最近正是竞争主力位置的关键时期。',
    condition: {},
    choices: [
      {
        id: 'mi-rest',
        text: '听从队医建议，休息恢复',
        riskLabel: 'low',
        effects: { fatigue: -10, coachTrust: -2, morale: -2 },
      },
      {
        id: 'mi-push',
        text: '坚持训练，不能掉队',
        riskLabel: 'high',
        effects: { fatigue: 10, coachTrust: 3, morale: 3 },
      },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'competition-with-teammate',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '位置竞争',
    description:
      '队里来了一个新球员，和你踢同一个位置。教练在训练中让你们轮流上场，似乎正在考察谁更适合首发。',
    condition: {},
    choices: [
      {
        id: 'cw-train-harder',
        text: '加练，用实力证明自己',
        riskLabel: 'medium',
        effects: { fatigue: 8, coachTrust: 4, morale: 3 },
      },
      {
        id: 'cw-observed',
        text: '先观察对手的特点，再调整策略',
        riskLabel: 'low',
        effects: { morale: 2, coachTrust: 1 },
      },
    ],
    cooldownWeeks: 12,
  },
  {
    id: 'family-support',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '家人的鼓励',
    description:
      '父母打电话来关心你的训练和生活，叮嘱你注意身体，说他们为你感到骄傲。',
    condition: {},
    choices: [
      {
        id: 'fs-touched',
        text: '心里暖暖的，更加坚定',
        riskLabel: 'low',
        effects: { morale: 6 },
      },
      {
        id: 'fs-focused',
        text: '简短回应，继续专注于训练',
        riskLabel: 'low',
        effects: { morale: 2, coachTrust: 1 },
      },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'quiet-week-reflection',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '平淡的一周',
    description:
      '这一周没有特别的事情发生，训练按部就班，生活平静如水。你利用这段时间反思了自己的进步和不足。',
    condition: {},
    choices: [
      {
        id: 'qw-self-improve',
        text: '制定新的训练计划',
        riskLabel: 'low',
        effects: { morale: 2, fatigue: 2 },
      },
      {
        id: 'qw-rest',
        text: '好好休息，为下一周充电',
        riskLabel: 'low',
        effects: { fatigue: -5, morale: 1 },
      },
    ],
    cooldownWeeks: 3,
  },
];

export function getYouthEvents(): EventDefinition[] {
  return youthEvents;
}