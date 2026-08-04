import { z } from 'zod';

// Minimal world state — will expand in later phases
export const WorldStateSchema = z.object({
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO format YYYY-MM-DD'),
  season: z.number().int().min(2000).max(2100),
});

export type WorldState = z.infer<typeof WorldStateSchema>;
