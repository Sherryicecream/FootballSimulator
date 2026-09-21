import { z } from 'zod';
import { WorldClubCountrySchema } from './world-football';

const IdSchema = z.string().min(1).max(60);

export const WorldTransferWindowSchema = z.enum(['summer', 'winter']);
export type WorldTransferWindow = z.infer<typeof WorldTransferWindowSchema>;

export const WorldTransferActivitySchema = z.strictObject({
  id: IdSchema,
  seasonId: IdSchema,
  window: WorldTransferWindowSchema,
  fromClubId: IdSchema,
  toClubId: IdSchema,
  playerId: IdSchema.nullable(),
  position: z.string().min(1).max(40),
  status: z.enum(['rumour', 'negotiating', 'completed']),
  reason: z.enum(['need', 'promotion', 'relegation', 'continental', 'contract', 'injury']),
  confidence: z.number().min(0).max(1),
  relatedFactId: IdSchema,
});
export type WorldTransferActivity = z.infer<typeof WorldTransferActivitySchema>;

export const WorldTransferClubRefSchema = z.strictObject({
  clubId: IdSchema,
  country: WorldClubCountrySchema,
});

/** Current resumable window state; completed history stays in compact pulses. */
export const WorldTransferWindowStateSchema = z.strictObject({
  seasonId: IdSchema,
  window: WorldTransferWindowSchema,
  seed: z.number().int().min(0).max(2_147_483_647),
  activities: z.array(WorldTransferActivitySchema).max(24),
  newsCursor: z.string().max(30).nullable(),
});
export type WorldTransferWindowState = z.infer<typeof WorldTransferWindowStateSchema>;
