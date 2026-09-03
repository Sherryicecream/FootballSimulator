import type { CareerSaveV5Like, ContractOfferV3, YouthContentBundle } from '@football/contracts';
import { generateOffers, type MarketPerformanceSnapshot } from './offer-generation';
import type { SeededRandomSource } from '../randomness';

export type TransferMarketKind = ContractOfferV3['offerKind'];

const defaultPreferences = {
  leagueTierBias: 'balanced' as const,
  priority: 'playing-time' as const,
};

export const generateProfessionalMarketOffers = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
  rng: SeededRandomSource,
  kind: TransferMarketKind,
): ContractOfferV3[] => {
  const proStats = save.proSeasonStats;
  const performance: MarketPerformanceSnapshot = {
    appearances: proStats.leagueAppearances + proStats.cupAppearances,
    goals: proStats.goals + proStats.cupGoals,
    assists: proStats.assists + proStats.cupAssists,
    ratingSum: proStats.ratingSum,
    ratingCount: proStats.ratingCount,
  };

  return generateMarketOffers(save, content, rng, kind, performance, [save.contract?.clubId]);
};

/**
 * 自由球员转会要约（设计 §5）：复用兴趣评分与层级天花板；
 * 适应力 ≥55 才会收到海外要约；无保底要约（市场冷淡即无果）；
 * 连续两个休赛期无签约后能力天花板 −1（市场降温）。
 */
export const generateTransferOffers = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
  rng: SeededRandomSource,
): ContractOfferV3[] => {
  const ceilingAdjustment = save.freeAgentSeasons >= 1 ? -1 : 0;
  return generateMarketOffers(save, content, rng, 'permanent', undefined, [], ceilingAdjustment);
};

const generateMarketOffers = (
  save: CareerSaveV5Like,
  content: YouthContentBundle,
  rng: SeededRandomSource,
  kind: TransferMarketKind,
  performance: MarketPerformanceSnapshot | undefined,
  excludeClubIds: readonly (string | undefined)[],
  ceilingAdjustment = save.freeAgentSeasons >= 1 ? -1 : 0,
): ContractOfferV3[] => {
  const prefs = save.agentPreferences ?? defaultPreferences;
  const overseasEligible = save.player.development.adaptability >= 55;
  const pool = [...content.clubs, ...(overseasEligible ? (content.overseasClubs ?? []) : [])];

  return generateOffers(save, pool, prefs, rng, {
    allowFallback: false,
    ceilingAdjustment,
    offerKind: kind,
    performance: performance ?? save.seasonStats,
    excludeClubIds: excludeClubIds.filter((clubId): clubId is string => clubId != null),
  });
};
