import { describe, expect, it } from 'vitest';
import type { CareerSaveV2, YouthAcademyProfile } from '@football/contracts';
import { advanceCareerMonth } from '../../src/use-cases/advance-career-month';

describe('advanceCareerMonth', () => {
  it('advances every week in the month, settles growth once and uses fixed opponents', () => {
    const save = createSave();
    const outcome = advanceCareerMonth(save, academies);

    expect(outcome.status).toBe('month-complete');
    if (outcome.status !== 'month-complete') return;
    expect(outcome.save.season.currentMonth).toBe('2024-10');
    expect(outcome.save.season.fixtures[0]?.status).toBe('played');
    expect(outcome.report.matchIds).toEqual(['match-fixture-1', 'match-fixture-2']);
    expect(outcome.report.attributeChanges.length).toBeGreaterThan(0);
    expect(
      Object.values(outcome.save.monthlyAdvance.developmentAccrual).every(
        (progress) => progress >= 0 && progress < 1,
      ),
    ).toBe(true);
    expect(outcome.save.health.fatigue).toBeGreaterThan(0);
  });

  it('runs a complete no-decision season for 100 deterministic seeds without illegal state', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      let save = createSave(seed);
      let guard = 0;
      while (!save.season.completed && guard < 12) {
        const outcome = advanceCareerMonth(save, academies);
        expect(outcome.status).not.toBe('awaiting-decision');
        save = outcome.save;
        guard += 1;
      }
      expect(save.season.completed).toBe(true);
      expect(guard).toBeLessThanOrEqual(10);
      expect(save.health.fatigue).toBeGreaterThanOrEqual(0);
      expect(save.health.fatigue).toBeLessThanOrEqual(100);
      expect(save.season.fixtures.every((fixture) => fixture.status === 'played')).toBe(true);
    }
  });
});

const academies: YouthAcademyProfile[] = [
  academy('home', '浦江青年队', 72),
  academy('away', '齐鲁青年队', 76),
];
function academy(id: string, name: string, level: number): YouthAcademyProfile {
  return {
    id,
    name,
    regionId: 'test',
    pathway: 'local-academy',
    facilityLevel: level,
    coachingLevel: level,
    competitionLevel: level,
    competitionIntensity: level,
    developmentStyle: '均衡',
    firstTeamLevel: level,
    promotionTendency: 55,
    relocationPressure: 20,
  };
}

const createSave = (seed = 42): CareerSaveV2 => {
  const attributes = {
    technical: {
      firstTouch: 50,
      dribbling: 50,
      passing: 52,
      shooting: 45,
      defending: 55,
      aerialAbility: 54,
    },
    physical: { pace: 52, strength: 55, stamina: 53, agility: 50 },
    mental: {
      offTheBall: 48,
      vision: 50,
      decision: 51,
      composure: 50,
      determination: 60,
      discipline: 58,
    },
  };
  const fixtures = Array.from({ length: 10 }, (_, index) => ({
    id: `fixture-${index + 1}`,
    weekKey: `2024-W${String(index * 4 + 2).padStart(2, '0')}`,
    competitionId: 'league',
    homeClubId: index % 2 ? 'away' : 'home',
    awayClubId: index % 2 ? 'home' : 'away',
    status: 'scheduled' as const,
    resultId: null,
  }));
  return {
    schemaVersion: 2,
    contentVersion: 'test-1',
    careerId: `career-${seed}`,
    player: {
      identity: {
        name: '林河',
        hometown: '上海',
        homelandId: 'shanghai',
        dateOfBirth: '2008-01-01',
        primaryPosition: 'FORWARD',
        preferredFoot: 'RIGHT',
        weakFootLevel: 35,
        growthBackground: 'academy',
        personalityTendency: 'composed',
      },
      attributes,
      development: {
        attributePotential: {
          technical: Object.fromEntries(
            Object.entries(attributes.technical).map(([key, value]) => [key, value + 20]),
          ) as typeof attributes.technical,
          physical: Object.fromEntries(
            Object.entries(attributes.physical).map(([key, value]) => [key, value + 20]),
          ) as typeof attributes.physical,
          mental: Object.fromEntries(
            Object.entries(attributes.mental).map(([key, value]) => [key, value + 20]),
          ) as typeof attributes.mental,
        },
        maturationPace: 'normal',
        professionalism: 70,
        stability: 60,
        pressureResistance: 60,
        adaptability: 60,
        injuryProneness: 20,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 10,
    },
    season: {
      id: 'season-2024',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      currentDate: '2024-09-01',
      currentWeek: 1,
      currentMonth: '2024-09',
      academyId: 'home',
      fixtures,
      completed: false,
    },
    clubContext: {
      squadMembers: [],
      positionDepth: {
        CENTER_BACK: [],
        FULL_BACK: [],
        DEFENSIVE_MIDFIELDER: [],
        MIDFIELDER: [],
        WINGER: [],
        FORWARD: [],
      },
      playerRole: 'regular',
      coachEvaluation: 60,
      firstTeamStage: 'none',
    },
    health: { fitness: 80, fatigue: 12, recentLoad: 20, activeInjury: null, previousInjuries: [] },
    currentState: { morale: 55, form: 60, confidence: 55 },
    trainingPlan: { focus: 'technical', intensity: 'normal', positionFocus: null },
    relationships: { persons: [], activeRelations: [] },
    story: {
      activeStorylines: [],
      completedStoryIds: [],
      cooldownsByEventId: {},
      pendingDelayedEffects: [],
      pendingEvent: null,
    },
    monthlyAdvance: {
      monthKey: '2024-09',
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'idle',
      developmentAccrual: {},
    },
    ledger: [],
    randomState: { seed, sequencePosition: 0 },
  };
};
