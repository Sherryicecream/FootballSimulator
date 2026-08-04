import { z } from 'zod';

export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'legendary']);

export const EventCategorySchema = z.enum([
  'china-youth',
  'dressing-room',
  'off-pitch',
  'asia-career',
  'europe-career',
  'national-team',
]);

export const EventChoiceSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1).max(200),
  riskLabel: z.string().min(1).max(10),
  effects: z.record(z.string(), z.number().int()).default({}),
  delayEffects: z.record(z.string(), z.number().int()).optional().default({}),
  memoryKey: z.string().optional(),
});

export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const EventConditionSchema = z.object({
  minAge: z.number().int().min(14).max(50).optional(),
  maxAge: z.number().int().min(14).max(50).optional(),
  minReputation: z.number().int().min(0).max(100).optional(),
  maxReputation: z.number().int().min(0).max(100).optional(),
  minSeason: z.number().int().optional(),
  position: z.string().optional(),
  requireStoryId: z.string().optional(),
  excludeStoryId: z.string().optional(),
});

export const EventDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  version: z.number().int().min(1),
  category: EventCategorySchema,
  rarity: RaritySchema,
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  condition: EventConditionSchema.default({}),
  choices: z.array(EventChoiceSchema).min(1),
  cooldownWeeks: z.number().int().min(0).max(52).default(0),
  storyId: z.string().optional(),
  nextEvents: z.array(z.string()).optional().default([]),
  narrativeTemplate: z.string().optional(),
});

export type EventDefinition = z.infer<typeof EventDefinitionSchema>;

export const DelayedEffectSchema = z.object({
  triggerWeek: z.number().int(),
  effects: z.record(z.string(), z.number().int()),
  sourceEventId: z.string(),
});

export const StoryStateSchema = z.object({
  activeStorylines: z.array(z.string()),
  completedStoryIds: z.array(z.string()),
  cooldowns: z.record(z.string(), z.number().int()),
  pendingDelayedEffects: z.array(DelayedEffectSchema),
});

export type StoryState = z.infer<typeof StoryStateSchema>;
