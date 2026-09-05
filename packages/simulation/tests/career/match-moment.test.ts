import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2, MatchContext } from '@football/contracts';
import { createYouthSave } from '../fixtures/youth-save';
import {
  buildMatchMomentEvent,
  isImportantMatchContext,
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
      isImportantMatchContext({ competitionId: 'domestic-cup', opponentStrength: 50, played: true }),
    ).toBe(true);
  });

  it('uses league strength thresholds by phase', () => {
    expect(
      isImportantMatchContext({ competitionId: 'pro-tier-5', opponentStrength: 80, played: true }),
    ).toBe(false);
    expect(
      isImportantMatchContext({ competitionId: 'pro-tier-5', opponentStrength: 82, played: true }),
    ).toBe(true);
    expect(
      isImportantMatchContext({ competitionId: 'youth-league', opponentStrength: 75, played: true }),
    ).toBe(true);
    expect(
      isImportantMatchContext({ competitionId: 'youth-league', opponentStrength: 74, played: true }),
    ).toBe(false);
  });

  it('requires actual participation', () => {
    expect(
      isImportantMatchContext({ competitionId: 'domestic-cup', opponentStrength: 50, played: false }),
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
    expect(buildMatchMomentEvent(createYouthSave(), matchFact({ opponentStrength: 60 }))).toBeNull();
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
