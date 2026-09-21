import { describe, expect, it } from 'vitest';
import { ClubProfileSchema, CountrySchema } from '../src';

const baseClub = {
  id: 'club-test',
  name: '测试俱乐部',
  tier: 5,
  regionId: 'shanghai',
  positionalNeeds: ['FORWARD'],
  youthCycle: 'stable' as const,
  wageBudget: 50,
};

describe('CountrySchema', () => {
  it('accepts all eight supported countries', () => {
    const countries = [
      'china',
      'england',
      'spain',
      'germany',
      'italy',
      'france',
      'japan',
      'korea',
    ] as const;

    for (const country of countries) {
      expect(CountrySchema.parse(country)).toBe(country);
      expect(ClubProfileSchema.parse({ ...baseClub, country }).country).toBe(country);
    }
  });

  it('accepts england without treating it as the legacy europe region', () => {
    const club = ClubProfileSchema.parse({ ...baseClub, country: 'england' });

    expect(club.country).toBe('england');
    expect(club.overseasRegion).toBeUndefined();
  });

  it('rejects an unsupported country', () => {
    expect(() => CountrySchema.parse('europe')).toThrow();
    expect(() => ClubProfileSchema.parse({ ...baseClub, country: 'europe' })).toThrow();
  });

  it('keeps the legacy overseas region as a compatibility alias', () => {
    const club = ClubProfileSchema.parse({
      ...baseClub,
      overseas: true,
      overseasRegion: 'europe',
      country: 'england',
    });

    expect(club.overseasRegion).toBe('europe');
    expect(club.country).toBe('england');
  });
});
