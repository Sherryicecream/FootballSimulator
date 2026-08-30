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

  it('keeps at most three high-priority highlights in a busy month', () => {
    const ledger = [
      fact('settlement', '2024-W02', 'monthly-settlement', '月末成长结算：pace 50→51'),
      fact('training-1', '2024-W02', 'training', 'technical/intense，周负荷 55'),
      fact('training-2', '2024-W03', 'training', 'technical/intense，周负荷 58'),
      fact('training-3', '2024-W04', 'training', 'technical/normal，周负荷 45'),
      fact('match-1', '2024-W02', 'match', '海湾青年队 1:0；出场 45 分钟，评分 6.8'),
      fact('match-2', '2024-W03', 'match', '北城青年队 2:1；出场 60 分钟，评分 7.5；突出表现'),
      fact('health-1', '2024-W03', 'health', '右脚踝轻伤，预计恢复 2 周'),
      fact('first-team-1', '2024-W03', 'first-team', '一线队路径从 none 推进至 watchlist'),
      fact('relationship-1', '2024-W03', 'relationship', 'coach-17 trust +5'),
      fact('event-1', '2024-W03', 'event', '[家人的电话] 得到鼓励'),
      fact('decision-position-race-3', '2024-W03', 'decision', '[位置竞争] 请求教练录像复盘'),
    ];
    const records = buildRecentRecords({
      season: { startDate: '2024-09-01' },
      ledger,
    } as Pick<CareerSaveV2, 'season' | 'ledger'>);

    expect(records[0]?.lines).toHaveLength(3);
    expect(records[0]?.lines).toContain('进入一线队观察名单。');
    expect(records[0]?.lines).toContain('右脚踝出现轻伤，预计恢复 2 周。');
    expect(records[0]?.lines).toContain('在位置竞争中，你选择请求教练录像复盘。');
    expect(records[0]?.lines.join('')).not.toContain('训练');
  });

  it('sanitizes internal summaries and consolidates quiet training', () => {
    const busy = buildRecentRecords({
      season: { startDate: '2024-09-01' },
      ledger: [
        fact('decision-position-race-3', '2024-W02', 'decision', '[位置竞争] 请求教练录像复盘'),
        fact('relationship-person-12', '2024-W02', 'relationship', 'person-12 trust 63→68'),
        fact('training-technical-2', '2024-W02', 'training', 'technical/intense，周负荷 55'),
      ],
    } as Pick<CareerSaveV2, 'season' | 'ledger'>);
    const copy = busy.flatMap(({ lines }) => lines).join(' ');

    expect(copy).toContain('在位置竞争中，你选择请求教练录像复盘。');
    expect(copy).not.toMatch(/[\[\]/]|decision-|person-|relationship|trust|technical|intense/i);
    expect(busy.flatMap(({ lines }) => lines).every((line) => line.length <= 80)).toBe(true);

    const quiet = buildRecentRecords({
      season: { startDate: '2024-09-01' },
      ledger: [
        fact('training-1', '2024-W02', 'training', 'technical/normal，周负荷 42'),
        fact('training-2', '2024-W03', 'training', 'physical/normal，周负荷 45'),
      ],
    } as Pick<CareerSaveV2, 'season' | 'ledger'>);
    expect(quiet[0]?.lines).toEqual(['本月按计划完成日常训练。']);
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
  summary = `internal ${type} detail`,
): CareerLedgerEntryV2 => ({
  id,
  weekKey,
  type,
  summary,
  participantIds: [],
});
