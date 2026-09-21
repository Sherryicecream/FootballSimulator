import { describe, expect, it } from 'vitest';
import type { YouthEventInstance } from '@football/contracts';
import { migrateCareerSaveV7 } from '@football/contracts';
import { advanceToNextNode } from '../../src/use-cases/advance-to-node';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { updateTrainingPlan } from '../../src/use-cases/update-training-plan';
import { content, createSave } from '../fixtures/youth-save';

const nodeContent = {
  academies: content.academies,
  clubs: content.clubs,
  events: content.events,
};

const pendingEvent: YouthEventInstance = {
  eventId: 'mid-save-event',
  title: '中途节点',
  description: '需要玩家处理的选择。',
  choices: [{ id: 'continue', text: '继续', riskLabel: '低', effects: {} }],
  resolvedChoiceId: null,
  participantIds: [],
  factRefs: [],
  storyId: null,
  nextEventIds: [],
  interaction: 'decision',
};

describe('advanceToNextNode application use case', () => {
  it('settles an uneventful youth season once, stores a readable brief, and clears full monthly report', () => {
    const save = createYouthCareerV2(createSave(42), content);
    const result = advanceToNextNode(save, nodeContent);

    expect(result.stopReason).toBe('season-end');
    expect(result.skippedMonths.length).toBeGreaterThan(1);
    expect(result.save.lastMonthlyReport).toBeNull();
    expect(result.save.monthlyAdvance.nodeAdvance).toMatchObject({
      stopReason: 'season-end',
      brief: { headline: expect.stringContaining('赛季结束') },
    });
    expect(result.save.seasonHistory).toContainEqual(
      expect.objectContaining({ seasonId: save.season.id }),
    );
  });

  it('preserves a mid-save event brief across serialization without advancing the event', () => {
    const save = createYouthCareerV2(createSave(42), content);
    const withEvent = migrateCareerSaveV7({
      ...save,
      story: { ...save.story, pendingEvent },
    });
    const result = advanceToNextNode(withEvent, nodeContent);
    const restored = migrateCareerSaveV7(JSON.parse(JSON.stringify(result.save)));

    expect(result.skippedMonths).toHaveLength(0);
    expect(result.stopReason).toBe('event');
    expect(result.save.story.pendingEvent).toEqual(pendingEvent);
    expect(restored.monthlyAdvance.nodeAdvance).toMatchObject({
      stopReason: 'event',
      stopEventTitle: '中途节点',
      skippedMonths: [],
    });
  });

  it('keeps the selected training plan active across skipped months', () => {
    const save = createYouthCareerV2(createSave(42), content);
    const trained = updateTrainingPlan(save, {
      ...save.trainingPlan,
      focus: 'recovery',
      intensity: 'light',
    });
    const result = advanceToNextNode(trained, nodeContent);

    expect(result.save.trainingPlan).toMatchObject({ focus: 'recovery', intensity: 'light' });
    expect(
      result.save.ledger.some(
        ({ type, trainingContext }) =>
          type === 'training' &&
          trainingContext?.focus === 'recovery' &&
          trainingContext.intensity === 'light',
      ),
    ).toBe(true);
  });
});
