import { z } from 'zod';
import { CareerSaveSchema } from './career';
import { HealthStateSchema } from './health';
import { PlayerCareerV2Schema, type PlayerAttributes } from './player';
import { RandomStateSchema } from './random';
import { RelationshipGraphSchema } from './person';
import {
  CareerLedgerEntryV2Schema,
  MonthlyAdvanceCursorSchema,
  PlayerCurrentStateSchema,
  TrainingPlanSchema,
  YouthClubContextSchema,
  YouthSeasonStateSchema,
  YouthStoryStateSchema,
} from './youth-season';

export const CareerSaveV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  contentVersion: z.string().min(1).max(40),
  careerId: z.string().min(1).max(60),
  player: PlayerCareerV2Schema,
  season: YouthSeasonStateSchema,
  clubContext: YouthClubContextSchema,
  health: HealthStateSchema,
  currentState: PlayerCurrentStateSchema,
  trainingPlan: TrainingPlanSchema,
  relationships: RelationshipGraphSchema,
  story: YouthStoryStateSchema,
  monthlyAdvance: MonthlyAdvanceCursorSchema,
  ledger: z.array(CareerLedgerEntryV2Schema),
  randomState: RandomStateSchema,
});

export type CareerSaveV2 = z.infer<typeof CareerSaveV2Schema>;

export const migrateCareerSave = (raw: unknown): CareerSaveV2 => {
  const existingV2 = CareerSaveV2Schema.safeParse(raw);
  if (existingV2.success) {
    return existingV2.data;
  }

  const legacy = CareerSaveSchema.safeParse(raw);
  if (!legacy.success) {
    throw new Error('无法迁移存档：数据既不是有效 v1 也不是有效 v2');
  }

  const save = legacy.data;
  const academyId = save.context.academyId ?? `school-pathway-${save.player.identity.homelandId}`;
  const currentMonth = save.world.currentDate.slice(0, 7);
  const position = save.player.identity.primaryPosition;
  const playerPersonId = `player-${save.careerId}`;
  const maturationPaces = ['early', 'normal', 'late'] as const;

  return CareerSaveV2Schema.parse({
    schemaVersion: 2,
    contentVersion: 'youth-1',
    careerId: save.careerId,
    player: {
      identity: save.player.identity,
      attributes: save.player.attributes,
      development: {
        attributePotential: createAttributePotential(
          save.player.attributes,
          save.player.hiddenTraits.potential,
          save.randomState.seed,
        ),
        maturationPace: maturationPaces[save.randomState.seed % maturationPaces.length],
        professionalism: save.player.hiddenTraits.professionalism,
        stability: save.player.hiddenTraits.stability,
        pressureResistance: save.player.hiddenTraits.pressureResistance,
        adaptability: save.player.hiddenTraits.adaptability,
        injuryProneness: save.player.hiddenTraits.injuryProneness,
      },
      age: save.player.age,
      careerStage: save.player.careerStage,
      reputation: save.player.reputation,
    },
    season: {
      id: `youth-${save.world.season}`,
      startDate: `${save.world.season}-09-01`,
      endDate: `${save.world.season + 1}-06-30`,
      currentDate: save.world.currentDate,
      currentWeek: save.world.weekNumber,
      currentMonth,
      academyId,
      fixtures: [],
      completed: false,
    },
    clubContext: {
      squadMembers: [
        {
          personId: playerPersonId,
          primaryPosition: position,
          currentAbility: averageAttributes(save.player.attributes),
          form: 50,
          fitness: save.context.playerState.fitness,
          developmentPriority: 50,
        },
      ],
      positionDepth: {
        CENTER_BACK: position === 'CENTER_BACK' ? [playerPersonId] : [],
        FULL_BACK: position === 'FULL_BACK' ? [playerPersonId] : [],
        DEFENSIVE_MIDFIELDER: position === 'DEFENSIVE_MIDFIELDER' ? [playerPersonId] : [],
        MIDFIELDER: position === 'MIDFIELDER' ? [playerPersonId] : [],
        WINGER: position === 'WINGER' ? [playerPersonId] : [],
        FORWARD: position === 'FORWARD' ? [playerPersonId] : [],
      },
      playerRole:
        save.context.playerState.teamStatus === 'key'
          ? 'starter'
          : save.context.playerState.teamStatus,
      coachEvaluation: save.context.playerState.coachTrust,
      firstTeamStage: 'none',
    },
    health: {
      fitness: save.context.playerState.fitness,
      fatigue: save.context.playerState.fatigue,
      recentLoad: save.context.playerState.fatigue,
      activeInjury: null,
      previousInjuries: [],
    },
    currentState: {
      morale: save.context.playerState.morale,
      form: 50,
      confidence: save.context.playerState.morale,
    },
    trainingPlan: {
      focus: 'technical',
      intensity: save.context.trainingIntensity,
      positionFocus: null,
    },
    relationships: save.relationships,
    story: {
      activeStorylines: save.story.activeStorylines,
      completedStoryIds: save.story.completedStoryIds,
      cooldownsByEventId: save.story.cooldowns,
      themeCooldownsByTheme: {},
      pendingDelayedEffects: [],
      pendingEvent: save.context.pendingEvent
        ? {
            ...save.context.pendingEvent,
            participantIds: [],
            factRefs: [],
            storyId: null,
            nextEventIds: [],
            interaction: 'decision',
          }
        : null,
    },
    monthlyAdvance: {
      monthKey: currentMonth,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: save.context.pendingEvent ? 'awaiting-decision' : 'idle',
      developmentAccrual: {},
      factIds: [],
      matchIds: [],
      interactiveEventCount: 0,
    },
    ledger: save.ledger.map((entry, index) => ({
      id: `migrated-${index + 1}`,
      weekKey: `${save.world.season}-W${String('week' in entry ? entry.week : 1).padStart(2, '0')}`,
      type: 'event',
      summary: JSON.stringify(entry).slice(0, 500),
      participantIds: [],
    })),
    randomState: save.randomState,
  });
};

const createAttributePotential = (
  attributes: PlayerAttributes,
  overallPotential: number,
  seed: number,
): PlayerAttributes => {
  let offset = seed % 7;
  const mapGroup = <T extends Record<string, number>>(group: T): T =>
    Object.fromEntries(
      Object.entries(group).map(([key, current]) => {
        const target = Math.min(100, Math.max(current, overallPotential - 8 + offset));
        offset = (offset + 3) % 17;
        return [key, target];
      }),
    ) as T;

  return {
    technical: mapGroup(attributes.technical),
    physical: mapGroup(attributes.physical),
    mental: mapGroup(attributes.mental),
  };
};

const averageAttributes = (attributes: PlayerAttributes): number => {
  const values = [
    ...Object.values(attributes.technical),
    ...Object.values(attributes.physical),
    ...Object.values(attributes.mental),
  ];
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};
