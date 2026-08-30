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
  const overseas = overseasEligible ? content.overseasClubs : [];
  const pool: readonly ClubProfile[] = [...domestic, ...overseas];
  const ceilingAdjustment = save.freeAgentSeasons >= 1 ? -1 : 0;
  return generateOffers(save, pool, prefs, rng, {
    allowFallback: false,
    ceilingAdjustment,
  });
};
