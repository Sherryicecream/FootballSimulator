import { describe, expect, it } from 'vitest';
import type { ContinentalParticipant } from '@football/contracts';
import { simulateContinentalSeason } from '../../src/competition/continental-season';

const participants: ContinentalParticipant[] = [
  {
    clubId: 'england-a',
    country: 'england',
    federation: 'uefa',
    stage: 'direct',
    reason: 'league-champion',
  },
  {
    clubId: 'england-b',
    country: 'england',
    federation: 'uefa',
    stage: 'direct',
    reason: 'league-rank',
  },
  {
    clubId: 'spain-a',
    country: 'spain',
    federation: 'uefa',
    stage: 'qualifying',
    reason: 'cup-winner',
  },
  {
    clubId: 'spain-b',
    country: 'spain',
    federation: 'uefa',
    stage: 'qualifying',
    reason: 'coefficient',
  },
];

describe('continental background season', () => {
  it('does not create detailed fixtures for non-player clubs', () => {
    const summary = simulateContinentalSeason({
      competitionId: 'uefa-champions',
      seasonId: 'world-2030',
      participants,
      playerClubId: null,
      seed: 7,
    });

    expect(summary.playerFixtures).toBeNull();
    expect(summary.results).toHaveLength(participants.length);
    expect(summary.results.every(({ relatedFactId }) => relatedFactId.length > 0)).toBe(true);
  });

  it('expands only the player club fixtures and stays deterministic', () => {
    const input = {
      competitionId: 'uefa-champions',
      seasonId: 'world-2030',
      participants,
      playerClubId: 'england-a',
      seed: 7,
    };
    const first = simulateContinentalSeason(input);
    const second = simulateContinentalSeason(input);

    expect(first).toEqual(second);
    expect(first.playerFixtures?.length).toBeGreaterThan(0);
    expect(
      first.playerFixtures?.every(
        ({ homeClubId, awayClubId }) => homeClubId === 'england-a' || awayClubId === 'england-a',
      ),
    ).toBe(true);
  });
});
