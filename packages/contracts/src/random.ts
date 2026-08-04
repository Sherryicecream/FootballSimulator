import { z } from 'zod';

// RandomState tracks the seed and sequence position for deterministic RNG
export const RandomStateSchema = z.object({
  seed: z.number().int().min(0).max(2147483647),
  sequencePosition: z.number().int().min(0),
});

export type RandomState = z.infer<typeof RandomStateSchema>;