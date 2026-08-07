import { describe, it, expect } from 'vitest';
import { createSubmitEventChoice } from '../../src/use-cases/submit-event-choice';
import type { CareerSave } from '@football/contracts';

function createMockSaveWithEvent(): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'test',
    player: {
      identity: {
        name: '测试',
        hometown: '上海',
        homelandId: 'shanghai',
        dateOfBirth: '2008-01-01',
        primaryPosition: 'MIDFIELDER',
        preferredFoot: 'RIGHT',
        weakFootLevel: 30,
        growthBackground: 'academy',
        personalityTendency: 'composed',
      },
      attributes: {
        technical: {
          firstTouch: 50,
          dribbling: 50,
          passing: 50,
          shooting: 40,
          defending: 30,
          aerialAbility: 30,
        },
        physical: { pace: 50, strength: 50, stamina: 50, agility: 50 },
        mental: {
          offTheBall: 50,
          vision: 50,
          decision: 50,
          composure: 50,
          determination: 50,
          discipline: 50,
        },
      },
      hiddenTraits: {
        potential: 80,
        stability: 60,
        professionalism: 70,
        pressureResistance: 60,
        adaptability: 50,
        injuryProneness: 30,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    },
    world: { currentDate: '2024-09-15', season: 2024, weekNumber: 3 },
    context: {
      academyId: 'shanghai-pujiang',
      pendingOpportunity: null,
      playerState: { fitness: 65, morale: 60, coachTrust: 35, fatigue: 8, teamStatus: 'fringe' },
      pendingEvent: {
        eventId: 'coach-praise',
        title: '教练表扬',
        description: '教练在训练后表扬了你的表现。',
        choices: [
          {
            id: 'c1',
            text: '感谢教练，继续努力',
            riskLabel: 'low',
            effects: { morale: 5, coachTrust: 3 },
            memoryKey: 'coach-praise-humble',
          },
          {
            id: 'c2',
            text: '保持低调，继续训练',
            riskLabel: 'low',
            effects: { morale: 2, coachTrust: 1 },
          },
        ],
        resolvedChoiceId: null,
      },
    },
    relationships: {
      persons: [
        {
          id: 'coach-wang',
          name: '王教练',
          role: 'coach',
          age: 45,
          personality: 'strict',
          traits: { experience: 70 },
          relationship: { trust: 50, respect: 50, closeness: 30 },
          memories: [],
        },
        {
          id: 'teammate-li',
          name: '小李',
          role: 'teammate',
          age: 16,
          personality: 'friendly',
          traits: { skill: 60 },
          relationship: { trust: 50, respect: 50, closeness: 30 },
          memories: [],
        },
      ],
      activeRelations: [],
    },
    story: {
      bootstrapOpportunityWeek: 3,
      resolvedOpportunityIds: [],
      completedStoryIds: [],
      activeStorylines: [],
      cooldowns: {},
    },
    ledger: [
      {
        type: 'career-started',
        date: '2024-09-01',
        playerName: '测试',
        age: 16,
        position: 'MIDFIELDER',
      },
    ],
    randomState: { seed: 42, sequencePosition: 5 },
  };
}

describe('createSubmitEventChoice', () => {
  it('submits a valid choice for a pending event', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    expect(result.context.pendingEvent).toBeNull();
  });

  it('throws if no pending event exists', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    save.context.pendingEvent = null;
    expect(() => submit(save, 'c1')).toThrow('没有待处理的事件');
  });

  it('throws if event already resolved', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    save.context.pendingEvent!.resolvedChoiceId = 'c1';
    expect(() => submit(save, 'c1')).toThrow('已经处理');
  });

  it('throws if choice ID does not exist', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    expect(() => submit(save, 'invalid')).toThrow('无效');
  });

  it('applies effects from the chosen option', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    expect(result.context.playerState.morale).toBe(65);
    expect(result.context.playerState.coachTrust).toBe(38);
  });

  it('adds event-week ledger entry', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    const eventEntry = result.ledger.find((e) => e.type === 'event-week');
    expect(eventEntry).toBeDefined();
    expect(eventEntry!.type).toBe('event-week');
  });

  it('does not mutate the original save', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const originalEvent = save.context.pendingEvent;
    const originalLedgerLength = save.ledger.length;
    submit(save, 'c1');
    expect(save.context.pendingEvent).toEqual(originalEvent);
    expect(save.ledger.length).toBe(originalLedgerLength);
  });

  it('adds memory to coach and teammates when choice has memoryKey', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');

    const coach = result.relationships.persons.find((p) => p.role === 'coach');
    expect(coach!.memories).toHaveLength(1);
    expect(coach!.memories[0].eventId).toBe('coach-praise');
    expect(coach!.memories[0].emotionalImpact).toBe('positive');

    const teammate = result.relationships.persons.find((p) => p.role === 'teammate');
    expect(teammate!.memories).toHaveLength(1);
    expect(teammate!.memories[0].eventId).toBe('coach-praise');
  });

  it('does not add memories when choice has no memoryKey', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c2');

    const coach = result.relationships.persons.find((p) => p.role === 'coach');
    expect(coach!.memories).toHaveLength(0);

    const teammate = result.relationships.persons.find((p) => p.role === 'teammate');
    expect(teammate!.memories).toHaveLength(0);
  });

  it('adds narrative to event-week ledger entry', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    const eventEntry = result.ledger.find((e) => e.type === 'event-week');
    expect(eventEntry).toBeDefined();
    if (eventEntry?.type === 'event-week') {
      expect(eventEntry.narrative).toBeDefined();
      expect(eventEntry.narrative).toContain('教练表扬');
      expect(eventEntry.narrative).toContain('感谢教练，继续努力');
    }
  });

  it('adds memory-note entry when choice has memoryKey', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    const memoryNote = result.ledger.find((e) => e.type === 'memory-note');
    expect(memoryNote).toBeDefined();
    if (memoryNote?.type === 'memory-note') {
      expect(memoryNote.summary).toContain('教练表扬');
      expect(memoryNote.personId).toBe('coach-wang');
    }
  });

  it('adds completedStoryIds when event has storyId', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    // Cast pendingEvent to include storyId (not on EventInstance type)
    (save.context.pendingEvent as Record<string, unknown>).storyId = 'coach-praise-story';
    const result = submit(save, 'c1');
    expect(result.story.completedStoryIds).toContain('coach-praise-story');
  });

  it('adds activeStorylines when event has nextEvents', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    // Cast pendingEvent to include nextEvents (not on EventInstance type)
    (save.context.pendingEvent as Record<string, unknown>).nextEvents = [
      'coach-praise-followup-1',
      'coach-praise-followup-2',
    ];
    const result = submit(save, 'c1');
    expect(result.story.activeStorylines).toContain('coach-praise-followup-1');
    expect(result.story.activeStorylines).toContain('coach-praise-followup-2');
  });
});
