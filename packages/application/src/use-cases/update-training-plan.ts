import {
  CareerSaveV3Schema,
  TrainingPlanSchema,
  type CareerSaveV3,
  type TrainingPlan,
} from '@football/contracts';

export const updateTrainingPlan = (save: CareerSaveV3, plan: TrainingPlan): CareerSaveV3 => {
  if (save.story.pendingEvent) throw new Error('请先处理当前事件');
  return CareerSaveV3Schema.parse({ ...save, trainingPlan: TrainingPlanSchema.parse(plan) });
};
