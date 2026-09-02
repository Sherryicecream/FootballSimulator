import { z } from 'zod';
import { PositionSchema } from './primitives';
import { ChoiceOutcomeSummarySchema, EventChoiceSchema, EventDefinitionSchema, EventInteractionSchema } from './event';
import { ClubProfileSchema, AgentArchetypeSchema } from './clubs';

const IdSchema = z.string().min(1).max(60);
const ScoreSchema = z.number().int().min(0).max(100);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const TrainingPlanSchema = z.strictObject({
  focus: z.enum(['technical', 'position', 'physical', 'tactical', 'recovery']),
  intensity: z.enum(['light', 'normal', 'intense']),
  positionFocus: PositionSchema.nullable(),
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

export const PlayerCurrentStateSchema = z.strictObject({
  morale: ScoreSchema,
  form: ScoreSchema,
  confidence: ScoreSchema,
});
export type PlayerCurrentState = z.infer<typeof PlayerCurrentStateSchema>;

export const ScheduledYouthFixtureSchema = z.strictObject({
  id: IdSchema,
  weekKey: z.string().min(1).max(20),
  competitionId: IdSchema,
  homeClubId: IdSchema,
  awayClubId: IdSchema,
  status: z.enum(['scheduled', 'played']),
  resultId: IdSchema.nullable(),
});
export type ScheduledYouthFixture = z.infer<typeof ScheduledYouthFixtureSchema>;

export const SquadMemberSchema = z.strictObject({
  personId: IdSchema,
  primaryPosition: PositionSchema,
  currentAbility: ScoreSchema,
  form: ScoreSchema,
  fitness: ScoreSchema,
  developmentPriority: ScoreSchema,
});
export type SquadMember = z.infer<typeof SquadMemberSchema>;

export const FirstTeamStageSchema = z.enum([
  'none',
  'watchlist',
  'training-invite',
  'bench-list',
  'substitute-appearance',
  'starting-appearance',
]);
export type FirstTeamStage = z.infer<typeof FirstTeamStageSchema>;

export const YouthAcademyProfileSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1).max(80),
  regionId: IdSchema,
  pathway: z.enum(['local-academy', 'school-elite', 'relocation-academy']),
  facilityLevel: ScoreSchema,
  coachingLevel: ScoreSchema,
  competitionLevel: ScoreSchema,
  competitionIntensity: ScoreSchema,
  developmentStyle: z.string().min(1).max(40),
  firstTeamLevel: ScoreSchema,
  promotionTendency: ScoreSchema,
  relocationPressure: ScoreSchema,
});
export type YouthAcademyProfile = z.infer<typeof YouthAcademyProfileSchema>;

export const YouthCompetitionDefinitionSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1).max(80),
  participatingAcademyIds: z.array(IdSchema).min(2),
  seasonStartMonth: z.number().int().min(1).max(12),
  seasonEndMonth: z.number().int().min(1).max(12),
  targetFixtureCount: z.strictObject({
    min: z.number().int().min(1).max(60),
    max: z.number().int().min(1).max(60),
  }),
});
export type YouthCompetitionDefinition = z.infer<typeof YouthCompetitionDefinitionSchema>;

export const PersonArchetypeSchema = z.strictObject({
  id: IdSchema,
  role: z.enum(['youth-coach', 'assistant-coach', 'teammate', 'rival']),
  personality: z.string().min(1).max(40),
  traitRanges: z.record(z.string(), z.strictObject({ min: ScoreSchema, max: ScoreSchema })),
});
export type PersonArchetype = z.infer<typeof PersonArchetypeSchema>;

export const YouthSeasonStateSchema = z.strictObject({
  id: IdSchema,
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  currentDate: IsoDateSchema,
  currentWeek: z.number().int().min(1).max(60),
  currentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  academyId: IdSchema,
  fixtures: z.array(ScheduledYouthFixtureSchema),
  completed: z.boolean(),
});
export type YouthSeasonState = z.infer<typeof YouthSeasonStateSchema>;

export const YouthClubContextSchema = z.strictObject({
  squadMembers: z.array(SquadMemberSchema),
  positionDepth: z.record(PositionSchema, z.array(IdSchema)),
  playerRole: z.enum(['fringe', 'rotation', 'regular', 'starter', 'first-team-radar']),
  coachEvaluation: ScoreSchema,
  firstTeamStage: FirstTeamStageSchema,
});
export type YouthClubContext = z.infer<typeof YouthClubContextSchema>;

export const MonthlyAdvanceCursorSchema = z.strictObject({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  nextWeekIndex: z.number().int().min(0).max(5),
  totalWeeks: z.number().int().min(4).max(5),
  status: z.enum(['idle', 'advancing', 'awaiting-decision', 'report-ready']),
  developmentAccrual: z.record(z.string(), z.number().min(0)).default({}),
  factIds: z.array(IdSchema).default([]),
  matchIds: z.array(IdSchema).default([]),
  interactiveEventCount: z.number().int().min(0).max(2).default(0),
});
export type MonthlyAdvanceCursor = z.infer<typeof MonthlyAdvanceCursorSchema>;

export const YouthDelayedEffectSchema = z.strictObject({
  id: IdSchema,
  sourceEventId: IdSchema,
  triggerWeekKey: z.string().min(1).max(20),
  effects: z.record(z.string(), z.number().int()),
  participantIds: z.array(IdSchema),
});
export type YouthDelayedEffect = z.infer<typeof YouthDelayedEffectSchema>;

export const YouthEventInstanceSchema = z.strictObject({
  eventId: IdSchema,
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  choices: z.array(EventChoiceSchema).min(1).max(4),
  resolvedChoiceId: IdSchema.nullable(),
  participantIds: z.array(IdSchema),
  factRefs: z.array(IdSchema),
  storyId: IdSchema.nullable().default(null),
  nextEventIds: z.array(IdSchema).default([]),
  interaction: EventInteractionSchema.default('decision'),
});
export type YouthEventInstance = z.infer<typeof YouthEventInstanceSchema>;

export const EventFeedbackParticipantResponseSchema = z.strictObject({
  personId: IdSchema,
  personName: z.string().min(1).max(50),
  role: z.string().min(1).max(30),
  text: z.string().min(1).max(500),
});
export type EventFeedbackParticipantResponse = z.infer<
  typeof EventFeedbackParticipantResponseSchema
>;

export const EventFeedbackStateChangeSchema = z.strictObject({
  key: z.string().min(1).max(40),
  oldValue: ScoreSchema,
  newValue: ScoreSchema,
});
export type EventFeedbackStateChange = z.infer<typeof EventFeedbackStateChangeSchema>;

export const EventFeedbackRelationshipChangeSchema = z.strictObject({
  personId: IdSchema,
  personName: z.string().min(1).max(50),
  dimension: z.enum(['trust', 'respect', 'closeness']),
  oldValue: ScoreSchema,
  newValue: ScoreSchema,
  delta: z.number().int().min(-100).max(100),
});
export type EventFeedbackRelationshipChange = z.infer<typeof EventFeedbackRelationshipChangeSchema>;

export const EventFeedbackSchema = z.strictObject({
  eventId: IdSchema,
  title: z.string().min(1).max(100),
  choiceId: IdSchema,
  choiceText: z.string().min(1).max(200),
  response: z.string().min(1).max(500),
  participantResponses: z.array(EventFeedbackParticipantResponseSchema).max(12),
  stateChanges: z.array(EventFeedbackStateChangeSchema).max(8),
  relationshipChanges: z.array(EventFeedbackRelationshipChangeSchema).max(24),
  followUp: z.string().min(1).max(300),
  outcome: ChoiceOutcomeSummarySchema.optional(),
  nextEventIds: z.array(IdSchema).max(8).optional(),
  narrativeVariantIndex: z.number().int().min(0).max(3).optional(),
});
export type EventFeedback = z.infer<typeof EventFeedbackSchema>;

export const YouthStoryStateSchema = z.strictObject({
  activeStorylines: z.array(IdSchema),
  completedStoryIds: z.array(IdSchema),
  cooldownsByEventId: z.record(IdSchema, z.number().int().min(0).max(52)),
  themeCooldownsByTheme: z.record(z.string(), z.number().int().min(0).max(52)).default({}),
  pendingDelayedEffects: z.array(YouthDelayedEffectSchema),
  pendingEvent: YouthEventInstanceSchema.nullable().default(null),
  pendingFeedback: EventFeedbackSchema.nullable().optional(),
});
export type YouthStoryState = z.infer<typeof YouthStoryStateSchema>;

export const MatchContextSchema = z.strictObject({
  opponentStrength: ScoreSchema,
  isHome: z.boolean(),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().min(1).max(10).nullable(),
  goals: z.number().int().min(0).max(50),
  assists: z.number().int().min(0).max(50),
});
export type MatchContext = z.infer<typeof MatchContextSchema>;

export const CareerLedgerEntryV2Schema = z.strictObject({
  id: IdSchema,
  weekKey: z.string().min(1).max(20),
  type: z.enum([
    'training',
    'match',
    'health',
    'event',
    'decision',
    'relationship',
    'first-team',
    'monthly-settlement',
    'season-outcome',
    'offseason-settlement',
    'contract-signed',
    'promise-review',
    'pro-match',
    'renewal-offer',
    'renewal-signed',
    'transfer-signed',
    'national-debut',
    'retirement',
  ]),
  summary: z.string().min(1).max(500),
  participantIds: z.array(IdSchema),
  outcome: ChoiceOutcomeSummarySchema.optional(),
  matchContext: MatchContextSchema.optional(),
});
export type CareerLedgerEntryV2 = z.infer<typeof CareerLedgerEntryV2Schema>;

export const YouthMatchResultV2Schema = z.strictObject({
  id: IdSchema,
  fixtureId: IdSchema,
  opponentId: IdSchema,
  opponentName: z.string().min(1).max(80),
  isHome: z.boolean(),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().min(1).max(10).nullable(),
  goals: z.number().int().min(0).max(50),
  assists: z.number().int().min(0).max(50),
});
export type YouthMatchResultV2 = z.infer<typeof YouthMatchResultV2Schema>;

export const MonthlyBeatSchema = z.strictObject({
  weekKey: z.string().min(1).max(20),
  kind: z.enum([
    'training',
    'match',
    'decision',
    'event',
    'health',
    'relationship',
    'first-team',
    'settlement',
  ]),
  title: z.string().min(1).max(80),
  detail: z.string().min(1).max(220),
  intensity: z.enum(['routine', 'notable', 'turning-point']),
});
export type MonthlyBeat = z.infer<typeof MonthlyBeatSchema>;

export const MonthlyMomentumSchema = z.strictObject({
  tone: z.enum(['steady', 'progress', 'turning-point', 'warning']),
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(300),
  nextFocus: z.string().min(1).max(220),
  beats: z.array(MonthlyBeatSchema).max(5),
});
export type MonthlyMomentum = z.infer<typeof MonthlyMomentumSchema>;

export const MatchdayMomentSchema = z.strictObject({
  weekKey: z.string().min(1).max(20),
  opponentName: z.string().min(1).max(80),
  opponentStrength: ScoreSchema,
  difficulty: z.enum(['favorable', 'balanced', 'difficult']),
  scoreline: z.string().min(3).max(20),
  result: z.enum(['win', 'draw', 'loss']),
  playerStatus: z.enum(['played', 'not-played']),
  preMatch: z.string().min(1).max(220),
  postMatch: z.string().min(1).max(220),
});
export type MatchdayMoment = z.infer<typeof MatchdayMomentSchema>;

export const StoryProgressStatusSchema = z.enum(['active', 'waiting', 'completed']);
export type StoryProgressStatus = z.infer<typeof StoryProgressStatusSchema>;

export const StoryProgressEntrySchema = z.strictObject({
  storyId: IdSchema,
  title: z.string().min(1).max(100),
  status: StoryProgressStatusSchema,
  completedNodes: z.number().int().min(0).max(20),
  totalNodes: z.number().int().min(1).max(20),
  progressPercent: z.number().int().min(0).max(100),
  activeNodeTitles: z.array(z.string().min(1).max(100)).max(8),
  waitReason: z.string().min(1).max(200),
});
export type StoryProgressEntry = z.infer<typeof StoryProgressEntrySchema>;

export const StoryProgressSnapshotSchema = z.strictObject({
  entries: z.array(StoryProgressEntrySchema).max(8),
  recentChoice: z
    .strictObject({
      eventTitle: z.string().min(1).max(100),
      choiceText: z.string().min(1).max(200),
      weekKey: z.string().min(1).max(20),
    })
    .nullable(),
});
export type StoryProgressSnapshot = z.infer<typeof StoryProgressSnapshotSchema>;

export const MonthlyReportSchema = z.strictObject({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  facts: z.array(CareerLedgerEntryV2Schema),
  attributeChanges: z.array(
    z.strictObject({
      attribute: z.string().min(1),
      oldValue: ScoreSchema,
      newValue: ScoreSchema,
    }),
  ),
  stateSummary: PlayerCurrentStateSchema.extend({
    fitness: ScoreSchema,
    fatigue: ScoreSchema,
  }),
  matchIds: z.array(IdSchema),
  momentum: MonthlyMomentumSchema.optional(),
  storyProgress: StoryProgressSnapshotSchema.optional(),
  matchdayMoments: z.array(MatchdayMomentSchema).max(5).optional(),
});
export type MonthlyReport = z.infer<typeof MonthlyReportSchema>;

export const YouthContentBundleSchema = z.strictObject({
  academies: z.array(YouthAcademyProfileSchema),
  competitions: z.array(YouthCompetitionDefinitionSchema),
  people: z.array(PersonArchetypeSchema),
  events: z.array(EventDefinitionSchema),
  clubs: z.array(ClubProfileSchema).default([]),
  overseasClubs: z.array(ClubProfileSchema).default([]),
  agents: z.array(AgentArchetypeSchema).default([]),
});
export type YouthContentBundle = z.infer<typeof YouthContentBundleSchema>;
