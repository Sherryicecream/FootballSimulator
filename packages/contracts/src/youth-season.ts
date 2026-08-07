import { z } from 'zod';
import { PositionSchema } from './primitives';
import { EventChoiceSchema, EventDefinitionSchema } from './event';

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
});

export const YouthStoryStateSchema = z.strictObject({
  activeStorylines: z.array(IdSchema),
  completedStoryIds: z.array(IdSchema),
  cooldownsByEventId: z.record(IdSchema, z.number().int().min(0).max(52)),
  pendingDelayedEffects: z.array(YouthDelayedEffectSchema),
  pendingEvent: YouthEventInstanceSchema.nullable().default(null),
});
export type YouthStoryState = z.infer<typeof YouthStoryStateSchema>;

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
  ]),
  summary: z.string().min(1).max(500),
  participantIds: z.array(IdSchema),
});
export type CareerLedgerEntryV2 = z.infer<typeof CareerLedgerEntryV2Schema>;

export const YouthContentBundleSchema = z.strictObject({
  academies: z.array(YouthAcademyProfileSchema),
  competitions: z.array(YouthCompetitionDefinitionSchema),
  people: z.array(PersonArchetypeSchema),
  events: z.array(EventDefinitionSchema),
});
export type YouthContentBundle = z.infer<typeof YouthContentBundleSchema>;
