import type { CareerSaveV3 } from '@football/contracts';
import { resolveCareerEvent } from './resolve-career-event';

export const submitCareerDecision = (
  save: CareerSaveV3,
  eventId: string,
  choiceId: string,
): CareerSaveV3 => {
  const event = save.story.pendingEvent;
  if (!event) throw new Error('没有待处理的生涯事件');
  if (event.eventId !== eventId) throw new Error('事件 ID 与当前待处理事件不一致');
  if (event.resolvedChoiceId !== null) throw new Error('该事件已经处理，不能重复提交');
  const choice = event.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`无效的选择 ID：${choiceId}`);
  return resolveCareerEvent(save, choiceId);
};
