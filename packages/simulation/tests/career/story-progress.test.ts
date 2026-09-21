import { describe, expect, it } from 'vitest';
import type { EventDefinition } from '@football/contracts';
import { buildStoryProgress } from '../../src/career/story-progress';
import { createYouthSave } from '../fixtures/youth-save';

const opening: EventDefinition = {
  id: 'selection-opening',
  version: 1,
  category: 'china-youth',
  rarity: 'uncommon',
  theme: 'trajectory',
  title: '入选边缘的信号',
  description: '教练正在考虑下一场名单。',
  condition: {},
  storyId: 'selection-opened',
  nextEvents: ['selection-follow-up'],
  choices: [{ id: 'ask', text: '询问计划', riskLabel: 'low', effects: {} }],
  cooldownWeeks: 10,
};

const followUp: EventDefinition = {
  id: 'selection-follow-up',
  version: 1,
  category: 'china-youth',
  rarity: 'uncommon',
  theme: 'training',
  title: '名单之前的训练计划',
  description: '教练把录像交给了你。',
  condition: { requireStoryId: 'selection-opened', requireFactType: 'match' },
  storyId: 'selection-planned',
  choices: [{ id: 'do', text: '按计划完成', riskLabel: 'low', effects: {} }],
  cooldownWeeks: 10,
};

describe('buildStoryProgress', () => {
  it('groups story nodes, reports the active next node and explains its wait condition', () => {
    const base = createYouthSave();
    const save = createYouthSave({
      ...base,
      story: {
        ...base.story,
        activeStorylines: ['selection-follow-up'],
        completedStoryIds: ['selection-opened'],
      },
      ledger: [
        ...base.ledger,
        {
          id: 'decision-selection-opening-8',
          weekKey: '2024-W08',
          type: 'decision',
          summary: '[入选边缘的信号] 询问训练计划',
          participantIds: [],
        },
      ],
    });

    const result = buildStoryProgress(save, [opening, followUp]);

    expect(result.entries).toEqual([
      expect.objectContaining({
        storyId: 'selection-opened',
        title: '入选边缘的信号',
        status: 'active',
        completedNodes: 1,
        totalNodes: 2,
        progressPercent: 50,
        activeNodeTitles: ['名单之前的训练计划'],
        waitReason: '等待下一场比赛记录',
      }),
    ]);
    expect(result.recentChoice).toEqual({
      eventTitle: '入选边缘的信号',
      choiceText: '询问训练计划',
      weekKey: '2024-W08',
    });
  });

  it('groups explicitly registered family nodes into one progressing story', () => {
    const familyEvents: EventDefinition[] = [
      {
        ...opening,
        id: 'family-opening',
        storyId: 'family-opening-node',
        storyFamilyId: 'family-selection-pressure',
        nextEvents: ['family-middle'],
      },
      {
        ...followUp,
        id: 'family-middle',
        storyId: 'family-middle-node',
        storyFamilyId: 'family-selection-pressure',
        nextEvents: ['family-resolution'],
      },
      {
        ...followUp,
        id: 'family-resolution',
        storyId: 'family-resolution-node',
        storyFamilyId: 'family-selection-pressure',
        condition: {},
        choices: [
          { id: 'stay', text: 'Stay with the plan', riskLabel: 'low', effects: {} },
          { id: 'change', text: 'Change the plan', riskLabel: 'medium', effects: {} },
        ],
      },
    ];
    const base = createYouthSave();
    const save = createYouthSave({
      ...base,
      story: {
        ...base.story,
        activeStorylines: ['family-resolution'],
        completedStoryIds: ['family-opening-node', 'family-middle-node'],
      },
    });

    const result = buildStoryProgress(save, familyEvents);

    expect(result.entries).toEqual([
      expect.objectContaining({
        storyId: 'family-selection-pressure',
        status: 'active',
        completedNodes: 2,
        totalNodes: 3,
        progressPercent: 67,
      }),
    ]);
  });
});
