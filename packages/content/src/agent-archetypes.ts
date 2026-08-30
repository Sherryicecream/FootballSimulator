import type { AgentArchetype } from '@football/contracts';

/** 虚构经纪人原型：风格描述其谈判倾向，focusTier 表示主要服务的俱乐部层级区间。 */
export const youthAgents: AgentArchetype[] = [
  agent('agent-shen', '沈志远', '务实稳健，重视出场承诺', 3, 6),
  agent('agent-lin', '林曼华', '敢于把年轻人送进豪门名单', 6, 9),
  agent('agent-hou', '侯一鸣', '擅长为青训球员争取长约保障', 4, 7),
];

function agent(
  id: string,
  name: string,
  style: string,
  focusTierMin: number,
  focusTierMax: number,
): AgentArchetype {
  return { id, name, style, focusTierMin, focusTierMax };
}
