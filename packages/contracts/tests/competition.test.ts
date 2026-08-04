import { describe, it, expect } from 'vitest';
import { CompetitionDefinitionSchema } from '../src/competition';

describe('CompetitionDefinition', () => {
  it('validates a competition definition', () => {
    const valid = CompetitionDefinitionSchema.parse({
      id: 'csl',
      name: '中国足球协会超级联赛',
      country: 'China',
      tier: 1,
      type: 'LEAGUE',
    });
    expect(valid.id).toBe('csl');
    expect(valid.tier).toBe(1);
  });

  it('rejects invalid tier', () => {
    expect(() => CompetitionDefinitionSchema.parse({
      id: 'invalid', name: 'Test', country: 'China', tier: 0, type: 'LEAGUE',
    })).toThrow();
  });
});