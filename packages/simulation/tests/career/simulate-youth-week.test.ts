import { describe, expect, it } from 'vitest';
import { simulateYouthWeek } from '../../src/career/simulate-youth-week';
import { academies, createYouthSave } from '../fixtures/youth-save';

describe('simulateYouthWeek', () => {
  it('is deterministic, consumes the fixed fixture once and keeps visible growth monthly', () => {
    const save = createYouthSave();
    const first = simulateYouthWeek(save, academies);
    const second = simulateYouthWeek(save, academies);
    const training = first.facts.find(({ type }) => type === 'training');

    expect(training?.trainingContext).toEqual({
      focus: 'technical',
      intensity: 'normal',
      trainingLoad: 36,
      totalLoad: 36 + (first.matchResult?.minutesPlayed ?? 0) * 0.42,
    });

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

  it('uses unique match fact IDs across youth seasons', () => {
    const first = simulateYouthWeek(createYouthSave(), academies);
    const secondBase = createYouthSave();
    const second = simulateYouthWeek(
      {
        ...secondBase,
        season: {
          ...secondBase.season,
          id: 'season-2025',
          startDate: '2025-09-01',
          endDate: '2026-06-30',
          currentDate: '2025-09-01',
          currentWeek: 1,
          currentMonth: '2025-09',
          fixtures: secondBase.season.fixtures.map((fixture) => ({
            ...fixture,
            weekKey: fixture.weekKey.replace(/^\d{4}/, '2025'),
          })),
        },
      },
      academies,
    );
    const firstMatchIds = first.save.ledger
      .filter(({ type }) => type === 'match')
      .map(({ id }) => id);
    const secondMatchIds = second.save.ledger
      .filter(({ type }) => type === 'match')
      .map(({ id }) => id);

    expect(firstMatchIds.length).toBeGreaterThan(0);
    expect(secondMatchIds.length).toBeGreaterThan(0);
    expect(firstMatchIds.some((id) => secondMatchIds.includes(id))).toBe(false);
  });
});
