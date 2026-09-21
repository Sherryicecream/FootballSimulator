import { z } from 'zod';
import { CareerEndSchema } from './career-end';
import {
  CareerTotalsSchema,
  ClubHistoryEntrySchema,
  LoanHistoryEntrySchema,
  NationalTeamSchema,
} from './career-expansion';
import { SeasonHistorySummarySchema, SeasonHonourSchema } from './graduation';
import { CareerSaveV7Schema, CareerSaveV8Schema } from './career-experience';
import { CareerLedgerEntryV2Schema } from './youth-season';
import { PlayerCareerV2Schema } from './player';

const IdSchema = z.string().min(1).max(60);
const ScoreSchema = z.number().int().min(0).max(100);
const DateTimeSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: '保存时间必须是有效日期',
  });

export const CareerTierSchema = z.enum(['legend', 'world-class', 'national', 'solid', 'ordinary']);
export type CareerTier = z.infer<typeof CareerTierSchema>;

export const CareerReplayMomentKindSchema = z.enum([
  'story',
  'match',
  'relationship',
  'international',
  'contract',
  'milestone',
  'health',
]);
export type CareerReplayMomentKind = z.infer<typeof CareerReplayMomentKindSchema>;

export const CareerReviewEndingSchema = z.strictObject({
  kind: CareerEndSchema.shape.kind,
  label: z.string().min(1).max(80),
  summary: z.string().min(1).max(300),
  endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CareerReviewEnding = z.infer<typeof CareerReviewEndingSchema>;

const CareerReplayMomentSchema = z.strictObject({
  evidenceId: IdSchema,
  timeKey: z.string().min(1).max(60),
  kind: CareerReplayMomentKindSchema,
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(500),
  participantIds: z.array(IdSchema),
  sourceType: CareerLedgerEntryV2Schema.shape.type,
});

const CareerGoalSchema = z.strictObject({
  id: IdSchema,
  label: z.string().min(1).max(120),
  progress: z.number().min(0),
  target: z.number().min(1),
  status: z.enum(['complete', 'in-progress']),
  evidenceIds: z.array(IdSchema),
});

const CareerDimensionSchema = z.strictObject({
  key: z.enum([
    'competition',
    'team-honours',
    'individual',
    'loyalty',
    'national-team',
    'off-pitch',
    'relationships',
    'legendary',
  ]),
  label: z.string().min(1).max(80),
  score: ScoreSchema,
  ratingLabel: z.string().min(1).max(40),
  evidenceIds: z.array(IdSchema),
});

const CareerBehindTheScenesSchema = z.strictObject({
  potentials: z.array(
    z.strictObject({
      group: z.enum(['technical', 'physical', 'mental']),
      label: z.string().min(1).max(40),
      items: z.array(
        z.strictObject({
          key: IdSchema,
          label: z.string().min(1).max(60),
          potential: ScoreSchema,
          achieved: ScoreSchema,
        }),
      ),
      fulfillment: ScoreSchema,
    }),
  ),
  traits: z.array(
    z.strictObject({
      key: IdSchema,
      label: z.string().min(1).max(60),
      value: z.string().min(1).max(80),
      rawValue: z.string().min(1).max(80),
      note: z.string().min(1).max(300),
    }),
  ),
  missedOpportunities: z.array(
    z.strictObject({
      id: IdSchema,
      label: z.string().min(1).max(120),
      detail: z.string().min(1).max(300),
      evidenceIds: z.array(IdSchema),
    }),
  ),
});

export const CareerArchiveReviewSchema = z.strictObject({
  tier: CareerTierSchema,
  tierLabel: z.string().min(1).max(80),
  commentary: z.string().min(1).max(500),
  ending: CareerReviewEndingSchema,
  dimensions: z.array(CareerDimensionSchema),
  behindTheScenes: CareerBehindTheScenesSchema,
  seasons: z.number().int().min(0),
  replay: z.array(CareerReplayMomentSchema),
  goals: z.array(CareerGoalSchema),
  totals: CareerTotalsSchema,
  caps: z.number().int().min(0),
  nationalGoals: z.number().int().min(0),
  clubs: z.number().int().min(0),
  honours: z.array(SeasonHonourSchema),
  overseasSpells: z.boolean(),
  timeline: z.array(
    z.strictObject({
      seasonId: IdSchema,
      status: z.string().min(1).max(40),
      appearances: z.number().int().min(0),
      goals: z.number().int().min(0),
      avgRating: z.number().min(0).max(10).nullable(),
    }),
  ),
});
export type CareerArchiveReview = z.infer<typeof CareerArchiveReviewSchema>;

export const CareerArchiveV1Schema = z.strictObject({
  archiveVersion: z.literal(1),
  careerId: IdSchema,
  player: PlayerCareerV2Schema,
  careerEnd: CareerEndSchema,
  review: CareerArchiveReviewSchema,
  history: z.strictObject({
    seasonHistory: z.array(SeasonHistorySummarySchema),
    clubHistory: z.array(ClubHistoryEntrySchema),
    loanHistory: z.array(LoanHistoryEntrySchema),
    nationalTeam: NationalTeamSchema.nullable(),
    totals: CareerTotalsSchema,
    honours: z.array(SeasonHonourSchema),
  }),
});
export type CareerArchiveV1 = z.infer<typeof CareerArchiveV1Schema>;

export const CareerSaveEnvelopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    storageVersion: z.literal(2),
    version: z.union([z.literal(7), z.literal(8)]).default(8),
    kind: z.literal('active'),
    savedAt: DateTimeSchema,
    data: z.union([CareerSaveV8Schema, CareerSaveV7Schema]),
  }),
  z.strictObject({
    storageVersion: z.literal(2),
    version: z.literal(1).default(1),
    kind: z.literal('archive'),
    savedAt: DateTimeSchema,
    data: CareerArchiveV1Schema,
  }),
]);
export type CareerSaveEnvelope = z.infer<typeof CareerSaveEnvelopeSchema>;
