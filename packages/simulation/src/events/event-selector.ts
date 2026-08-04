import type { EventDefinition, StoryState } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export interface PlayerContext {
  age: number;
  reputation: number;
  season: number;
  week: number;
  storyState: StoryState;
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
    if (c.minReputation !== undefined && context.reputation < c.minReputation) return false;
    if (c.maxReputation !== undefined && context.reputation > c.maxReputation) return false;

    // 冷却期检查
    const cooldown = context.storyState.cooldowns[event.id];
    if (cooldown !== undefined && cooldown > 0) return false;

    // 故事线互斥：该事件要求排除某个已完成的故事线
    if (c.excludeStoryId && context.storyState.completedStoryIds.includes(c.excludeStoryId)) return false;

    // 需要前置故事线
    if (c.requireStoryId && !context.storyState.completedStoryIds.includes(c.requireStoryId)) return false;

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