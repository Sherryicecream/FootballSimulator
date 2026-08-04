import { describe, it, expect } from 'vitest';
import { PersonSchema, RelationshipGraphSchema, PersonMemorySchema } from '../src/person';

describe('PersonMemory', () => {
  it('验证人物记忆', () => {
    const valid = PersonMemorySchema.parse({
      eventId: 'coach_challenge_01',
      summary: '教练在训练后挑战了我',
      season: 2024,
      week: 5,
      emotionalImpact: 'positive',
    });
    expect(valid.eventId).toBe('coach_challenge_01');
  });
});

describe('Person', () => {
  it('验证人物定义', () => {
    const valid = PersonSchema.parse({
      id: 'coach_li',
      name: '李教练',
      role: '教练',
      age: 45,
      personality: '严格',
      traits: { tactical: 75, manManagement: 70, youthDevelopment: 80 },
      relationship: { trust: 50, respect: 50, closeness: 30 },
      memories: [],
    });
    expect(valid.name).toBe('李教练');
    expect(valid.relationship.trust).toBe(50);
  });
});

describe('RelationshipGraph', () => {
  it('验证关系图', () => {
    const valid = RelationshipGraphSchema.parse({
      persons: [],
      activeRelations: [],
    });
    expect(valid.persons).toHaveLength(0);
  });
});
