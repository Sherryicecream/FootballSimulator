import { describe, expect, it } from 'vitest';
import type { ContinentalClubInput, ContinentalQuota } from '@football/contracts';
import { selectContinentalParticipants } from '../../src/competition/continental-qualification';

const quota: ContinentalQuota = { directPerCountry: 2, qualifyingPerCountry: 1 };

const club = (
  input: Partial<ContinentalClubInput> & Pick<ContinentalClubInput, 'clubId'>,
): ContinentalClubInput => ({
  country: 'england',
  tier: 1,
  finalRank: 4,
  points: 50,
  cupWinner: false,
  ...input,
});

describe('continental qualification', () => {
  it('keeps champions and cup winners eligible without duplicate slots', () => {
    const participants = selectContinentalParticipants({
      federation: 'uefa',
      clubs: [
        club({ clubId: 'england-a', finalRank: 1, points: 70, cupWinner: true }),
        club({ clubId: 'england-b', finalRank: 2, points: 65 }),
        club({ clubId: 'england-c', finalRank: 3, points: 60, cupWinner: true }),
        club({ clubId: 'england-d', finalRank: 4, points: 55 }),
      ],
      seasonPulses: [],
      recentHistory: [],
      quota,
    });

    expect(participants).toEqual([
      expect.objectContaining({ clubId: 'england-a', stage: 'direct', reason: 'league-champion' }),
      expect.objectContaining({ clubId: 'england-b', stage: 'direct', reason: 'league-rank' }),
      expect.objectContaining({ clubId: 'england-c', stage: 'qualifying', reason: 'cup-winner' }),
    ]);
    expect(new Set(participants.map(({ clubId }) => clubId)).size).toBe(participants.length);
  });

  it('uses recent appearances only as a soft tie-break for close candidates', () => {
    const clubs = [
      club({ clubId: 'england-a', finalRank: 1, points: 70 }),
      club({ clubId: 'england-b', finalRank: 2, points: 65 }),
      club({ clubId: 'england-c', finalRank: 3, points: 60 }),
      club({ clubId: 'england-d', finalRank: 4, points: 59 }),
    ];
    const result = selectContinentalParticipants({
      federation: 'uefa',
      clubs,
      seasonPulses: [],
      recentHistory: [
        {
          clubId: 'england-c',
          country: 'england',
          tier: 1,
          seasonId: 'world-2029',
          finalRank: 3,
          points: 60,
          domesticHonours: [],
          continentalStatus: 'main-stage',
          continentalAppearancesLast3: 3,
          transferActivityLast2: 0,
          lastNewsWindow: null,
        },
      ],
      quota,
    });

    expect(result.at(-1)?.clubId).toBe('england-d');
  });

  it('uses club id as the final deterministic tie-break', () => {
    const clubs = [
      club({ clubId: 'england-a', finalRank: 1, points: 70 }),
      club({ clubId: 'england-b', finalRank: 2, points: 65 }),
      club({ clubId: 'england-z', finalRank: 3, points: 60 }),
      club({ clubId: 'england-y', finalRank: 3, points: 60 }),
    ];
    const input = {
      federation: 'uefa' as const,
      clubs,
      seasonPulses: [],
      recentHistory: [],
      quota,
    };

    expect(selectContinentalParticipants(input)).toEqual(selectContinentalParticipants(input));
    expect(selectContinentalParticipants(input).at(-1)?.clubId).toBe('england-y');
  });
});
