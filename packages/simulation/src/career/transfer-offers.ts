import type {
  CareerSaveV5Like,
  ClubProfile,
  ContractOfferV3,
  YouthContentBundle,
} from '@football/contracts';
import { generateOffers } from './offer-generation';
import type { SeededRandomSource } from '../randomness';

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
  const prefs = save.agentPreferences ?? {
    leagueTierBias: 'balanced' as const,
    priority: 'playing-time' as const,
  };
  const adaptability = save.player.development.adaptability;
  const overseasEligible = adaptability >= 55;
  const domestic = content.clubs;
  const overseas = overseasEligible ? (content.overseasClubs ?? []) : [];
  const pool: readonly ClubProfile[] = [...domestic, ...overseas];
  const ceilingAdjustment = save.freeAgentSeasons >= 1 ? -1 : 0;
  const marketOffers = generateOffers(save, pool, prefs, rng, {
    allowFallback: false,
    ceilingAdjustment,
  });
  if (!overseasEligible || overseas.length === 0) return marketOffers;

  // 留洋不是随机传送：先过适应力门槛，再用一枚独立机会签决定本窗口是否出现海外席位。
  // 这样既保留能力/兴趣筛选，也让可适应球员在多次转会窗口中有可见但非必然的选择。
  const overseasOffers = generateOffers(save, overseas, prefs, rng, {
    allowFallback: false,
    // 海外球探对已通过适应力门槛的球员保留一档发展容错，仍受能力天花板约束。
    ceilingAdjustment: ceilingAdjustment + 1,
  });
  if (overseasOffers.length === 0 || rng.next() >= 0.95) return marketOffers;
  const overseasOffer = overseasOffers[0]!;
  return [
    overseasOffer,
    ...marketOffers.filter(({ clubId }) => clubId !== overseasOffer.clubId).slice(0, 3),
  ];
};
