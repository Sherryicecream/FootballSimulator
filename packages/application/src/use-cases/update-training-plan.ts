import {
  CareerSaveV4Schema,
  CareerSaveV5Schema,
  CareerSaveV6Schema,
  CareerSaveV7Schema,
  CareerSaveV8Schema,
  TrainingPlanSchema,
  type CareerSaveV4Like,
  type TrainingPlan,
} from '@football/contracts';

export const updateTrainingPlan = <S extends CareerSaveV4Like>(save: S, plan: TrainingPlan): S => {
  if (save.story.pendingEvent || save.story.pendingFeedback) throw new Error('请先处理当前事件');
  const version = (save as { schemaVersion?: number }).schemaVersion;
  const schema =
    version === 8
      ? CareerSaveV8Schema
      : version === 7
        ? CareerSaveV7Schema
        : version === 6
          ? CareerSaveV6Schema
          : version === 5
            ? CareerSaveV5Schema
            : CareerSaveV4Schema;
  const schemaVersion =
    version === 8 ? 8 : version === 7 ? 7 : version === 6 ? 6 : version === 5 ? 5 : 4;
  return schema.parse({
    ...save,
    schemaVersion,
    trainingPlan: TrainingPlanSchema.parse(plan),
  }) as unknown as S;
};
