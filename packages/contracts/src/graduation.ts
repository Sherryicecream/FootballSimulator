import { z } from 'zod';
import { CareerSaveV2Schema, migrateCareerSave } from './save-migration';
import { AttributeChangeSchema } from './career';

const IdSchema = z.string().min(1).max(60);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SeasonHonourSchema = z.strictObject({
  id: IdSchema,
  kind: z.enum([
    'league-champion',
    'cup-champion',
    'promotion',
    'relegation',
    'asian-cup-champion',
    'world-cup-champion',
    'world-cup-runner-up',
  ]),
  label: z.string().min(1).max(100),
  seasonId: IdSchema,
  clubId: IdSchema,
  evidenceId: IdSchema,
});
export type SeasonHonour = z.infer<typeof SeasonHonourSchema>;

export const CareerPhaseSchema = z.enum([
  'youth-season',
  'offseason',
  'agent-preferences',
  'offer-review',
  'professional-contract',
  'pro-season',
  'pro-offseason',
  'free-agent',
  'retired',
]);
export type CareerPhase = z.infer<typeof CareerPhaseSchema>;

export const ContractPromiseSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('playing-time'), minimumShare: z.number().min(0).max(1) }),
  z.strictObject({ kind: z.literal('position-guarantee') }),
  z.strictObject({ kind: z.literal('none') }),
]);
export type ContractPromise = z.infer<typeof ContractPromiseSchema>;

export const ContractOfferV3Schema = z.strictObject({
  id: IdSchema,
  clubId: IdSchema,
  clubName: z.string().min(1).max(80),
  clubTier: z.number().int().min(1).max(10),
  salaryPerYear: z.number().int().min(0),
  contractYears: z.number().int().min(1).max(3),
  squadRole: z.enum(['youth-team', 'rotation', 'first-team-rotation', 'highlighted-prospect']),
  offerKind: z.enum(['permanent', 'loan']).default('permanent'),
  overseas: z.boolean().default(false),
  promise: ContractPromiseSchema,
  releaseClauseNote: z.string().max(200),
});
export type ContractOfferV3 = z.infer<typeof ContractOfferV3Schema>;

export const SignedContractSchema = ContractOfferV3Schema.extend({
  signedOn: IsoDateSchema,
  seasonsCompleted: z.number().int().min(0).default(0),
  promiseStatus: z.enum(['pending', 'kept', 'broken']).default('pending'),
});
export type SignedContract = z.infer<typeof SignedContractSchema>;

export const SeasonHistorySummarySchema = z.strictObject({
  seasonId: IdSchema,
  age: z.number().int().min(14).max(50),
  status: z.enum(['retained', 'released', 'graduated']),
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  avgRating: z.number().min(0).max(10).nullable(),
  signals: z.array(z.string().min(1).max(40)),
  endedOn: IsoDateSchema,
  honours: z.array(SeasonHonourSchema).default([]),
});
export type SeasonHistorySummary = z.infer<typeof SeasonHistorySummarySchema>;

export const OffseasonBriefingSchema = z.strictObject({
  healthClearance: z.string().min(1).max(200),
  attributeDrift: z.array(AttributeChangeSchema),
  reputationChange: z.number().int().min(-20).max(20),
  ageUpdate: z.strictObject({
    from: z.number().int().min(14).max(50),
    to: z.number().int().min(14).max(50),
  }),
});
export type OffseasonBriefing = z.infer<typeof OffseasonBriefingSchema>;

export const EligibilityCriterionSchema = z.strictObject({
  criterion: z.string().min(1).max(60),
  met: z.boolean(),
});
export type EligibilityCriterion = z.infer<typeof EligibilityCriterionSchema>;

export const OffseasonStateSchema = z.strictObject({
  briefing: OffseasonBriefingSchema,
  graduationEligible: z.boolean(),
  eligibilityReport: z.array(EligibilityCriterionSchema),
  nextSeasonStart: IsoDateSchema,
});
export type OffseasonState = z.infer<typeof OffseasonStateSchema>;

export const AgentPreferencesSchema = z.strictObject({
  leagueTierBias: z.enum(['high', 'balanced', 'low']),
  priority: z.enum(['playing-time', 'salary', 'development']),
});
export type AgentPreferences = z.infer<typeof AgentPreferencesSchema>;

export const SeasonStatsSchema = z.strictObject({
  appearances: z.number().int().min(0).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  ratingSum: z.number().min(0).default(0),
  ratingCount: z.number().int().min(0).default(0),
});
export type SeasonStats = z.infer<typeof SeasonStatsSchema>;

export const CareerSaveV3Schema = CareerSaveV2Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(3),
  careerPhase: CareerPhaseSchema.default('youth-season'),
  seasonStats: SeasonStatsSchema.default({
    appearances: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    ratingCount: 0,
  }),
  contract: SignedContractSchema.nullable().default(null),
  pendingOffers: z.array(ContractOfferV3Schema).max(4).default([]),
  agentPreferences: AgentPreferencesSchema.nullable().default(null),
  offseason: OffseasonStateSchema.nullable().default(null),
  seasonHistory: z.array(SeasonHistorySummarySchema).default([]),
  graduationPressure: z.number().int().min(0).max(3).default(0),
});
export type CareerSaveV3 = z.infer<typeof CareerSaveV3Schema>;

/**
 * 迁移任意历史存档（v1 / v2 / v3）为 v3：v3 原样通过，v2 补默认字段，v1 先走既有迁移。
 */
export const migrateCareerSaveV3 = (raw: unknown): CareerSaveV3 => {
  const existingV3 = CareerSaveV3Schema.safeParse(raw);
  if (existingV3.success) return existingV3.data;
  const asV2 = migrateCareerSave(raw);
  const asV3 = CareerSaveV3Schema.safeParse({ ...asV2, schemaVersion: 3 });
  if (asV3.success) return asV3.data;
  throw new Error('无法迁移存档为 v3：' + asV3.error.issues[0]?.message);
};
