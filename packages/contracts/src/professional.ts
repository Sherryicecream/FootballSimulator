import { z } from 'zod';
import { CareerSaveV3Schema, migrateCareerSaveV3 } from './graduation';
import { LeagueStandingSchema } from './match';
import { PositionSchema } from './primitives';
import { ScheduledYouthFixtureSchema } from './youth-season';

const IdSchema = z.string().min(1).max(60);
const ScoreSchema = z.number().int().min(0).max(100);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DomesticTierSchema = z.number().int().min(3).max(8);

export const ProSquadMemberSchema = z.strictObject({
  personId: IdSchema,
  name: z.string().min(1).max(50),
  primaryPosition: PositionSchema,
  currentAbility: ScoreSchema,
  age: z.number().int().min(15).max(45),
  form: ScoreSchema,
  fitness: ScoreSchema,
  minutesPlayed: z.number().int().min(0).default(0),
});
export type ProSquadMember = z.infer<typeof ProSquadMemberSchema>;

/** 职业赛程复用青训赛程结构：homeClubId/awayClubId 为俱乐部 ID。 */
export const ProFixtureSchema = ScheduledYouthFixtureSchema;
export type ProFixture = z.infer<typeof ProFixtureSchema>;

export const ProCupStateSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1).max(80),
  competitionId: IdSchema,
  entrants: z
    .array(IdSchema)
    .length(8)
    .superRefine((entrants, ctx) => {
      if (new Set(entrants).size !== entrants.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '杯赛参赛队伍不能重复' });
      }
    }),
  fixtures: z.array(ProFixtureSchema),
  currentRound: z.enum(['quarterfinal', 'semifinal', 'final', 'complete']),
  winnerClubId: IdSchema.nullable(),
  completed: z.boolean(),
});
export type ProCupState = z.infer<typeof ProCupStateSchema>;
export const ProSeasonStateSchema = z.strictObject({
  id: IdSchema,
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  currentDate: IsoDateSchema,
  currentWeek: z.number().int().min(1).max(60),
  currentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  clubId: IdSchema,
  competitionId: IdSchema,
  domesticCup: ProCupStateSchema.nullable().default(null),
  nextClubTier: DomesticTierSchema.nullable().default(null),
  fixtures: z.array(ProFixtureSchema),
  standings: z.array(LeagueStandingSchema),
  squad: z.array(ProSquadMemberSchema).min(10).max(24),
  depthChart: z.record(PositionSchema, z.array(IdSchema)),
  completed: z.boolean(),
});
export type ProSeasonState = z.infer<typeof ProSeasonStateSchema>;

export const PromiseReviewSchema = z.strictObject({
  seasonId: IdSchema,
  share: z.number().min(0).max(1),
  promisedShare: z.number().min(0).max(1),
  status: z.enum(['kept', 'broken']),
  cause: z.enum(['none', 'injury', 'club', 'player']),
  evaluatedOn: IsoDateSchema,
});
export type PromiseReview = z.infer<typeof PromiseReviewSchema>;

export const ProSeasonStatsSchema = z.strictObject({
  leagueAppearances: z.number().int().min(0).default(0),
  reserveAppearances: z.number().int().min(0).default(0),
  minutes: z.number().int().min(0).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  ratingSum: z.number().min(0).default(0),
  ratingCount: z.number().int().min(0).default(0),
  cupAppearances: z.number().int().min(0).default(0),
  cupMinutes: z.number().int().min(0).default(0),
  cupGoals: z.number().int().min(0).default(0),
  cupAssists: z.number().int().min(0).default(0),
});
export type ProSeasonStats = z.infer<typeof ProSeasonStatsSchema>;

export const ProPhaseSchema = z.enum(['preseason', 'league', 'settled']);
export type ProPhase = z.infer<typeof ProPhaseSchema>;

export const CareerSaveV4Schema = CareerSaveV3Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(4),
  proSeason: ProSeasonStateSchema.nullable().default(null),
  proSeasonStats: ProSeasonStatsSchema.default({
    leagueAppearances: 0,
    reserveAppearances: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    ratingCount: 0,
    cupAppearances: 0,
    cupMinutes: 0,
    cupGoals: 0,
    cupAssists: 0,
  }),
  promiseReviews: z.array(PromiseReviewSchema).default([]),
  proPhase: ProPhaseSchema.default('preseason'),
});
export type CareerSaveV4 = z.infer<typeof CareerSaveV4Schema>;

/** 版本无关的 v4 结构切片：v5 等后续版本同样满足。 */
export type CareerSaveV4Like = Omit<CareerSaveV4, 'schemaVersion'> & {
  schemaVersion: number;
  /** v5 字段：v4 存档不存在（undefined），职业周按缺失处理 */
  overseasSince?: string | null;
};

/**
 * 迁移任意历史存档（v1/v2/v3/v4）为 v4：v4 原样通过，v3 补默认字段，更早版本走既有链路。
 */
export const migrateCareerSaveV4 = (raw: unknown): CareerSaveV4 => {
  const existingV4 = CareerSaveV4Schema.safeParse(raw);
  if (existingV4.success) return existingV4.data;
  const asV3 = migrateCareerSaveV3(raw);
  const asV4 = CareerSaveV4Schema.safeParse({ ...asV3, schemaVersion: 4 });
  if (asV4.success) return asV4.data;
  throw new Error('无法迁移存档为 v4：' + asV4.error.issues[0]?.message);
};
