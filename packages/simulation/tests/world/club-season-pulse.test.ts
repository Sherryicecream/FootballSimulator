import { describe, expect, it } from 'vitest';
import { allClubProfiles } from '../../../content/src';
import {
  WorldClubPulseSchema,
  WorldRegistrySchema,
  type ClubProfile,
  type WorldClubSeasonResult,
  type WorldClubPulse,
} from '@football/contracts';
import { buildWorldClubPulses } from '../../src/world/club-season-pulse';

const makeSeasonResults = (
  clubs: readonly ClubProfile[],
  seasonId = 'world-2030',
): WorldClubSeasonResult[] =>
  clubs.map((club, index) => ({
    clubId: club.id,
    country: club.country ?? 'china',
    tier: club.tier,
    seasonId,
    finalRank: (index % 12) + 1,
    points: Math.max(0, 66 - index),
    domesticHonours: index === 0 ? ['league-champion'] : [],
    continentalStatus: index === 0 ? 'champion' : 'none',
  }));

const makePulse = (overrides: Partial<WorldClubPulse> = {}): WorldClubPulse => ({
  clubId: 'club-1',
  country: 'china',
  tier: 1,
  seasonId: 'world-2029',
  finalRank: 2,
  points: 60,
  domesticHonours: [],
  continentalStatus: 'main-stage',
  continentalAppearancesLast3: 1,
  transferActivityLast2: 1,
  lastNewsWindow: 'summer-2029',
  ...overrides,
});

describe('world club season pulses', () => {
  it('builds one compact pulse for every playable club', () => {
    const clubs = allClubProfiles();
    const pulses = buildWorldClubPulses({
      clubs,
      seasonResults: makeSeasonResults(clubs),
      previous: [],
    });

    expect(pulses).toHaveLength(240);
    expect(new Set(pulses.map(({ clubId }) => clubId)).size).toBe(240);
    expect(pulses.every((pulse) => !('fixtures' in pulse))).toBe(true);
    expect(pulses.every((pulse) => WorldClubPulseSchema.safeParse(pulse).success)).toBe(true);
  });

  it('sorts output by club id and repeats the same result for the same inputs', () => {
    const clubs = [...allClubProfiles()].reverse();
    const seasonResults = makeSeasonResults(clubs).reverse();
    const input = { clubs, seasonResults, previous: [] as WorldClubPulse[] };

    const first = buildWorldClubPulses(input);
    const second = buildWorldClubPulses(input);

    expect(first).toEqual(second);
    expect(first.map(({ clubId }) => clubId)).toEqual(
      [...first.map(({ clubId }) => clubId)].sort(),
    );
  });

  it('uses a legal empty-season fallback when a club has no season result', () => {
    const clubs = allClubProfiles().slice(0, 2);
    const pulses = buildWorldClubPulses({
      clubs,
      seasonResults: makeSeasonResults(clubs.slice(0, 1)),
      previous: [],
    });
    const missing = pulses.find(({ clubId }) => clubId === clubs[1]!.id);

    expect(missing).toMatchObject({
      clubId: clubs[1]!.id,
      country: clubs[1]!.country,
      tier: clubs[1]!.tier,
      seasonId: 'world-2030',
      finalRank: null,
      points: 0,
      domesticHonours: [],
      continentalStatus: 'none',
      continentalAppearancesLast3: 0,
      transferActivityLast2: 0,
      lastNewsWindow: null,
    });
    expect(WorldClubPulseSchema.parse(missing)).toEqual(missing);
  });

  it('keeps rolling history in the compact pulse', () => {
    const clubs = allClubProfiles().slice(0, 1);
    const club = clubs[0]!;
    const previous = [
      makePulse({ clubId: club.id, seasonId: 'world-2028', continentalStatus: 'qualifying' }),
      makePulse({ clubId: club.id, seasonId: 'world-2029', continentalStatus: 'champion' }),
    ];

    const [pulse] = buildWorldClubPulses({
      clubs,
      seasonResults: [
        {
          ...makeSeasonResults(clubs)[0]!,
          continentalStatus: 'none',
        },
      ],
      previous,
    });

    expect(pulse).toMatchObject({
      continentalAppearancesLast3: 2,
      transferActivityLast2: 1,
      lastNewsWindow: 'summer-2029',
    });
  });

  it('reloads legacy world registries with an empty club pulse list', () => {
    expect(WorldRegistrySchema.parse({ entries: [] }).clubPulses).toEqual([]);
  });
});
