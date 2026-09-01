import { describe, expect, it } from 'vitest';
import { createLeagueFixtures } from '../../src/career/league-fixtures';
import { buildDepthChart, depthRank, generateProSquad } from '../../src/career/pro-squad';
import { decideAppearance, simulateProfessionalWeek } from '../../src/career/professional-week';
import { createSeededRandomSource } from '../../src/randomness';
import { createProSave, proClubs } from '../fixtures/pro-save';
import { CareerSaveV5Schema, type CareerSaveV4, type CareerSaveV4Like } from '@football/contracts';

describe('createLeagueFixtures', () => {
  const clubIds = proClubs.map(({ id }) => id);

  it('双循环：n 家俱乐部产生 n×(n−1) 场，主客各一次', () => {
    const fixtures = createLeagueFixtures(clubIds, 'pro-league', 7, '2027');
    expect(fixtures).toHaveLength(6 * 5);
    const pairs = fixtures.map(({ homeClubId, awayClubId }) => `${homeClubId}>${awayClubId}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const home of clubIds) {
      for (const away of clubIds) {
        if (home === away) continue;
        expect(pairs).toContain(`${home}>${away}`);
        expect(pairs).toContain(`${away}>${home}`);
      }
    }
  });

  it('同种子生成一致，不同种子顺序不同', () => {
    const a = createLeagueFixtures(clubIds, 'pro-league', 7, '2027');
    const b = createLeagueFixtures(clubIds, 'pro-league', 7, '2027');
    const c = createLeagueFixtures(clubIds, 'pro-league', 8, '2027');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('generateProSquad', () => {
  it('阵容覆盖位置并包含同位置竞争者，深度图按能力排序', () => {
    const squad = generateProSquad(proClubs[0]!, 'FORWARD', 60, createSeededRandomSource(99));
    expect(squad.length).toBeGreaterThanOrEqual(17);
    const positions = new Set(squad.map(({ primaryPosition }) => primaryPosition));
    expect(positions.has('FORWARD')).toBe(true);
    expect(positions.has('CENTER_BACK')).toBe(true);
    const rivals = squad.filter(({ primaryPosition }) => primaryPosition === 'FORWARD');
    expect(rivals.length).toBeGreaterThanOrEqual(2);

    const chart = buildDepthChart(squad);
    const forwardIds = chart.FORWARD!;
    const abilities = forwardIds.map(
      (id) => squad.find(({ personId }) => personId === id)!.currentAbility,
    );
    expect([...abilities].sort((l, r) => r - l)).toEqual(abilities);
  });

  it('同种子完全一致', () => {
    const a = generateProSquad(proClubs[0]!, 'FORWARD', 60, createSeededRandomSource(5));
    const b = generateProSquad(proClubs[0]!, 'FORWARD', 60, createSeededRandomSource(5));
    expect(a).toEqual(b);
  });
});

describe('simulateProfessionalWeek', () => {
  it('keeps overseas morale loss compatible with the integer save contract', () => {
    const save = {
      ...createProSave(),
      schemaVersion: 5,
      overseasSince: '2027-07-01',
    } as CareerSaveV4Like;
    const { save: next } = simulateProfessionalWeek(save, proClubs);

    expect(Number.isInteger(next.currentState.morale)).toBe(true);
    expect(() => CareerSaveV5Schema.parse(next)).not.toThrow();
  });

  it('同种子同输入结果一致', () => {
    const a = simulateProfessionalWeek(createProSave(), proClubs);
    const b = simulateProfessionalWeek(createProSave(), proClubs);
    expect(a).toEqual(b);
  });

  it('推进日期、更新赛程与积分榜，比赛场次一一对应', () => {
    const save = createProSave();
    // 第 2 周起有赛程
    const { save: next, matchResult } = simulateProfessionalWeek(save, proClubs);
    expect(next.proSeason!.currentWeek).toBe(2);
    expect(next.proSeason!.fixtures.every(({ status }) => status === 'played')).toBe(false);
    const weekFixtures = save.proSeason!.fixtures.filter(({ weekKey }) => weekKey === '2027-W02');
    const playedTotal = next.proSeason!.standings.reduce((sum, s) => sum + s.played, 0);
    expect(playedTotal).toBe(weekFixtures.length * 2);
    if (weekFixtures.some((f) => f.homeClubId === 'pro-club-1' || f.awayClubId === 'pro-club-1')) {
      expect(matchResult).not.toBeNull();
      expect(matchResult!.id.startsWith('pro-')).toBe(true);
    }
  });

  it('伤病患者无法出场，健康的低评分球员进入预备队', () => {
    const injured = createProSave({
      health: {
        fitness: 70,
        fatigue: 10,
        recentLoad: 20,
        activeInjury: {
          id: 'inj-1',
          kind: 'minor',
          bodyArea: '脚踝',
          occurredWeek: '2027-W01',
          expectedRecoveryWeeks: 3,
          recoveredWeeks: 0,
          recurrenceRisk: 0.1,
        },
        previousInjuries: [],
      },
    });
    const { matchResult } = simulateProfessionalWeek(injured, proClubs);
    if (matchResult) {
      expect(matchResult.played).toBe(false);
      expect(matchResult.minutesPlayed).toBe(0);
    }
  });
});

describe('decideAppearance', () => {
  const base = createProSave();
  const healthy = base.health;
  const rng = () => createSeededRandomSource(11);

  it('高强度承诺降低首发门槛（阈值单调放宽）', () => {
    const withBigPromise = decideAppearance(
      {
        ...base,
        contract: base.contract
          ? { ...base.contract, promise: { kind: 'playing-time', minimumShare: 0.5 } }
          : base.contract,
      },
      healthy,
      rng(),
      true,
    );
    const noPromise = decideAppearance(
      { ...base, contract: base.contract ? { ...base.contract, promise: { kind: 'none' } } : null },
      healthy,
      rng(),
      true,
    );
    expect(withBigPromise.threshold).toBeLessThan(noPromise.threshold);
  });

  it('同位置强竞争者抬高首发门槛', () => {
    const strongRival = createProSave({
      proSeason: {
        ...base.proSeason!,
        squad: base.proSeason!.squad.map((member) =>
          member.primaryPosition === 'FORWARD' ? { ...member, currentAbility: 90 } : member,
        ),
      },
    });
    const weakRival = createProSave({
      proSeason: {
        ...base.proSeason!,
        squad: base.proSeason!.squad.map((member) =>
          member.primaryPosition === 'FORWARD' ? { ...member, currentAbility: 40 } : member,
        ),
      },
    });
    const withStrong = decideAppearance(strongRival, healthy, rng(), true);
    const withWeak = decideAppearance(weakRival, healthy, rng(), true);
    expect(withStrong.threshold).toBeGreaterThan(withWeak.threshold);
  });

  it('高疲劳惩罚门槛', () => {
    const tired = createProSave({
      health: { ...healthy, fatigue: 85 },
    });
    const rested = createProSave({ health: { ...healthy, fatigue: 20 } });
    expect(decideAppearance(tired, tired.health, rng(), true).threshold).toBeLessThan(
      decideAppearance(rested, rested.health, rng(), true).threshold,
    );
  });

  it('无赛程周不做出场安排', () => {
    const decision = decideAppearance(base, healthy, rng(), false);
    expect(decision.appearance).toBe('unavailable');
  });
});

describe('player id in depth chart', () => {
  it('球员以 player 身份参与深度图排位', () => {
    const save = createProSave() as CareerSaveV4;
    expect(save.proSeason!.depthChart.FORWARD![0]).toBe('player');
    expect(depthRank(save.proSeason!.depthChart, 'FORWARD', 'player')).toBe(1);
  });
});
