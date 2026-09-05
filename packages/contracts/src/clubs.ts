import { z } from 'zod';

const IdSchema = z.string().min(1).max(60);

export const ClubProfileSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1).max(80),
  tier: z.number().int().min(1).max(10),
  regionId: IdSchema,
  positionalNeeds: z.array(z.string().min(1).max(40)).max(6),
  youthCycle: z.enum(['rebuilding', 'stable', 'contending']),
  overseas: z.boolean().default(false),
  overseasRegion: z.enum(['europe', 'asia']).optional(),
  wageBudget: z.number().int().min(0).max(100),
});
export type ClubProfile = z.infer<typeof ClubProfileSchema>;

export const AgentArchetypeSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1).max(40),
  style: z.string().min(1).max(40),
  focusTierMin: z.number().int().min(1).max(10),
  focusTierMax: z.number().int().min(1).max(10),
});
export type AgentArchetype = z.infer<typeof AgentArchetypeSchema>;
