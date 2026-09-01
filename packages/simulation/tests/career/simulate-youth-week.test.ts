import { describe, expect, it } from 'vitest';
import { simulateYouthWeek } from '../../src/career/simulate-youth-week';
import { academies, createYouthSave } from '../fixtures/youth-save';

describe('simulateYouthWeek', () => {
  it('is deterministic, consumes the fixed fixture once and keeps visible growth monthly', () => {
    const save = createYouthSave();
    const first = simulateYouthWeek(save, academies);
    const second = simulateYouthWeek(save, academies);

    expect(first).toEqual(second);
    expect(first.facts.find(({ type }) => type === 'match')?.matchContext).toEqual(
      expect.objectContaining({
        opponentStrength: expect.any(Number),
        isHome: expect.any(Boolean),
        played: expect.any(Boolean),
        minutesPlayed: expect.any(Number),
        goals: expect.any(Number),
        assists: expect.any(Number),
      }),
    );
    expect(first.matchResult?.opponentName).toBe('齐鲁青年队');
    expect(first.save.season.fixtures[0]?.status).toBe('played');
    expect(first.save.player.attributes).toEqual(save.player.attributes);
    expect(Object.values(first.developmentAccrual).some((value) => value > 0)).toBe(true);
    expect(first.save.health.fatigue).toBeGreaterThan(0);
    if (first.matchResult?.played) {
      const ownGoals = first.matchResult.isHome
        ? first.matchResult.homeScore
        : first.matchResult.awayScore;
      expect(first.matchResult.goals).toBeLessThanOrEqual(ownGoals);
    } else {
      expect(first.matchResult?.rating).toBeNull();
    }
  });

  it('cannot replay a fixture that is already marked played', () => {
    const save = createYouthSave({
      season: {
        ...createYouthSave().season,
        fixtures: [
          {
            ...createYouthSave().season.fixtures[0]!,
            status: 'played',
            resultId: 'match-fixture-1',
          },
        ],
      },
    });
    expect(simulateYouthWeek(save, academies).matchResult).toBeNull();
  });
});
