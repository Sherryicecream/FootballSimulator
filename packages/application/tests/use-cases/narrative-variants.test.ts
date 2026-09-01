import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { createCareerSave } from '../../src/use-cases/start-career';
import { submitCareerDecision } from '../../src/use-cases/submit-career-decision';

describe('narrative variant persistence', () => {
  it('keeps the selected response stable after serializing and hydrating the save', () => {
    const content = createContent();
    const base = createYouthCareerV2(
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
    const pendingEvent: NonNullable<typeof base.story.pendingEvent> = {
      eventId: 'variant-event',
      title: '一次需要说开的误会',
      description: '队友误解了你的跑位。',
      choices: [
        {
          id: 'clarify',
          text: '把误会说清楚',
          riskLabel: 'low',
          effects: {},
          response: '旧版单一回应不应覆盖已选文案。',
          followUp: '旧版后续不应覆盖已选文案。',
          narrativeVariants: [
            {
              response: '你先听完队友的顾虑，再逐句解释跑位。',
              followUp: '教练会观察你们的下一次配合。',
            },
            {
              response: '你把训练录像调出来，和队友一起找到了误会的源头。',
              followUp: '下一场比赛会检验这次沟通。',
            },
          ],
        },
      ],
      resolvedChoiceId: null,
      participantIds: [],
      factRefs: [],
      storyId: null,
      nextEventIds: [],
      interaction: 'decision',
    };
    const save = {
      ...base,
      story: { ...base.story, pendingEvent: pendingEvent },
      monthlyAdvance: { ...base.monthlyAdvance, status: 'awaiting-decision' as const },
    };

    const resolved = submitCareerDecision(save, 'variant-event', 'clarify');
    const feedback = resolved.story.pendingFeedback!;
    const reloaded = createYouthCareerV2(JSON.parse(JSON.stringify(resolved)), content);

    expect(feedback.narrativeVariantIndex).toBeDefined();
    expect(reloaded.story.pendingFeedback).toEqual(feedback);
  });
});

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

const createContent = (): YouthContentBundle => {
  const academies = [academy('home'), academy('away')];
  return {
    academies,
    competitions: [
      {
        id: 'league',
        name: '测试青年联赛',
        participatingAcademyIds: academies.map(({ id }) => id),
        seasonStartMonth: 9,
        seasonEndMonth: 6,
        targetFixtureCount: { min: 18, max: 18 },
      },
    ],
    people: [],
    events: [
      {
        id: 'variant-event',
        version: 1,
        category: 'dressing-room',
        rarity: 'common',
        theme: 'relationships',
        interaction: 'decision',
        baseWeight: 20,
        title: '一次需要说开的误会',
        description: '队友误解了你的跑位。',
        condition: {},
        choices: [
          {
            id: 'clarify',
            text: '把误会说清楚',
            riskLabel: 'low',
            effects: {},
            response: '旧版单一回应不应覆盖已选文案。',
            followUp: '旧版后续不应覆盖已选文案。',
            narrativeVariants: [
              {
                response: '你先听完队友的顾虑，再逐句解释跑位。',
                followUp: '教练会观察你们的下一次配合。',
              },
              {
                response: '你把训练录像调出来，和队友一起找到了误会的源头。',
                followUp: '下一场比赛会检验这次沟通。',
              },
            ],
          },
        ],
        participantRoles: [],
      },
    ],
  };
};
