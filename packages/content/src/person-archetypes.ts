import type { PersonArchetype } from '@football/contracts';

export const youthPersonArchetypes: PersonArchetype[] = [
  {
    id: 'coach-demanding-developer',
    role: 'youth-coach',
    personality: '要求严格但重视培养',
    traitRanges: { experience: { min: 65, max: 90 }, patience: { min: 45, max: 75 } },
  },
  {
    id: 'assistant-supportive-observer',
    role: 'assistant-coach',
    personality: '善于观察并愿意沟通',
    traitRanges: { experience: { min: 45, max: 75 }, empathy: { min: 60, max: 90 } },
  },
  {
    id: 'teammate-friendly-worker',
    role: 'teammate',
    personality: '友善勤奋',
    traitRanges: { ability: { min: 35, max: 70 }, ambition: { min: 40, max: 80 } },
  },
  {
    id: 'rival-ambitious-prospect',
    role: 'rival',
    personality: '好胜且目标明确',
    traitRanges: { ability: { min: 45, max: 80 }, ambition: { min: 65, max: 95 } },
  },
];
