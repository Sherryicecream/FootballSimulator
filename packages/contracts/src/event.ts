import { z } from 'zod';

export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'legendary']);

export const YouthEventThemeSchema = z.enum([
  'match',
  'training',
  'relationships',
  'off-pitch',
  'health',
  'trajectory',
]);
export type YouthEventTheme = z.infer<typeof YouthEventThemeSchema>;

export const EventInteractionSchema = z.enum(['decision', 'automatic']);
export type EventInteraction = z.infer<typeof EventInteractionSchema>;

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
  delayEffects: z.record(z.string(), z.number().int()).optional(),
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
  requireFactType: z
    .enum([
      'training',
      'match',
      'health',
      'event',
      'decision',
      'relationship',
      'first-team',
      'monthly-settlement',
      'season-outcome',
    ])
    .optional(),
  requireFactText: z.string().min(1).max(40).optional(),
  requireActiveInjury: z.boolean().optional(),
  requirePersonRole: z
    .enum(['youth-coach', 'assistant-coach', 'teammate', 'rival', 'family'])
    .optional(),
  requireRelocation: z.boolean().optional(),
  growthBackgrounds: z.array(z.string().min(1).max(50)).optional(),
  personalityTendencies: z.array(z.string().min(1).max(30)).optional(),
  maturationPaces: z.array(z.enum(['early', 'normal', 'late'])).optional(),
  playerRoles: z
    .array(z.enum(['fringe', 'rotation', 'regular', 'starter', 'first-team-radar']))
    .optional(),
  firstTeamStages: z
    .array(
      z.enum([
        'none',
        'watchlist',
        'training-invite',
        'bench-list',
        'substitute-appearance',
        'starting-appearance',
      ]),
    )
    .optional(),
  minWeek: z.number().int().min(1).max(60).optional(),
  maxWeek: z.number().int().min(1).max(60).optional(),
  minMorale: z.number().int().min(0).max(100).optional(),
  maxMorale: z.number().int().min(0).max(100).optional(),
  minConfidence: z.number().int().min(0).max(100).optional(),
  maxConfidence: z.number().int().min(0).max(100).optional(),
  minFatigue: z.number().int().min(0).max(100).optional(),
  maxFatigue: z.number().int().min(0).max(100).optional(),
  minCoachEvaluation: z.number().int().min(0).max(100).optional(),
  maxCoachEvaluation: z.number().int().min(0).max(100).optional(),
  minProfessionalism: z.number().int().min(0).max(100).optional(),
  minStability: z.number().int().min(0).max(100).optional(),
});

export const EventDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  version: z.number().int().min(1),
  category: EventCategorySchema,
  rarity: RaritySchema,
  title: z.string().min(1).max(100),
  theme: YouthEventThemeSchema.default('off-pitch'),
  interaction: EventInteractionSchema.default('decision'),
  baseWeight: z.number().int().min(1).max(100).default(20),
  description: z.string().min(1).max(500),
  condition: EventConditionSchema.default({}),
  choices: z.array(EventChoiceSchema).min(1),
  cooldownWeeks: z.number().int().min(0).max(52).default(0),
  storyId: z.string().optional(),
  nextEvents: z.array(z.string()).optional(),
  narrativeTemplate: z.string().optional(),
  participantRoles: z
    .array(z.enum(['youth-coach', 'assistant-coach', 'teammate', 'rival', 'family']))
    .optional(),
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
