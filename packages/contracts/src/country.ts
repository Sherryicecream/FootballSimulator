import { z } from 'zod';
import { WorldClubPulseSchema } from './world-football';
import { WorldTransferWindowStateSchema } from './world-transfer';

const IdSchema = z.string().min(1).max(60);

export const CountrySchema = z.enum([
  'china',
  'england',
  'spain',
  'germany',
  'italy',
  'france',
  'japan',
  'korea',
]);
export type Country = z.infer<typeof CountrySchema>;

export const WorldRegistrySourceSchema = z.enum(['player', 'world']);
export type WorldRegistrySource = z.infer<typeof WorldRegistrySourceSchema>;

export const WorldRegistryEntrySchema = z.strictObject({
  country: CountrySchema,
  source: WorldRegistrySourceSchema,
  seasonId: IdSchema.optional(),
  completed: z.boolean().default(false),
  champion: IdSchema.optional(),
  promoted: z.array(IdSchema).max(4).default([]),
  relegated: z.array(IdSchema).max(4).default([]),
});
export type WorldRegistryEntry = z.infer<typeof WorldRegistryEntrySchema>;

/**
 * 当前世界只保留每个已激活联赛的赛季摘要引用。
 * 同一国家允许存在多个 tier/seasonId，避免上下级联赛结算互相覆盖。
 */
export const WorldRegistrySchema = z
  .strictObject({
    entries: z.array(WorldRegistryEntrySchema).max(32).default([]),
    clubPulses: z.array(WorldClubPulseSchema).max(240).default([]),
    transferWindow: WorldTransferWindowStateSchema.optional(),
  })
  .superRefine((registry, ctx) => {
    const keys = new Set<string>();
    for (const [index, entry] of registry.entries.entries()) {
      const key = `${entry.country}:${entry.seasonId ?? 'unassigned'}:${entry.source}`;
      if (keys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '世界注册表中同一国家、赛季和来源不能重复',
          path: ['entries', index],
        });
      }
      keys.add(key);
    }
  });
export type WorldRegistry = z.infer<typeof WorldRegistrySchema>;

export type LegacyClubCountryFields = {
  country?: Country | undefined;
  overseas?: boolean | undefined;
  overseasRegion?: 'europe' | 'asia' | undefined;
  regionId?: string | undefined;
};

/** 旧海外区域只有大区信息时的确定性迁移映射。 */
export const inferLegacyClubCountry = (club: LegacyClubCountryFields): Country => {
  if (club.country) return club.country;
  if (club.overseasRegion === 'europe') return 'england';
  if (club.overseasRegion === 'asia') return 'japan';
  return 'china';
};
