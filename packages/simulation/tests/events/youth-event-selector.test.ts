import { describe, expect, it } from 'vitest';
import type { EventDefinition } from '@football/contracts';
import { filterEligibleYouthEvents } from '../../src/events/event-selector';
import { calculateYouthEventWeight } from '../../src/events/event-selector';
import { pickYouthEventForWeek } from '../../src/career/event-integration';
import { createYouthSave } from '../fixtures/youth-save';

const mediaEvent: EventDefinition = {
  id: 'media',
  version: 1,
  category: 'china-youth',
  rarity: 'rare',
  title: '媒体关注',
  description: '赛后采访',
  condition: { requireFactType: 'match' },
  choices: [{ id: 'answer', text: '接受采访', riskLabel: 'low', effects: {} }],
  cooldownWeeks: 8,
  participantRoles: [],
};
const injuryEvent: EventDefinition = {
  ...mediaEvent,
  id: 'injury-choice',
  title: '伤病选择',
  condition: { requireActiveInjury: true },
};

describe('filterEligibleYouthEvents', () => {
  it('requires a recent match fact for media and a real active injury for injury choices', () => {
    const healthy = createYouthSave();
    expect(filterEligibleYouthEvents([mediaEvent, injuryEvent], healthy)).toEqual([]);
    const afterMatch = createYouthSave({
      ledger: [
        {
          id: 'match-1',
          weekKey: '2024-W02',
          type: 'match',
          summary: '突出表现',
          participantIds: [],
        },
      ],
    });
    expect(
      filterEligibleYouthEvents([mediaEvent, injuryEvent], afterMatch).map(({ id }) => id),
    ).toEqual(['media']);
    const injured = createYouthSave({
      health: {
        ...healthy.health,
        activeInjury: {
          id: 'injury-1',
          kind: 'minor',
          bodyArea: '脚踝',
          occurredWeek: '2024-W02',
          expectedRecoveryWeeks: 2,
          recoveredWeeks: 0,
          recurrenceRisk: 0.1,
        },
      },
    });
    expect(
      filterEligibleYouthEvents([mediaEvent, injuryEvent], injured).map(({ id }) => id),
    ).toEqual(['injury-choice']);
  });
});

describe('contextual youth event selection', () => {
  const contextualEvent: EventDefinition = {
    ...mediaEvent,
    id: 'contextual',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    condition: {
      minSeason: 2024,
      position: 'FORWARD',
      growthBackgrounds: ['school'],
      personalityTendencies: ['disciplined'],
      maturationPaces: ['late'],
      playerRoles: ['rotation'],
      firstTeamStages: ['watchlist'],
      minWeek: 20,
      maxWeek: 30,
      maxMorale: 60,
      minConfidence: 40,
      minFatigue: 25,
      maxFatigue: 80,
      minCoachEvaluation: 50,
      maxCoachEvaluation: 80,
      minProfessionalism: 65,
      minStability: 50,
    },
  };
  const matchingSave = () => {
    const base = createYouthSave();
    return createYouthSave({
      player: {
        ...base.player,
        identity: {
          ...base.player.identity,
          growthBackground: 'school',
          personalityTendency: 'disciplined',
        },
        development: { ...base.player.development, maturationPace: 'late' },
      },
      season: { ...base.season, currentWeek: 24 },
      clubContext: {
        ...base.clubContext,
        playerRole: 'rotation',
        firstTeamStage: 'watchlist',
      },
      health: { ...base.health, fatigue: 35 },
      currentState: { ...base.currentState, morale: 50, confidence: 50 },
    });
  };

  it('enforces profile, season, position and current-state hard conditions', () => {
    const matching = matchingSave();
    expect(filterEligibleYouthEvents([contextualEvent], matching)).toHaveLength(1);

    const mismatches = [
      createYouthSave({
        player: {
          ...matching.player,
          identity: { ...matching.player.identity, growthBackground: 'academy' },
        },
      }),
      createYouthSave({
        player: {
          ...matching.player,
          identity: { ...matching.player.identity, personalityTendency: 'composed' },
        },
      }),
      createYouthSave({
        player: {
          ...matching.player,
          identity: { ...matching.player.identity, primaryPosition: 'CENTER_BACK' },
        },
      }),
      createYouthSave({
        player: {
          ...matching.player,
          development: { ...matching.player.development, maturationPace: 'normal' },
        },
      }),
      createYouthSave({ season: { ...matching.season, currentWeek: 10 } }),
      createYouthSave({ clubContext: { ...matching.clubContext, playerRole: 'regular' } }),
      createYouthSave({ clubContext: { ...matching.clubContext, firstTeamStage: 'none' } }),
      createYouthSave({ health: { ...matching.health, fatigue: 10 } }),
      createYouthSave({ currentState: { ...matching.currentState, morale: 75 } }),
      createYouthSave({ clubContext: { ...matching.clubContext, coachEvaluation: 90 } }),
      createYouthSave({
        player: {
          ...matching.player,
          development: { ...matching.player.development, professionalism: 40 },
        },
      }),
    ];
    for (const mismatch of mismatches) {
      expect(filterEligibleYouthEvents([contextualEvent], mismatch)).toHaveLength(0);
    }
  });

  it('weights themes by background, personality, state and recent theme cooldown', () => {
    const base = createYouthSave();
    const offPitch = { ...contextualEvent, id: 'off-pitch', condition: {} };
    const training = {
      ...contextualEvent,
      id: 'training',
      theme: 'training' as const,
      condition: {},
    };
    const health = { ...contextualEvent, id: 'health', theme: 'health' as const, condition: {} };
    const school = createYouthSave({
      player: { ...base.player, identity: { ...base.player.identity, growthBackground: 'school' } },
    });
    const disciplined = createYouthSave({
      player: {
        ...base.player,
        identity: { ...base.player.identity, personalityTendency: 'disciplined' },
      },
    });
    const expressive = createYouthSave({
      player: {
        ...base.player,
        identity: { ...base.player.identity, personalityTendency: 'expressive' },
      },
    });
    const fatigued = createYouthSave({ health: { ...base.health, fatigue: 70 } });
    const cooling = createYouthSave({
      story: { ...base.story, themeCooldownsByTheme: { training: 2 } },
    });

    expect(calculateYouthEventWeight(offPitch, school)).toBeGreaterThan(
      calculateYouthEventWeight(offPitch, base),
    );
    expect(calculateYouthEventWeight(training, disciplined)).toBeGreaterThan(
      calculateYouthEventWeight(training, expressive),
    );
    expect(calculateYouthEventWeight(health, fatigued)).toBeGreaterThan(
      calculateYouthEventWeight(health, base),
    );
    expect(calculateYouthEventWeight(training, cooling)).toBeLessThan(
      calculateYouthEventWeight(training, base),
    );
  });
});

describe('weekly youth event flow controls', () => {
  const event = (
    id: string,
    interaction: 'decision' | 'automatic',
    overrides: Partial<EventDefinition> = {},
  ): EventDefinition => ({
    id,
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    theme: 'training',
    interaction,
    baseWeight: 100,
    title: id,
    description: id,
    condition: {},
    choices: [{ id: 'continue', text: '继续', riskLabel: 'low', effects: {} }],
    cooldownWeeks: 4,
    ...overrides,
  });

  it('decrements theme cooldowns and blocks a third monthly decision', () => {
    const base = createYouthSave();
    const save = createYouthSave({
      story: { ...base.story, themeCooldownsByTheme: { training: 2 } },
      monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 2 },
    });
    const result = pickYouthEventForWeek([event('third-decision', 'decision')], save);

    expect(result.event).toBeNull();
    expect(result.save.story.themeCooldownsByTheme).toEqual({ training: 1 });
    expect(result.save.monthlyAdvance.interactiveEventCount).toBe(2);
  });

  it('still permits automatic events after the decision cap', () => {
    const automatic = event('background-change', 'automatic');
    const result = firstPicked([automatic], (base) => ({
      monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 2 },
    }));

    expect(result.event?.eventId).toBe('background-change');
    expect(result.event?.interaction).toBe('automatic');
    expect(result.save.monthlyAdvance.interactiveEventCount).toBe(2);
    expect(result.save.monthlyAdvance.status).toBe('idle');
  });

  it('preserves authored feedback fields when instantiating a content event', () => {
    const authored = event('authored-feedback', 'decision', {
      choices: [
        {
          id: 'clarify',
          text: '把误会说清楚',
          riskLabel: 'low',
          effects: { confidence: 1 },
          response: '你把关键细节解释清楚，训练场的气氛明显松动下来。',
          responses: [
            {
              speakerRole: 'youth-coach',
              text: '{personName}：“把问题说清楚，下一次才知道怎么改。”',
            },
          ],
          followUp: '教练会在下一场训练观察你是否把这次沟通变成场上的判断。',
        },
      ],
    });

    const result = firstPicked([authored], (base) => ({
      monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 0 },
    }));
    const choice = result.event?.choices[0];

    expect(choice).toEqual(
      expect.objectContaining({
        response: authored.choices[0]!.response,
        responses: authored.choices[0]!.responses,
        followUp: authored.choices[0]!.followUp,
      }),
    );
  });

  it('keeps an eligible early-month story beat from disappearing into quiet weeks', () => {
    const storyBeat = event('monthly-story-beat', 'decision');
    let triggered = 0;

    for (let seed = 1; seed <= 100; seed += 1) {
      const base = createYouthSave();
      const save = createYouthSave({
        story: { ...base.story, activeStorylines: [storyBeat.id] },
        monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 0 },
        randomState: { seed, sequencePosition: 0 },
      });
      const result = pickYouthEventForWeek([storyBeat], save);
      if (result.event) triggered += 1;
    }

    expect(triggered).toBeGreaterThanOrEqual(38);
  });

  it('prioritizes an active follow-up without bypassing its hard conditions', () => {
    const unrelated = event('unrelated', 'automatic', { theme: 'off-pitch' });
    const followUp = event('position-review', 'automatic', {
      condition: { requireStoryId: 'position-race-opened' },
    });
    const selected = firstPicked([unrelated, followUp], (base) => ({
      story: {
        ...base.story,
        activeStorylines: ['position-review'],
        completedStoryIds: ['position-race-opened'],
      },
    }));
    expect(selected.event?.eventId).toBe('position-review');

    const blocked = firstPicked(
      [unrelated, { ...followUp, condition: { ...followUp.condition, requireActiveInjury: true } }],
      (base) => ({
        story: {
          ...base.story,
          activeStorylines: ['position-review'],
          completedStoryIds: ['position-race-opened'],
        },
      }),
    );
    expect(blocked.event?.eventId).toBe('unrelated');
  });

  it('defers a decision follow-up until a later month after its story opens', () => {
    const unrelated = event('quiet-background', 'automatic', { theme: 'off-pitch' });
    const followUp = event('position-review', 'decision', {
      condition: { requireStoryId: 'position-race-opened' },
    });
    const storyState = (base: ReturnType<typeof createYouthSave>) => ({
      story: {
        ...base.story,
        activeStorylines: ['position-review'],
        completedStoryIds: ['position-race-opened'],
      },
    });

    const sameMonth = firstPicked([unrelated, followUp], (base) => ({
      ...storyState(base),
      monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 1 },
    }));
    expect(sameMonth.event?.eventId).toBe('quiet-background');

    const nextMonth = firstPicked([unrelated, followUp], (base) => ({
      ...storyState(base),
      monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 0 },
    }));
    expect(nextMonth.event?.eventId).toBe('position-review');
  });

  const firstPicked = (
    events: EventDefinition[],
    overrides: (
      base: ReturnType<typeof createYouthSave>,
    ) => Partial<ReturnType<typeof createYouthSave>>,
  ) => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const base = createYouthSave();
      const save = createYouthSave({
        ...overrides(base),
        randomState: { seed, sequencePosition: 0 },
      });
      const result = pickYouthEventForWeek(events, save);
      if (result.event) return result;
    }
    throw new Error('测试种子中没有触发事件');
  };
});

describe('pro-phase event conditions', () => {
  const proEvent = (
    id: string,
    category: EventDefinition['category'],
    condition: EventDefinition['condition'],
  ): EventDefinition => ({
    ...mediaEvent,
    id,
    category,
    title: id,
    condition,
  });
  const asiaClub = {
    id: 'ov-sakura-frontier',
    name: '樱前线',
    tier: 7,
    regionId: 'japan',
    positionalNeeds: ['FORWARD'],
    youthCycle: 'stable',
    overseas: true,
    overseasRegion: 'asia',
    wageBudget: 60,
  } as const;
  const europeClub = {
    id: 'ov-albion-rovers',
    name: '阿尔比恩流浪者',
    tier: 8,
    regionId: 'shanghai',
    positionalNeeds: ['FORWARD'],
    youthCycle: 'contending',
    overseas: true,
    overseasRegion: 'europe',
    wageBudget: 92,
  } as const;
  const overseasState = {
    overseasSince: '2028-08-01',
    nationalTeam: null,
  } as const;
  const cappedState = {
    overseasSince: null,
    nationalTeam: { capped: true, caps: 12, goals: 3, debutOn: '2029-03-01' },
  } as const;

  it('gates overseas events by overseas status and region context', () => {
    const asia = proEvent('asia-language-class', 'asia-career', {
      requireOverseas: true,
      overseasRegions: ['asia'],
    });
    const europe = proEvent('europe-locker-room', 'europe-career', {
      requireOverseas: true,
      overseasRegions: ['europe'],
    });
    const base = createYouthSave();

    expect(filterEligibleYouthEvents([asia, europe], base, { currentClub: asiaClub })).toEqual([]);
    expect(filterEligibleYouthEvents([asia], { ...base, ...overseasState })).toEqual([]);
    expect(
      filterEligibleYouthEvents(
        [asia, europe],
        { ...base, ...overseasState },
        {
          currentClub: asiaClub,
        },
      ).map(({ id }) => id),
    ).toEqual(['asia-language-class']);
    expect(
      filterEligibleYouthEvents(
        [asia, europe],
        { ...base, ...overseasState },
        {
          currentClub: europeClub,
        },
      ).map(({ id }) => id),
    ).toEqual(['europe-locker-room']);
  });

  it('gates country-specific events by the current club country', () => {
    const englandEvent = proEvent('england-media-pressure', 'europe-career', {
      requireOverseas: true,
      overseasRegions: ['europe'],
      requireCountry: 'england',
    } as EventDefinition['condition']);
    const base = createYouthSave();
    const overseas = { ...base, ...overseasState };
    const englandClub = { ...europeClub, country: 'england' as const };
    const spainClub = { ...europeClub, country: 'spain' as const };

    expect(
      filterEligibleYouthEvents([englandEvent], overseas, { currentClub: englandClub }),
    ).toHaveLength(1);
    expect(filterEligibleYouthEvents([englandEvent], overseas, { currentClub: spainClub })).toEqual(
      [],
    );
  });

  it('gates national-team events by capped status and caps', () => {
    const squadRoom = proEvent('national-squad-room', 'national-team', {
      requireNationalTeam: true,
    });
    const mentor = proEvent('national-veteran-mentor', 'national-team', { minCaps: 20 });
    const base = createYouthSave();

    expect(filterEligibleYouthEvents([squadRoom, mentor], base)).toEqual([]);
    expect(
      filterEligibleYouthEvents([squadRoom, mentor], {
        ...base,
        nationalTeam: { capped: false, caps: 0, goals: 0, debutOn: null },
      }),
    ).toEqual([]);
    expect(
      filterEligibleYouthEvents([squadRoom, mentor], { ...base, ...cappedState }).map(
        ({ id }) => id,
      ),
    ).toEqual(['national-squad-room']);
    expect(
      filterEligibleYouthEvents([squadRoom, mentor], {
        ...base,
        nationalTeam: { capped: true, caps: 25, goals: 5, debutOn: '2029-03-01' },
      }).map(({ id }) => id),
    ).toEqual(['national-squad-room', 'national-veteran-mentor']);
  });

  it('keeps existing youth events eligible under the extended filter', () => {
    const base = createYouthSave();
    expect(filterEligibleYouthEvents([mediaEvent], base, { currentClub: asiaClub })).toEqual(
      filterEligibleYouthEvents([mediaEvent], base),
    );
  });

  it('passes the current club context through pickYouthEventForWeek', () => {
    const asia = proEvent('asia-language-class', 'asia-career', {
      requireOverseas: true,
      overseasRegions: ['asia'],
    });
    let triggered = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const base = createYouthSave();
      const save = {
        ...base,
        ...overseasState,
        monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: 0 },
        randomState: { seed, sequencePosition: 0 },
      };
      const result = pickYouthEventForWeek([asia], save, { currentClub: asiaClub });
      if (result.event) triggered += 1;
    }
    expect(triggered).toBeGreaterThanOrEqual(30);
  });
});
