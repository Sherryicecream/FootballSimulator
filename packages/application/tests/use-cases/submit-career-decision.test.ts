import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { submitCareerDecision } from '../../src/use-cases/submit-career-decision';
import { resolveCareerEvent } from '../../src/use-cases/resolve-career-event';
import { clearEventFeedback } from '../../src/use-cases/clear-event-feedback';

describe('submitCareerDecision', () => {
  it('applies a decision to participants once and preserves the monthly cursor', () => {
    const base = createSave();
    const rival = base.relationships.persons.find(({ role }) => role === 'rival')!;
    const coach = base.relationships.persons.find(({ role }) => role === 'youth-coach')!;
    const save = {
      ...base,
      story: {
        ...base.story,
        pendingEvent: {
          eventId: 'rival-talk',
          title: '位置竞争',
          description: '竞争者找你交流。',
          choices: [
            {
              id: 'respect',
              text: '尊重竞争',
              riskLabel: 'low',
              effects: { respect: 5, morale: 2 },
            },
          ],
          resolvedChoiceId: null,
          participantIds: [rival.id],
          factRefs: ['match-1'],
          storyId: null,
          nextEventIds: [],
        },
      },
      monthlyAdvance: {
        ...base.monthlyAdvance,
        nextWeekIndex: 2,
        status: 'awaiting-decision' as const,
      },
    };
    const result = submitCareerDecision(save, 'rival-talk', 'respect');
    expect(
      result.relationships.persons.find(({ id }) => id === rival.id)?.relationship.respect,
    ).toBe(rival.relationship.respect + 5);
    expect(result.relationships.persons.find(({ id }) => id === coach.id)).toEqual(coach);
    expect(result.monthlyAdvance.nextWeekIndex).toBe(2);
    expect(result.story.pendingEvent).toBeNull();
    expect(() => submitCareerDecision(result, 'rival-talk', 'respect')).toThrow('没有待处理');
  });

  it('stores an immediate participant response and explainable consequences', () => {
    const base = createSave();
    const coach = base.relationships.persons.find(({ role }) => role === 'youth-coach')!;
    const teammate = base.relationships.persons.find(({ role }) => role === 'teammate')!;
    const pendingEvent = {
      eventId: 'misunderstanding-clarification',
      title: '训练场上的误会',
      description: '一次训练中的沟通失误让你和队友都感到不舒服。',
      choices: [
        {
          id: 'clarify',
          text: '当面澄清误会',
          riskLabel: 'medium',
          effects: { respect: 3, trust: 2, confidence: 2 },
          response: '你把事情说清楚了，训练场的空气终于松动下来。',
          responses: [
            {
              speakerRole: 'youth-coach',
              text: '{personName}：“愿意把问题说开，这是成熟的表现。”',
            },
            {
              speakerRole: 'teammate',
              text: '{personName}：“那我们别把误会带进下一场比赛。”',
            },
          ],
        },
      ],
      resolvedChoiceId: null,
      participantIds: [coach.id, teammate.id],
      factRefs: [],
      storyId: null,
      nextEventIds: [],
      interaction: 'decision' as const,
    } as unknown as typeof base.story.pendingEvent;
    const save = {
      ...base,
      story: { ...base.story, pendingEvent },
      monthlyAdvance: { ...base.monthlyAdvance, status: 'awaiting-decision' as const },
    };

    const result = submitCareerDecision(save, 'misunderstanding-clarification', 'clarify');
    const feedback = (
      result.story as typeof result.story & {
        pendingFeedback?: {
          response: string;
          participantResponses: Array<{ personName: string; text: string }>;
          relationshipChanges: Array<{ personId: string; dimension: string; delta: number }>;
          stateChanges: Array<{ key: string; oldValue: number; newValue: number }>;
        };
      }
    ).pendingFeedback;

    expect(feedback?.response).toContain('事情说清楚');
    expect(feedback?.participantResponses.map(({ personName }) => personName)).toEqual([
      coach.name,
      teammate.name,
    ]);
    expect(feedback?.participantResponses[0]?.text).toContain(coach.name);
    expect(feedback?.participantResponses[1]?.text).toContain(teammate.name);
    expect(feedback?.relationshipChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ personId: coach.id, dimension: 'trust', delta: 2 }),
        expect.objectContaining({ personId: teammate.id, dimension: 'respect', delta: 3 }),
      ]),
    );
    expect(feedback?.stateChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'confidence', oldValue: 60, newValue: 62 }),
      ]),
    );
  });

  it('clears acknowledged feedback without changing the resolved event', () => {
    const base = createSave();
    const save = {
      ...base,
      story: {
        ...base.story,
        pendingFeedback: {
          eventId: 'feedback-1',
          title: '一次反馈',
          choiceId: 'choice-1',
          choiceText: '继续训练',
          response: '教练记住了你的选择。',
          participantResponses: [],
          stateChanges: [],
          relationshipChanges: [],
          followUp: '下个月会看到影响。',
        },
      },
    };

    const result = clearEventFeedback(save);

    expect(result.story.pendingFeedback).toBeNull();
    expect(result.story.pendingEvent).toBeNull();
    expect(result.monthlyAdvance).toEqual(base.monthlyAdvance);
  });
});

const createSave = () =>
  createYouthCareerV2(
    createCareerSave({
      playerName: '林河',
      hometown: '上海',
      primaryPosition: 'FORWARD',
      preferredFoot: 'RIGHT',
      regionId: 'shanghai',
      seed: 42,
    }),
    content,
  );

const academy = (id: string): YouthAcademyProfile => ({
  id,
  name: `${id}青年队`,
  regionId: 'shanghai',
  pathway: 'local-academy',
  facilityLevel: 70,
  coachingLevel: 70,
  competitionLevel: 70,
  competitionIntensity: 70,
  developmentStyle: '均衡',
  firstTeamLevel: 65,
  promotionTendency: 55,
  relocationPressure: 20,
});
const academies = [academy('home'), academy('away')];
const content: YouthContentBundle = {
  academies,
  competitions: [
    {
      id: 'league',
      name: '青年联赛',
      participatingAcademyIds: academies.map(({ id }) => id),
      seasonStartMonth: 9,
      seasonEndMonth: 6,
      targetFixtureCount: { min: 18, max: 18 },
    },
  ],
  people: [],
  events: [],
};

describe('resolveCareerEvent', () => {
  it('matches public decision submission and advances the active story exactly once', () => {
    const base = createSave();
    const rival = base.relationships.persons.find(({ role }) => role === 'rival')!;
    const save = {
      ...base,
      story: {
        ...base.story,
        activeStorylines: ['position-opening'],
        pendingEvent: {
          eventId: 'position-opening',
          title: '位置竞争开始',
          description: '竞争者向你发起挑战。',
          choices: [
            {
              id: 'accept',
              text: '接受竞争',
              riskLabel: 'medium',
              effects: { respect: 3, confidence: 2 },
              delayEffects: { morale: 1 },
            },
          ],
          resolvedChoiceId: null,
          participantIds: [rival.id],
          factRefs: [],
          storyId: 'position-race-opened',
          nextEventIds: ['position-review'],
          interaction: 'decision' as const,
        },
      },
      monthlyAdvance: { ...base.monthlyAdvance, status: 'awaiting-decision' as const },
    };

    const direct = resolveCareerEvent(save, 'accept');
    const submitted = submitCareerDecision(save, 'position-opening', 'accept');

    expect(direct).toEqual(submitted);
    expect(direct.story.activeStorylines).toEqual(['position-review']);
    expect(direct.story.completedStoryIds).toContain('position-race-opened');
    expect(direct.story.pendingDelayedEffects).toHaveLength(1);
    expect(direct.story.pendingFeedback).toEqual(
      expect.objectContaining({ nextEventIds: ['position-review'] }),
    );
    expect(direct.monthlyAdvance.nextWeekIndex).toBe(save.monthlyAdvance.nextWeekIndex);
  });

  it('uses the chosen branch instead of the event default for the next scene', () => {
    const base = createSave();
    const rival = base.relationships.persons.find(({ role }) => role === 'rival')!;
    const save = {
      ...base,
      story: {
        ...base.story,
        pendingEvent: {
          eventId: 'branching-event',
          title: '入选边缘',
          description: '教练准备决定你是否进入下一场名单。',
          choices: [
            {
              id: 'ask-plan',
              text: '询问清晰的训练计划',
              riskLabel: 'low',
              effects: {},
              nextEventIds: ['selection-bubble-plan'],
            },
          ],
          resolvedChoiceId: null,
          participantIds: [rival.id],
          factRefs: [],
          storyId: 'selection-bubble-opened',
          nextEventIds: ['selection-bubble-default'],
          interaction: 'decision' as const,
        },
      },
      monthlyAdvance: { ...base.monthlyAdvance, status: 'awaiting-decision' as const },
    };

    const result = resolveCareerEvent(save, 'ask-plan');

    expect(result.story.activeStorylines).toEqual(['selection-bubble-plan']);
    expect(result.story.pendingFeedback).toEqual(
      expect.objectContaining({ nextEventIds: ['selection-bubble-plan'] }),
    );
  });
});
