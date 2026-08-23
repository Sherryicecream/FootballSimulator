import { describe, expect, it } from 'vitest';
import {
  CareerSaveV2Schema,
  EventDefinitionSchema,
  InjuryStatusSchema,
  PlayerDevelopmentProfileSchema,
  YouthEventInstanceSchema,
  YouthSeasonStateSchema,
} from '../src';

const attributes = {
  technical: {
    firstTouch: 60,
    dribbling: 58,
    passing: 62,
    shooting: 45,
    defending: 55,
    aerialAbility: 52,
  },
  physical: { pace: 61, strength: 57, stamina: 59, agility: 60 },
  mental: {
    offTheBall: 55,
    vision: 60,
    decision: 56,
    composure: 54,
    determination: 65,
    discipline: 63,
  },
};

describe('youth season v2 contracts', () => {
  it('validates per-attribute potential and maturation pace', () => {
    const development = PlayerDevelopmentProfileSchema.parse({
      attributePotential: attributes,
      maturationPace: 'late',
      professionalism: 72,
      stability: 61,
      pressureResistance: 58,
      adaptability: 66,
      injuryProneness: 24,
    });

    expect(development.attributePotential.technical.passing).toBe(62);
    expect(development.maturationPace).toBe('late');
  });

  it('validates a fixed fixture and monthly cursor', () => {
    const season = YouthSeasonStateSchema.parse({
      id: 'season-2024',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      currentDate: '2024-09-01',
      currentWeek: 1,
      currentMonth: '2024-09',
      academyId: 'shanghai-pujiang',
      fixtures: [
        {
          id: 'fixture-1',
          weekKey: '2024-W38',
          competitionId: 'east-youth-league',
          homeClubId: 'shanghai-pujiang',
          awayClubId: 'shandong-qilu',
          status: 'scheduled',
          resultId: null,
        },
      ],
      completed: false,
    });

    expect(season.fixtures[0]?.awayClubId).toBe('shandong-qilu');
  });

  it('records injury recovery and causal event references', () => {
    const injury = InjuryStatusSchema.parse({
      id: 'ankle-1',
      kind: 'moderate',
      bodyArea: '右脚踝',
      occurredWeek: '2024-W42',
      expectedRecoveryWeeks: 5,
      recoveredWeeks: 2,
      recurrenceRisk: 0.18,
    });
    const event = YouthEventInstanceSchema.parse({
      eventId: 'position-battle',
      title: '位置竞争',
      description: '同位置队友进入首发竞争。',
      choices: [{ id: 'respond', text: '积极应对', riskLabel: 'low', effects: {} }],
      resolvedChoiceId: null,
      participantIds: ['rival-7', 'coach-1'],
      factRefs: ['fact-depth-chart-3'],
    });

    expect(injury.recoveredWeeks).toBe(2);
    expect(event.participantIds).toEqual(['rival-7', 'coach-1']);
    expect(event.factRefs).toEqual(['fact-depth-chart-3']);
    expect(event.interaction).toBe('decision');
  });

  it('defaults legacy events and accepts contextual youth conditions', () => {
    const legacyEvent = EventDefinitionSchema.parse({
      id: 'legacy-event',
      version: 1,
      category: 'china-youth',
      rarity: 'common',
      title: '旧事件',
      description: '旧内容无需立即补写新字段。',
      choices: [{ id: 'continue', text: '继续', riskLabel: 'low', effects: {} }],
    });
    const contextualEvent = EventDefinitionSchema.parse({
      id: 'late-bloomer-window',
      version: 1,
      category: 'china-youth',
      rarity: 'rare',
      theme: 'trajectory',
      interaction: 'automatic',
      baseWeight: 8,
      title: '迟来的窗口',
      description: '身体和比赛理解在赛季后段出现新的增长迹象。',
      condition: {
        growthBackgrounds: ['school'],
        personalityTendencies: ['resilient'],
        maturationPaces: ['late'],
        playerRoles: ['rotation', 'regular'],
        firstTeamStages: ['none', 'watchlist'],
        minWeek: 20,
        maxWeek: 40,
        minMorale: 30,
        maxMorale: 90,
        minConfidence: 30,
        maxConfidence: 90,
        minFatigue: 0,
        maxFatigue: 60,
        minCoachEvaluation: 35,
        maxCoachEvaluation: 75,
        minProfessionalism: 55,
        minStability: 45,
      },
      choices: [{ id: 'notice', text: '记录变化', riskLabel: 'low', effects: {} }],
    });

    expect(legacyEvent.theme).toBe('off-pitch');
    expect(legacyEvent.interaction).toBe('decision');
    expect(legacyEvent.baseWeight).toBe(20);
    expect(contextualEvent.condition.maturationPaces).toEqual(['late']);
    expect(contextualEvent.condition.minProfessionalism).toBe(55);
    expect(contextualEvent.interaction).toBe('automatic');
  });

  it('rejects professional career fields from the v2 save boundary', () => {
    const candidate = createV2Save();
    const parsed = CareerSaveV2Schema.safeParse({
      ...candidate,
      contract: { salary: 1000 },
      transferHistory: [],
      nationalTeam: null,
    });

    expect(parsed.success).toBe(false);
  });
});

const createV2Save = () => ({
  schemaVersion: 2,
  contentVersion: 'youth-1',
  careerId: 'career-42',
  player: {
    identity: {
      name: '林岳',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-01-01',
      primaryPosition: 'CENTER_BACK',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: 'academy',
      personalityTendency: 'composed',
    },
    attributes,
    development: {
      attributePotential: attributes,
      maturationPace: 'normal',
      professionalism: 70,
      stability: 60,
      pressureResistance: 60,
      adaptability: 55,
      injuryProneness: 25,
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
    academyId: 'shanghai-pujiang',
    fixtures: [],
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
    playerRole: 'fringe',
    coachEvaluation: 35,
    firstTeamStage: 'none',
  },
  health: {
    fitness: 70,
    fatigue: 5,
    recentLoad: 0,
    activeInjury: null,
    previousInjuries: [],
  },
  currentState: { morale: 60, form: 50, confidence: 50 },
  trainingPlan: { focus: 'technical', intensity: 'normal', positionFocus: null },
  relationships: { persons: [], activeRelations: [] },
  story: {
    activeStorylines: [],
    completedStoryIds: [],
    cooldownsByEventId: {},
    pendingDelayedEffects: [],
  },
  monthlyAdvance: {
    monthKey: '2024-09',
    nextWeekIndex: 0,
    totalWeeks: 4,
    status: 'idle',
  },
  ledger: [],
  randomState: { seed: 42, sequencePosition: 0 },
});
