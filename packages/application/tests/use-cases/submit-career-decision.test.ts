import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { submitCareerDecision } from '../../src/use-cases/submit-career-decision';
import { resolveCareerEvent } from '../../src/use-cases/resolve-career-event';

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
    expect(direct.monthlyAdvance.nextWeekIndex).toBe(save.monthlyAdvance.nextWeekIndex);
  });
});
