import { z } from 'zod';
import {
  CareerSaveV5Schema,
  migrateCareerSaveV5,
  validateCareerSaveV5LoanState,
} from './career-expansion';

const IdSchema = z.string().min(1).max(60);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CareerEndKindSchema = z.enum([
  'youth-no-contract',
  'voluntary-retirement',
  'market-exit',
]);
export type CareerEndKind = z.infer<typeof CareerEndKindSchema>;

export const CareerEndSchema = z.strictObject({
  kind: CareerEndKindSchema,
  endedOn: IsoDateSchema,
  summary: z.string().min(1).max(300),
  evidenceIds: z.array(IdSchema).max(20),
});
export type CareerEnd = z.infer<typeof CareerEndSchema>;

export const CareerSaveV6Schema = CareerSaveV5Schema.omit({ schemaVersion: true })
  .extend({
    schemaVersion: z.literal(6),
    careerEnd: CareerEndSchema.nullable().default(null),
  })
  .superRefine((save, ctx) => {
    try {
      validateCareerSaveV5LoanState({ ...save, schemaVersion: 5 });
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

export type CareerSaveV6 = z.infer<typeof CareerSaveV6Schema>;
export type CareerSaveV6Like = Omit<CareerSaveV6, 'schemaVersion'> & { schemaVersion: number };

export const migrateCareerSaveV6 = (raw: unknown): CareerSaveV6 => {
  const existing = CareerSaveV6Schema.safeParse(raw);
  if (existing.success) return existing.data;
  const v5 = migrateCareerSaveV5(raw);
  const endedOn = v5.retiredOn ?? v5.proSeason?.endDate ?? v5.season.endDate;
  const retirementFacts = v5.ledger.filter(({ type }) => type === 'retirement').slice(-1);
  return CareerSaveV6Schema.parse({
    ...v5,
    schemaVersion: 6,
    careerEnd:
      v5.careerPhase === 'retired'
        ? {
            kind: 'voluntary-retirement',
            endedOn,
            summary: '球员正式结束了自己的足球生涯。',
            evidenceIds: retirementFacts.map(({ id }) => id),
          }
        : null,
    retiredOn: v5.careerPhase === 'retired' ? endedOn : v5.retiredOn,
  });
};
