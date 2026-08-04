import { z } from 'zod';

/** 中国大区分类 */
export const RegionGroupSchema = z.enum(['华东', '华南', '华北', '华中', '西南', '西北', '东北']);

export type RegionGroup = z.infer<typeof RegionGroupSchema>;

/** 地域档案：描述一个地区的足球青训生态 */
export const RegionProfileSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(30),
  group: RegionGroupSchema,
  isKeyRegion: z.boolean(),
  description: z.string().min(1).max(200),
  youthFacilityLevel: z.number().int().min(0).max(100),
  scoutingCoverage: z.number().int().min(0).max(100),
  competitionIntensity: z.number().int().min(0).max(100),
  trainingStyle: z.string().min(1).max(20),
  costOfLiving: z.string().min(1).max(10),
  climate: z.string().min(1).max(30),
  footballCulture: z.string().min(1).max(100),
});

export type RegionProfile = z.infer<typeof RegionProfileSchema>;
