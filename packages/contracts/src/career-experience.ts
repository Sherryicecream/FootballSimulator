import { z } from 'zod';
import { CareerSaveV5Schema, validateCareerSaveV5LoanState } from './career-expansion';
import { CareerEndSchema, migrateCareerSaveV6 } from './career-end';
import type { CareerSaveV6Like } from './career-end';
import { WorldRegistrySchema } from './country';

// ─── CareerMoment ──────────────────────────────────────────────
// 标识一个节点推进可能停留的位置（§1 推进规则）
export const CareerMomentTypeSchema = z.enum([
  'event-pending',
  'season-end',
  'injury-occurs',
  'contract-window',
  'national-team-window',
  'major-settlement',
  'none',
]);
export type CareerMomentType = z.infer<typeof CareerMomentTypeSchema>;

/** 最小 CareerMoment：标识赛季内的一周位置。weekIndex 为该赛季内周序，不作 ISO 周号。 */
export const CareerMomentSchema = z.strictObject({
  seasonId: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekIndex: z.number().int().min(1),
});
export type CareerMoment = z.infer<typeof CareerMomentSchema>;

// ─── Mechanics Version ─────────────────────────────────────────
export const MechanicsVersionSchema = z.literal('experience-v1');
export type MechanicsVersion = z.infer<typeof MechanicsVersionSchema>;

// ─── CareerSaveV7 / CareerSaveV8 ──────────────────────────────
// 避免在含有 superRefine 的 v6 上直接 .omit()，改为从 v5 base 重建
const CareerSaveV6BaseSchema = CareerSaveV5Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(6),
  careerEnd: CareerEndSchema.nullable().default(null),
});

const CareerSaveV7BaseSchema = CareerSaveV6BaseSchema.extend({
  schemaVersion: z.union([z.literal(7), z.literal(8)]),
  mechanicsVersion: MechanicsVersionSchema.default('experience-v1'),
  moments: z.array(CareerMomentSchema).default([]),
  worldRegistry: WorldRegistrySchema.default(() => ({ entries: [], clubPulses: [] })),
});

const CareerSaveV8BaseSchema = CareerSaveV6BaseSchema.extend({
  schemaVersion: z.literal(8),
  mechanicsVersion: MechanicsVersionSchema.default('experience-v1'),
  moments: z.array(CareerMomentSchema).default([]),
  worldRegistry: WorldRegistrySchema.default(() => ({ entries: [], clubPulses: [] })),
});

type CareerSaveInvariantFields = {
  careerPhase: string;
  careerEnd: { endedOn: string } | null;
  retiredOn: string | null;
};

const withCareerSaveInvariants = <T extends CareerSaveInvariantFields>(schema: z.ZodType<T>) =>
  schema.superRefine((save, ctx) => {
    try {
      validateCareerSaveV5LoanState({ ...save, schemaVersion: 5 } as unknown as Parameters<
        typeof validateCareerSaveV5LoanState
      >[0]);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : '租借状态不一致',
        path: ['activeLoan'],
      });
    }
    const terminal = save.careerPhase === 'retired';
    if (terminal !== (save.careerEnd !== null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '终局阶段与终局原因不一致' });
    }
    if (save.careerEnd && save.retiredOn !== save.careerEnd.endedOn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '终局日期与退役日期不一致' });
    }
  });

export const CareerSaveV7Schema = withCareerSaveInvariants(CareerSaveV7BaseSchema);
export const CareerSaveV8Schema = withCareerSaveInvariants(CareerSaveV8BaseSchema);
export type CareerSaveV7 = z.infer<typeof CareerSaveV7Schema>;
export type CareerSaveV8 = z.infer<typeof CareerSaveV8Schema>;

/** 版本无关的 v7-like 切片 */
export type CareerSaveV7Like = Omit<CareerSaveV7, 'schemaVersion'> & { schemaVersion: number };
export type CareerSaveV8Like = Omit<CareerSaveV8, 'schemaVersion'> & { schemaVersion: number };

// ─── Migration v6 → v7 ────────────────────────────────────────
export const migrateCareerSaveV7 = (raw: unknown): CareerSaveV7 => {
  const existing = CareerSaveV7Schema.safeParse(raw);
  if (existing.success) return existing.data;
  const v6: CareerSaveV6Like = migrateCareerSaveV6(raw);
  return CareerSaveV7Schema.parse({
    ...v6,
    schemaVersion: 7,
    mechanicsVersion: 'experience-v1',
    moments: [],
  });
};

/** 将任意历史存档升级到 v8，并为旧存档建立空的世界注册表。 */
export const migrateCareerSaveV8 = (raw: unknown): CareerSaveV8 => {
  const existing = CareerSaveV8Schema.safeParse(raw);
  if (existing.success) return existing.data;
  const v7 = migrateCareerSaveV7(raw);
  return CareerSaveV8Schema.parse({
    ...v7,
    schemaVersion: 8,
    worldRegistry: v7.worldRegistry ?? { entries: [] },
  });
};
