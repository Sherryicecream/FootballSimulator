import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2 } from '@football/contracts';
import { buildMatchdayMoments } from '../../src/career/matchday-moments';

describe('buildMatchdayMoments', () => {
  it('turns a match fact into a difficult-match preview and outcome replay', () => {
    const fact = {
      id: 'match-week-03',
      weekKey: '2024-W03',
      type: 'match',
      summary: '海港青年队 2:1；出场 70 分钟，评分 7.8；突出表现',
      participantIds: [],
      matchContext: {
        opponentStrength: 74,
        isHome: true,
        played: true,
        minutesPlayed: 70,
        rating: 7.8,
        goals: 1,
        assists: 0,
      },
    } as CareerLedgerEntryV2;

    const result = buildMatchdayMoments([fact]);

    expect(result).toEqual([
      expect.objectContaining({
        weekKey: '2024-W03',
        opponentName: '海港青年队',
        difficulty: 'difficult',
        result: 'win',
        playerStatus: 'played',
        preMatch: expect.stringContaining('高强度'),
        postMatch: expect.stringContaining('拿下'),
      }),
    ]);
  });
  it('falls back to legacy professional appearance text when context is absent', () => {
    const fact = {
      id: 'pro-match-week-03',
      weekKey: '2027-W03',
      type: 'pro-match',
      summary: '职业俱乐部2 1:0；首发 70 分钟，评分 7.2',
      participantIds: [],
    } as CareerLedgerEntryV2;

    const [moment] = buildMatchdayMoments([fact]);

    expect(moment).toEqual(
      expect.objectContaining({
        opponentName: '职业俱乐部2',
        playerStatus: 'played',
        postMatch: expect.stringContaining('70 分钟'),
      }),
    );
  });
});
