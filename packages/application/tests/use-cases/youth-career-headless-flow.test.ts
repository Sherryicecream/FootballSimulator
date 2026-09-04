import { describe, expect, it } from 'vitest';
import type { EventDefinition, YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { advanceCareerMonth } from '../../src/use-cases/advance-career-month';
import { submitCareerDecision } from '../../src/use-cases/submit-career-decision';
import { clearEventFeedback } from '../../src/use-cases/clear-event-feedback';
import { completeYouthSeason } from '../../src/use-cases/complete-youth-season';
import { loadCareer } from '../../src/use-cases/load-career';

describe('headless youth career flow', () => {
  it('pauses, decides, reloads, resumes and completes 100 event seasons', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      let save = createYouthCareerV2(
        createCareerSave({
          playerName: '林河',
          hometown: '上海',
          primaryPosition: 'FORWARD',
          preferredFoot: 'RIGHT',
          regionId: 'shanghai',
          seed,
        }),
        content,
      );
      let decisions = 0;
      let guard = 0;
      let pendingDecisionIds: string[] = [];
      while (!save.season.completed && guard < 80) {
        const result = advanceCareerMonth(save, academies, [event]);
        save = result.save;
        if (result.status === 'awaiting-decision') {
          const fixtureState = save.season.fixtures.map(({ id, status }) => ({ id, status }));
          save = loadCareer(JSON.parse(JSON.stringify(save)), content);
          expect(save.season.fixtures.map(({ id, status }) => ({ id, status }))).toEqual(
            fixtureState,
          );
          save = clearEventFeedback(
            submitCareerDecision(save, result.event.eventId, result.event.choices[0]!.id),
          );
          pendingDecisionIds.push(save.ledger.at(-1)!.id);
          decisions += 1;
        } else {
          expect(result.report.facts.map(({ id }) => id)).toEqual(
            expect.arrayContaining(pendingDecisionIds),
          );
          pendingDecisionIds = [];
        }
        guard += 1;
      }
      expect(save.season.completed).toBe(true);
      expect(decisions).toBeGreaterThan(0);
      expect(save.season.fixtures.every(({ status }) => status === 'played')).toBe(true);
      const weeklyFactIds = save.ledger
        .filter(({ type }) => type === 'training')
        .map(({ id }) => id);
      expect(new Set(weeklyFactIds).size).toBe(weeklyFactIds.length);
      const completed = completeYouthSeason(save);
      const completedAgain = completeYouthSeason(completed.save);
      expect(completed.outcome.status).toMatch(/retained|released/);
      expect(
        completedAgain.save.ledger.filter(({ type }) => type === 'season-outcome'),
      ).toHaveLength(1);
    }
  }, 60_000);

  it('restores authored feedback fields for an older pending event snapshot', () => {
    const authoredEvent: EventDefinition = {
      ...event,
      storyId: 'misunderstanding-opened',
      nextEvents: ['misunderstanding-repair'],
      choices: [
        {
          ...event.choices[0]!,
          response: '你把训练中的误会解释清楚，教练也看到了你的处理方式。',
          resultTitle: '沟通留下结果',
          responses: [
            {
              speakerRole: 'youth-coach',
              text: '{personName}：“说清楚之后，下一次才知道怎么改。”',
            },
          ],
          followUp: '下一场训练会继续观察你是否把这次沟通变成场上的判断。',
        },
      ],
    };
    const restoredContent = { ...content, events: [authoredEvent] };
    const save = createYouthCareerV2(
      createCareerSave({
        playerName: '林河',
        hometown: '上海',
        primaryPosition: 'FORWARD',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
      restoredContent,
    );
    const pendingEvent = {
      eventId: authoredEvent.id,
      title: authoredEvent.title,
      description: authoredEvent.description,
      choices: [
        {
          id: authoredEvent.choices[0]!.id,
          text: authoredEvent.choices[0]!.text,
          riskLabel: authoredEvent.choices[0]!.riskLabel,
          effects: authoredEvent.choices[0]!.effects,
        },
      ],
      resolvedChoiceId: null,
      participantIds: [],
      factRefs: [],
      storyId: null,
      nextEventIds: [],
      interaction: 'decision' as const,
    };

    const restored = loadCareer(
      {
        ...save,
        story: { ...save.story, pendingEvent },
      },
      restoredContent,
    );
    const choice = restored.story.pendingEvent?.choices[0];

    expect(choice?.response).toBe(authoredEvent.choices[0]!.response);
    expect(choice?.resultTitle).toBe(authoredEvent.choices[0]!.resultTitle);
    expect(choice?.responses).toEqual(authoredEvent.choices[0]!.responses);
    expect(choice?.followUp).toBe(authoredEvent.choices[0]!.followUp);
    expect(restored.story.pendingEvent?.storyId).toBe(authoredEvent.storyId);
    expect(restored.story.pendingEvent?.nextEventIds).toEqual(authoredEvent.nextEvents);

    const restoredFeedback = loadCareer(
      {
        ...save,
        story: {
          ...save.story,
          pendingEvent: null,
          pendingFeedback: {
            eventId: authoredEvent.id,
            title: authoredEvent.title,
            choiceId: authoredEvent.choices[0]!.id,
            choiceText: '旧版本保存的选择文字',
            response: '旧版本的通用结果',
            participantResponses: [],
            stateChanges: [],
            relationshipChanges: [],
            followUp: '旧版本的通用后续',
          },
        },
      },
      restoredContent,
    );

    expect(restoredFeedback.story.pendingFeedback?.choiceText).toBe(authoredEvent.choices[0]!.text);
    expect(restoredFeedback.story.pendingFeedback?.response).toBe(
      authoredEvent.choices[0]!.response,
    );
    expect(restoredFeedback.story.pendingFeedback?.followUp).toBe(
      authoredEvent.choices[0]!.followUp,
    );
    expect(restoredFeedback.story.pendingFeedback?.nextEventIds).toEqual(authoredEvent.nextEvents);
    expect(restoredFeedback.story.pendingFeedback?.resultTitle).toBeUndefined();
    expect(restoredFeedback.story.pendingFeedback?.resultTone).toBeUndefined();
    expect(restoredFeedback.story.pendingFeedback?.outcome).toBeUndefined();
  });
});

const academy = (id: string, level: number): YouthAcademyProfile => ({
  id,
  name: `${id}青年队`,
  regionId: 'shanghai',
  pathway: 'local-academy',
  facilityLevel: level,
  coachingLevel: level,
  competitionLevel: level,
  competitionIntensity: level,
  developmentStyle: '均衡',
  firstTeamLevel: level,
  promotionTendency: 55,
  relocationPressure: 20,
});
const academies = [academy('home', 72), academy('away', 77)];
const event: EventDefinition = {
  id: 'coach-monthly-talk',
  version: 1,
  category: 'china-youth',
  rarity: 'common',
  title: '教练谈话',
  description: '教练在训练后与你交流本月表现。',
  condition: {},
  participantRoles: ['youth-coach'],
  choices: [
    { id: 'listen', text: '认真听取建议', riskLabel: 'low', effects: { morale: 1, trust: 1 } },
  ],
  cooldownWeeks: 2,
};
const content: YouthContentBundle = {
  academies,
  competitions: [
    {
      id: 'league',
      name: '青年联赛',
      participatingAcademyIds: academies.map(({ id }) => id),
      seasonStartMonth: 9,
      seasonEndMonth: 6,
      targetFixtureCount: { min: 18, max: 20 },
    },
  ],
  people: [],
  events: [event],
};
