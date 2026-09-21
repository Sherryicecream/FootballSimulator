import { describe, expect, it } from 'vitest';
import type { ProFixture } from '@football/contracts';
import { countClubFixtures } from '../../src/career/competition-summary';

const fixture = (overrides: Partial<ProFixture>): ProFixture => ({
  id: 'fixture-1',
  weekKey: '2027-W02',
  competitionId: 'pro-league',
  homeClubId: 'club-a',
  awayClubId: 'club-b',
  status: 'scheduled',
  resultId: null,
  ...overrides,
});

describe('competition summary', () => {
  it('counts only played fixtures involving the selected club', () => {
    const fixtures = [
      fixture({ id: 'played-home', status: 'played', resultId: 'result-1' }),
      fixture({
        id: 'played-away',
        homeClubId: 'club-c',
        awayClubId: 'club-a',
        status: 'played',
        resultId: 'result-2',
      }),
      fixture({ id: 'scheduled-home' }),
      fixture({
        id: 'other-clubs',
        homeClubId: 'club-d',
        awayClubId: 'club-e',
        status: 'played',
        resultId: 'result-3',
      }),
    ];

    expect(countClubFixtures(fixtures, 'club-a')).toBe(2);
    expect(countClubFixtures(fixtures, 'club-c')).toBe(1);
  });
});
