import { describe, it, expect } from 'vitest';
import {
  createPerson,
  updateRelationship,
  addMemory,
  getRelationshipLabel,
} from '../../src/relationships/relationship-manager';
import { PersonSchema, PersonMemorySchema } from '@football/contracts';

describe('relationshipManager', () => {
  it('创建人物', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    expect(person.name).toBe('李教练');
    expect(person.relationship.trust).toBe(50);
    expect(person.relationship.respect).toBe(50);
    expect(person.relationship.closeness).toBe(30);
  });

  it('创建的人物通过 Zod 校验', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格', { tactical: 75 });
    const result = PersonSchema.safeParse(person);
    expect(result.success).toBe(true);
  });

  it('更新关系维度', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = updateRelationship(person, { trust: 10, respect: 5 });
    expect(updated.relationship.trust).toBe(60);
    expect(updated.relationship.respect).toBe(55);
    expect(updated.relationship.closeness).toBe(30); // 不变
  });

  it('关系维度不会超过上限', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = updateRelationship(person, { trust: 100 });
    expect(updated.relationship.trust).toBe(100);
  });

  it('关系维度不会低于下限', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = updateRelationship(person, { trust: -200 });
    expect(updated.relationship.trust).toBe(0);
  });

  it('添加记忆', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = addMemory(person, 'coach_challenge_01', '教练挑战了我', 2024, 5, 'positive');
    expect(updated.memories.length).toBe(1);
    expect(updated.memories[0]!.eventId).toBe('coach_challenge_01');
    expect(updated.memories[0]!.emotionalImpact).toBe('positive');
  });

  it('添加多条记忆并验证顺序', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const step1 = addMemory(person, 'event_1', '第一次事件', 2024, 1, 'positive');
    const step2 = addMemory(step1, 'event_2', '第二次事件', 2024, 2, 'negative');
    expect(step2.memories.length).toBe(2);
    expect(step2.memories[0]!.eventId).toBe('event_1');
    expect(step2.memories[1]!.eventId).toBe('event_2');
  });

  it('添加的记忆通过 Zod 校验', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = addMemory(person, 'test_event', '测试记忆', 2024, 10, 'neutral');
    const memoryResult = PersonMemorySchema.safeParse(updated.memories[0]);
    expect(memoryResult.success).toBe(true);
  });

  it('获取关系标签', () => {
    expect(getRelationshipLabel(85)).toBe('亲密');
    expect(getRelationshipLabel(60)).toBe('信任');
    expect(getRelationshipLabel(40)).toBe('中立');
    expect(getRelationshipLabel(15)).toBe('疏远');
    expect(getRelationshipLabel(0)).toBe('疏远');
    expect(getRelationshipLabel(100)).toBe('亲密');
  });
});
