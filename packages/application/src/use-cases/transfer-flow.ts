import type {
  CareerLedgerEntryV2,
  CareerSaveV5Like,
  LoanHistoryEntry,
  YouthContentBundle,
} from '@football/contracts';
import { LoanHistoryEntrySchema } from '@football/contracts';
import {
  createSeededRandomSource,
  generateProfessionalMarketOffers,
  generateTransferOffers,
} from '@football/simulation';
import type { TransferMarketKind } from '@football/simulation';

const currentDateOf = (save: CareerSaveV5Like): string =>
  save.proSeason?.endDate ??
  save.contract?.signedOn ??
  save.offseason?.nextSeasonStart ??
  save.season.endDate;

const nextProfessionalSeasonStartOf = (save: CareerSaveV5Like): string => {
  const year = save.proSeason
    ? Number(save.proSeason.startDate.slice(0, 4)) + 1
    : Number((save.contract?.signedOn ?? currentDateOf(save)).slice(0, 4));
  if (!Number.isFinite(year) || year <= 0) throw new Error('无法确定下一职业赛季年份');
  return `${year}-08-01`;
};

const nextProfessionalSeasonIdOf = (save: CareerSaveV5Like): string =>
  `pro-${nextProfessionalSeasonStartOf(save).slice(0, 4)}`;

const marketWindowFact = (
  save: CareerSaveV5Like,
  kind: TransferMarketKind,
  offerCount: number,
): CareerLedgerEntryV2 => {
  const windowId = save.proSeason?.id ?? nextProfessionalSeasonIdOf(save);
  const year = currentDateOf(save).slice(0, 4);
  return {
    id: `market-window-${windowId}-${kind}`,
    weekKey: `${year}-W30`,
    type: 'market-window',
    summary:
      offerCount > 0
        ? `职业市场开放：收到 ${offerCount} 份${kind === 'loan' ? '租借' : '永久转会'}报价`
        : '职业市场开放：暂时没有合适报价',
    participantIds: [],
  };
};
/** 职业转会/租借市场请求：仅在职业休赛期生成并保留当前窗口报价。 */
export const requestCareerMarket = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
  kind: TransferMarketKind,
): CareerSaveV5Like => {
  if (save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能请求职业市场`);
  }
  const year = Number(nextProfessionalSeasonStartOf(save).slice(0, 4));
  const rng = createSeededRandomSource(
    save.randomState.seed + 8200 + year * 29 + (kind === 'loan' ? 17 : 0),
  );
  const offers = generateProfessionalMarketOffers(save, content, rng, kind);
  const fact = marketWindowFact(save, kind, offers.length);
  const ledger = save.ledger.filter(({ id }) => id !== fact.id);
  return {
    ...save,
    pendingOffers: offers,
    ledger: [...ledger, fact],
  };
};

/** 自由球员转会要约（设计 §5）：市场降温随自由球员季数递增。 */
export const generateFreeAgentOffers = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
): CareerSaveV5Like => {
  const rng = createSeededRandomSource(save.randomState.seed + 4100 + save.freeAgentSeasons * 37);
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
    player: {
      ...save.player,
      careerStage: 'PROFESSIONAL',
    },
    contract: {
      ...offer,
      signedOn,
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    proSeason: null,
    pendingOffers: [],
    overseasSince: offer.overseas ? signedOn : null,
    freeAgentSeasons: 0,
    clubHistory,
    ledger: [...save.ledger, fact],
  };
};
type CareerOffer = CareerSaveV5Like['pendingOffers'][number];

const signPermanentMarketOffer = (
  save: CareerSaveV5Like,
  offer: CareerOffer,
  summary: string,
  factId: string,
): CareerSaveV5Like => {
  const signedOn = currentDateOf(save);
  const normalizedOffer = { ...offer, offerKind: offer.offerKind ?? 'permanent' };
  const clubHistory = save.clubHistory.map((entry) =>
    entry.to === null ? { ...entry, to: signedOn } : entry,
  );
  const fact: CareerLedgerEntryV2 = {
    id: factId,
    weekKey: `${signedOn.slice(0, 4)}-W30`,
    type: 'transfer-signed',
    summary,
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'professional-contract',
    player: {
      ...save.player,
      careerStage: 'PROFESSIONAL',
    },
    contract: {
      ...normalizedOffer,
      signedOn,
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    proSeason: null,
    pendingOffers: [],
    activeLoan: null,
    overseasSince: normalizedOffer.overseas ? signedOn : null,
    freeAgentSeasons: 0,
    clubHistory,
    ledger: [...save.ledger, fact],
  };
};

/** 签署职业市场报价：永久转会替换合同，租借保留母队合同。 */
export const signMarketOffer = (save: CareerSaveV5Like, offerId: string): CareerSaveV5Like => {
  if (save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能签署职业市场报价`);
  }
  const offer = save.pendingOffers.find(({ id }) => id === offerId);
  if (!offer) throw new Error(`要约不存在或已失效：${offerId}`);
  const offerKind = offer.offerKind ?? 'permanent';
  if (offerKind === 'permanent') {
    const promise =
      offer.promise.kind === 'playing-time'
        ? `，出场承诺 ${Math.round(offer.promise.minimumShare * 100)}%`
        : '';
    return signPermanentMarketOffer(
      save,
      offer,
      `永久转会加盟${offer.clubName}（层级 ${offer.clubTier}，${offer.contractYears} 年${promise}）`,
      `transfer-signed-${offer.clubId}-${currentDateOf(save)}`,
    );
  }
  if (!save.contract) throw new Error('租借报价需要有效的母队合同');
  const startedOn = nextProfessionalSeasonStartOf(save);
  const startYear = Number(startedOn.slice(0, 4));
  const activeLoan = {
    parentClubId: save.contract.clubId,
    parentClubName: save.contract.clubName,
    parentClubTier: save.contract.clubTier,
    loanClubId: offer.clubId,
    loanClubName: offer.clubName,
    loanClubTier: offer.clubTier,
    startedOn,
    returnsOn: `${startYear + 1}-05-31`,
    seasonId: `pro-${startYear}`,
  };
  const fact: CareerLedgerEntryV2 = {
    id: `loan-signed-${offer.clubId}-${activeLoan.seasonId}`,
    weekKey: `${currentDateOf(save).slice(0, 4)}-W30`,
    type: 'transfer-signed',
    summary: `租借加盟${offer.clubName}（层级 ${offer.clubTier}），下赛季结束回归${save.contract.clubName}`,
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'professional-contract',
    player: {
      ...save.player,
      careerStage: 'PROFESSIONAL',
    },
    proSeason: null,
    pendingOffers: [],
    activeLoan,
    ledger: [...save.ledger, fact],
  };
};
/** 租借赛季结算并回归母队；重复提交同一履历保持幂等。 */
export const returnFromLoan = (
  save: CareerSaveV5Like,
  rawEntry: LoanHistoryEntry,
): CareerSaveV5Like => {
  const entry = LoanHistoryEntrySchema.parse(rawEntry);
  if (!save.activeLoan) {
    if (save.loanHistory.some(({ seasonId }) => seasonId === entry.seasonId)) return save;
    throw new Error('当前没有进行中的租借');
  }
  const loan = save.activeLoan;
  if (!save.proSeason || !save.proSeason.completed) {
    throw new Error('租借赛季尚未完成，不能回归母队');
  }
  if (save.proSeason.id !== loan.seasonId || save.proSeason.clubId !== loan.loanClubId) {
    throw new Error('租借赛季与当前参赛俱乐部不一致');
  }
  const sameLoan =
    entry.seasonId === loan.seasonId &&
    entry.parentClubId === loan.parentClubId &&
    entry.loanClubId === loan.loanClubId &&
    entry.from === loan.startedOn &&
    entry.to === loan.returnsOn;
  if (!sameLoan) throw new Error('租借结算履历与当前租借不一致');
  if (save.loanHistory.some(({ seasonId }) => seasonId === entry.seasonId)) {
    return { ...save, activeLoan: null, careerPhase: 'pro-offseason' };
  }
  const fact: CareerLedgerEntryV2 = {
    id: `loan-return-${entry.seasonId}`,
    weekKey: `${entry.to.slice(0, 4)}-W53`,
    type: 'decision',
    summary: `${entry.loanClubName}租借结束，回归母队${entry.parentClubName}`,
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'pro-offseason',
    activeLoan: null,
    loanHistory: [...save.loanHistory, entry],
    proSeason: { ...save.proSeason, nextClubTier: null },
    pendingOffers: [],
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
