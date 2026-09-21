import { z } from 'zod';

const IdSchema = z.string().min(1).max(60);
const PlayerNameSchema = z.string().min(1).max(50);
const SeasonIdSchema = z.string().min(1).max(60);

export const MilestoneKindSchema = z.enum([
  'first-contract',
  'injury-return',
  'key-transfer',
  'national-team',
  'retirement',
]);
export type MilestoneKind = z.infer<typeof MilestoneKindSchema>;

export const MilestoneHonourSchema = z.strictObject({
  kind: z.string().min(1).max(40),
  label: z.string().min(1).max(100),
  seasonId: SeasonIdSchema,
});

export const MilestoneKeyStatSchema = z.strictObject({
  label: z.string().min(1).max(60),
  value: z.number().finite().min(0).max(1_000_000),
  unit: z.string().min(1).max(20),
});

export const MilestoneSignatureMatchSchema = z.strictObject({
  matchId: IdSchema,
  competition: z.string().min(1).max(80),
  opponent: z.string().min(1).max(80),
  result: z.string().min(1).max(40),
  playerGoals: z.number().int().min(0).max(20),
  playerAssists: z.number().int().min(0).max(20),
  rating: z.number().min(0).max(10).nullable(),
  highlight: z.string().min(1).max(240),
});

const milestoneFactsShape = {
  honours: z.array(MilestoneHonourSchema).max(30).default([]),
  keyStats: z.array(MilestoneKeyStatSchema).max(30).default([]),
  signatureMatches: z.array(MilestoneSignatureMatchSchema).max(20).default([]),
};

const milestoneBaseShape = {
  playerName: PlayerNameSchema,
  seasonId: SeasonIdSchema,
  ...milestoneFactsShape,
};

export const FirstContractMilestoneInputSchema = z.strictObject({
  kind: z.literal('first-contract'),
  ...milestoneBaseShape,
  club: z.string().min(1).max(80),
  contractYears: z.number().int().min(1).max(8),
  annualSalary: z.number().finite().min(0).max(1_000_000_000),
  transferFee: z.number().finite().min(0).max(1_000_000_000).nullable(),
  clubPromise: z.string().max(240).nullable().default(null),
});

export const InjuryReturnMilestoneInputSchema = z.strictObject({
  kind: z.literal('injury-return'),
  ...milestoneBaseShape,
  injuryType: z.string().min(1).max(100),
  durationWeeks: z.number().int().min(1).max(260),
  recoveryChoices: z.array(z.string().min(1).max(160)).max(8).default([]),
  returnOutcome: z.enum(['fully-recovered', 'partial-recovery', 'career-ending']),
});

export const KeyTransferMilestoneInputSchema = z
  .strictObject({
    kind: z.literal('key-transfer'),
    ...milestoneBaseShape,
    fromClub: z.string().min(1).max(80),
    toClub: z.string().min(1).max(80),
    transferFeeRange: z
      .strictObject({
        minimum: z.number().finite().min(0).max(1_000_000_000),
        maximum: z.number().finite().min(0).max(1_000_000_000),
        currency: z.string().min(1).max(20),
      })
      .nullable(),
    adaptationStatusChange: z.string().min(1).max(240),
  })
  .superRefine((input, ctx) => {
    if (input.transferFeeRange && input.transferFeeRange.minimum > input.transferFeeRange.maximum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferFeeRange', 'maximum'],
        message: '转会费范围的上限不能小于下限',
      });
    }
  });

export const NationalTeamMilestoneInputSchema = z.strictObject({
  kind: z.literal('national-team'),
  ...milestoneBaseShape,
  competitionType: z.string().min(1).max(60),
  competitionName: z.string().max(100).nullable().default(null),
  appearances: z.number().int().min(0).max(200),
  goals: z.number().int().min(0).max(200),
  knockoutRound: z.string().max(60).nullable().default(null),
});

export const RetirementMilestoneInputSchema = z.strictObject({
  kind: z.literal('retirement'),
  ...milestoneBaseShape,
  careerOverview: z.strictObject({
    seasons: z.number().int().min(0).max(80),
    clubs: z.number().int().min(0).max(80),
    appearances: z.number().int().min(0).max(5_000),
    minutes: z.number().int().min(0).max(1_000_000),
    goals: z.number().int().min(0).max(5_000),
    assists: z.number().int().min(0).max(5_000),
  }),
  regret: z.string().max(240).nullable().default(null),
  biggestAchievement: z.string().max(240).nullable().default(null),
});

export const MilestoneInputSchema = z.discriminatedUnion('kind', [
  FirstContractMilestoneInputSchema,
  InjuryReturnMilestoneInputSchema,
  KeyTransferMilestoneInputSchema,
  NationalTeamMilestoneInputSchema,
  RetirementMilestoneInputSchema,
]);
export type MilestoneInput = z.infer<typeof MilestoneInputSchema>;

export const MilestoneNarrationRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  promptVersion: z.literal('milestone-narration-v1'),
  kind: z.literal('milestone'),
  canonicalFactsHash: z.string().regex(/^[a-f0-9]{64}$/),
  input: MilestoneInputSchema,
});
export type MilestoneNarrationRequest = z.infer<typeof MilestoneNarrationRequestSchema>;

export const MilestoneNarrationOutputSchema = z.strictObject({
  narrative: z.string().min(150).max(250),
});
export type MilestoneNarrationOutput = z.infer<typeof MilestoneNarrationOutputSchema>;

export interface BuildMilestoneNarrationRequestInput {
  input: MilestoneInput;
  canonicalFactsHash: string;
}

export const buildMilestoneNarrationRequest = (
  input: BuildMilestoneNarrationRequestInput,
): MilestoneNarrationRequest =>
  MilestoneNarrationRequestSchema.parse({
    schemaVersion: 1,
    promptVersion: 'milestone-narration-v1',
    kind: 'milestone',
    canonicalFactsHash: input.canonicalFactsHash,
    input: input.input,
  });
