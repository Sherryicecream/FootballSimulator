import { z } from 'zod';
import type { Country } from './country';
import type { ClubProfile } from './clubs';
import type { ProFixture } from './professional';

const IdSchema = z.string().min(1).max(60);
const DomesticHonourSchema = z.string().min(1).max(80);
export const WorldClubCountrySchema = z.enum([
  'china',
  'england',
  'spain',
  'germany',
  'italy',
  'france',
  'japan',
  'korea',
]);

export const WorldClubContinentalStatusSchema = z.enum([
  'none',
  'qualifying',
  'main-stage',
  'champion',
]);
export type WorldClubContinentalStatus = z.infer<typeof WorldClubContinentalStatusSchema>;

export const WorldClubPulseSchema = z.strictObject({
  clubId: IdSchema,
  country: WorldClubCountrySchema,
  tier: z.number().int().min(1).max(10),
  seasonId: IdSchema,
  finalRank: z.number().int().min(1).max(12).nullable(),
  points: z.number().int().min(0).max(66),
  domesticHonours: z.array(DomesticHonourSchema).max(4),
  continentalStatus: WorldClubContinentalStatusSchema,
  continentalAppearancesLast3: z.number().int().min(0).max(3),
  transferActivityLast2: z.number().int().min(0).max(2),
  lastNewsWindow: IdSchema.nullable(),
});
export type WorldClubPulse = z.infer<typeof WorldClubPulseSchema>;

export type WorldClubSeasonResult = {
  clubId: string;
  country: Country;
  tier: number;
  seasonId: string;
  finalRank: number | null;
  points: number;
  domesticHonours: readonly string[];
  continentalStatus: WorldClubContinentalStatus;
};

export type BuildWorldClubPulsesInput = {
  clubs: readonly ClubProfile[];
  seasonResults: readonly WorldClubSeasonResult[];
  previous: readonly WorldClubPulse[];
};

export const ContinentalFederationSchema = z.enum(['uefa', 'afc']);
export type ContinentalFederation = z.infer<typeof ContinentalFederationSchema>;

export const ContinentalClubInputSchema = z.strictObject({
  clubId: IdSchema,
  country: WorldClubCountrySchema,
  tier: z.number().int().min(1).max(10),
  finalRank: z.number().int().min(1).max(12),
  points: z.number().int().min(0).max(100),
  cupWinner: z.boolean(),
});
export type ContinentalClubInput = z.infer<typeof ContinentalClubInputSchema>;

export const ContinentalQuotaSchema = z.strictObject({
  directPerCountry: z.number().int().min(1).max(4),
  qualifyingPerCountry: z.number().int().min(0).max(4),
});
export type ContinentalQuota = z.infer<typeof ContinentalQuotaSchema>;

export const ContinentalParticipantStageSchema = z.enum(['direct', 'qualifying']);
export const ContinentalParticipantReasonSchema = z.enum([
  'league-champion',
  'league-rank',
  'cup-winner',
  'coefficient',
]);
export const ContinentalParticipantSchema = z.strictObject({
  clubId: IdSchema,
  country: WorldClubCountrySchema,
  federation: ContinentalFederationSchema,
  stage: ContinentalParticipantStageSchema,
  reason: ContinentalParticipantReasonSchema,
});
export type ContinentalParticipant = z.infer<typeof ContinentalParticipantSchema>;

export const ContinentalClubResultSchema = z.strictObject({
  clubId: IdSchema,
  stage: z.enum(['qualifying', 'main-stage', 'knockout', 'champion']),
  wins: z.number().int().min(0).max(20),
  draws: z.number().int().min(0).max(20),
  losses: z.number().int().min(0).max(20),
  points: z.number().int().min(0).max(60),
  honour: z.string().min(1).max(80).nullable(),
  relatedFactId: IdSchema,
});
export type ContinentalClubResult = z.infer<typeof ContinentalClubResultSchema>;

const ContinentalFixtureSchema = z.strictObject({
  id: IdSchema,
  weekKey: z.string().min(1).max(20),
  competitionId: IdSchema,
  homeClubId: IdSchema,
  awayClubId: IdSchema,
  status: z.enum(['scheduled', 'played']),
  resultId: IdSchema.nullable(),
});

export const ContinentalSeasonSummarySchema = z.strictObject({
  competitionId: IdSchema,
  seasonId: IdSchema,
  participants: z.array(ContinentalParticipantSchema),
  results: z.array(ContinentalClubResultSchema),
  playerFixtures: z.array(ContinentalFixtureSchema).nullable(),
});
export type ContinentalSeasonSummary = {
  competitionId: string;
  seasonId: string;
  participants: readonly ContinentalParticipant[];
  results: readonly ContinentalClubResult[];
  playerFixtures: readonly ProFixture[] | null;
};
