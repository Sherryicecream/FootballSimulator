import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2, CareerSaveV2 } from '@football/contracts';
import {
  buildPlayerProfile,
  buildRecentRecords,
  labelAttribute,
} from '../../src/career-dashboard/career-presentation';

const baseProfilePlayer = {
  identity: {
    growthBackground: 'academy',
    personalityTendency: 'composed',
    preferredFoot: 'LEFT',
    weakFootLevel: 3,
  },
  attributes: {
    technical: {
      firstTouch: 50,
      dribbling: 50,
      passing: 50,
      shooting: 50,
      defending: 50,
      aerialAbility: 50,
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
};

describe('career presentation', () => {
  it('maps every player-facing attribute to Chinese', () => {
    expect(labelAttribute('firstTouch')).toBe('停球');
    expect(labelAttribute('aerialAbility')).toBe('头球');
    expect(labelAttribute('offTheBall')).toBe('无球跑动');
    expect(labelAttribute('discipline')).toBe('自律');
    expect(labelAttribute('unrecognized')).toBe('其他能力');
  });

  it('consolidates ledger facts into the latest three months', () => {
    const projection = {
      season: { startDate: '2024-09-01' },
      ledger: [
        fact('sep-training', '2024-W01', 'training'),
        fact('oct-training', '2024-W06', 'training'),
        fact('oct-match', '2024-W06', 'match'),
        fact('oct-health', '2024-W07', 'health'),
        fact('oct-event', '2024-W07', 'event'),
        fact('oct-decision', '2024-W07', 'decision'),
        fact('nov-relationship', '2024-W10', 'relationship'),
        fact('nov-first-team', '2024-W10', 'first-team'),
        fact('dec-settlement', '2024-W14', 'monthly-settlement'),
      ],
    } as Pick<CareerSaveV2, 'season' | 'ledger'>;

    const records = buildRecentRecords(projection, 3);

    expect(records).toHaveLength(3);
    expect(records.map(({ monthKey }) => monthKey)).toEqual(['2024-12', '2024-11', '2024-10']);
    const copy = records.flatMap(({ lines }) => lines).join(' ');
    expect(copy).not.toMatch(
      /training|match|health|event|decision|relationship|first-team|monthly-settlement/i,
    );
    expect(copy).toContain('比赛');
    expect(copy).toContain('关键选择');
    expect(copy).toContain('一线队');
  });

  it('projects a Chinese player profile with stable top-three strengths', () => {
    const profile = buildPlayerProfile({
      identity: {
        growthBackground: 'school',
        personalityTendency: 'disciplined',
        preferredFoot: 'RIGHT',
        weakFootLevel: 4,
      },
      attributes: {
        technical: {
          firstTouch: 40,
          dribbling: 69,
          passing: 45,
          shooting: 43,
          defending: 42,
          aerialAbility: 41,
        },
        physical: { pace: 72, strength: 44, stamina: 46, agility: 48 },
        mental: {
          offTheBall: 67,
          vision: 50,
          decision: 49,
          composure: 47,
          determination: 45,
          discipline: 44,
        },
      },
    } as CareerSaveV2['player']);

    expect(profile.background).toBe('校园足球');
    expect(profile.personality).toBe('自律');
    expect(profile.preferredFoot).toBe('右脚');
    expect(profile.weakFoot).toBe('较好');
    expect(profile.strengths).toEqual([
      { label: '速度', value: 72 },
      { label: '盘带', value: 69 },
      { label: '无球跑动', value: 67 },
    ]);
  });

  it('uses safe legacy fallbacks and stable attribute order for ties', () => {
    const player = {
      ...baseProfilePlayer,
      identity: {
        ...baseProfilePlayer.identity,
        growthBackground: 'internal-old-background',
        personalityTendency: 'internal-old-personality',
      },
    } as CareerSaveV2['player'];
    const profile = buildPlayerProfile(player);

    expect(profile.background).toBe('其他经历');
    expect(profile.personality).toBe('尚待观察');
    expect(profile.strengths.map(({ label }) => label)).toEqual(['停球', '盘带', '传球']);
  });

  it('returns no summaries for an empty ledger', () => {
    const projection = {
      season: { startDate: '2024-09-01' },
      ledger: [],
    } as unknown as Pick<CareerSaveV2, 'season' | 'ledger'>;

    expect(buildRecentRecords(projection)).toEqual([]);
  });
});

const fact = (
  id: string,
  weekKey: string,
  type: CareerLedgerEntryV2['type'],
): CareerLedgerEntryV2 => ({
  id,
  weekKey,
  type,
  summary: `internal ${type} detail`,
  participantIds: [],
});
