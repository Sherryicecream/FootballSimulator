import {
  CareerSaveV2Schema,
  TrainingPlanSchema,
  type CareerSaveV2,
  type TrainingPlan,
} from '@football/contracts';

export const updateTrainingPlan = (save: CareerSaveV2, plan: TrainingPlan): CareerSaveV2 => {
  if (save.story.pendingEvent) throw new Error('请先处理当前事件');
  return CareerSaveV2Schema.parse({ ...save, trainingPlan: TrainingPlanSchema.parse(plan) });
};
