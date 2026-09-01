import type { EventDefinition } from '@football/contracts';

export const trajectoryEvents: EventDefinition[] = [
  {
    id: 'early-prodigy-signal',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 8,
    title: '提前到来的关注',
    description: '你的成长速度超出同龄人的预期，教练组开始讨论是否让你提前接受更高强度的训练。',
    condition: { maturationPaces: ['early'], minCoachEvaluation: 60, minWeek: 8 },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 24,
    choices: [
      {
        id: 'step-up',
        text: '接受更高强度的训练安排',
        riskLabel: 'medium',
        effects: { confidence: 3, coachTrust: 3, fatigue: 5 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“提前面对更高强度，意味着你也要提前学会保护自己。”',
          },
        ],
        response:
          '你接受了升级训练的邀请，第一次合练的节奏几乎不给人喘息。你被迫更快做决定，也第一次感到自己的成长速度正在带来新的压力。',
        followUp: '接下来几周会观察你能否适应更高强度；如果疲劳失控，提前升级也可能变成提前停训。',
      },
      {
        id: 'steady-growth',
        text: '保持现有节奏，继续夯实基础',
        riskLabel: 'low',
        effects: { confidence: 2, coachTrust: 1, fatigue: -1 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“不急着证明自己，能把基础做深也是一种选择。”',
          },
        ],
        response:
          '你谢绝了立刻加码，选择把已有的技术再打磨一遍。别人可能先看到更快的进步，但你知道自己在给未来的强度留余量。',
        followUp: '教练会继续关注你的成长曲线；当基础足够稳定时，更高强度的机会还会再次出现。',
      },
    ],
  },
  {
    id: 'late-bloomer-window',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 7,
    title: '迟来的成长窗口',
    description: '长期稳定的训练开始显现效果，教练认为你正在进入一段此前未被注意到的成长窗口。',
    condition: {
      growthBackgrounds: ['late-bloomer'],
      maturationPaces: ['late'],
      minWeek: 18,
      minProfessionalism: 55,
      minStability: 45,
      requireFactType: 'training',
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 24,
    choices: [
      {
        id: 'seize-window',
        text: '主动增加针对性训练',
        riskLabel: 'medium',
        effects: { confidence: 4, coachTrust: 2, fatigue: 4 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“窗口打开了，但不要把每一天都当成最后一天。”',
          },
        ],
        response:
          '你抓住这段迟来的成长窗口，主动把训练时间用在此前最薄弱的环节。进步还没有写进数据表，但动作开始变得更有把握。',
        followUp:
          '接下来的训练会检验这段窗口能持续多久；适度加量能放大成长，过度加量会让疲劳抢走成果。',
      },
      {
        id: 'protect-rhythm',
        text: '维持稳定节奏，避免操之过急',
        riskLabel: 'low',
        effects: { confidence: 2, morale: 2, fatigue: -2 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“迟来的机会更需要耐心，别让急切替你做决定。”',
          },
        ],
        response:
          '你没有因为终于被注意到就突然改变全部计划，而是保持原有节奏，只增加了最必要的一点专项训练。成长的感觉因此更安静，也更可控。',
        followUp:
          '教练会观察你的稳定进步；如果窗口持续打开，你可以再逐步增加强度，而不必一次押上全部体能。',
      },
    ],
  },
];
