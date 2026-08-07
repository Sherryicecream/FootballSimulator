import { z } from 'zod';

export const InjuryStatusSchema = z.strictObject({
  id: z.string().min(1).max(60),
  kind: z.enum(['discomfort', 'minor', 'moderate', 'severe']),
  bodyArea: z.string().min(1).max(60),
  occurredWeek: z.string().min(1).max(20),
  expectedRecoveryWeeks: z.number().int().min(1).max(52),
  recoveredWeeks: z.number().int().min(0).max(52),
  recurrenceRisk: z.number().min(0).max(1),
});

export type InjuryStatus = z.infer<typeof InjuryStatusSchema>;

export const HealthStateSchema = z.strictObject({
  fitness: z.number().int().min(0).max(100),
  fatigue: z.number().int().min(0).max(100),
  recentLoad: z.number().min(0).max(100),
  activeInjury: InjuryStatusSchema.nullable(),
  previousInjuries: z.array(InjuryStatusSchema),
});

export type HealthState = z.infer<typeof HealthStateSchema>;
