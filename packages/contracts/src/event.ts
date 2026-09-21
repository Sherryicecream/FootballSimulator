import { z } from 'zod';
import { CountrySchema } from './country';

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

export const EventSpeakerRoleSchema = z.enum([
  'youth-coach',
  'assistant-coach',
  'teammate',
  'rival',
  'family',
]);
export type EventSpeakerRole = z.infer<typeof EventSpeakerRoleSchema>;

export const EventFeedbackResultToneSchema = z.enum(['success', 'partial', 'failure', 'neutral']);
export type EventFeedbackResultTone = z.infer<typeof EventFeedbackResultToneSchema>;

export const EventChoiceResponseSchema = z.strictObject({
  speakerRole: EventSpeakerRoleSchema,
  text: z.string().min(1).max(500),
});
export type EventChoiceResponse = z.infer<typeof EventChoiceResponseSchema>;

export const EventChoiceNarrativeVariantSchema = z.strictObject({
  response: z.string().min(1).max(500),
  responses: z.array(EventChoiceResponseSchema).max(6).optional(),
  followUp: z.string().min(1).max(300),
  resultTitle: z.string().min(1).max(100).optional(),
});
export type EventChoiceNarrativeVariant = z.infer<typeof EventChoiceNarrativeVariantSchema>;

export const ChoiceResolutionAttributeSchema = z.enum([
  'firstTouch',
  'dribbling',
  'passing',
  'shooting',
  'defending',
  'aerialAbility',
  'pace',
  'strength',
  'stamina',
  'agility',
  'offTheBall',
  'vision',
  'decision',
  'composure',
  'determination',
  'discipline',
]);
export type ChoiceResolutionAttribute = z.infer<typeof ChoiceResolutionAttributeSchema>;

export const ChoiceResolutionOutcomeSchema = z.object({
  label: z.string().min(1).max(40),
  eventOutcome: z.literal('adapted').optional(),
  effects: z.record(z.string(), z.number().int()).default({}),
  delayEffects: z.record(z.string(), z.number().int()).optional(),
  memoryKey: z.string().optional(),
  response: z.string().min(1).max(500).optional(),
  responses: z.array(EventChoiceResponseSchema).max(6).optional(),
  followUp: z.string().min(1).max(300).optional(),
  nextEventIds: z.array(z.string().min(1).max(60)).max(8).optional(),
  narrativeVariants: z.array(EventChoiceNarrativeVariantSchema).min(2).max(4).optional(),
});
export type ChoiceResolutionOutcome = z.infer<typeof ChoiceResolutionOutcomeSchema>;

export const ChoiceResolutionSchema = z.strictObject({
  attribute: ChoiceResolutionAttributeSchema,
  difficulty: z.number().int().min(0).max(100),
  volatility: z.number().int().min(0).max(20).default(8),
  stateModifiers: z
    .strictObject({
      morale: z.number().min(-1).max(1).default(0),
      form: z.number().min(-1).max(1).default(0),
      confidence: z.number().min(-1).max(1).default(0),
      fitness: z.number().min(-1).max(1).default(0),
      fatigue: z.number().min(-1).max(1).default(0),
      coachTrust: z.number().min(-1).max(1).default(0),
    })
    .default({
      morale: 0,
      form: 0,
      confidence: 0,
      fitness: 0,
      fatigue: 0,
      coachTrust: 0,
    }),
  outcomes: z.strictObject({
    success: ChoiceResolutionOutcomeSchema,
    partial: ChoiceResolutionOutcomeSchema,
    failure: ChoiceResolutionOutcomeSchema,
  }),
});
export type ChoiceResolution = z.infer<typeof ChoiceResolutionSchema>;

export const ChoiceOutcomeKindSchema = z.enum(['success', 'partial', 'failure', 'legacy']);
export type ChoiceOutcomeKind = z.infer<typeof ChoiceOutcomeKindSchema>;

export const ChoiceOutcomeSummarySchema = z.strictObject({
  outcome: z.enum(['success', 'partial', 'failure']),
  label: z.string().min(1).max(40),
  attribute: ChoiceResolutionAttributeSchema,
  attributeValue: z.number().int().min(0).max(100),
  score: z.number().int().min(0).max(120),
  target: z.number().int().min(0).max(100),
  stateModifier: z.number().int().min(-100).max(100),
  variance: z.number().int().min(-20).max(20),
  reason: z.string().min(1).max(220),
});
export type ChoiceOutcomeSummary = z.infer<typeof ChoiceOutcomeSummarySchema>;

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
  eventOutcome: z.literal('adapted').optional(),
  effects: z.record(z.string(), z.number().int()).default({}),
  resolution: ChoiceResolutionSchema.optional(),
  delayEffects: z.record(z.string(), z.number().int()).optional(),
  memoryKey: z.string().optional(),
  response: z.string().min(1).max(500).optional(),
  resultTitle: z.string().min(1).max(100).optional(),
  responses: z.array(EventChoiceResponseSchema).max(6).optional(),
  followUp: z.string().min(1).max(300).optional(),
  nextEventIds: z.array(z.string().min(1).max(60)).max(8).optional(),
  narrativeVariants: z.array(EventChoiceNarrativeVariantSchema).min(2).max(4).optional(),
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
      'pro-match',
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
  requireOverseas: z.boolean().optional(),
  overseasRegions: z.array(z.enum(['europe', 'asia'])).optional(),
  requireCountry: CountrySchema.optional(),
  requireNationalTeam: z.boolean().optional(),
  minCaps: z.number().int().min(0).optional(),
});

export const EventDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  storyFamilyId: z.string().min(1).max(60).optional(),
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

export type ResolvedEventDefinition = z.infer<typeof EventDefinitionSchema>;
export type EventDefinition = Omit<
  ResolvedEventDefinition,
  'theme' | 'interaction' | 'baseWeight'
> &
  Partial<Pick<ResolvedEventDefinition, 'theme' | 'interaction' | 'baseWeight'>>;

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
