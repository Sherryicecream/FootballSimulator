import { describe, expect, it } from 'vitest';
import { StoryProgressSnapshotSchema } from '../src/youth-season';

describe('StoryProgressSnapshot', () => {
  it('accepts a bounded, explainable monthly story snapshot', () => {
    const snapshot = StoryProgressSnapshotSchema.parse({
      entries: [
        {
          storyId: 'selection-bubble-opened',
          title: '入选边缘的信号',
          status: 'active',
          completedNodes: 1,
          totalNodes: 3,
          progressPercent: 33,
          activeNodeTitles: ['名单之前的训练计划'],
          waitReason: '等待下一次训练记录',
        },
      ],
      recentChoice: {
        eventTitle: '入选边缘的信号',
        choiceText: '请教练给出一份明确的训练计划',
        weekKey: '2024-W08',
      },
    });

    expect(snapshot.entries[0]?.progressPercent).toBe(33);
    expect(snapshot.recentChoice?.eventTitle).toBe('入选边缘的信号');
  });
});
