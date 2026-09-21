import type {
  CareerSaveV5Like,
  ClubProfile,
  ContractOfferV3,
  Country,
  YouthContentBundle,
  WorldClubPulse,
} from '@football/contracts';
import { inferLegacyClubCountry } from '@football/contracts';
import { generateOffers, type MarketPerformanceSnapshot } from './offer-generation';
import type { SeededRandomSource } from '../randomness';
import { computeCountryAppeal } from '../transfer/cross-country-transfer';

export type TransferMarketKind = ContractOfferV3['offerKind'];

export const selectOverseasMarketRepresentatives = (
  clubs: readonly ClubProfile[],
  perCountry: number,
): ClubProfile[] => {
  if (perCountry <= 0) return [];

  const byCountry = new Map<string, ClubProfile[]>();
  for (const club of clubs) {
    const key = club.country ?? club.overseasRegion ?? 'legacy';
    const countryClubs = byCountry.get(key) ?? [];
    countryClubs.push(club);
    byCountry.set(key, countryClubs);
  }

  return [...byCountry.values()].flatMap((countryClubs) => {
    const targetCount = Math.min(perCountry, countryClubs.length);
    const byTier = new Map<number, ClubProfile[]>();
    for (const club of countryClubs) {
      const tierClubs = byTier.get(club.tier) ?? [];
      tierClubs.push(club);
      byTier.set(club.tier, tierClubs);
    }
    const tiers = [...byTier.keys()].sort((left, right) => left - right);
    const tierSlots = Array.from(
      { length: targetCount },
      (_, index) => tiers[index % tiers.length]!,
    );
    const selectedByTier = new Map<number, number>();
    const slotsByTier = new Map<number, number>();
    for (const tier of tierSlots) slotsByTier.set(tier, (slotsByTier.get(tier) ?? 0) + 1);

    return tierSlots.map((tier) => {
      const occurrence = selectedByTier.get(tier) ?? 0;
      selectedByTier.set(tier, occurrence + 1);
      const tierClubs = byTier.get(tier)!;
      const tierSlotCount = slotsByTier.get(tier)!;
      const representativeIndex = Math.floor(
        ((occurrence + 0.5) * tierClubs.length) / tierSlotCount,
      );
      return tierClubs[representativeIndex]!;
    });
  });
};

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
  const overseasPulses =
    (save as CareerSaveV5Like & { worldRegistry?: { clubPulses: readonly WorldClubPulse[] } })
      .worldRegistry?.clubPulses ?? [];
  const pulseByClub = new Map(overseasPulses.map((pulse) => [pulse.clubId, pulse]));
  const worldOrderedOverseas = [...(content.overseasClubs ?? [])].sort(
    (left, right) =>
      (pulseByClub.get(left.id)?.finalRank ?? 99) - (pulseByClub.get(right.id)?.finalRank ?? 99) ||
      left.id.localeCompare(right.id),
  );
  const overseasRepresentatives = overseasEligible
    ? selectOverseasMarketRepresentatives(
        overseasPulses.length > 0 ? worldOrderedOverseas : (content.overseasClubs ?? []),
        3,
      )
    : [];
  const pool = [...content.clubs, ...overseasRepresentatives];
  const playerCountry = save.player.identity.country ?? 'china';
  const allKnownClubs = [...content.clubs, ...(content.overseasClubs ?? [])];
  const currentClubId = save.contract?.clubId ?? save.clubHistory.at(-1)?.clubId;
  const currentClub = currentClubId
    ? allKnownClubs.find(({ id }) => id === currentClubId)
    : undefined;
  const currentCountry = currentClub ? inferLegacyClubCountry(currentClub) : playerCountry;
  const adapted = save.story.completedStoryIds.includes('cross-country-adapted');
  const languageBarrier = currentCountry !== playerCountry && !adapted;

  const marketOptions = {
    allowFallback: false,
    ceilingAdjustment,
    offerKind: kind,
    performance: performance ?? save.seasonStats,
    excludeClubIds: excludeClubIds.filter((clubId): clubId is string => clubId != null),
    interestMultiplier: (club: ClubProfile) =>
      computeCountryAppeal(inferLegacyClubCountry(club), playerCountry, languageBarrier) / 100,
  };
  const offers = generateOffers(save, pool, prefs, rng, marketOptions);
  if (!overseasEligible || overseasRepresentatives.length === 0) {
    return offers;
  }

  // 国内候选数量远大于海外代表时，按固定种子轮换一个国家的曝光槽；
  // 海外候选仍要通过能力天花板，且只降低入池门槛，不改变国家吸引力折扣。
  // 这样欧洲国家不会因中国球员的亚洲吸引力加成而在所有报价中消失。
  const overseasCountries = [
    ...new Set(overseasRepresentatives.map((club) => inferLegacyClubCountry(club))),
  ].sort() as Country[];
  const exposureCountry =
    overseasCountries[Math.abs(save.randomState.seed) % overseasCountries.length]!;
  const exposureClubs = overseasRepresentatives.filter(
    (club) => inferLegacyClubCountry(club) === exposureCountry,
  );
  const exposureOffers = generateOffers(save, exposureClubs, prefs, rng, {
    ...marketOptions,
    minimumInterest: 0.2,
  });
  const overseasOffer = exposureOffers[0];
  if (!overseasOffer || rng.next() >= 0.25) return offers;
  return [overseasOffer, ...offers.filter(({ clubId }) => clubId !== overseasOffer.clubId)].slice(
    0,
    4,
  );
};
