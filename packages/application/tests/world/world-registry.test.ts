import { describe, expect, it } from 'vitest';
import type { WorldClubPulse } from '@football/contracts';
import {
  createWorldRegistry,
  mergeWorldClubPulses,
  readWorldLeague,
  writeWorldLeagueSummary,
} from '../../src/world/world-registry';

describe('WorldRegistry', () => {
  it('stores and reads a non-player league summary without match details', () => {
    const registry = createWorldRegistry();
    const next = writeWorldLeagueSummary(registry, {
      country: 'england',
      source: 'world',
      seasonId: 'world-england-2030-tier-1',
      completed: true,
      champion: 'england-club-1',
      promoted: [],
      relegated: ['england-club-12'],
    });

    expect(readWorldLeague(next, 'england', 'world-england-2030-tier-1')).toEqual({
      country: 'england',
      source: 'world',
      seasonId: 'world-england-2030-tier-1',
      completed: true,
      champion: 'england-club-1',
      promoted: [],
      relegated: ['england-club-12'],
    });
    expect(next).not.toHaveProperty('fixtures');
    expect(next.entries[0]).not.toHaveProperty('fixtures');
  });

  it('keeps two non-player leagues in the same country independent', () => {
    const registry = createWorldRegistry();
    const tierOne = writeWorldLeagueSummary(registry, {
      country: 'japan',
      source: 'world',
      seasonId: 'world-japan-2030-tier-1',
      completed: true,
      champion: 'japan-tier-1-champion',
      promoted: [],
      relegated: ['japan-tier-1-relegated'],
    });
    const tierTwo = writeWorldLeagueSummary(tierOne, {
      country: 'japan',
      source: 'world',
      seasonId: 'world-japan-2030-tier-2',
      completed: true,
      champion: 'japan-tier-2-champion',
      promoted: ['japan-tier-2-promoted'],
      relegated: [],
    });

    expect(readWorldLeague(tierTwo, 'japan', 'world-japan-2030-tier-1')?.champion).toBe(
      'japan-tier-1-champion',
    );
    expect(readWorldLeague(tierTwo, 'japan', 'world-japan-2030-tier-2')?.champion).toBe(
      'japan-tier-2-champion',
    );
    expect(tierTwo.entries.filter(({ country }) => country === 'japan')).toHaveLength(2);
  });

  it('replaces only the matching player season reference', () => {
    const registry = writeWorldLeagueSummary(createWorldRegistry(), {
      country: 'spain',
      source: 'world',
      seasonId: 'world-spain-2030-tier-1',
      completed: false,
      promoted: [],
      relegated: [],
    });
    const next = writeWorldLeagueSummary(registry, {
      country: 'spain',
      source: 'player',
      seasonId: 'pro-spain-tier-1-2030',
      completed: false,
      promoted: [],
      relegated: [],
    });

    expect(readWorldLeague(next, 'spain', 'world-spain-2030-tier-1')?.source).toBe('world');
    expect(readWorldLeague(next, 'spain', 'pro-spain-tier-1-2030')?.source).toBe('player');
  });

  it('replaces matching club season pulses without duplicating other records', () => {
    const original: WorldClubPulse = {
      clubId: 'club-england-1',
      country: 'england',
      tier: 1,
      seasonId: 'world-2030',
      finalRank: 2,
      points: 60,
      domesticHonours: [],
      continentalStatus: 'main-stage',
      continentalAppearancesLast3: 1,
      transferActivityLast2: 1,
      lastNewsWindow: 'summer-2030',
    };
    const other: WorldClubPulse = {
      ...original,
      clubId: 'club-japan-1',
      country: 'japan',
      seasonId: 'world-2029',
    };
    const updated: WorldClubPulse = { ...original, finalRank: 1, points: 66 };
    const registry = { ...createWorldRegistry(), clubPulses: [original, other] };

    const once = mergeWorldClubPulses(registry, [updated]);
    const twice = mergeWorldClubPulses(once, [updated]);

    const withSummary = writeWorldLeagueSummary(once, {
      country: 'england',
      source: 'world',
      seasonId: 'world-england-2031',
      completed: true,
      promoted: [],
      relegated: [],
    });

    expect(once.clubPulses).toEqual([updated, other]);
    expect(twice).toEqual(once);
    expect(twice.clubPulses).toHaveLength(2);
    expect(withSummary.clubPulses).toEqual(once.clubPulses);
  });

  it('keeps only the newest compact pulse for each club', () => {
    const original = makePulseForRegistry('club-rolling', 'world-2030');
    const later = { ...original, seasonId: 'world-2031', finalRank: 1 };
    const merged = mergeWorldClubPulses(createWorldRegistry(), [original, later]);

    expect(merged.clubPulses).toEqual([later]);
  });
});

const makePulseForRegistry = (clubId: string, seasonId: string): WorldClubPulse => ({
  clubId,
  country: 'china',
  tier: 1,
  seasonId,
  finalRank: 2,
  points: 60,
  domesticHonours: [],
  continentalStatus: 'none',
  continentalAppearancesLast3: 0,
  transferActivityLast2: 0,
  lastNewsWindow: null,
});
