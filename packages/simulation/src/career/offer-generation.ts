import type {
  CareerSaveV3Like,
  ClubProfile,
  ContractOfferV3,
  AgentPreferences,
} from '@football/contracts';
import { weightedAbility } from './graduation';
import type { SeededRandomSource } from '../randomness';

/**
 * 首份职业合同要约生成：对每家俱乐部计算兴趣评分（设计 §7.2），
 * 按 interest 排序取 2–4 份；不足 2 份时补充低层级保底要约。
 * 全部输入确定性可复现。
 */
export interface MarketPerformanceSnapshot {
  appearances: number;
  goals: number;
  assists: number;
  ratingSum: number;
  ratingCount: number;
}

export interface GenerateOffersOptions {
  /** 自由球员转会无保底要约 */
  allowFallback?: boolean;
  /** 市场降温：能力天花板调整（负值） */
  ceilingAdjustment?: number;
  offerKind?: ContractOfferV3['offerKind'];
  performance?: MarketPerformanceSnapshot;
  excludeClubIds?: readonly string[];
}

export const generateOffers = (
  save: CareerSaveV3Like,
  clubs: readonly ClubProfile[],
  agentPreferences: AgentPreferences,
  rng: SeededRandomSource,
  options: GenerateOffersOptions = {},
): ContractOfferV3[] => {
  const position = save.player.identity.primaryPosition;
  const ability = weightedAbility(position, save.player.attributes);
  const potential = averagePotential(save);
  const { ratingSum, ratingCount, appearances, goals, assists } =
    options.performance ?? save.seasonStats;
  const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null;
  const performance =
    avgRating != null ? clamp01((avgRating / 10) * 0.7 + Math.min(1, appearances / 20) * 0.3) : 0.4;
  const highlightBonus = goals + assists >= 8 ? 0.05 : 0;

  const excludedClubIds = new Set(options.excludeClubIds ?? []);
  const availableClubs = clubs.filter((club) => !excludedClubIds.has(club.id));
  const scored = availableClubs.map((club) => {
    const fit = fitScore(club, position);
    const ageScore = save.player.age <= 16 ? 0.6 : save.player.age <= 19 ? 0.7 : 0.5;
    const preference = tierPreference(club.tier, agentPreferences.leagueTierBias);
    const noise = (rng.next() - 0.5) * 0.1;
    const interest =
      0.3 * clamp01(ability / 100) +
      0.2 * clamp01(potential / 100) +
      0.15 * clamp01(performance + highlightBonus) +
      0.15 * fit +
      0.1 * ageScore +
      0.1 * preference +
      noise;
    // 能力 → 可签层级天花板：每 10 点能力 +1 档（能力 63 → 5 档）；
    // 位置高度契合时俱乐部愿意冒险上调一档。
    const ceiling =
      Math.floor((ability - 10) / 10) +
      (options.ceilingAdjustment ?? 0) +
      (fit >= 0.8 && rng.next() < 0.5 ? 1 : 0);
    return { club, interest, ability, ceiling };
  });

  // 入池条件：兴趣达标且俱乐部层级不超过能力天花板，形成能力 → 层级的单调映射。
  const ranked = scored
    .filter(({ club, interest, ceiling }) => interest >= 0.45 && club.tier <= ceiling)
    .sort((a, b) => b.interest - a.interest || a.club.id.localeCompare(b.club.id));

  const targetCount = 2 + Math.floor(rng.next() * 3);
  let pool = ranked.slice(0, Math.min(targetCount, ranked.length));
  if (pool.length < 2 && options.allowFallback !== false) {
    // 保底要约优先取层级 ≤4 的俱乐部（低层级保底）；内容包没有低层级俱乐部时取层级最低者。
    const remaining = [...availableClubs]
      .filter((club) => !pool.some(({ club: picked }) => picked.id === club.id))
      .sort((a, b) => a.tier - b.tier);
    const fallback = remaining.find((club) => club.tier <= 4) ?? remaining[0];
    if (fallback) {
      pool = [...pool, { club: fallback, interest: 0.42, ability, ceiling: 0 }];
    }
    if (pool.length < 2) {
      pool = [
        ...pool,
        ...ranked
          .filter(({ club }) => !pool.some(({ club: picked }) => picked.id === club.id))
          .slice(0, 2 - pool.length),
      ];
    }
  }

  return pool.map(({ club, interest, ability: abilityValue }) =>
    buildOffer(
      club,
      interest,
      abilityValue,
      save.player.age,
      agentPreferences,
      options.offerKind ?? 'permanent',
      rng,
    ),
  );
};

const buildOffer = (
  club: ClubProfile,
  interest: number,
  ability: number,
  age: number,
  preferences: AgentPreferences,
  offerKind: ContractOfferV3['offerKind'],
  rng: SeededRandomSource,
): ContractOfferV3 => {
  const contractYears = offerKind === 'loan' ? 1 : interest >= 0.75 ? 3 : interest >= 0.6 ? 2 : 1;
  // 小幅表现浮动（±2%），不会翻转相邻层级之间的薪资单调性。
  const performanceCoefficient = 0.98 + rng.next() * 0.04;
  const overseasBoost = club.overseas ? 1.4 : 1;
  const salaryPerYear = Math.round(
    (club.tier * club.tier * 40 + ability * 120 * performanceCoefficient) * overseasBoost,
  );
  const squadRole = pickSquadRole(interest, age, club);
  const promise = pickPromise(club, preferences, rng);
  return {
    id: `offer-${club.id}`,
    clubId: club.id,
    clubName: club.name,
    clubTier: club.tier,
    salaryPerYear,
    contractYears,
    squadRole,
    offerKind,
    overseas: club.overseas,
    promise,
    releaseClauseNote: club.tier >= 6 ? '附带降级解约条款：球队降级时可按约定条件解约' : '',
  };
};

const pickSquadRole = (
  interest: number,
  age: number,
  club: ClubProfile,
): ContractOfferV3['squadRole'] => {
  if (interest >= 0.8) return 'first-team-rotation';
  if (age <= 17 && interest >= 0.6 && club.youthCycle === 'rebuilding')
    return 'highlighted-prospect';
  if (interest >= 0.62) return 'rotation';
  return 'youth-team';
};

const pickPromise = (
  club: ClubProfile,
  preferences: AgentPreferences,
  rng: SeededRandomSource,
): ContractOfferV3['promise'] => {
  if (preferences.priority === 'playing-time' && club.youthCycle !== 'contending') {
    return {
      kind: 'playing-time',
      minimumShare: club.tier <= 5 ? 0.5 : 0.3,
    };
  }
  if (preferences.priority === 'development' && club.youthCycle === 'rebuilding') {
    return { kind: 'position-guarantee' };
  }
  const roll = rng.next();
  if (roll < 0.4) return { kind: 'none' };
  if (roll < 0.7) return { kind: 'playing-time', minimumShare: 0.3 };
  return { kind: 'position-guarantee' };
};

const fitScore = (club: ClubProfile, position: string): number => {
  const needs = club.positionalNeeds.includes(position);
  const cycleBonus =
    club.youthCycle === 'rebuilding' ? 0.2 : club.youthCycle === 'stable' ? 0.1 : 0;
  return Math.min(1, (needs ? 0.7 : 0.35) + cycleBonus);
};

const tierPreference = (tier: number, bias: AgentPreferences['leagueTierBias']): number => {
  if (bias === 'high') return tier >= 6 ? 1 : tier / 10;
  if (bias === 'low') return tier <= 4 ? 1 : 0.4;
  return 0.6;
};

const averagePotential = (save: CareerSaveV3Like): number => {
  const groups = Object.values(save.player.development.attributePotential);
  const values = groups.flatMap((group) => Object.values(group));
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
