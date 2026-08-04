import { z } from 'zod';

export const PersonMemorySchema = z.object({
  eventId: z.string().min(1).max(40),
  summary: z.string().min(1).max(200),
  season: z.number().int(),
  week: z.number().int().min(1).max(52),
  emotionalImpact: z.enum(['positive', 'negative', 'neutral']),
});

export type PersonMemory = z.infer<typeof PersonMemorySchema>;

export const RelationshipDimensionSchema = z.object({
  trust: z.number().int().min(0).max(100),
  respect: z.number().int().min(0).max(100),
  closeness: z.number().int().min(0).max(100),
});

export type RelationshipDimension = z.infer<typeof RelationshipDimensionSchema>;

export const PersonSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(50),
  role: z.string().min(1).max(30),
  age: z.number().int().min(16).max(80),
  personality: z.string().min(1).max(30),
  traits: z.record(z.string(), z.number().int().min(0).max(100)).default({}),
  relationship: RelationshipDimensionSchema,
  memories: z.array(PersonMemorySchema).default([]),
});

export type Person = z.infer<typeof PersonSchema>;

export const ActiveRelationSchema = z.object({
  personId: z.string().min(1).max(40),
  relationType: z.enum(['teammate', 'coach', 'rival', 'friend', 'family', 'agent']),
  sinceSeason: z.number().int(),
});

export const RelationshipGraphSchema = z.object({
  persons: z.array(PersonSchema),
  activeRelations: z.array(ActiveRelationSchema),
});

export type RelationshipGraph = z.infer<typeof RelationshipGraphSchema>;