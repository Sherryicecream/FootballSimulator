import type { Person, PersonMemory, RelationshipDimension } from '@football/contracts';

/**
 * 创建一个人物，初始关系为默认值
 */
export function createPerson(
  id: string,
  name: string,
  role: string,
  age: number,
  personality: string,
  traits?: Record<string, number>,
): Person {
  return {
    id,
    name,
    role,
    age,
    personality,
    traits: traits ?? {},
    relationship: { trust: 50, respect: 50, closeness: 30 },
    memories: [],
  };
}

/**
 * 更新关系维度（信任、尊重、亲近）
 * 所有维度值限制在 [0, 100] 范围内
 */
export function updateRelationship(
  person: Person,
  delta: Partial<RelationshipDimension>,
): Person {
  const clamp = (value: number): number => Math.min(100, Math.max(0, value));

  return {
    ...person,
    relationship: {
      trust: clamp(person.relationship.trust + (delta.trust ?? 0)),
      respect: clamp(person.relationship.respect + (delta.respect ?? 0)),
      closeness: clamp(person.relationship.closeness + (delta.closeness ?? 0)),
    },
  };
}

/**
 * 为人物添加一条记忆
 */
export function addMemory(
  person: Person,
  eventId: string,
  summary: string,
  season: number,
  week: number,
  emotionalImpact: 'positive' | 'negative' | 'neutral',
): Person {
  const memory: PersonMemory = {
    eventId,
    summary,
    season,
    week,
    emotionalImpact,
  };
  return {
    ...person,
    memories: [...person.memories, memory],
  };
}

/**
 * 根据关系均值得出自然语言标签
 * 80+: 亲密, 55-79: 信任, 30-54: 中立, 0-29: 疏远
 */
export function getRelationshipLabel(averageScore: number): string {
  if (averageScore >= 80) return '亲密';
  if (averageScore >= 55) return '信任';
  if (averageScore >= 30) return '中立';
  return '疏远';
}