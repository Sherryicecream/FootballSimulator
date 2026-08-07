import { z } from 'zod';
import { PlayerIdentitySchema, PlayerAttributesSchema, HiddenTraitsSchema } from './player';
import { CareerStageSchema } from './primitives';
import { WorldStateSchema } from './world';
import { RandomStateSchema } from './random';
import { EventChoiceSchema } from './event';
import { RelationshipGraphSchema } from './person';

/**
 * 青年机会：球员在青训阶段面临的首个职业选择
 * 包含 2-3 个不同路径的选项
 */
export const YouthOfferSchema = z.object({
  id: z.string().min(1).max(40),
  academyId: z.string().min(1).max(40),
  academyName: z.string().min(1).max(50),
  pathway: z.enum(['local-academy', 'school-elite', 'relocation-academy']),
  riskLabel: z.enum(['low', 'medium', 'high']),
  description: z.string().min(1).max(200),
});

export type YouthOffer = z.infer<typeof YouthOfferSchema>;

export const YouthOpportunitySchema = z.object({
  week: z.number().int().min(1),
  offers: z.array(YouthOfferSchema).min(2).max(3),
});

export type YouthOpportunity = z.infer<typeof YouthOpportunitySchema>;

/**
 * 球员运行时状态
 */
export const PlayerStateSchema = z.object({
  fitness: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  coachTrust: z.number().int().min(0).max(100),
  fatigue: z.number().int().min(0).max(100),
  teamStatus: z.enum(['fringe', 'rotation', 'regular', 'key']),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

/**
 * 训练强度
 */
export const TrainingIntensitySchema = z.enum(['light', 'normal', 'intense']);
export type TrainingIntensity = z.infer<typeof TrainingIntensitySchema>;

/**
 * 属性变化记录
 */
export const AttributeChangeSchema = z.object({
  attribute: z.string(),
  oldValue: z.number().int().min(0).max(100),
  newValue: z.number().int().min(0).max(100),
});

export type AttributeChange = z.infer<typeof AttributeChangeSchema>;

/**
 * 状态变化记录
 */
export const StateChangeSchema = z.object({
  key: z.string(),
  oldValue: z.number().int().min(0).max(100),
  newValue: z.number().int().min(0).max(100),
});

export type StateChange = z.infer<typeof StateChangeSchema>;

/**
 * 事件实例：运行时的事件快照
 */
export const EventInstanceSchema = z.object({
  eventId: z.string().min(1).max(40),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  choices: z.array(EventChoiceSchema).min(1).max(4),
  resolvedChoiceId: z.string().nullable(),
});

export type EventInstance = z.infer<typeof EventInstanceSchema>;

/**
 * 训练摘要
 */
export const TrainingSummarySchema = z.object({
  focus: z.string().min(1).max(30),
  attributeChanges: z.array(AttributeChangeSchema),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
  injury: z.boolean().default(false),
});

export type TrainingSummary = z.infer<typeof TrainingSummarySchema>;

/**
 * 青训比赛结果
 */
export const YouthMatchResultSchema = z.object({
  opponent: z.string().min(1).max(50),
  isHome: z.boolean(),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().int().min(1).max(10),
  performanceSummary: z.string().min(1).max(200),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
});

export type YouthMatchResult = z.infer<typeof YouthMatchResultSchema>;

/**
 * 周活动类型
 */
export const WeekActivitySchema = z.enum(['training', 'match', 'event', 'quiet']);
export type WeekActivity = z.infer<typeof WeekActivitySchema>;

/**
 * 每周推进结果
 */
export const WeeklyAdvanceResultSchema = z.object({
  date: z.string(),
  week: z.number().int().min(1).max(52),
  season: z.number().int(),
  activity: WeekActivitySchema,
  trainingSummary: TrainingSummarySchema.nullable(),
  matchResult: YouthMatchResultSchema.nullable(),
  event: EventInstanceSchema.nullable(),
  stateChanges: z.array(StateChangeSchema),
  hasPendingChoice: z.boolean(),
  eventCooldowns: z.record(z.string(), z.number().int()).default({}),
});

export type WeeklyAdvanceResult = z.infer<typeof WeeklyAdvanceResultSchema>;

/**
 * 生涯账本条目的联合类型
 */
export const CareerStartedEntrySchema = z.object({
  type: z.literal('career-started'),
  date: z.string(),
  playerName: z.string(),
  age: z.number().int(),
  position: z.string(),
});

export const WeekAdvancedEntrySchema = z.object({
  type: z.literal('week-advanced'),
  date: z.string(),
  week: z.number().int(),
});

export const YouthOpportunityChosenEntrySchema = z.object({
  type: z.literal('youth-opportunity-chosen'),
  date: z.string(),
  week: z.number().int(),
  offerId: z.string(),
  academyId: z.string(),
  academyName: z.string(),
});

export const TrainingWeekEntrySchema = z.object({
  type: z.literal('training-week'),
  date: z.string(),
  week: z.number().int(),
  focus: z.string().min(1).max(30),
  attributeChanges: z.array(AttributeChangeSchema),
});

export const MatchWeekEntrySchema = z.object({
  type: z.literal('match-week'),
  date: z.string(),
  week: z.number().int(),
  opponent: z.string().min(1).max(50),
  isHome: z.boolean(),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().int().min(1).max(10),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
});

export const EventWeekEntrySchema = z.object({
  type: z.literal('event-week'),
  date: z.string(),
  week: z.number().int(),
  eventId: z.string(),
  title: z.string(),
  choiceId: z.string().nullable(),
  narrative: z.string().optional(),
});

export const MemoryNoteEntrySchema = z.object({
  type: z.literal('memory-note'),
  date: z.string(),
  week: z.number().int(),
  summary: z.string().min(1).max(200),
  personId: z.string().min(1).max(40),
});

export const AttributeChangeEntrySchema = z.object({
  type: z.literal('attribute-change'),
  date: z.string(),
  week: z.number().int(),
  changes: z.array(AttributeChangeSchema),
});

export const StateChangeEntrySchema = z.object({
  type: z.literal('state-change'),
  date: z.string(),
  week: z.number().int(),
  changes: z.array(StateChangeSchema),
});

export const CareerLedgerEntrySchema = z.discriminatedUnion('type', [
  CareerStartedEntrySchema,
  WeekAdvancedEntrySchema,
  YouthOpportunityChosenEntrySchema,
  TrainingWeekEntrySchema,
  MatchWeekEntrySchema,
  EventWeekEntrySchema,
  AttributeChangeEntrySchema,
  StateChangeEntrySchema,
  MemoryNoteEntrySchema,
]);

export type CareerLedgerEntry = z.infer<typeof CareerLedgerEntrySchema>;

/**
 * 生涯上下文：合同、队内角色、教练信任等（§23）
 */
export const CareerContextSchema = z.object({
  academyId: z.string().nullable(),
  pendingOpportunity: YouthOpportunitySchema.nullable(),
  playerState: PlayerStateSchema,
  pendingEvent: EventInstanceSchema.nullable(),
  trainingFocus: z.string().min(1).max(30).nullable().default(null),
  trainingIntensity: TrainingIntensitySchema.default('normal'),
});

export type CareerContext = z.infer<typeof CareerContextSchema>;

/**
 * 故事状态（内部使用）：进行中的故事线、冷却、承诺等（§23）
 */
const StoryStateSchema = z.object({
  bootstrapOpportunityWeek: z.number().int().min(2).max(4),
  resolvedOpportunityIds: z.array(z.string()),
  completedStoryIds: z.array(z.string()).default([]),
  activeStorylines: z.array(z.string()).default([]),
  cooldowns: z.record(z.string(), z.number().int()).default({}),
});

/**
 * 关系图（内部使用，§23）
 */
// Uses RelationshipGraphSchema imported from './person'

// PlayerCareer: 身份、属性、隐藏特质、年龄、生涯阶段、声望 (§23)
export const PlayerCareerSchema = z.object({
  identity: PlayerIdentitySchema,
  attributes: PlayerAttributesSchema,
  hiddenTraits: HiddenTraitsSchema,
  age: z.number().int().min(14).max(50),
  careerStage: CareerStageSchema,
  reputation: z.number().int().min(0).max(100),
});

export type PlayerCareer = z.infer<typeof PlayerCareerSchema>;

// CareerSave: 一段生涯的一致性边界 (§23)
export const CareerSaveSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.literal('bootstrap-1'),
  careerId: z.string().min(1).max(60),
  player: PlayerCareerSchema,
  world: WorldStateSchema,
  context: CareerContextSchema,
  relationships: RelationshipGraphSchema,
  story: StoryStateSchema,
  ledger: z.array(CareerLedgerEntrySchema),
  randomState: RandomStateSchema,
});

export type CareerSave = z.infer<typeof CareerSaveSchema>;
