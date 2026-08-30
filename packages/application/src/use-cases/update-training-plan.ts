import {
  CareerSaveV4Schema,
  CareerSaveV5Schema,
  TrainingPlanSchema,
  type CareerSaveV4Like,
  type TrainingPlan,
} from '@football/contracts';

export const updateTrainingPlan = <S extends CareerSaveV4Like>(save: S, plan: TrainingPlan): S => {
  if (save.story.pendingEvent) throw new Error('请先处理当前事件');
  const isV5 = (save as { schemaVersion?: number }).schemaVersion === 5;
  return (isV5 ? CareerSaveV5Schema : CareerSaveV4Schema).parse({
    ...save,
    schemaVersion: isV5 ? 5 : 4,
    trainingPlan: TrainingPlanSchema.parse(plan),
  }) as unknown as S;
};
