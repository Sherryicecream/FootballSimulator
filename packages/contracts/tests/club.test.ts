import { describe, it, expect } from 'vitest';
import { ClubDefinitionSchema } from '../src/club';
import { ClubProfileSchema } from '../src/clubs';

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
    expect(() =>
      ClubDefinitionSchema.parse({
        id: 'test',
        name: 'Test FC',
        shortName: 'TFC',
        country: 'China',
        city: '北京',
        tier: 1,
        reputation: 150,
        tacticalStyle: 'balanced',
      }),
    ).toThrow();
  });
});

describe('ClubProfile', () => {
  const baseProfile = {
    id: 'ov-sakura-frontier',
    name: '樱前线',
    tier: 7,
    regionId: 'japan',
    positionalNeeds: ['FORWARD'],
    youthCycle: 'stable',
    overseas: true,
    wageBudget: 60,
  };

  it('接受海外区域标记', () => {
    const asia = ClubProfileSchema.parse({ ...baseProfile, overseasRegion: 'asia' });
    const europe = ClubProfileSchema.parse({ ...baseProfile, overseasRegion: 'europe' });
    expect(asia.overseasRegion).toBe('asia');
    expect(europe.overseasRegion).toBe('europe');
  });

  it('允许俱乐部不设置海外区域', () => {
    const parsed = ClubProfileSchema.parse(baseProfile);
    expect(parsed.overseas).toBe(true);
    expect(parsed.overseasRegion).toBeUndefined();
  });

  it('拒绝非法海外区域', () => {
    expect(() => ClubProfileSchema.parse({ ...baseProfile, overseasRegion: 'america' })).toThrow();
  });
});
