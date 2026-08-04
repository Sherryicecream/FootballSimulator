import { z } from 'zod';
import { PlayerIdentitySchema, PlayerAttributesSchema, HiddenTraitsSchema } from './player';
import { CareerStageSchema } from './primitives';
import { WorldStateSchema } from './world';
import { RandomStateSchema } from './random';

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

export const CareerLedgerEntrySchema = z.discriminatedUnion('type', [
  CareerStartedEntrySchema,
  WeekAdvancedEntrySchema,
  YouthOpportunityChosenEntrySchema,
]);

export type CareerLedgerEntry = z.infer<typeof CareerLedgerEntrySchema>;

/**
 * 生涯上下文：合同、队内角色、教练信任等（§23）
 */
export const CareerContextSchema = z.object({
  academyId: z.string().nullable(),
  pendingOpportunity: YouthOpportunitySchema.nullable(),
});

export type CareerContext = z.infer<typeof CareerContextSchema>;

/**
 * 故事状态（内部使用）：进行中的故事线、冷却、承诺等（§23）
 */
const StoryStateSchema = z.object({
  bootstrapOpportunityWeek: z.number().int().min(2).max(4),
  resolvedOpportunityIds: z.array(z.string()),
});

type StoryState = z.infer<typeof StoryStateSchema>;

/**
 * 关系图（内部使用，§23）- 简化的初始版本
 */
const RelationshipGraphSchema = z.object({
  people: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});

type RelationshipGraph = z.infer<typeof RelationshipGraphSchema>;

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