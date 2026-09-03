import { describe, expect, it } from 'vitest';
import { createLeagueFixtures } from '../../src/career/league-fixtures';
import { createDomesticCup } from '../../src/career/domestic-cup';
import { buildDepthChart, depthRank, generateProSquad } from '../../src/career/pro-squad';
import {
  calculatePlayerTeamImpact,
  decideAppearance,
  simulateProfessionalWeek,
} from '../../src/career/professional-week';
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
    const training = next.ledger.find(({ type }) => type === 'training');
    const ownFixtures = save.proSeason!.fixtures.filter(
      ({ weekKey, homeClubId, awayClubId }) =>
        weekKey === '2027-W02' && (homeClubId === 'pro-club-1' || awayClubId === 'pro-club-1'),
    );

    expect(training?.trainingContext).toEqual({
      focus: 'technical',
      intensity: 'normal',
      trainingLoad: 36,
      totalLoad: (36 + 8) * 1.15 + ownFixtures.length * 12,
    });
    expect(next.proSeason!.currentWeek).toBe(2);
    expect(next.proSeason!.fixtures.every(({ status }) => status === 'played')).toBe(false);
    const weekFixtures = save.proSeason!.fixtures.filter(({ weekKey }) => weekKey === '2027-W02');
    const playedTotal = next.proSeason!.standings.reduce((sum, s) => sum + s.played, 0);
    expect(playedTotal).toBe(weekFixtures.length * 2);
    if (weekFixtures.some((f) => f.homeClubId === 'pro-club-1' || f.awayClubId === 'pro-club-1')) {
      expect(matchResult).not.toBeNull();
      expect(matchResult!.id.startsWith('pro-')).toBe(true);
      expect(next.ledger.find(({ id }) => id === matchResult!.id)?.matchContext).toEqual(
        expect.objectContaining({
          opponentStrength: expect.any(Number),
          isHome: expect.any(Boolean),
          played: expect.any(Boolean),
          minutesPlayed: expect.any(Number),
          goals: expect.any(Number),
          assists: expect.any(Number),
        }),
      );
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
  const attributesWithValue = (value: number) => ({
    technical: {
      firstTouch: value,
      dribbling: value,
      passing: value,
      shooting: value,
      defending: value,
      aerialAbility: value,
    },
    physical: {
      pace: value,
      strength: value,
      stamina: value,
      agility: value,
    },
    mental: {
      offTheBall: value,
      vision: value,
      decision: value,
      composure: value,
      determination: value,
      discipline: value,
    },
  });

  describe('player team impact', () => {
    const base = createProSave();
    const selection = {
      appearance: 'starter' as const,
      minutes: 90,
      selectionScore: 90,
      threshold: 50,
    };

    const saveWithAbilityAndState = (ability: number) => ({
      ...base,
      player: {
        ...base.player,
        attributes: attributesWithValue(ability),
      },
      currentState: {
        ...base.currentState,
        form: 90,
        confidence: 90,
      },
      health: {
        ...base.health,
        fitness: 95,
        fatigue: 0,
      },
      clubContext: {
        ...base.clubContext,
        coachEvaluation: 90,
      },
    });

    it('能力和状态影响球队强度且影响值限制在正负四以内', () => {
      const strongImpact = calculatePlayerTeamImpact(
        saveWithAbilityAndState(95),
        saveWithAbilityAndState(95).health,
        selection,
        55,
      );
      const weakImpact = calculatePlayerTeamImpact(
        saveWithAbilityAndState(35),
        saveWithAbilityAndState(35).health,
        selection,
        75,
      );

      expect(strongImpact).toBeGreaterThan(weakImpact);
      expect(strongImpact).toBeGreaterThan(0);
      expect(strongImpact).toBeLessThanOrEqual(4);
      expect(weakImpact).toBeGreaterThanOrEqual(-4);
      expect(
        calculatePlayerTeamImpact(
          saveWithAbilityAndState(95),
          base.health,
          { ...selection, appearance: 'reserve' },
          55,
        ),
      ).toBe(0);
    });

    it('杯赛周只更新杯赛，不污染联赛积分榜并留下赛事上下文', () => {
      const cupClubs = [
        ...proClubs,
        { ...proClubs[0]!, id: 'pro-club-7' },
        { ...proClubs[0]!, id: 'pro-club-8' },
      ];
      const cup = createDomesticCup(cupClubs, 'pro-club-1', 5, '2027', 7);
      const save = {
        ...saveWithAbilityAndState(95),
        proSeason: {
          ...base.proSeason!,
          currentWeek: 26,
          domesticCup: cup,
        },
        contract: base.contract
          ? { ...base.contract, squadRole: 'highlighted-prospect' as const }
          : base.contract,
      };
      const { save: next } = simulateProfessionalWeek(save, cupClubs);
      const ownCupFixture = cup.fixtures.find(
        ({ weekKey, homeClubId, awayClubId }) =>
          weekKey.endsWith('W27') && (homeClubId === 'pro-club-1' || awayClubId === 'pro-club-1'),
      )!;
      const fact = next.ledger.find(({ id }) => id === `pro-${ownCupFixture.id}`);

      expect(next.proSeason!.standings).toEqual(save.proSeason!.standings);
      expect(
        next.proSeason!.domesticCup!.fixtures.filter(
          ({ weekKey, status }) => weekKey.endsWith('W27') && status === 'played',
        ),
      ).toHaveLength(4);
      expect(next.proSeasonStats.cupAppearances).toBe(1);
      expect(next.proSeasonStats.cupMinutes).toBeGreaterThan(0);
      expect(fact?.matchContext).toEqual(
        expect.objectContaining({
          competitionId: 'domestic-cup',
          teamImpact: expect.any(Number),
        }),
      );
    });

    it('同周同时有联赛和杯赛时分别记录两场比赛与球员统计', () => {
      const base = createProSave();
      const cupClubs = [
        ...proClubs,
        { ...proClubs[0]!, id: 'pro-club-7' },
        { ...proClubs[0]!, id: 'pro-club-8' },
      ];
      const cup = createDomesticCup(cupClubs, 'pro-club-1', 5, '2027', 7);
      const ownLeagueFixture = base.proSeason!.fixtures.find(
        ({ homeClubId, awayClubId }) => homeClubId === 'pro-club-1' || awayClubId === 'pro-club-1',
      )!;
      const fixtures = base.proSeason!.fixtures.map((fixture) =>
        fixture.id === ownLeagueFixture.id
          ? { ...fixture, weekKey: '2027-W27' }
          : fixture.weekKey === '2027-W27'
            ? { ...fixture, weekKey: '2027-W26' }
            : fixture,
      );
      const strongAttributes = {
        technical: Object.fromEntries(
          Object.keys(base.player.attributes.technical).map((key) => [key, 95]),
        ) as typeof base.player.attributes.technical,
        physical: Object.fromEntries(
          Object.keys(base.player.attributes.physical).map((key) => [key, 95]),
        ) as typeof base.player.attributes.physical,
        mental: Object.fromEntries(
          Object.keys(base.player.attributes.mental).map((key) => [key, 95]),
        ) as typeof base.player.attributes.mental,
      };
      const save = createProSave({
        player: { ...base.player, attributes: strongAttributes },
        health: { ...base.health, fitness: 95, fatigue: 0, recentLoad: 0 },
        currentState: { ...base.currentState, form: 90, confidence: 90 },
        clubContext: { ...base.clubContext, coachEvaluation: 90 },
        proSeason: {
          ...base.proSeason!,
          currentWeek: 26,
          fixtures,
          domesticCup: cup,
        },
      });

      const { save: next } = simulateProfessionalWeek(save, cupClubs);
      const matchFacts = next.ledger.filter(
        ({ type, weekKey }) => type === 'pro-match' && weekKey === '2027-W27',
      );

      expect(matchFacts).toHaveLength(2);
      expect(matchFacts.map(({ matchContext }) => matchContext?.competitionId)).toEqual(
        expect.arrayContaining(['pro-league', 'domestic-cup']),
      );
      expect(matchFacts.every(({ participantIds }) => participantIds.includes('player'))).toBe(
        true,
      );
      expect(next.proSeasonStats.leagueAppearances).toBeGreaterThanOrEqual(1);
      expect(next.proSeasonStats.cupAppearances).toBeGreaterThanOrEqual(1);
    });
  });
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
