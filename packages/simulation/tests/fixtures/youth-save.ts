import type { CareerSaveV2, YouthAcademyProfile } from '@football/contracts';

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

export const academies: YouthAcademyProfile[] = [
  academy('home', '浦江青年队', 72),
  academy('away', '齐鲁青年队', 76),
];

export const createYouthSave = (overrides: Partial<CareerSaveV2> = {}): CareerSaveV2 => ({
  schemaVersion: 2,
  contentVersion: 'test-1',
  careerId: 'career-42',
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
        technical: { ...attributes.technical, shooting: 75, dribbling: 72 },
        physical: { ...attributes.physical, pace: 70 },
        mental: { ...attributes.mental, offTheBall: 73 },
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
    fixtures: [
      {
        id: 'fixture-1',
        weekKey: '2024-W02',
        competitionId: 'league',
        homeClubId: 'home',
        awayClubId: 'away',
        status: 'scheduled',
        resultId: null,
      },
    ],
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
  randomState: { seed: 42, sequencePosition: 0 },
  ...overrides,
});

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
