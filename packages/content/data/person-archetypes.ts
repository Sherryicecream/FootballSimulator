// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
import type { PersonArchetype } from '@football/contracts';

export const personArchetypes: PersonArchetype[] = [
  {
    id: 'coach-demanding-developer',
    role: 'youth-coach',
    personality: '要求严格但重视培养',
    traitRanges: {
      experience: {
        min: 65,
        max: 90,
      },
      patience: {
        min: 45,
        max: 75,
      },
    },
  },
  {
    id: 'assistant-supportive-observer',
    role: 'assistant-coach',
    personality: '善于观察并愿意沟通',
    traitRanges: {
      experience: {
        min: 45,
        max: 75,
      },
      empathy: {
        min: 60,
        max: 90,
      },
    },
  },
  {
    id: 'teammate-friendly-worker',
    role: 'teammate',
    personality: '友善勤奋',
    traitRanges: {
      ability: {
        min: 35,
        max: 70,
      },
      ambition: {
        min: 40,
        max: 80,
      },
    },
  },
  {
    id: 'rival-ambitious-prospect',
    role: 'rival',
    personality: '好胜且目标明确',
    traitRanges: {
      ability: {
        min: 45,
        max: 80,
      },
      ambition: {
        min: 65,
        max: 95,
      },
    },
  },
];
