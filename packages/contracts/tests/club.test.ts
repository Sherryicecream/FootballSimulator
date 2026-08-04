import { describe, it, expect } from 'vitest';
import { ClubDefinitionSchema } from '../src/club';

describe('ClubDefinition', () => {
  it('validates a club definition', () => {
    const valid = ClubDefinitionSchema.parse({
      id: 'shanghai-wings',
      name: '上海翼帆',
      shortName: '翼帆',
      country: 'China',
      city: '上海',
      tier: 1,
      reputation: 70,
      tacticalStyle: 'possession',
    });
    expect(valid.id).toBe('shanghai-wings');
    expect(valid.reputation).toBe(70);
  });

  it('rejects reputation out of range', () => {
    expect(() => ClubDefinitionSchema.parse({
      id: 'test', name: 'Test FC', shortName: 'TFC',
      country: 'China', city: '北京', tier: 1,
      reputation: 150, tacticalStyle: 'balanced',
    })).toThrow();
  });
});