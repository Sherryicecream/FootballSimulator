import { describe, expect, it } from 'vitest';
import { allClubProfiles, clubCountByCountry } from '../src';

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

describe('country club registry', () => {
  it('contains exactly 240 clubs with the planned country distribution', () => {
    const clubs = allClubProfiles();
    const counts = clubCountByCountry();

    expect(clubs).toHaveLength(240);
    expect(counts).toEqual({
      china: 72,
      england: 24,
      spain: 24,
      germany: 24,
      italy: 24,
      france: 24,
      japan: 24,
      korea: 24,
    });
  });

  it('keeps China in six tiers and each overseas country in two adjacent 12-club tiers', () => {
    const clubs = allClubProfiles();

    for (const country of countries) {
      const countryClubs = clubs.filter((club) => club.country === country);
      const tiers = [...new Set(countryClubs.map(({ tier }) => tier))].sort((a, b) => a - b);

      expect(tiers).toHaveLength(country === 'china' ? 6 : 2);
      if (country !== 'china') expect(tiers[1]! - tiers[0]!).toBe(1);
      for (const tier of tiers) {
        expect(countryClubs.filter((club) => club.tier === tier)).toHaveLength(12);
      }
    }
  });

  it('has unique ids and names with China as the only domestic country', () => {
    const clubs = allClubProfiles();
    const ids = clubs.map(({ id }) => id);
    const names = clubs.map(({ name }) => name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    expect(clubs.every(({ name }) => name.trim().length > 0)).toBe(true);
    expect(
      clubs.filter(({ overseas }) => !overseas).every(({ country }) => country === 'china'),
    ).toBe(true);
    expect(
      clubs.filter(({ overseas }) => overseas).every(({ country }) => country !== 'china'),
    ).toBe(true);
  });
});
