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
  // 🏋️ 训练维度：额外加练
  {
    id: 'extra-training',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '额外加练',
    description:
      '今天的常规训练结束后，球场还有几个人在加练。你感觉今天的状态不错，留下来加练一会儿可能会有所收获。',
    condition: {},
    choices: [
      {
        id: 'et-stay',
        text: '留下来加练一小时',
        riskLabel: 'low',
        effects: { fatigue: 5, coachTrust: 2, morale: 2 },
      },
      {
        id: 'et-rest',
        text: '回去休息，明天还有训练',
        riskLabel: 'low',
        effects: { fatigue: -3, morale: 1 },
      },
    ],
    cooldownWeeks: 5,
  },
  // ⚽ 比赛维度：首秀机会
  {
    id: 'debut-chance',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '首秀机会',
    description:
      '教练在赛前找到你："这场比赛的对手实力不强，我打算让你下半场替补出场。准备好了吗？"你的心跳加速，这是你期盼已久的机会。',
    condition: {},
    choices: [
      {
        id: 'dc-ready',
        text: '准备好了！一定全力以赴',
        riskLabel: 'medium',
        effects: { morale: 8, coachTrust: 5 },
      },
      {
        id: 'dc-nervous',
        text: '有点紧张，但我会尽力',
        riskLabel: 'low',
        effects: { morale: 3, coachTrust: 2 },
      },
    ],
    cooldownWeeks: 10,
  },
  // 👥 关系维度：更衣室冲突
  {
    id: 'locker-room-conflict',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    title: '更衣室里的争执',
    description:
      '训练结束后，两名队友在更衣室里因为一次训练中的拼抢发生了激烈的争吵。气氛很紧张，其他人都不知道该说什么。',
    condition: {},
    choices: [
      {
        id: 'lc-mediate',
        text: '上前劝架，缓和气氛',
        riskLabel: 'medium',
        effects: { morale: 3, coachTrust: 2 },
      },
      {
        id: 'lc-stay-out',
        text: '不关我的事，默默离开',
        riskLabel: 'low',
        effects: { morale: -1 },
      },
    ],
    cooldownWeeks: 10,
  },
  // 🏠 生活维度：社交与休息
  {
    id: 'social-vs-rest',
    version: 1,
    category: 'off-pitch',
    rarity: 'common',
    title: '周末的安排',
    description:
      '周末到了，队友们约好一起去唱卡拉OK，但你最近感觉有点累，也想好好休息一下。',
    condition: {},
    choices: [
      {
        id: 'sr-social',
        text: '和队友们出去玩，增进感情',
        riskLabel: 'low',
        effects: { morale: 4, fatigue: 4 },
      },
      {
        id: 'sr-rest',
        text: '在家休息，恢复体力',
        riskLabel: 'low',
        effects: { fatigue: -5, morale: 1 },
      },
    ],
    cooldownWeeks: 5,
  },
  // 🏥 健康维度：体能测试
  {
    id: 'fitness-test',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '体能测试',
    description:
      '今天队里安排了每月一次的体能测试——12分钟跑。教练会记录每个人的成绩，成绩好的球员在接下来的训练中会得到更多关注。',
    condition: {},
    choices: [
      {
        id: 'ft-go-hard',
        text: '全力冲刺，争取最好成绩',
        riskLabel: 'medium',
        effects: { fitness: 5, fatigue: 8, coachTrust: 3, morale: 2 },
      },
      {
        id: 'ft-pace',
        text: '按自己的节奏跑，安全第一',
        riskLabel: 'low',
        effects: { fitness: 2, fatigue: 3, morale: 1 },
      },
    ],
    cooldownWeeks: 8,
  },
  // 🧠 心理维度①：信心危机
  {
    id: 'confidence-crisis',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '信心危机',
    description:
      '最近几场训练中你频频出现失误，队友开始有些不耐烦了。你开始怀疑自己是否真的适合踢球，晚上躺在床上辗转难眠。',
    condition: {},
    choices: [
      {
        id: 'cc-push-through',
        text: '加倍努力，用汗水克服困难',
        riskLabel: 'medium',
        effects: { morale: -3, fatigue: 8, coachTrust: 3 },
      },
      {
        id: 'cc-talk',
        text: '找教练谈心，寻求指导',
        riskLabel: 'low',
        effects: { morale: 2, fatigue: 2, coachTrust: 4 },
      },
    ],
    cooldownWeeks: 10,
  },
  // 🧠 心理维度②：媒体关注
  {
    id: 'media-attention',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '媒体的关注',
    description:
      '你在上一场比赛中的出色表现引起了本地媒体的注意。一名记者来到训练基地，想要采访你——这是你第一次面对镜头。',
    condition: {},
    choices: [
      {
        id: 'ma-accept',
        text: '接受采访，自信表达',
        riskLabel: 'medium',
        effects: { morale: 5, coachTrust: 1 },
      },
      {
        id: 'ma-decline',
        text: '婉拒采访，专注于训练',
        riskLabel: 'low',
        effects: { morale: 1, coachTrust: 3 },
      },
    ],
    cooldownWeeks: 15,
  },
  // 🎯 发展维度①：球探观察
  {
    id: 'scout-watching',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '球探在看你',
    description:
      '今天的训练场上来了几张陌生的面孔——听队友说，那是来自其他俱乐部青年队的球探。他们在场边认真记录着每个球员的表现。',
    condition: {},
    choices: [
      {
        id: 'sw-show-off',
        text: '尽情展示自己，冒点险也值得',
        riskLabel: 'high',
        effects: { morale: 5, coachTrust: 2, fatigue: 5 },
      },
      {
        id: 'sw-normal',
        text: '保持平常心，正常发挥',
        riskLabel: 'low',
        effects: { morale: 2, coachTrust: 1 },
      },
    ],
    cooldownWeeks: 15,
  },
  // 🎯 发展维度②：试训邀请
  {
    id: 'trial-invitation',
    version: 1,
    category: 'china-youth',
    rarity: 'legendary',
    title: '试训邀请',
    description:
      '你的表现引起了一家知名俱乐部青训营的注意！他们发来了一份为期一周的试训邀请函。如果表现出色，有可能被正式录取。这是一个改变命运的机会。',
    condition: {},
    choices: [
      {
        id: 'ti-go',
        text: '接受邀请，去更高平台挑战',
        riskLabel: 'high',
        effects: { morale: 10, coachTrust: 5, fatigue: 5 },
      },
      {
        id: 'ti-stay',
        text: '婉拒，留在当前俱乐部继续磨练',
        riskLabel: 'low',
        effects: { morale: 3, coachTrust: 5 },
      },
    ],
    cooldownWeeks: 20,
  },
];

export function getYouthEvents(): EventDefinition[] {
  return youthEvents;
}