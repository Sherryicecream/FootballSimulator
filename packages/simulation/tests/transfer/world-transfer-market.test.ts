import { describe, expect, it } from 'vitest';
import { allClubProfiles } from '../../../content/src';
import type { WorldClubPulse } from '@football/contracts';
import {
  selectPlayerMarketClubs,
  simulateWorldTransferWindow,
} from '../../src/transfer/world-transfer-market';

const pulseFor = (clubId: string, tier: number): WorldClubPulse => ({
  clubId,
  country: 'china',
  tier,
  seasonId: 'world-2030',
  finalRank: 1,
  points: 60,
  domesticHonours: [],
  continentalStatus: 'none',
  continentalAppearancesLast3: 0,
  transferActivityLast2: 0,
  lastNewsWindow: null,
});

describe('world transfer market', () => {
  it('lets every club become a source and destination over deterministic windows', () => {
    const clubs = allClubProfiles();
    const activities = Array.from({ length: 10 }, (_, index) =>
      simulateWorldTransferWindow({
        clubs,
        pulses: clubs.map((club) => pulseFor(club.id, club.tier)),
        previous: [],
        seasonId: `world-203${index}`,
        window: 'summer',
        seed: index,
      }),
    ).flat();
    const sourceIds = new Set(activities.map(({ fromClubId }) => fromClubId));
    const destinationIds = new Set(activities.map(({ toClubId }) => toClubId));

    expect(sourceIds.size).toBe(240);
    expect(destinationIds.size).toBe(240);
    expect(activities.every(({ fromClubId, toClubId }) => fromClubId !== toClubId)).toBe(true);
  });

  it('is deterministic and avoids repeating a pair without a new reason', () => {
    const clubs = allClubProfiles().slice(0, 24);
    const input = {
      clubs,
      pulses: clubs.map((club) => pulseFor(club.id, club.tier)),
      previous: [],
      seasonId: 'world-2030',
      window: 'summer' as const,
      seed: 12,
    };
    const first = simulateWorldTransferWindow(input);
    const second = simulateWorldTransferWindow(input);
    const next = simulateWorldTransferWindow({ ...input, previous: first, window: 'winter' });

    expect(first).toEqual(second);
    expect(
      next.some((activity) =>
        first.some(
          (old) =>
            old.fromClubId === activity.fromClubId &&
            old.toClubId === activity.toClubId &&
            old.reason === activity.reason,
        ),
      ),
    ).toBe(false);
    expect(
      first.every(
        ({ fromClubId, toClubId }) =>
          clubs.some(({ id }) => id === fromClubId) && clubs.some(({ id }) => id === toClubId),
      ),
    ).toBe(true);
  });

  it('keeps the player market as a small readable projection', () => {
    const clubs = allClubProfiles();
    const selected = selectPlayerMarketClubs({
      clubs,
      pulses: clubs.map((club) => pulseFor(club.id, club.tier)),
      playerAbility: 62,
      playerAdaptability: 70,
      seed: 4,
    });

    expect(selected.length).toBeLessThanOrEqual(24);
    expect(new Set(selected.map(({ country }) => country)).size).toBeGreaterThan(1);
  });
});
