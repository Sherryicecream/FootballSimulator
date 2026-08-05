import type { EventDefinition, EventInstance, CareerSave } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { filterEligibleEvents, selectEvent } from '../events/event-selector';
import type { PlayerContext } from '../events/event-selector';

/**
 * 从候选事件列表中为当前周选取一个事件
 * 返回 EventInstance 或 null（无合适事件）
 */
export function pickEventForWeek(
  events: EventDefinition[],
  save: CareerSave,
  weekNumber: number,
  rng: SeededRandomSource,
): EventInstance | null {
  const context: PlayerContext = {
    age: save.player.age,
    reputation: save.player.reputation,
    season: save.world.season,
    week: weekNumber,
    storyState: {
      activeStorylines: save.story.resolvedOpportunityIds,
      completedStoryIds: save.story.resolvedOpportunityIds,
      cooldowns: {},
      pendingDelayedEffects: [],
    },
  };

  const eligible = filterEligibleEvents(events, context);
  if (eligible.length === 0) return null;

  const selected = selectEvent(eligible, rng);
  if (!selected) return null;

  return {
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
  };
}