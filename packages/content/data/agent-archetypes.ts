// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
import type { AgentArchetype } from '@football/contracts';

export const agentArchetypes: AgentArchetype[] = [
  {
    id: 'agent-shen',
    name: '沈志远',
    style: '务实稳健，重视出场承诺',
    focusTierMin: 3,
    focusTierMax: 6,
  },
  {
    id: 'agent-lin',
    name: '林曼华',
    style: '敢于把年轻人送进豪门名单',
    focusTierMin: 6,
    focusTierMax: 9,
  },
  {
    id: 'agent-hou',
    name: '侯一鸣',
    style: '擅长为青训球员争取长约保障',
    focusTierMin: 4,
    focusTierMax: 7,
  },
];
