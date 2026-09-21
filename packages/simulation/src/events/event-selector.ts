import type {
  CareerSaveV2Like,
  ClubProfile,
  EventDefinition,
  StoryState,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export interface PlayerContext {
  age: number;
  reputation: number;
  season: number;
  week: number;
  storyState: StoryState;
}

/** 职业期事件状态切片：青训存档缺失相应字段时按"未留洋/未入选"处理。 */
export interface ProPhaseEventState {
  overseasSince?: string | null;
  nationalTeam?: { capped: boolean; caps: number } | null;
}

/** 事件评估上下文：职业推进方提供当前俱乐部档案，青训推进方可省略。 */
export interface YouthEventFilterContext {
  currentClub?: Pick<ClubProfile, 'id' | 'overseas' | 'overseasRegion' | 'country'>;
}

export function filterEligibleYouthEvents(
  events: EventDefinition[],
  save: CareerSaveV2Like & ProPhaseEventState,
  context: YouthEventFilterContext = {},
): EventDefinition[] {
  const legacyEligible = filterEligibleEvents(events, {
    age: save.player.age,
    reputation: save.player.reputation,
    season: Number(save.season.startDate.slice(0, 4)),
    week: save.season.currentWeek,
    storyState: {
      activeStorylines: save.story.activeStorylines,
      completedStoryIds: save.story.completedStoryIds,
      cooldowns: save.story.cooldownsByEventId,
      pendingDelayedEffects: [],
    },
  });
  return legacyEligible.filter(({ condition }) => {
    if (
      condition.requireFactType &&
      !save.ledger.slice(-8).some(({ type }) => type === condition.requireFactType)
    )
      return false;
    if (
      condition.requireFactText &&
      !save.ledger.slice(-8).some(({ summary }) => summary.includes(condition.requireFactText!))
    )
      return false;
    if (
      condition.requireActiveInjury !== undefined &&
      Boolean(save.health.activeInjury) !== condition.requireActiveInjury
    )
      return false;
    if (
      condition.requirePersonRole &&
      !save.relationships.persons.some(({ role }) => role === condition.requirePersonRole)
    )
      return false;
    if (
      condition.requireRelocation !== undefined &&
      save.season.academyId.startsWith('relocation-') !== condition.requireRelocation
    )
      return false;
    if (condition.position && save.player.identity.primaryPosition !== condition.position)
      return false;
    if (!includesIfDefined(condition.growthBackgrounds, save.player.identity.growthBackground))
      return false;
    if (
      !includesIfDefined(condition.personalityTendencies, save.player.identity.personalityTendency)
    )
      return false;
    if (!includesIfDefined(condition.maturationPaces, save.player.development.maturationPace))
      return false;
    if (!includesIfDefined(condition.playerRoles, save.clubContext.playerRole)) return false;
    if (!includesIfDefined(condition.firstTeamStages, save.clubContext.firstTeamStage))
      return false;
    if (!within(save.season.currentWeek, condition.minWeek, condition.maxWeek)) return false;
    if (!within(save.currentState.morale, condition.minMorale, condition.maxMorale)) return false;
    if (!within(save.currentState.confidence, condition.minConfidence, condition.maxConfidence))
      return false;
    if (!within(save.health.fatigue, condition.minFatigue, condition.maxFatigue)) return false;
    if (
      !within(
        save.clubContext.coachEvaluation,
        condition.minCoachEvaluation,
        condition.maxCoachEvaluation,
      )
    )
      return false;
    if (!within(save.player.development.professionalism, condition.minProfessionalism, undefined))
      return false;
    if (!within(save.player.development.stability, condition.minStability, undefined)) return false;
    if (
      condition.requireOverseas !== undefined &&
      Boolean(save.overseasSince) !== condition.requireOverseas
    )
      return false;
    if (condition.overseasRegions && condition.overseasRegions.length > 0) {
      const region = save.overseasSince ? context.currentClub?.overseasRegion : undefined;
      if (!region || !condition.overseasRegions.includes(region)) return false;
    }
    if (condition.requireCountry) {
      const country = save.overseasSince ? context.currentClub?.country : undefined;
      if (country !== condition.requireCountry) return false;
    }
    if (
      condition.requireNationalTeam !== undefined &&
      Boolean(save.nationalTeam?.capped) !== condition.requireNationalTeam
    )
      return false;
    if (condition.minCaps !== undefined && (save.nationalTeam?.caps ?? 0) < condition.minCaps)
      return false;
    return true;
  });
}

/**
 * 筛选符合条件的候选事件
 * 依次检查：年龄、声望、冷却期、故事线互斥、前置故事线
 */
export function filterEligibleEvents(
  events: EventDefinition[],
  context: PlayerContext,
): EventDefinition[] {
  return events.filter((event) => {
    const c = event.condition;

    if (c.minAge !== undefined && context.age < c.minAge) return false;
    if (c.maxAge !== undefined && context.age > c.maxAge) return false;
    if (c.minSeason !== undefined && context.season < c.minSeason) return false;
    if (c.minReputation !== undefined && context.reputation < c.minReputation) return false;
    if (c.maxReputation !== undefined && context.reputation > c.maxReputation) return false;

    // 冷却期检查
    const cooldown = context.storyState.cooldowns[event.id];
    if (cooldown !== undefined && cooldown > 0) return false;

    // 故事线互斥：该事件要求排除某个已完成的故事线
    if (c.excludeStoryId && context.storyState.completedStoryIds.includes(c.excludeStoryId))
      return false;

    // 需要前置故事线
    if (c.requireStoryId && !context.storyState.completedStoryIds.includes(c.requireStoryId))
      return false;

    return true;
  });
}

/**
 * 从合法事件中按稀有度加权选择一个
 * 稀有度权重：common=50, uncommon=30, rare=15, legendary=5
 */
export function selectEvent(
  eligibleEvents: EventDefinition[],
  rng: SeededRandomSource,
): EventDefinition | undefined {
  if (eligibleEvents.length === 0) return undefined;

  const rarityWeights: Record<string, number> = {
    common: 50,
    uncommon: 30,
    rare: 15,
    legendary: 5,
  };

  const weights = eligibleEvents.map((e) => rarityWeights[e.rarity] ?? 10);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = rng.next() * totalWeight;
  for (let i = 0; i < eligibleEvents.length; i++) {
    random -= weights[i]!;
    if (random <= 0) return eligibleEvents[i]!;
  }

  return eligibleEvents[eligibleEvents.length - 1];
}
const within = (value: number, min?: number, max?: number): boolean =>
  (min === undefined || value >= min) && (max === undefined || value <= max);

const includesIfDefined = <T>(values: readonly T[] | undefined, value: T): boolean =>
  values === undefined || values.includes(value);

const BACKGROUND_THEME_BONUS: Record<string, Partial<Record<string, number>>> = {
  academy: { training: 1.25, relationships: 1.15 },
  school: { 'off-pitch': 1.35, match: 1.1 },
  community: { 'off-pitch': 1.25, relationships: 1.15 },
  'late-bloomer': { training: 1.2, trajectory: 1.25 },
};

const PERSONALITY_THEME_BONUS: Record<string, Partial<Record<string, number>>> = {
  ambitious: { match: 1.2, trajectory: 1.2 },
  composed: { health: 1.15 },
  disciplined: { training: 1.25 },
  expressive: { relationships: 1.2, 'off-pitch': 1.15 },
};

export const calculateYouthEventWeight = (
  event: EventDefinition,
  save: CareerSaveV2Like,
): number => {
  const theme = event.theme ?? 'off-pitch';
  let weight = event.baseWeight ?? 20;
  weight *= BACKGROUND_THEME_BONUS[save.player.identity.growthBackground]?.[theme] ?? 1;
  weight *= PERSONALITY_THEME_BONUS[save.player.identity.personalityTendency]?.[theme] ?? 1;

  if (save.health.fatigue >= 60 && theme === 'health') weight *= 1.35;
  if (save.currentState.morale <= 35 && (theme === 'health' || theme === 'off-pitch'))
    weight *= 1.2;
  if (save.clubContext.coachEvaluation >= 65 && (theme === 'match' || theme === 'trajectory'))
    weight *= 1.15;

  const themeCooldown = save.story.themeCooldownsByTheme?.[theme] ?? 0;
  weight *= themeCooldown > 0 ? 0.45 : 1.05;
  return Math.min(200, Math.max(1, Math.round(weight)));
};

export const selectYouthEvent = (
  eligibleEvents: EventDefinition[],
  save: CareerSaveV2Like,
  rng: SeededRandomSource,
): EventDefinition | undefined => {
  if (eligibleEvents.length === 0) return undefined;
  const rarityFactors = { common: 1, uncommon: 0.7, rare: 0.35, legendary: 0.12 };
  const weights = eligibleEvents.map(
    (event) => calculateYouthEventWeight(event, save) * rarityFactors[event.rarity],
  );
  return rng.pickWeighted(eligibleEvents, weights);
};
