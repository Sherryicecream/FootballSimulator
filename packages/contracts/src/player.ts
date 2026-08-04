import { z } from 'zod';
import { PositionSchema, FootSchema } from './primitives';

// Technical attributes (6): 停球、盘带、传球、射门、防守、空中能力
export const TechnicalAttributesSchema = z.object({
  firstTouch: z.number().int().min(0).max(100),
  dribbling: z.number().int().min(0).max(100),
  passing: z.number().int().min(0).max(100),
  shooting: z.number().int().min(0).max(100),
  defending: z.number().int().min(0).max(100),
  aerialAbility: z.number().int().min(0).max(100),
});

export type TechnicalAttributes = z.infer<typeof TechnicalAttributesSchema>;

// Physical attributes (4): 速度、力量、耐力、灵活
export const PhysicalAttributesSchema = z.object({
  pace: z.number().int().min(0).max(100),
  strength: z.number().int().min(0).max(100),
  stamina: z.number().int().min(0).max(100),
  agility: z.number().int().min(0).max(100),
});

export type PhysicalAttributes = z.infer<typeof PhysicalAttributesSchema>;

// Mental attributes (6): 跑位、视野、决策、镇定、意志、纪律
export const MentalAttributesSchema = z.object({
  offTheBall: z.number().int().min(0).max(100),
  vision: z.number().int().min(0).max(100),
  decision: z.number().int().min(0).max(100),
  composure: z.number().int().min(0).max(100),
  determination: z.number().int().min(0).max(100),
  discipline: z.number().int().min(0).max(100),
});

export type MentalAttributes = z.infer<typeof MentalAttributesSchema>;

// All 16 visible attributes
export const PlayerAttributesSchema = z.object({
  technical: TechnicalAttributesSchema,
  physical: PhysicalAttributesSchema,
  mental: MentalAttributesSchema,
});

export type PlayerAttributes = z.infer<typeof PlayerAttributesSchema>;

// Hidden traits (§7): 分项潜力、稳定性、职业素养、抗压能力、适应力、伤病倾向
export const HiddenTraitsSchema = z.object({
  potential: z.number().int().min(0).max(100),
  stability: z.number().int().min(0).max(100),
  professionalism: z.number().int().min(0).max(100),
  pressureResistance: z.number().int().min(0).max(100),
  adaptability: z.number().int().min(0).max(100),
  injuryProneness: z.number().int().min(0).max(100),
});

export type HiddenTraits = z.infer<typeof HiddenTraitsSchema>;

// Player identity (§6): 姓名、家乡、位置、惯用脚、背景、性格
export const PlayerIdentitySchema = z.object({
  name: z.string().min(1).max(50),
  hometown: z.string().min(1).max(30),
  homelandId: z.string().min(1).max(40),
  dateOfBirth: z.string(), // ISO date string: "2008-06-15"
  primaryPosition: PositionSchema,
  secondaryPosition: PositionSchema.optional(),
  preferredFoot: FootSchema,
  weakFootLevel: z.number().int().min(0).max(100),
  growthBackground: z.string().min(1).max(50),
  personalityTendency: z.string().min(1).max(30),
});

export type PlayerIdentity = z.infer<typeof PlayerIdentitySchema>;
