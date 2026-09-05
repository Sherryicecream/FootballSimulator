import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2, MatchContext } from '@football/contracts';
import { createYouthSave } from '../fixtures/youth-save';
import {
  buildMatchMomentEvent,
  isImportantMatchContext,
  pickMatchMomentForWeek,
} from '../../src/career/match-moment';

const context = (overrides: Partial<MatchContext> = {}): MatchContext => ({
  opponentStrength: 70,
  isHome: true,
  played: true,
  minutesPlayed: 90,
  rating: 6.8,
  goals: 0,
  assists: 0,
  competitionId: 'pro-tier-5',
  ...overrides,
});

const matchFact = (overrides: Partial<MatchContext> = {}): CareerLedgerEntryV2 => ({
  id: 'pro-match-2028-W36-league-1',
  weekKey: '2028-W36',
  type: 'pro-match',
  summary: '测试对手 2:1；你出场 90 分钟，表现稳健',
  participantIds: [],
  matchContext: context(overrides),
});

describe('isImportantMatchContext', () => {
  it('treats domestic cup knockouts as important matches', () => {
    expect(
      isImportantMatchContext({
        competitionId: 'domestic-cup',
        opponentStrength: 50,
        played: true,
      }),
    ).toBe(true);
  });

  it('applies the shared league strength threshold across phases', () => {
    expect(
      isImportantMatchContext({ competitionId: 'pro-tier-5', opponentStrength: 81, played: true }),
    ).toBe(false);
    expect(
      isImportantMatchContext({ competitionId: 'pro-tier-5', opponentStrength: 82, played: true }),
    ).toBe(true);
    expect(
      isImportantMatchContext({
        competitionId: 'youth-league',
        opponentStrength: 82,
        played: true,
      }),
    ).toBe(true);
    expect(
      isImportantMatchContext({
        competitionId: 'youth-league',
        opponentStrength: 81,
        played: true,
      }),
    ).toBe(false);
  });

  it('requires actual participation', () => {
    expect(
      isImportantMatchContext({
        competitionId: 'domestic-cup',
        opponentStrength: 50,
        played: false,
      }),
    ).toBe(false);
  });
});

describe('buildMatchMomentEvent', () => {
  it('builds position-specific intents with three-tier resolutions', () => {
    const save = createYouthSave();
    const event = buildMatchMomentEvent(save, matchFact({ opponentStrength: 82 }));
    expect(event).not.toBeNull();
    expect(event!.storyId).toBe('match-moment');
    expect(event!.interaction).toBe('decision');
    expect(event!.factRefs).toEqual(['pro-match-2028-W36-league-1']);
    expect(event!.choices).toHaveLength(3);
    expect(event!.description).toContain('测试对手');
    expect(event!.description).toContain('2:1');
    for (const choice of event!.choices) {
      expect(choice.response).toBeTruthy();
      expect(choice.followUp).toBeTruthy();
      expect(choice.resolution).toBeTruthy();
      expect(Object.keys(choice.resolution!.outcomes).sort()).toEqual([
        'failure',
        'partial',
        'success',
      ]);
    }
  });

  it('adapts intent labels to the player position', () => {
    const important = matchFact({ opponentStrength: 82 });
    const forward = buildMatchMomentEvent(createYouthSave(), important);
    const defenderSave = createYouthSave();
    const defender = buildMatchMomentEvent(
      {
        ...defenderSave,
        player: {
          ...defenderSave.player,
          identity: { ...defenderSave.player.identity, primaryPosition: 'CENTER_BACK' },
        },
      } as Parameters<typeof buildMatchMomentEvent>[0],
      important,
    );
    expect(forward!.choices.map(({ id }) => id)).not.toEqual(defender!.choices.map(({ id }) => id));
  });

  it('returns null for ordinary matches or unplayed important ones', () => {
    expect(
      buildMatchMomentEvent(createYouthSave(), matchFact({ opponentStrength: 60 })),
    ).toBeNull();
    expect(
      buildMatchMomentEvent(
        createYouthSave(),
        matchFact({ opponentStrength: 82, played: false, minutesPlayed: 0 }),
      ),
    ).toBeNull();
    expect(
      buildMatchMomentEvent(createYouthSave(), {
        ...matchFact(),
        type: 'training',
        summary: '训练',
      }),
    ).toBeNull();
  });

  it('keeps descriptions honest about the scoreline', () => {
    const event = buildMatchMomentEvent(createYouthSave(), matchFact({ opponentStrength: 82 }));
    expect(event!.description).toContain('2:1');
    const awayWin = buildMatchMomentEvent(
      createYouthSave(),
      matchFact({ opponentStrength: 82, isHome: false }),
    );
    expect(awayWin!.description).toContain('1:2');
  });
});

describe('pickMatchMomentForWeek', () => {
  it('returns the moment for an important played match and marks the pending state', () => {
    const facts = [
      matchFact({ opponentStrength: 82 }),
      {
        id: 'training-1',
        weekKey: '2028-W36',
        type: 'training',
        summary: '训练',
        participantIds: [],
      },
    ];
    let picked: ReturnType<typeof pickMatchMomentForWeek> | null = null;
    for (let seed = 1; seed <= 200 && !picked; seed += 1) {
      picked = pickMatchMomentForWeek(
        createYouthSave({ randomState: { seed, sequencePosition: 0 } }),
        facts,
      );
    }
    expect(picked).not.toBeNull();
    expect(picked?.event?.storyId).toBe('match-moment');
    expect(picked?.save.story.pendingEvent?.eventId).toBe(
      'match-moment-pro-match-2028-W36-league-1',
    );
  });

  it('suppresses deterministically per match fact and seed', () => {
    const facts = [matchFact({ opponentStrength: 82 })];
    const firstSeedHits = [];
    for (let seed = 1; seed <= 200; seed += 1) {
      const save = createYouthSave({ randomState: { seed, sequencePosition: 0 } });
      const picked = pickMatchMomentForWeek(save, facts);
      firstSeedHits.push(picked !== null);
    }
    const hitRate = firstSeedHits.filter(Boolean).length / firstSeedHits.length;
    expect(hitRate).toBeGreaterThan(0.3);
    expect(hitRate).toBeLessThan(0.9);

    // 同种子完全一致（读档重入不改变判定）
    let hittingSeed = -1;
    for (let seed = 1; seed <= 200 && hittingSeed === -1; seed += 1) {
      if (
        pickMatchMomentForWeek(
          createYouthSave({ randomState: { seed, sequencePosition: 0 } }),
          facts,
        ) !== null
      ) {
        hittingSeed = seed;
      }
    }
    expect(hittingSeed).toBeGreaterThan(0);
    const save = createYouthSave({ randomState: { seed: hittingSeed, sequencePosition: 0 } });
    expect(pickMatchMomentForWeek(save, facts)).not.toBeNull();
    expect(pickMatchMomentForWeek(save, facts)).not.toBeNull();
  });

  it('returns null for weeks without important matches', () => {
    const save = createYouthSave();
    expect(pickMatchMomentForWeek(save, [matchFact({ opponentStrength: 60 })])).toBeNull();
    expect(pickMatchMomentForWeek(save, [])).toBeNull();
  });
});

describe('pickMatchMomentForWeek monthly cap', () => {
  it('never generates beyond the two-decision monthly cap', () => {
    const facts = [matchFact({ opponentStrength: 82 })];
    for (let count = 2; count <= 3; count += 1) {
      const base = createYouthSave();
      const save = createYouthSave({
        monthlyAdvance: { ...base.monthlyAdvance, interactiveEventCount: count },
      });
      expect(pickMatchMomentForWeek(save, facts)).toBeNull();
    }
  });
});
