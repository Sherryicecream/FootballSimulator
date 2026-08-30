import {
  AgentPreferencesSchema,
  type AgentPreferences,
  type CareerLedgerEntryV2,
  type CareerSaveV3,
  type YouthContentBundle,
} from '@football/contracts';
import { createSeededRandomSource, generateOffers } from '@football/simulation';

export const submitAgentPreferences = (
  save: CareerSaveV3,
  preferences: AgentPreferences,
): CareerSaveV3 => {
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

export const generateContractOffers = (
  save: CareerSaveV3,
  content: YouthContentBundle,
): CareerSaveV3 => {
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

export const signContract = (save: CareerSaveV3, offerId: string): CareerSaveV3 => {
  if (save.careerPhase !== 'offer-review') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能签署合同`);
  }
  const offer = save.pendingOffers.find(({ id }) => id === offerId);
  if (!offer) throw new Error(`要约不存在或已失效：${offerId}`);
  const signedOn = save.offseason?.nextSeasonStart ?? save.season.endDate;
  const fact: CareerLedgerEntryV2 = {
    id: `contract-signed-${offer.clubId}-${signedOn}`,
    weekKey: `${signedOn.slice(0, 4)}-W01`,
    type: 'contract-signed',
    summary: `签署首份职业合同：${offer.clubName}（${offer.contractYears} 年，角色 ${offer.squadRole}）`,
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'professional-contract',
    player: { ...save.player, careerStage: 'PROFESSIONAL' },
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

export const rejectOffers = (save: CareerSaveV3): CareerSaveV3 => {
  if (save.careerPhase !== 'offer-review') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能拒绝要约`);
  }
  const fact: CareerLedgerEntryV2 = {
    id: `offers-rejected-${save.offseason?.nextSeasonStart ?? save.season.endDate}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'decision',
    summary: '拒绝全部要约，留在青训体系继续培养',
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'offseason',
    pendingOffers: [],
    graduationPressure: Math.min(3, save.graduationPressure + 1),
    ledger: [...save.ledger, fact],
  };
};
