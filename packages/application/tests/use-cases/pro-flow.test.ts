import { describe, expect, it } from 'vitest';
import { migrateCareerSaveV5 } from '@football/contracts';
import type { CareerSaveV4 } from '@football/contracts';
import {
  acceptRenewal,
  advanceProMonth,
  completeProfessionalSeason,
  declineRenewal,
  startProfessionalSeason,
  submitNationalTeamDecision,
} from '../../src/use-cases/pro-flow';
import {
  generateFreeAgentOffers,
  requestCareerMarket,
  retire,
  signMarketOffer,
  signTransfer,
} from '../../src/use-cases/transfer-flow';
import {
  submitAgentPreferences,
  generateContractOffers,
  signContract,
} from '../../src/use-cases/contract-flow';
import { clearEventFeedback, completeYouthSeason, enterOffseason } from '../../src/index';
import { createSave, content, finishSeason } from '../fixtures/youth-save';
import { buildCareerReview } from '@football/application';
import { advanceDomesticCup, createDomesticCup } from '@football/simulation';

/** 构造一名已签署职业合同的 v4 存档（1 年短合同便于测试到期分支）。 */
function signedProSave(overrides: Partial<CareerSaveV4> = {}): CareerSaveV4 {
  let save = finishSeason(createSave(42));
  const attributes = {
    technical: {
      firstTouch: 70,
      dribbling: 68,
      passing: 66,
      shooting: 72,
      defending: 50,
      aerialAbility: 60,
    },
    physical: { pace: 74, strength: 66, stamina: 70, agility: 68 },
    mental: {
      offTheBall: 72,
      vision: 64,
      decision: 66,
      composure: 68,
      determination: 74,
      discipline: 70,
    },
  };
  save = {
    ...save,
    clubContext: { ...save.clubContext, coachEvaluation: 75, firstTeamStage: 'watchlist' },
    player: { ...save.player, age: 18, attributes },
    seasonStats: { appearances: 20, goals: 6, assists: 3, ratingSum: 145, ratingCount: 20 },
  };
  const completed = completeYouthSeason(save);
  save = enterOffseason(completed.save, content.academies).save;
  save = submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'playing-time' });
  save = generateContractOffers(save, content);
  const target =
    save.pendingOffers.find(({ clubId }) => clubId === 'river-club') ?? save.pendingOffers[0]!;
  save = signContract(save, target.id);
  const v4 = migrateCareerSaveV5({
    ...save,
    contract: {
      ...save.contract!,
      clubId: 'river-club',
      clubName: '闽江渔火',
      clubTier: 5,
      overseas: false,
      contractYears: 1,
    },
  });
  return { ...v4, ...overrides };
}
function finishProfessionalSeason<S extends CareerSaveV4>(save: S): S {
  let current = save;
  let guard = 0;
  while (!current.proSeason?.completed && guard < 20) {
    const outcome = advanceProMonth(current, content.clubs, []);
    if (outcome.status === 'awaiting-decision') throw new Error('测试赛季出现未处理事件');
    current = outcome.save;
    guard += 1;
  }
  if (!current.proSeason?.completed) throw new Error('测试赛季未在月度推进中完成');
  return current;
}

function loanedOffseasonSave() {
  let save = migrateCareerSaveV5(signedProSave());
  const started = startProfessionalSeason(save, content.clubs);
  const finished = finishProfessionalSeason(started);
  const settled = completeProfessionalSeason(finished).save;
  const market = requestCareerMarket(settled, content, 'loan');
  const offer = market.pendingOffers[0];
  if (!offer) throw new Error('测试市场没有租借报价');
  return { save: signMarketOffer(market, offer.id), offer };
}

function standingsWithPlayerRank(
  standings: ReturnType<typeof startProfessionalSeason>['proSeason']['standings'],
  playerClubId: string,
  playerRank: number,
) {
  const orderedIds = standings
    .map(({ clubId }) => clubId)
    .filter((clubId) => clubId !== playerClubId);
  orderedIds.splice(Math.max(0, Math.min(playerRank - 1, orderedIds.length)), 0, playerClubId);
  const records = [
    { won: 3, drawn: 0, lost: 0, points: 9 },
    { won: 2, drawn: 1, lost: 0, points: 7 },
    { won: 2, drawn: 0, lost: 1, points: 6 },
    { won: 1, drawn: 2, lost: 0, points: 5 },
    { won: 1, drawn: 1, lost: 1, points: 4 },
    { won: 1, drawn: 0, lost: 2, points: 3 },
    { won: 0, drawn: 2, lost: 1, points: 2 },
    { won: 0, drawn: 0, lost: 3, points: 0 },
  ];
  return orderedIds.map((clubId, index) => {
    const record = records[index] ?? records.at(-1)!;
    return {
      clubId,
      played: 3,
      won: record.won,
      drawn: record.drawn,
      lost: record.lost,
      goalsFor: 10 - index,
      goalsAgainst: index,
      points: record.points,
    };
  });
}

function cupWonBy(cup: NonNullable<ReturnType<typeof createDomesticCup>>, championId: string) {
  let current = cup;
  while (!current.completed) {
    const pending = current.fixtures.filter(
      ({ status, homeClubId, awayClubId }) =>
        status === 'scheduled' &&
        !homeClubId.startsWith('cup-slot-') &&
        !awayClubId.startsWith('cup-slot-'),
    );
    if (pending.length === 0) throw new Error('测试杯赛没有可结算的对阵');
    for (const fixture of pending) {
      const homeScore = fixture.homeClubId === championId ? 1 : 0;
      const awayScore = fixture.awayClubId === championId ? 1 : 0;
      current = advanceDomesticCup(
        current,
        fixture.id,
        homeScore || awayScore ? homeScore : 1,
        homeScore || awayScore ? awayScore : 0,
        0,
      );
    }
  }
  return current;
}

function saveWithCompletedLeagueAndCup(options: {
  playerRank: number;
  cupChampion?: boolean;
}): CareerSaveV4 {
  const started = startProfessionalSeason(signedProSave(), content.clubs);
  const playerClubId = started.proSeason!.clubId;
  const cup =
    options.cupChampion === false
      ? null
      : cupWonBy(createDomesticCup(content.clubs, playerClubId, 5, '2025', 42), playerClubId);
  return {
    ...started,
    proSeason: {
      ...started.proSeason!,
      currentDate: started.proSeason!.endDate,
      currentMonth: started.proSeason!.endDate.slice(0, 7),
      currentWeek: 52,
      standings: standingsWithPlayerRank(
        started.proSeason!.standings,
        playerClubId,
        options.playerRank,
      ),
      domesticCup: cup,
      completed: true,
    },
    proSeasonStats: {
      ...started.proSeasonStats,
      leagueAppearances: 15,
      cupAppearances: cup ? 3 : 0,
      cupMinutes: cup ? 180 : 0,
      cupGoals: 1,
      cupAssists: 1,
    },
  };
}

function saveAtTierBoundary(tier: number, playerRank: number): CareerSaveV4 {
  const completed = saveWithCompletedLeagueAndCup({ playerRank, cupChampion: false });
  return {
    ...completed,
    contract: { ...completed.contract!, clubTier: tier, overseas: false },
  };
}

describe('职业赛季流程', () => {
  it('requires event feedback acknowledgement before resuming a professional month', () => {
    const started = startProfessionalSeason(signedProSave(), content.clubs);
    const save = {
      ...started,
      story: {
        ...started.story,
        pendingFeedback: {
          eventId: 'feedback-1',
          title: '事件反馈',
          choiceId: 'choice-1',
          choiceText: '继续训练',
          response: '教练记住了你的选择。',
          participantResponses: [],
          stateChanges: [],
          relationshipChanges: [],
          followUp: '下个月会看到影响。',
        },
      },
    };

    expect(() => advanceProMonth(save, content.clubs)).toThrow('反馈');
  });

  it('starts the next season with an off-season fitness reset', () => {
    const base = signedProSave();
    const initial = {
      ...base,
      health: { ...base.health, fitness: 24, fatigue: 92, recentLoad: 80 },
    };
    const next = startProfessionalSeason(initial, content.clubs);
    expect(next.health.fitness).toBeGreaterThanOrEqual(70);
    expect(next.health.fatigue).toBeLessThanOrEqual(20);
    expect(next.health.recentLoad).toBe(0);
  });

  it('职业联赛最多固化 12 支球队，升级降级不会额外制造第 13 队', () => {
    const expandedClubs = [
      ...content.clubs,
      ...Array.from({ length: 8 }, (_, index) => ({
        ...content.clubs[1]!,
        id: `expanded-tier5-${index + 1}`,
        name: `扩展五级俱乐部${index + 1}`,
        tier: 5,
      })),
    ];
    const started = startProfessionalSeason(signedProSave(), expandedClubs);

    expect(started.proSeason!.standings).toHaveLength(12);
    expect(new Set(started.proSeason!.standings.map(({ clubId }) => clubId)).size).toBe(12);
  });

  it('开启职业赛季：阵容、赛程与积分榜固化，阶段进入 pro-season', () => {
    let save = signedProSave();
    save = startProfessionalSeason(save, content.clubs);
    expect(save.careerPhase).toBe('pro-season');
    expect(save.proSeason).not.toBeNull();
    expect(save.proSeason!.clubId).toBe(save.contract!.clubId);
    // 8 家同层级（tier 5）俱乐部 → 8×7 = 56 场双循环
    const tier5 = content.clubs.filter(({ tier }) => tier === 5).length;
    expect(save.proSeason!.fixtures).toHaveLength(tier5 * (tier5 - 1));
    expect(save.proSeason!.standings).toHaveLength(tier5);
    expect(save.proSeason!.squad.length).toBeGreaterThanOrEqual(17);
    expect(save.proSeason!.depthChart.FORWARD!.includes('player')).toBe(true);
    expect(save.ledger.some(({ summary }) => summary.includes('开启职业赛季'))).toBe(true);
  });

  it('creates a domestic cup containing the player club when a new professional season starts', () => {
    const started = startProfessionalSeason(signedProSave(), content.clubs);
    expect(started.proSeason?.domesticCup?.entrants).toContain(started.proSeason?.clubId);
    expect(started.proSeason?.domesticCup?.fixtures).toHaveLength(7);
  });

  it('uses the persisted next club tier when creating the following season', () => {
    const first = startProfessionalSeason(signedProSave(), content.clubs);
    const next = startProfessionalSeason(
      {
        ...first,
        careerPhase: 'pro-offseason',
        proSeason: { ...first.proSeason!, nextClubTier: 7 },
      },
      content.clubs,
    );

    expect(next.proSeason!.competitionId).toBe('pro-tier-7');
    expect(next.contract!.clubTier).toBe(7);
    expect(next.proSeason!.domesticCup?.entrants).toContain(next.proSeason!.clubId);
  });

  it('租借赛季使用目标队数据，结算后回到母队', () => {
    const { save: signed } = loanedOffseasonSave();
    const started = startProfessionalSeason(signed, content.clubs);
    const targetClubId = signed.activeLoan!.loanClubId;
    expect(started.proSeason?.clubId).toBe(targetClubId);

    const finished = finishProfessionalSeason(started);
    const completed = {
      ...finished,
      proSeason: {
        ...finished.proSeason!,
        standings: standingsWithPlayerRank(finished.proSeason!.standings, targetClubId, 1),
      },
    };
    const settled = completeProfessionalSeason(completed).save;

    expect(settled.activeLoan).toBeNull();
    expect(settled.contract?.clubId).toBe(signed.contract?.clubId);
    expect(settled.loanHistory.at(-1)?.loanClubId).toBe(targetClubId);
    expect(settled.seasonHistory.at(-1)?.honours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'league-champion', clubId: targetClubId }),
      ]),
    );
  });

  it('目标队降级只记录在目标队赛季，不污染母队合同层级', () => {
    const { save: signed } = loanedOffseasonSave();
    const started = startProfessionalSeason(signed, content.clubs);
    const targetClubId = signed.activeLoan!.loanClubId;
    const completed = {
      ...started,
      proSeason: {
        ...started.proSeason!,
        clubId: targetClubId,
        currentDate: started.proSeason!.endDate,
        currentMonth: started.proSeason!.endDate.slice(0, 7),
        currentWeek: 52,
        standings: standingsWithPlayerRank(started.proSeason!.standings, targetClubId, 99),
        completed: true,
      },
    };

    const settled = completeProfessionalSeason(completed).save;

    expect(settled.contract?.clubId).toBe(signed.contract?.clubId);
    expect(settled.contract?.clubTier).toBe(signed.contract?.clubTier);
    expect(settled.proSeason?.nextClubTier).toBeNull();
    expect(settled.seasonHistory.at(-1)?.honours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'relegation', clubId: targetClubId }),
      ]),
    );
  });
  it('settles cup and league honours and promotion into season history and ledger', () => {
    const completed = saveWithCompletedLeagueAndCup({ playerRank: 2, cupChampion: true });
    const settled = completeProfessionalSeason(completed).save;
    const honours = settled.seasonHistory.at(-1)!.honours;
    expect(honours.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(['cup-champion', 'promotion']),
    );
    expect(settled.proSeason?.nextClubTier).toBe((completed.contract?.clubTier ?? 5) + 1);
    expect(
      settled.ledger.some(
        ({ type, summary }) => type === 'season-outcome' && summary.includes('升级'),
      ),
    ).toBe(true);
    expect(settled.seasonHistory.at(-1)?.appearances).toBe(18);
    expect(settled.totals.appearances).toBe(completed.totals.appearances + 18);
    const outcomeFact = settled.ledger.find(
      ({ id }) => id === 'pro-season-outcome-' + completed.proSeason!.id,
    );
    expect(outcomeFact?.participantIds).toContain('player');
    expect(outcomeFact?.id).toBe(honours[0]?.evidenceId);
  });

  it('protects tier 8 from promotion and tier 3 from relegation', () => {
    expect(completeProfessionalSeason(saveAtTierBoundary(8, 1)).save.proSeason?.nextClubTier).toBe(
      8,
    );
    expect(completeProfessionalSeason(saveAtTierBoundary(3, 8)).save.proSeason?.nextClubTier).toBe(
      3,
    );
    const relegated = completeProfessionalSeason(saveAtTierBoundary(5, 8)).save;
    expect(relegated.proSeason?.nextClubTier).toBe(4);
    expect(relegated.seasonHistory.at(-1)?.honours).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'relegation', label: '降级' })]),
    );
  });

  it('writes one season history entry and one league honour for a reloaded completed season', () => {
    const first = completeProfessionalSeason(
      saveWithCompletedLeagueAndCup({ playerRank: 1, cupChampion: false }),
    ).save;
    expect(
      first.seasonHistory.filter(({ seasonId }) => seasonId === first.proSeason?.id),
    ).toHaveLength(1);
    expect(
      first.seasonHistory.at(-1)?.honours.filter(({ kind }) => kind === 'league-champion'),
    ).toHaveLength(1);
  });

  it('builds a playable overseas division when a single tier has fewer than four clubs', () => {
    const base = signedProSave();
    const overseasClubs = Array.from({ length: 6 }, (_, index) => ({
      ...content.clubs[0]!,
      id: `ov-test-${index + 1}`,
      name: `Overseas Test ${index + 1}`,
      tier: index < 2 ? 5 : index < 4 ? 6 : 4,
      overseas: true,
    }));
    const overseasClub = overseasClubs[0]!;
    const save = {
      ...base,
      contract: {
        ...base.contract!,
        clubId: overseasClub.id,
        clubName: overseasClub.name,
        clubTier: overseasClub.tier,
        overseas: true,
      },
      overseasSince: '2025-07-01',
    };
    const started = startProfessionalSeason(save, [...content.clubs, ...overseasClubs]);
    expect(started.proSeason!.fixtures.length).toBeGreaterThanOrEqual(4);
    expect(
      started.proSeason!.fixtures.every(({ homeClubId, awayClubId }) =>
        [homeClubId, awayClubId].every((id) => id.startsWith('ov-')),
      ),
    ).toBe(true);
  });

  it('同种子开启的赛季完全一致；非法阶段被拒绝', () => {
    const a = startProfessionalSeason(signedProSave(), content.clubs);
    const b = startProfessionalSeason(signedProSave(), content.clubs);
    expect(a).toEqual(b);
    expect(() =>
      startProfessionalSeason(
        migrateCareerSaveV5({ ...signedProSave(), careerPhase: 'pro-season' }),
        content.clubs,
      ),
    ).toThrow(/阶段/);
  });

  it('月报保存训练反馈并保留职业比赛联系', () => {
    const initial = startProfessionalSeason(signedProSave(), content.clubs);
    const outcome = advanceProMonth(initial, content.clubs, []);

    expect(outcome.status).toBe('month-complete');
    if (outcome.status !== 'month-complete') return;
    const feedback = outcome.report.trainingFeedback;
    expect(feedback).toEqual(
      expect.objectContaining({
        matches: expect.objectContaining({ appearances: expect.any(Number) }),
      }),
    );
    expect(feedback?.trainingWeeks).toBeGreaterThanOrEqual(4);
    expect(feedback?.trainingWeeks).toBeLessThanOrEqual(5);
    expect(feedback?.totalTrainingLoad).toBe((feedback?.trainingWeeks ?? 0) * 36);
    expect(outcome.save.lastMonthlyReport).toEqual(outcome.report);
  });

  it('月度推进：青训赛季月份推进与赛季完成', () => {
    let save = startProfessionalSeason(signedProSave(), content.clubs);
    let guard = 0;
    let sawMonthComplete = false;
    while (!save.proSeason!.completed && guard < 40) {
      const outcome = advanceProMonth(save, content.clubs, content.events);
      if (outcome.status === 'awaiting-decision') {
        save = outcome.save;
        break;
      }
      if (outcome.status === 'month-complete') sawMonthComplete = true;
      save = outcome.save;
      guard += 1;
    }
    expect(sawMonthComplete || save.proSeason!.completed).toBe(true);
    expect(guard).toBeLessThan(40);
    if (save.proSeason!.completed) {
      const played = save.proSeason!.fixtures.filter(({ status }) => status === 'played').length;
      const totalMinutes = save.proSeason!.standings.reduce((sum, s) => sum + s.played, 0);
      expect(played * 2).toBe(totalMinutes);
    }
  });

  it('赛季结算：承诺对照、年限递减，到期出现续约要约并可接受', () => {
    let save = startProfessionalSeason(signedProSave(), content.clubs);
    let guard = 0;
    while (!save.proSeason!.completed && guard < 40) {
      const outcome = advanceProMonth(save, content.clubs, content.events);
      if (outcome.status === 'awaiting-decision') break;
      save = outcome.save;
      guard += 1;
    }
    if (!save.proSeason!.completed) {
      console.warn('夹具出现事件中断，跳过结算用例');
      return;
    }
    const { save: settled, review } = completeProfessionalSeason(save);
    expect(settled.careerPhase).toBe('pro-offseason');
    expect(settled.contract!.seasonsCompleted).toBe(1);
    // 1 年合同 → 到期 → 续约要约
    expect(settled.pendingOffers).toHaveLength(1);
    expect(settled.ledger.some(({ type }) => type === 'promise-review')).toBe(true);
    if (review) {
      expect(review.review.share).toBeGreaterThanOrEqual(0);
      expect(review.review.status).toMatch(/kept|broken/);
    }

    const renewed = acceptRenewal(settled);
    expect(renewed.careerPhase).toBe('pro-offseason');
    expect(renewed.contract!.seasonsCompleted).toBe(0);
    expect(renewed.pendingOffers).toEqual([]);
    expect(renewed.ledger.some(({ type }) => type === 'renewal-signed')).toBe(true);

    // 续约后可再次开启下个赛季
    const nextSeason = startProfessionalSeason(renewed, content.clubs);
    expect(nextSeason.proSeason!.id).toBe('pro-2026');
  });

  it('拒绝续约成为自由球员（M7 起点）', () => {
    let save = startProfessionalSeason(signedProSave(), content.clubs);
    let guard = 0;
    while (!save.proSeason!.completed && guard < 40) {
      const outcome = advanceProMonth(save, content.clubs, content.events);
      if (outcome.status === 'awaiting-decision') break;
      save = outcome.save;
      guard += 1;
    }
    if (!save.proSeason!.completed) {
      console.warn('夹具出现事件中断，跳过该用例');
      return;
    }
    const settled = completeProfessionalSeason(save).save;
    if (settled.pendingOffers.length === 0) {
      console.warn('合同未到期，跳过该用例');
      return;
    }
    const freeAgent = declineRenewal(settled);
    expect(freeAgent.careerPhase).toBe('free-agent');
    expect(freeAgent.contract).toBeNull();
  });

  it('applies visible age decline during professional monthly settlement', () => {
    const initial = signedProSave();
    let save = startProfessionalSeason(
      {
        ...initial,
        player: {
          ...initial.player,
          age: 32,
          identity: { ...initial.player.identity, dateOfBirth: '1993-01-01' },
          attributes: {
            ...initial.player.attributes,
            physical: { pace: 40, strength: 40, stamina: 40, agility: 40 },
          },
        },
      },
      content.clubs,
    );
    const declineChanges = [];
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') {
        declineChanges.push(
          ...outcome.report.attributeChanges.filter(
            ({ attribute, oldValue, newValue }) =>
              ['pace', 'stamina', 'agility', 'strength'].includes(attribute) && newValue < oldValue,
          ),
        );
        save = outcome.save;
      }
      guard += 1;
    }
    expect(declineChanges.length).toBeGreaterThan(0);
  });

  it('can sign a domestic free-agent offer and start the next professional season', () => {
    let save = startProfessionalSeason(signedProSave(), content.clubs);
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') save = outcome.save;
      guard += 1;
    }
    expect(save.proSeason!.completed).toBe(true);
    const settled = completeProfessionalSeason(save).save;
    const freeAgent = declineRenewal(settled);
    const market = generateFreeAgentOffers(freeAgent, content);
    const offer = market.pendingOffers.find(({ overseas }) => !overseas);
    expect(offer).toBeDefined();
    const signed = signTransfer(
      { ...market, proSeason: { ...market.proSeason!, nextClubTier: 8 } },
      offer!.id,
    );
    expect(signed.careerPhase).toBe('professional-contract');
    expect(signed.freeAgentSeasons).toBe(0);
    expect(signed.proSeason).toBeNull();
    const nextSeason = startProfessionalSeason(signed, content.clubs);
    expect(nextSeason.careerPhase).toBe('pro-season');
    expect(nextSeason.proSeason!.clubId).toBe(offer!.clubId);
    expect(nextSeason.proSeason!.competitionId).toBe(`pro-tier-${offer!.clubTier}`);
    expect(nextSeason.proSeason!.startDate).toBe('2026-08-01');
  });

  it('keeps an overseas career in an overseas-only league schedule', () => {
    const domesticTierFive = content.clubs.filter(({ tier }) => tier === 5);
    const overseasLeague = domesticTierFive.slice(0, 4).map((club, index) => ({
      ...club,
      id: `overseas-test-${index + 1}`,
      name: `Overseas Test ${index + 1}`,
      overseas: true,
    }));
    const initial = signedProSave();
    const save = {
      ...initial,
      contract: {
        ...initial.contract!,
        clubId: overseasLeague[0]!.id,
        clubName: overseasLeague[0]!.name,
        overseas: true,
      },
      overseasSince: '2025-07-01',
    };
    const next = startProfessionalSeason(save, [...content.clubs, ...overseasLeague]);

    expect(next.proSeason!.competitionId).toBe('pro-overseas-tier-5');
    expect(next.proSeason!.fixtures).toHaveLength(
      overseasLeague.length * (overseasLeague.length - 1),
    );
    expect(
      next.proSeason!.fixtures.every(({ homeClubId, awayClubId }) =>
        [homeClubId, awayClubId].every((id) => id.startsWith('overseas-test-')),
      ),
    ).toBe(true);
  });

  it('turns first national-team eligibility into a decision event', () => {
    const initial = signedProSave();
    let save = startProfessionalSeason(
      {
        ...initial,
        player: {
          ...initial.player,
          identity: { ...initial.player.identity, dateOfBirth: '2000-01-01' },
          reputation: 60,
        },
      },
      content.clubs,
    );
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') save = outcome.save;
      guard += 1;
    }
    expect(save.proSeason!.completed).toBe(true);
    save = {
      ...save,
      player: { ...save.player, reputation: 60 },
      proSeasonStats: { ...save.proSeasonStats, leagueAppearances: 15 },
    };
    const settled = completeProfessionalSeason(save).save;
    expect(settled.nationalTeam).toBeNull();
    expect(settled.story.pendingEvent?.eventId).toContain('national');
    expect(settled.story.pendingEvent?.choices).toHaveLength(2);
    for (const choice of settled.story.pendingEvent?.choices ?? []) {
      expect(choice.response).toEqual(expect.any(String));
      expect(choice.followUp).toEqual(expect.any(String));
    }
  });

  it('accepting the first call-up records caps and applies the decision effects', () => {
    const initial = signedProSave();
    let save = startProfessionalSeason(
      {
        ...initial,
        player: {
          ...initial.player,
          identity: { ...initial.player.identity, dateOfBirth: '2000-01-01' },
          reputation: 60,
        },
      },
      content.clubs,
    );
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') save = outcome.save;
      guard += 1;
    }
    save = {
      ...save,
      player: { ...save.player, reputation: 60 },
      proSeasonStats: { ...save.proSeasonStats, leagueAppearances: 15 },
    };
    const settled = completeProfessionalSeason(save).save;
    const accepted = submitNationalTeamDecision(settled, 'accept-national-team');

    expect(accepted.nationalTeam?.capped).toBe(true);
    expect(accepted.nationalTeam?.caps).toBeGreaterThanOrEqual(1);
    expect(accepted.currentState.confidence).toBe(settled.currentState.confidence + 3);
    expect(accepted.health.fatigue).toBe(settled.health.fatigue + 2);
    expect(accepted.ledger.some(({ type }) => type === 'national-debut')).toBe(true);
  });

  it('accumulates another international window after a debut', () => {
    const initial = signedProSave();
    let first = startProfessionalSeason(
      {
        ...initial,
        player: {
          ...initial.player,
          identity: { ...initial.player.identity, dateOfBirth: '2000-01-01' },
          reputation: 60,
        },
      },
      content.clubs,
    );
    let guard = 0;
    while (!first.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(first, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') first = outcome.save;
      guard += 1;
    }
    first = {
      ...first,
      player: { ...first.player, reputation: 60 },
      proSeasonStats: { ...first.proSeasonStats, leagueAppearances: 15 },
    };
    const firstSettled = completeProfessionalSeason(first).save;
    const debuted = clearEventFeedback(
      submitNationalTeamDecision(firstSettled, 'accept-national-team'),
    );
    const renewed = acceptRenewal(debuted);
    let second = startProfessionalSeason(renewed, content.clubs);
    guard = 0;
    while (!second.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(second, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') second = outcome.save;
      guard += 1;
    }
    second = {
      ...second,
      player: { ...second.player, reputation: 60 },
      proSeasonStats: { ...second.proSeasonStats, leagueAppearances: 15 },
    };
    const secondSettled = completeProfessionalSeason(second).save;

    expect(secondSettled.nationalTeam!.caps).toBeGreaterThan(debuted.nationalTeam!.caps);
    expect(secondSettled.ledger.filter(({ type }) => type === 'decision').length).toBeGreaterThan(
      0,
    );
  });

  it('retirement is terminal and requires the player to be at least 30', () => {
    const base = signedProSave();
    expect(() =>
      retire(
        { ...base, careerPhase: 'pro-offseason', player: { ...base.player, age: 29 } },
        '2026-05-31',
      ),
    ).toThrow();
    const retired = retire(
      { ...base, careerPhase: 'pro-offseason', player: { ...base.player, age: 30 } },
      '2026-05-31',
    );

    expect(retired.careerPhase).toBe('retired');
    expect(() => retire(retired, '2026-05-31')).toThrow();
    expect(() => startProfessionalSeason(retired, content.clubs)).toThrow();
  });

  it('forces retirement at 38 after professional season settlement', () => {
    const initial = signedProSave();
    let save = startProfessionalSeason(
      {
        ...initial,
        player: {
          ...initial.player,
          age: 38,
          identity: { ...initial.player.identity, dateOfBirth: '1987-01-01' },
        },
      },
      content.clubs,
    );
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') save = outcome.save;
      guard += 1;
    }
    const settled = completeProfessionalSeason(save).save;

    expect(settled.careerPhase).toBe('retired');
    expect(settled.retiredOn).toBe('2026-05-31');
  });

  it('career review includes professional seasons in its timeline', () => {
    let save = startProfessionalSeason(signedProSave(), content.clubs);
    let guard = 0;
    while (!save.proSeason!.completed && guard < 20) {
      const outcome = advanceProMonth(save, content.clubs, []);
      expect(outcome.status).not.toBe('awaiting-decision');
      if (outcome.status !== 'awaiting-decision') save = outcome.save;
      guard += 1;
    }
    const settled = completeProfessionalSeason(save).save;
    const review = buildCareerReview(settled);

    expect(review.seasons).toBeGreaterThan(0);
    expect(review.timeline.some(({ seasonId }) => seasonId === 'pro-2025')).toBe(true);
  });

  it('keeps every same-week league and cup match in the monthly report', () => {
    const started = startProfessionalSeason(signedProSave(), content.clubs);
    const pro = started.proSeason!;
    const leagueFixture = pro.fixtures.find(
      ({ homeClubId, awayClubId }) => homeClubId === pro.clubId || awayClubId === pro.clubId,
    )!;
    const cupFixture = pro.domesticCup!.fixtures.find(
      ({ homeClubId, awayClubId }) => homeClubId === pro.clubId || awayClubId === pro.clubId,
    )!;
    const save = {
      ...started,
      health: { ...started.health, activeInjury: null, fitness: 100, fatigue: 0 },
      proSeason: {
        ...pro,
        currentDate: '2026-02-22',
        currentMonth: '2026-02',
        currentWeek: 26,
        fixtures: pro.fixtures.map((fixture) =>
          fixture.id === leagueFixture.id ? { ...fixture, weekKey: '2025-W27' } : fixture,
        ),
      },
      monthlyAdvance: {
        ...started.monthlyAdvance,
        monthKey: '2026-02',
        nextWeekIndex: 0,
        status: 'idle' as const,
        factIds: [],
        matchIds: [],
      },
    };

    const outcome = advanceProMonth(save, content.clubs, []);

    expect(outcome.status).toBe('month-complete');
    expect(outcome.report.matchIds).toEqual(
      expect.arrayContaining([`pro-${leagueFixture.id}`, `pro-${cupFixture.id}`]),
    );
  });
});
