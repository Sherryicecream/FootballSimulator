import type {
  CareerLedgerEntryV2,
  CareerSaveV5Like,
  YouthContentBundle,
} from '@football/contracts';
import { generateTransferOffers } from '@football/simulation';
import type { SeededRandomSource } from '@football/simulation';

const currentDateOf = (save: CareerSaveV5Like): string =>
  save.proSeason?.endDate ?? save.contract?.signedOn ?? '';

/** 自由球员转会要约（设计 §5）：市场降温随自由球员季数递增。 */
export const generateFreeAgentOffers = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
  rng: SeededRandomSource,
): CareerSaveV5Like => {
  if (save.careerPhase !== 'free-agent') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能生成转会要约`);
  }
  const offers = generateTransferOffers(save, content, rng);
  const fact: CareerLedgerEntryV2 = {
    id: `transfer-offers-${currentDateOf(save)}`,
    weekKey: `${currentDateOf(save).slice(0, 4)}-W30`,
    type: 'decision',
    summary: offers.length > 0 ? `收到 ${offers.length} 份转会要约` : '转会市场冷淡，没有收到要约',
    participantIds: [],
  };
  return {
    ...save,
    pendingOffers: offers,
    freeAgentSeasons: save.freeAgentSeasons + 1,
    ledger: [...save.ledger, fact],
  };
};

/** 签约转会：新合同写入，旧俱乐部履历收口，留洋标记更新。 */
export const signTransfer = (save: CareerSaveV5Like, offerId: string): CareerSaveV5Like => {
  if (save.careerPhase !== 'free-agent') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能签署转会`);
  }
  const offer = save.pendingOffers.find(({ id }) => id === offerId);
  if (!offer) throw new Error(`要约不存在或已失效：${offerId}`);
  const signedOn = currentDateOf(save);

  const clubHistory = save.clubHistory.map((entry) =>
    entry.to === null ? { ...entry, to: signedOn } : entry,
  );
  const fact: CareerLedgerEntryV2 = {
    id: `transfer-signed-${offer.clubId}-${signedOn}`,
    weekKey: `${signedOn.slice(0, 4)}-W30`,
    type: 'transfer-signed',
    summary: `自由转会加盟${offer.clubName}（层级 ${offer.clubTier}，${offer.contractYears} 年${offer.promise.kind === 'playing-time' ? `，出场承诺 ${Math.round(offer.promise.minimumShare * 100)}%` : ''}）`,
    participantIds: [],
  };

  return {
    ...save,
    careerPhase: 'professional-contract',
    contract: {
      ...offer,
      signedOn,
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    pendingOffers: [],
    overseasSince: offer.overseas ? signedOn : null,
    freeAgentSeasons: 0,
    clubHistory,
    ledger: [...save.ledger, fact],
  };
};

/** 宣布退役（30+ 可选）：永久性终态，需界面二次确认后才调用。 */
export const retire = (save: CareerSaveV5Like, retiredOn: string): CareerSaveV5Like => {
  if (save.careerPhase !== 'pro-offseason' && save.careerPhase !== 'free-agent') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能退役`);
  }
  if (save.player.age < 30) throw new Error('未满 30 岁不能宣布退役');
  const clubHistory = save.clubHistory.map((entry) =>
    entry.to === null ? { ...entry, to: retiredOn } : entry,
  );
  const fact: CareerLedgerEntryV2 = {
    id: `retirement-${retiredOn}`,
    weekKey: `${retiredOn.slice(0, 4)}-W30`,
    type: 'retirement',
    summary: `正式宣布退役，结束球员生涯`,
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'retired',
    retiredOn,
    pendingOffers: [],
    clubHistory,
    ledger: [...save.ledger, fact],
  };
};
