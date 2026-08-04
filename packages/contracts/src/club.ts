import { z } from 'zod';

export const ClubDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(50),
  shortName: z.string().min(1).max(20),
  country: z.string().min(1).max(30),
  city: z.string().min(1).max(30),
  tier: z.number().int().min(1).max(10),
  reputation: z.number().int().min(1).max(100),
  tacticalStyle: z.string().min(1).max(30),
});

export type ClubDefinition = z.infer<typeof ClubDefinitionSchema>;
