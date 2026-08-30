import { z } from 'zod';
import { CareerSaveV4Schema, migrateCareerSaveV4 } from './professional';

const IdSchema = z.string().min(1).max(60);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ClubHistoryEntrySchema = z.strictObject({
  clubId: IdSchema,
  clubName: z.string().min(1).max(80),
  from: IsoDateSchema,
  to: IsoDateSchema.nullable(),
  seasons: z.number().int().min(1),
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
});
export type ClubHistoryEntry = z.infer<typeof ClubHistoryEntrySchema>;

export const NationalTeamSchema = z.strictObject({
  capped: z.boolean(),
  caps: z.number().int().min(0),
  goals: z.number().int().min(0),
  debutOn: IsoDateSchema.nullable(),
});
export type NationalTeam = z.infer<typeof NationalTeamSchema>;

export const CareerTotalsSchema = z.strictObject({
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  minutes: z.number().int().min(0),
});
export type CareerTotals = z.infer<typeof CareerTotalsSchema>;

export const CareerSaveV5Schema = CareerSaveV4Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(5),
  clubHistory: z.array(ClubHistoryEntrySchema).default([]),
  nationalTeam: NationalTeamSchema.nullable().default(null),
  totals: CareerTotalsSchema.default({
    appearances: 0,
    goals: 0,
    assists: 0,
    minutes: 0,
  }),
  overseasSince: IsoDateSchema.nullable().default(null),
  freeAgentSeasons: z.number().int().min(0).default(0),
  retiredOn: IsoDateSchema.nullable().default(null),
});
export type CareerSaveV5 = z.infer<typeof CareerSaveV5Schema>;

/** 版本无关的 v5 结构切片。 */
export type CareerSaveV5Like = Omit<CareerSaveV5, 'schemaVersion'> & { schemaVersion: number };

/**
 * 迁移任意历史存档（v1–v5）为 v5：v5 原样通过，v4 补默认字段，更早版本走既有链路。
 */
export const migrateCareerSaveV5 = (raw: unknown): CareerSaveV5 => {
  const existingV5 = CareerSaveV5Schema.safeParse(raw);
  if (existingV5.success) return existingV5.data;
  const asV4 = migrateCareerSaveV4(raw);
  const asV5 = CareerSaveV5Schema.safeParse({ ...asV4, schemaVersion: 5 });
  if (asV5.success) return asV5.data;
  throw new Error('无法迁移存档为 v5：' + asV5.error.issues[0]?.message);
};
