import { z } from 'zod';
import { PlayerIdentitySchema, PlayerAttributesSchema, HiddenTraitsSchema } from './player';
import { CareerStageSchema } from './primitives';
import { WorldStateSchema } from './world';
import { RandomStateSchema } from './random';

// PlayerCareer: 身份、属性、隐藏特质、年龄、生涯阶段、声望 (§23)
export const PlayerCareerSchema = z.object({
  identity: PlayerIdentitySchema,
  attributes: PlayerAttributesSchema,
  hiddenTraits: HiddenTraitsSchema,
  age: z.number().int().min(14).max(50),
  careerStage: CareerStageSchema,
  reputation: z.number().int().min(0).max(100),
});

export type PlayerCareer = z.infer<typeof PlayerCareerSchema>;

// CareerSave: 一段生涯的一致性边界 (§23)
export const CareerSaveSchema = z.object({
  schemaVersion: z.literal(1),
  player: PlayerCareerSchema,
  world: WorldStateSchema,
  randomState: RandomStateSchema,
});

export type CareerSave = z.infer<typeof CareerSaveSchema>;