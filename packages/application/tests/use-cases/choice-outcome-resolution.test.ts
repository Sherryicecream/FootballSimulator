import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { resolveCareerEvent } from '../../src/use-cases/resolve-career-event';

const resolution = {
  attribute: 'decision' as const,
  difficulty: 58,
  volatility: 7,
  stateModifiers: { confidence: 0.2, fatigue: -0.1, coachTrust: 0.15 },
  outcomes: {
    success: {
      label: '沟通奏效',
      effects: { confidence: 3, coachTrust: 2 },
      response: '你把事实说清楚，教练看见了你的成熟。',
      followUp: '下一场比赛会检验这次沟通。',
    },
    partial: {
      label: '误会缓和',
      effects: { confidence: 1, coachTrust: 1 },
      response: '误会暂时缓和，但关系仍需要训练来确认。',
      followUp: '下一次配合会留下新的观察点。',
    },
    failure: {
      label: '解释被误解',
      effects: { confidence: -2, coachTrust: -2 },
      response: '你的解释被听成了推责，教练让你先回到训练。',
      followUp: '下一次训练需要用行动承担责任。',
    },
  },
};

describe('resolveCareerEvent with authored outcomes', () => {
  it('applies the selected outcome and persists its explanation', () => {
    const save = withPendingEvent(withDecision(createSave(), 80), resolution);
    const result = resolveCareerEvent(save, 'clarify');

    expect(result.story.pendingFeedback?.outcome).toEqual(
      expect.objectContaining({ outcome: 'success', label: '沟通奏效' }),
    );
    expect(result.story.pendingFeedback?.response).toContain('成熟');
    expect(result.currentState.confidence).toBeGreaterThan(save.currentState.confidence);
    expect(result.ledger.at(-1)?.summary).toContain('沟通奏效');
    expect(result.ledger.at(-1)?.outcome).toEqual(
      expect.objectContaining({ outcome: 'success', label: '沟通奏效' }),
    );
  });

  it('keeps legacy static effects when no resolution is configured', () => {
    const save = withPendingEvent(createSave(), undefined);
    const result = resolveCareerEvent(save, 'clarify');

    expect(result.currentState.confidence).toBe(save.currentState.confidence + 2);
    expect(result.story.pendingFeedback?.outcome).toBeUndefined();
  });
});

const withDecision = (save: ReturnType<typeof createSave>, decision: number) => ({
  ...save,
  player: {
    ...save.player,
    attributes: {
      ...save.player.attributes,
      mental: { ...save.player.attributes.mental, decision },
    },
  },
});

const withPendingEvent = (save: ReturnType<typeof createSave>, configuredResolution?: object) => ({
  ...save,
  story: {
    ...save.story,
    pendingEvent: {
      eventId: 'misunderstanding-clarification',
      title: '训练场上的误会',
      description: '一次训练中的沟通失误需要被说清楚。',
      choices: [
        {
          id: 'clarify',
          text: '当面澄清误会',
          riskLabel: 'medium',
          effects: { confidence: 2 },
          ...(configuredResolution ? { resolution: configuredResolution } : {}),
        },
      ],
      resolvedChoiceId: null,
      participantIds: [],
      factRefs: [],
      storyId: null,
      nextEventIds: [],
      interaction: 'decision' as const,
    },
  },
  monthlyAdvance: { ...save.monthlyAdvance, status: 'awaiting-decision' as const },
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
