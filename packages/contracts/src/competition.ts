import { z } from 'zod';

export const CompetitionTypeSchema = z.enum(['LEAGUE', 'CUP', 'TOURNAMENT']);

export const CompetitionDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  country: z.string().min(1).max(30),
  tier: z.number().int().min(1).max(10),
  type: CompetitionTypeSchema,
});

export type CompetitionDefinition = z.infer<typeof CompetitionDefinitionSchema>;
