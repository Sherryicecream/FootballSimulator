import { describe, expect, it } from 'vitest';
import { migrateCareerSaveV5 } from '@football/contracts';
import {
  requestCareerMarket,
  returnFromLoan,
  signMarketOffer,
} from '../../src/use-cases/transfer-flow';
import { startProfessionalSeason } from '../../src/use-cases/pro-flow';
import {
  submitAgentPreferences,
  generateContractOffers,
  signContract,
} from '../../src/use-cases/contract-flow';
import { completeYouthSeason, enterOffseason } from '../../src/index';
import { content, createSave, finishSeason } from '../fixtures/youth-save';

function professionalOffseasonSave() {
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
  save = signContract(save, save.pendingOffers[0]!.id);
  const v5 = migrateCareerSaveV5(save);
  const started = startProfessionalSeason(v5, content.clubs);
  return {
    ...started,
    careerPhase: 'pro-offseason' as const,
    proPhase: 'settled' as const,
    proSeason: {
      ...started.proSeason!,
      currentDate: started.proSeason!.endDate,
      currentMonth: started.proSeason!.endDate.slice(0, 7),
      currentWeek: 52,
      completed: true,
    },
    proSeasonStats: {
      ...started.proSeasonStats,
      leagueAppearances: 20,
      goals: 6,
      assists: 3,
      minutes: 1400,
      ratingSum: 145,
      ratingCount: 20,
    },
  };
}

describe('职业转会与租借市场', () => {
  it('职业休赛期市场会生成带类型的永久报价并记录窗口事实', () => {
    const market = requestCareerMarket(professionalOffseasonSave(), content, 'permanent');

    expect(market.pendingOffers.length).toBeGreaterThan(0);
    expect(market.pendingOffers.every(({ offerKind }) => offerKind === 'permanent')).toBe(true);
    expect(market.ledger.at(-1)).toMatchObject({ type: 'market-window' });
  });
  it('签署永久报价会替换合同并关闭母队履历', () => {
    const save = professionalOffseasonSave();
    const withHistory = {
      ...save,
      clubHistory: [
        {
          clubId: save.contract!.clubId,
          clubName: save.contract!.clubName,
          from: save.contract!.signedOn,
          to: null,
          seasons: 1,
          appearances: 20,
          goals: 6,
        },
      ],
    };
    const market = requestCareerMarket(withHistory, content, 'permanent');
    const offer = market.pendingOffers[0]!;
    const signed = signMarketOffer(market, offer.id);

    expect(signed.contract).toMatchObject({
      clubId: offer.clubId,
      offerKind: 'permanent',
      promiseStatus: 'pending',
    });
    expect(signed.clubHistory[0]?.to).toBe(save.proSeason!.endDate);
    expect(signed.ledger.at(-1)?.type).toBe('transfer-signed');
  });

  it('签署租借报价会保留母队合同并建立下一赛季租借状态', () => {
    const market = requestCareerMarket(professionalOffseasonSave(), content, 'loan');
    const offer = market.pendingOffers[0]!;
    const parentClubId = market.contract!.clubId;
    const signed = signMarketOffer(market, offer.id);

    expect(offer.offerKind).toBe('loan');
    expect(signed.contract?.clubId).toBe(parentClubId);
    expect(signed.activeLoan).toMatchObject({
      parentClubId,
      loanClubId: offer.clubId,
      seasonId: `pro-${Number(market.proSeason!.startDate.slice(0, 4)) + 1}`,
    });
    expect(signed.proSeason).toBeNull();
    expect(signed.careerPhase).toBe('professional-contract');
  });

  it('完成租借赛季后可以回归母队且重复结算不会重复写入履历', () => {
    const market = requestCareerMarket(professionalOffseasonSave(), content, 'loan');
    const signed = signMarketOffer(market, market.pendingOffers[0]!.id);
    const activeLoan = signed.activeLoan!;
    const started = startProfessionalSeason(signed, content.clubs);
    const completed = {
      ...started,
      proSeason: {
        ...started.proSeason!,
        id: activeLoan.seasonId,
        clubId: activeLoan.loanClubId,
        currentDate: activeLoan.returnsOn,
        currentMonth: activeLoan.returnsOn.slice(0, 7),
        currentWeek: 52,
        completed: true,
      },
      proPhase: 'settled' as const,
    };
    const entry = {
      seasonId: activeLoan.seasonId,
      parentClubId: activeLoan.parentClubId,
      parentClubName: activeLoan.parentClubName,
      loanClubId: activeLoan.loanClubId,
      loanClubName: activeLoan.loanClubName,
      from: activeLoan.startedOn,
      to: activeLoan.returnsOn,
      appearances: 12,
      goals: 4,
      assists: 2,
      minutes: 900,
      competitionTier: activeLoan.loanClubTier,
      outcomeEvidenceId: `pro-season-${activeLoan.seasonId}`,
    };

    const returned = returnFromLoan(completed, entry);
    expect(returned.activeLoan).toBeNull();
    expect(returned.loanHistory).toHaveLength(1);
    expect(returned.careerPhase).toBe('pro-offseason');
    expect(returnFromLoan(returned, entry)).toEqual(returned);
  });

  it('只允许职业休赛期处理市场，过期报价不能签署', () => {
    const save = professionalOffseasonSave();
    expect(() =>
      requestCareerMarket({ ...save, careerPhase: 'professional-contract' }, content, 'loan'),
    ).toThrow(/非法阶段转移|pro-offseason/);

    const market = requestCareerMarket(save, content, 'permanent');
    expect(() => signMarketOffer({ ...market, pendingOffers: [] }, 'stale-offer')).toThrow(
      /要约不存在|失效/,
    );
  });
});
