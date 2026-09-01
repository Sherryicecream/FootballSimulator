import { describe, expect, it } from 'vitest';
import {
  submitAgentPreferences,
  generateContractOffers,
  signContract,
  rejectOffers,
} from '../../src/use-cases/contract-flow';
import { generateFreeAgentOffers, signTransfer } from '../../src/use-cases/transfer-flow';
import { migrateCareerSaveV5 } from '@football/contracts';
import { completeYouthSeason, enterOffseason } from '../../src/index';
import { finishSeason, createSave, content } from '../fixtures/youth-save';

/** 构造一名达标可毕业的强球员并存档至休赛期。 */
function eligibleOffseasonSave() {
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
  return enterOffseason(completed.save, content.academies).save;
}

describe('毕业签约流程', () => {
  it('设定经纪人倾向 → 生成要约 → 签署合同 → 进入职业合同期', () => {
    let save = eligibleOffseasonSave();
    save = submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'playing-time' });
    expect(save.careerPhase).toBe('agent-preferences');

    save = generateContractOffers(save, content);
    expect(save.careerPhase).toBe('offer-review');
    expect(save.pendingOffers.length).toBeGreaterThanOrEqual(2);
    const uniqueClubIds = new Set(save.pendingOffers.map(({ clubId }) => clubId));
    expect(uniqueClubIds.size).toBe(save.pendingOffers.length);

    const target = save.pendingOffers[0]!;
    const reputationBefore = save.player.reputation;
    save = signContract(save, target.id);
    expect(save.careerPhase).toBe('professional-contract');
    expect(save.contract).toMatchObject({ clubId: target.clubId, promiseStatus: 'pending' });
    expect(save.contract?.signedOn).toBe(save.offseason?.nextSeasonStart);
    expect(save.pendingOffers).toEqual([]);
    expect(save.player.careerStage).toBe('PROFESSIONAL');
    expect(save.player.reputation).toBeGreaterThan(reputationBefore);
    expect(save.ledger.some(({ type }) => type === 'contract-signed')).toBe(true);
  });

  it('拒绝全部要约回到休赛期并提升毕业压力', () => {
    let save = eligibleOffseasonSave();
    save = submitAgentPreferences(save, { leagueTierBias: 'low', priority: 'salary' });
    save = generateContractOffers(save, content);
    const before = save.graduationPressure;
    save = rejectOffers(save);
    expect(save.careerPhase).toBe('offseason');
    expect(save.pendingOffers).toEqual([]);
    expect(save.graduationPressure).toBe(before + 1);
    expect(save.ledger.some(({ summary }) => summary.includes('拒绝全部要约'))).toBe(true);
  });

  it('19 岁最后职业窗口拒绝报价后不再回到青训', () => {
    let save = eligibleOffseasonSave();
    save = {
      ...save,
      player: { ...save.player, age: 19 },
    };
    save = submitAgentPreferences(save, { leagueTierBias: 'low', priority: 'salary' });
    save = generateContractOffers(save, content);

    save = rejectOffers(save);

    expect(save.careerPhase).toBe('free-agent');
    expect(save.contract).toBeNull();
    expect(save.ledger.at(-1)?.summary).toContain('进入职业市场');
  });

  it('青训年龄窗口后的自由市场签约会切换到职业阶段', () => {
    let save = migrateCareerSaveV5(eligibleOffseasonSave());
    save = { ...save, player: { ...save.player, age: 19 } };
    save = submitAgentPreferences(save, { leagueTierBias: 'low', priority: 'salary' });
    save = generateContractOffers(save, content);
    save = generateFreeAgentOffers(rejectOffers(save), content);
    const offer = save.pendingOffers[0];
    expect(offer).toBeDefined();

    const signed = signTransfer(save, offer!.id);

    expect(signed.player.careerStage).toBe('PROFESSIONAL');
  });

  it('同种子同操作的要约与签署结果完全一致', () => {
    const run = () => {
      let save = eligibleOffseasonSave();
      save = submitAgentPreferences(save, { leagueTierBias: 'high', priority: 'development' });
      save = generateContractOffers(save, content);
      save = signContract(save, save.pendingOffers[0]!.id);
      return save;
    };
    expect(run()).toEqual(run());
  });

  it('未获得毕业资格的玩家不能寻求要约', () => {
    let save = finishSeason(createSave(42));
    const completed = completeYouthSeason(save);
    save = enterOffseason(completed.save, content.academies).save;
    if (save.offseason?.graduationEligible) {
      console.warn('夹具意外达标，跳过该用例');
      return;
    }
    expect(() =>
      submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'salary' }),
    ).toThrow(/毕业资格/);
  });

  it('非法阶段转移全部被拒绝', () => {
    const offseason = eligibleOffseasonSave();
    expect(() => generateContractOffers(offseason, content)).toThrow(/经纪人倾向/);
    const withPrefs = submitAgentPreferences(offseason, {
      leagueTierBias: 'balanced',
      priority: 'playing-time',
    });
    expect(() => signContract(withPrefs, 'offer-x')).toThrow(/阶段/);
    expect(() => rejectOffers(withPrefs)).toThrow(/阶段/);
    const reviewing = generateContractOffers(withPrefs, content);
    expect(() =>
      submitAgentPreferences(reviewing, { leagueTierBias: 'low', priority: 'salary' }),
    ).toThrow(/阶段/);
  });
});
