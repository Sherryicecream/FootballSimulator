import {
  AgentPreferencesSchema,
  type AgentPreferences,
  type CareerSaveV3Like,
  type CareerSaveV6Like,
  type YouthContentBundle,
} from '@football/contracts';
import {
  createSeededRandomSource,
  generateOffers,
  applyReputationGain,
  leagueTierFactor,
  stampCareerFact,
} from '@football/simulation';
import { isFinalYouthSeason } from '@football/simulation';

export const submitAgentPreferences = <S extends CareerSaveV3Like>(
  save: S,
  preferences: AgentPreferences,
): S => {
  if (save.careerPhase !== 'offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能设定经纪人倾向`);
  }
  if (!save.offseason?.graduationEligible) {
    throw new Error('尚未获得毕业资格，不能寻求职业合同');
  }
  const prefs = AgentPreferencesSchema.parse(preferences);
  return {
    ...save,
    careerPhase: 'agent-preferences',
    agentPreferences: prefs,
  };
};

export const generateContractOffers = <S extends CareerSaveV3Like>(
  save: S,
  content: YouthContentBundle,
): S => {
  if (save.careerPhase !== 'agent-preferences' || !save.agentPreferences) {
    throw new Error('非法阶段转移：请先设定经纪人倾向');
  }
  if (content.clubs.length < 2) throw new Error('俱乐部内容不足，无法生成要约');
  const rng = createSeededRandomSource(
    save.randomState.seed + 3300 + save.seasonHistory.length * 7,
  );
  const offers = generateOffers(save, content.clubs, save.agentPreferences, rng);
  if (offers.length < 2) throw new Error('可用要约不足，请留队继续培养');
  return {
    ...save,
    careerPhase: 'offer-review',
    pendingOffers: offers,
  };
};

export const signContract = <S extends CareerSaveV3Like>(save: S, offerId: string): S => {
  if (save.careerPhase !== 'offer-review') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能签署合同`);
  }
  const offer = save.pendingOffers.find(({ id }) => id === offerId);
  if (!offer) throw new Error(`要约不存在或已失效：${offerId}`);
  const signedOn = save.offseason?.nextSeasonStart ?? save.season.endDate;
  const fact = stampCareerFact(
    save as unknown as CareerSaveV6Like,
    {
      id: `contract-signed-${offer.clubId}-${signedOn}`,
      weekKey: `${signedOn.slice(0, 4)}-W01`,
      type: 'contract-signed',
      summary: `签署首份职业合同：${offer.clubName}（${offer.contractYears} 年，角色 ${offer.squadRole}）`,
      participantIds: [],
    },
    {
      seasonId: `pro-${signedOn.slice(0, 4)}`,
      date: signedOn,
      weekIndex: 1,
    },
  );
  return {
    ...save,
    careerPhase: 'professional-contract',
    player: {
      ...save.player,
      careerStage: 'PROFESSIONAL',
      // 首份职业合同带来可见曝光；层级越高，媒体与球探覆盖越广（声望经济 v2）。
      reputation: applyReputationGain(
        save.player.reputation,
        Math.round(Math.max(4, offer.clubTier) * leagueTierFactor(offer.clubTier)),
      ),
    },
    contract: {
      ...offer,
      signedOn,
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    pendingOffers: [],
    ledger: [...save.ledger, fact],
  };
};

export const rejectOffers = <S extends CareerSaveV3Like>(save: S): S => {
  if (save.careerPhase !== 'offer-review') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能拒绝要约`);
  }
  const finalYouthWindow = isFinalYouthSeason(save.player.age);
  const fact = stampCareerFact(save as unknown as CareerSaveV6Like, {
    id: `offers-rejected-${save.offseason?.nextSeasonStart ?? save.season.endDate}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'decision',
    summary: finalYouthWindow
      ? '拒绝全部要约，进入职业市场等待其他机会'
      : '拒绝全部要约，留在青训体系继续培养',
    participantIds: [],
  });
  return {
    ...save,
    careerPhase: finalYouthWindow ? 'free-agent' : 'offseason',
    contract: finalYouthWindow ? null : save.contract,
    pendingOffers: [],
    graduationPressure: Math.min(3, save.graduationPressure + 1),
    ledger: [...save.ledger, fact],
  };
};
