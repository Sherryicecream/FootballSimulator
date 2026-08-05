import type { EventDefinition, EventInstance, CareerSave } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { filterEligibleEvents, selectEvent } from '../events/event-selector';
import type { PlayerContext } from '../events/event-selector';

export interface EventPickResult {
  event: EventInstance | null;
  updatedCooldowns: Record<string, number>;
}

/**
 * 从候选事件列表中为当前周选取一个事件
 * 读取存档中的冷却期，选择后自动设置冷却
 * 返回 EventInstance（或 null）和更新后的冷却期映射
 */
export function pickEventForWeek(
  events: EventDefinition[],
  save: CareerSave,
  weekNumber: number,
  rng: SeededRandomSource,
): EventPickResult {
  // 1. 递减所有已有冷却期
  const decrementedCooldowns: Record<string, number> = {};
  const rawCooldowns = save.story.cooldowns ?? {};
  for (const [eventId, remaining] of Object.entries(rawCooldowns)) {
    const r = remaining as number;
    if (r > 1) {
      decrementedCooldowns[eventId] = r - 1;
    }
  }

  const context: PlayerContext = {
    age: save.player.age,
    reputation: save.player.reputation,
    season: save.world.season,
    week: weekNumber,
    storyState: {
      activeStorylines: save.story.resolvedOpportunityIds,
      completedStoryIds: save.story.resolvedOpportunityIds,
      cooldowns: decrementedCooldowns,
      pendingDelayedEffects: [],
    },
  };

  const eligible = filterEligibleEvents(events, context);
  if (eligible.length === 0) {
    return { event: null, updatedCooldowns: decrementedCooldowns };
  }

  const selected = selectEvent(eligible, rng);
  if (!selected) {
    return { event: null, updatedCooldowns: decrementedCooldowns };
  }

  // 2. 设置被选中事件的冷却期
  const updatedCooldowns = {
    ...decrementedCooldowns,
    [selected.id]: selected.cooldownWeeks,
  };

  return {
    event: {
      eventId: selected.id,
      title: selected.title,
      description: selected.description,
      choices: selected.choices.map((c) => ({
        id: c.id,
        text: c.text,
        riskLabel: c.riskLabel,
        effects: c.effects,
        delayEffects: c.delayEffects ?? {},
        memoryKey: c.memoryKey,
      })),
      resolvedChoiceId: null,
    },
    updatedCooldowns,
  };
}