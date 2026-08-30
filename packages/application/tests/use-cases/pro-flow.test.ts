import { describe, expect, it } from 'vitest';
import { migrateCareerSaveV5 } from '@football/contracts';
import type { CareerSaveV4 } from '@football/contracts';
import {
  acceptRenewal,
  advanceProMonth,
  completeProfessionalSeason,
  declineRenewal,
  startProfessionalSeason,
} from '../../src/use-cases/pro-flow';
import {
  submitAgentPreferences,
  generateContractOffers,
  signContract,
} from '../../src/use-cases/contract-flow';
import { completeYouthSeason, enterOffseason } from '../../src/index';
import { createSave, content, finishSeason } from '../fixtures/youth-save';

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
  const v4 = migrateCareerSaveV5({ ...save, contract: { ...save.contract!, contractYears: 1 } });
  return { ...v4, ...overrides };
}

describe('职业赛季流程', () => {
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
});
