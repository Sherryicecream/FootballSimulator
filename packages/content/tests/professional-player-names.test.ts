import { describe, expect, it } from 'vitest';
import { allClubProfiles, professionalPlayerNamePools } from '../src';

describe('professional player name content', () => {
  it('provides localized, natural name pools for every playable country', () => {
    for (const [country, names] of Object.entries(professionalPlayerNamePools)) {
      expect(names.length, country).toBeGreaterThanOrEqual(20);
      expect(
        names.every((name) => !/\d$/.test(name)),
        country,
      ).toBe(true);
    }
  });

  it('attaches a country-specific pool to every playable club', () => {
    for (const club of allClubProfiles()) {
      expect(club.personNamePool?.length, club.id).toBeGreaterThanOrEqual(20);
      expect(
        club.personNamePool?.every((name) => !/\d$/.test(name)),
        club.id,
      ).toBe(true);
    }
  });
});
