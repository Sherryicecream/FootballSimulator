import type { CareerSaveV2Like } from '@football/contracts';

/** 玩家确认读完事件反馈后，清除阻塞游标，恢复原有月度/赛季流程。 */
export const clearEventFeedback = <S extends CareerSaveV2Like>(save: S): S => {
  if (!save.story.pendingFeedback) throw new Error('没有待确认的事件反馈');
  return {
    ...save,
    story: {
      ...save.story,
      pendingFeedback: null,
    },
    monthlyAdvance:
      save.monthlyAdvance.nodeAdvance === undefined
        ? save.monthlyAdvance
        : {
            ...save.monthlyAdvance,
            nodeAdvance: null,
          },
  } as S;
};
