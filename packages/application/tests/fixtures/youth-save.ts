import { expect } from 'vitest';
import {
  CareerSaveV3Schema,
  type CareerSaveV2,
  type EventDefinition,
  type YouthAcademyProfile,
  type YouthContentBundle,
} from '@football/contracts';
import { advanceCareerMonth } from '../../src/use-cases/advance-career-month';

export const academies: YouthAcademyProfile[] = [
  academy('home', '浦江青年队', 60, 'local-academy'),
  academy('away', '齐鲁青年队', 76, 'local-academy'),
  academy('school', '明德校园足球', 45, 'school-elite'),
  academy('relocate', '南岭青训营', 55, 'relocation-academy'),
];

export const content: YouthContentBundle = {
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
  clubs: [
    club('county-club', '云梦泽畔', 4, 'hubei-hunan', ['MIDFIELDER', 'FORWARD'], 'rebuilding', 36),
    club('river-club', '闽江渔火', 5, 'fujian', ['FORWARD', 'WINGER'], 'stable', 44),
    club(
      'city-club',
      '蜀中天府',
      6,
      'sichuan-chongqing',
      ['FORWARD', 'CENTER_BACK'],
      'rebuilding',
      55,
    ),
    club('top-club', '申海港联', 8, 'shanghai', ['FORWARD', 'WINGER'], 'contending', 90),
    club('tier5-a', '澜溪叠石', 5, 'jiangsu-zhejiang', ['WINGER', 'MIDFIELDER'], 'stable', 41),
    club('tier5-b', '青沼池塘', 5, 'hubei-hunan', ['CENTER_BACK', 'WINGER'], 'rebuilding', 39),
    club('tier5-c', '燕山炉匠', 5, 'beijing-tianjin', ['MIDFIELDER', 'FORWARD'], 'stable', 37),
    club('tier5-d', '南溪礁石', 5, 'guangdong', ['FULL_BACK', 'FORWARD'], 'rebuilding', 36),
  ],
  agents: [
    agent('agent-shen', '沈志远', '务实稳健', 3, 6),
    agent('agent-lin', '林曼华', '敢于推荐', 6, 9),
  ],
};

function club(
  id: string,
  name: string,
  tier: number,
  regionId: string,
  positionalNeeds: string[],
  youthCycle: 'rebuilding' | 'stable' | 'contending',
  wageBudget: number,
) {
  return { id, name, tier, regionId, positionalNeeds, youthCycle, wageBudget };
}

function agent(
  id: string,
  name: string,
  style: string,
  focusTierMin: number,
  focusTierMax: number,
) {
  return { id, name, style, focusTierMin, focusTierMax };
}

export const createSave = (seed = 42): CareerSaveV2 => {
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

export const toV3 = (save: CareerSaveV2) => CareerSaveV3Schema.parse({ ...save, schemaVersion: 3 });

/** 推进至赛季完成并结算为 v3 存档（不打断事件）。 */
export function finishSeason(initial: CareerSaveV2) {
  let save = toV3(initial);
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
