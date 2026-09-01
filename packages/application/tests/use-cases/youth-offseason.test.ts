import { describe, expect, it } from 'vitest';
import {
  CareerSaveV3Schema,
  type CareerSaveV2,
  type EventDefinition,
  type YouthAcademyProfile,
  type YouthContentBundle,
} from '@football/contracts';
import {
  advanceCareerMonth,
  completeYouthSeason,
  enterOffseason,
  startNextYouthSeason,
} from '../../src/index';

const academies: YouthAcademyProfile[] = [
  academy('home', '浦江青年队', 60, 'local-academy'),
  academy('away', '齐鲁青年队', 76, 'local-academy'),
  academy('school', '明德校园足球', 45, 'school-elite'),
  academy('relocate', '南岭青训营', 55, 'relocation-academy'),
];

const content: YouthContentBundle = {
  academies: [...academies],
  competitions: [
    {
      id: 'league',
      name: '测试青年联赛',
      participatingAcademyIds: ['home', 'away', 'school', 'relocate'],
      seasonStartMonth: 9,
      seasonEndMonth: 6,
      targetFixtureCount: { min: 18, max: 26 },
    },
  ],
  people: [],
  events: [] as EventDefinition[],
};

describe('休赛期阶段机', () => {
  it('赛季完成 → 赛季总结 → 休赛期结算 → 开启下赛季', () => {
    let save = finishSeason(createSave(42));
    const completed = completeYouthSeason(save);
    save = completed.save;
    expect(save.seasonHistory).toHaveLength(1);
    expect(save.seasonHistory[0]!.seasonId).toBe(save.season.id);

    const entered = enterOffseason(save, content.academies);
    save = entered.save;
    expect(save.careerPhase).toBe('offseason');
    expect(save.offseason).not.toBeNull();
    expect(save.health.fitness).toBeGreaterThanOrEqual(88);
    expect(save.health.fitness).toBeLessThanOrEqual(96);
    expect(save.health.fatigue).toBe(0);
    expect(save.offseason!.briefing.ageUpdate.to).toBeGreaterThanOrEqual(
      save.offseason!.briefing.ageUpdate.from,
    );
    expect(save.ledger.some(({ type }) => type === 'offseason-settlement')).toBe(true);

    const next = startNextYouthSeason(save, content);
    expect(next.careerPhase).toBe('youth-season');
    expect(next.season.id).toBe('season-2025');
    expect(next.season.startDate).toBe('2025-09-01');
    expect(next.season.fixtures.length).toBeGreaterThanOrEqual(18);
    expect(next.seasonHistory).toHaveLength(1);
    expect(next.ledger.some(({ summary }) => summary.includes('开启新赛季'))).toBe(true);
    expect(next.monthlyAdvance.status).toBe('idle');
  });

  it('休赛期结算与下赛季生成在同种子下完全一致', () => {
    const a = startNextYouthSeason(
      enterOffseason(finishSeason(createSave(7)), content.academies).save,
      content,
    );
    const b = startNextYouthSeason(
      enterOffseason(finishSeason(createSave(7)), content.academies).save,
      content,
    );
    expect(a).toEqual(b);
  });

  it('非法阶段转移被拒绝', () => {
    const save = finishSeason(createSave(42));
    expect(() =>
      enterOffseason({ ...save, season: { ...save.season, completed: false } }, content.academies),
    ).toThrow(/尚未结束/);
    const entered = enterOffseason(save, content.academies);
    expect(() => completeYouthSeason(entered.save)).toThrow(/阶段/);
    expect(() =>
      startNextYouthSeason(
        CareerSaveV3Schema.parse({ ...createSave(1), schemaVersion: 3 }),
        content,
      ),
    ).toThrow(/阶段/);
  });

  it('被放弃或留队玩家均可开启下赛季，可指定补救机构', () => {
    let save = finishSeason(createSave(42));
    const completed = completeYouthSeason(save);
    const released = completed.outcome.status === 'released';
    save = completed.save;
    const entered = enterOffseason(save, content.academies);
    const target = released ? 'school' : 'relocate';
    const next = startNextYouthSeason(entered.save, content, target);
    expect(next.season.academyId).toBe(target);
    expect(next.season.fixtures.every((f) => [f.homeClubId, f.awayClubId].includes(target))).toBe(
      true,
    );
  });

  it('19 岁青训赛季结算后后续方向为职业市场', () => {
    const finished = finishSeason(createSave(42));
    const save = { ...finished, player: { ...finished.player, age: 19 } };

    const completed = completeYouthSeason(save);

    expect(completed.outcome.nextPath).toBe('professional-market');
    expect(completed.outcome.summary).toContain('职业市场');
  });
});

function finishSeason(initial: CareerSaveV2) {
  let save: ReturnType<typeof toV3> = toV3(initial);
  let guard = 0;
  while (!save.season.completed && guard < 12) {
    const outcome = advanceCareerMonth(save, academies);
    if (outcome.status === 'awaiting-decision') throw new Error('测试种子不应产生决策事件');
    save = outcome.save;
    guard += 1;
  }
  expect(save.season.completed).toBe(true);
  return save;
}

const toV3 = (save: CareerSaveV2) => CareerSaveV3Schema.parse({ ...save, schemaVersion: 3 });

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
      factIds: [],
      matchIds: [],
    },
    ledger: [],
    randomState: { seed, sequencePosition: 0 },
  };
};

function academy(
  id: string,
  name: string,
  level: number,
  pathway: YouthAcademyProfile['pathway'],
): YouthAcademyProfile {
  return {
    id,
    name,
    regionId: 'test',
    pathway,
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
