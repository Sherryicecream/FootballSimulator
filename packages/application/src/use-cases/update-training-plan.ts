import {
  CareerSaveV4Schema,
  TrainingPlanSchema,
  type CareerSaveV4,
  type TrainingPlan,
} from '@football/contracts';

export const updateTrainingPlan = (save: CareerSaveV4, plan: TrainingPlan): CareerSaveV4 => {
  if (save.story.pendingEvent) throw new Error('请先处理当前事件');
  return CareerSaveV4Schema.parse({ ...save, trainingPlan: TrainingPlanSchema.parse(plan) });
};
