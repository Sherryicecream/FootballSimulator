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
      },
      {
        id: 'steady-growth',
        text: '保持现有节奏，继续夯实基础',
        riskLabel: 'low',
        effects: { confidence: 2, coachTrust: 1, fatigue: -1 },
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
      },
      {
        id: 'protect-rhythm',
        text: '维持稳定节奏，避免操之过急',
        riskLabel: 'low',
        effects: { confidence: 2, morale: 2, fatigue: -2 },
      },
    ],
  },
];
