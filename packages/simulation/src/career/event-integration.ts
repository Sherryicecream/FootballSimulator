import type {
  CareerSaveV2,
  EventDefinition,
  EventInstance,
  CareerSave,
  YouthEventInstance,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import {
  filterEligibleEvents,
  filterEligibleYouthEvents,
  selectEvent,
} from '../events/event-selector';
import { createSeededRandomSource } from '../randomness';
import type { PlayerContext } from '../events/event-selector';

export interface EventPickResult {
  event: EventInstance | null;
  updatedCooldowns: Record<string, number>;
}

export const decrementEventCooldowns = (
  cooldowns: Record<string, number>,
): Record<string, number> => {
  const decremented: Record<string, number> = {};
  for (const [eventId, remaining] of Object.entries(cooldowns)) {
    if (remaining > 1) {
      decremented[eventId] = remaining - 1;
    }
  }
  return decremented;
};

export interface YouthEventPickResult {
  save: CareerSaveV2;
  event: YouthEventInstance | null;
}

export const pickYouthEventForWeek = (
  events: readonly EventDefinition[],
  save: CareerSaveV2,
): YouthEventPickResult => {
  const cooldownsByEventId = decrementEventCooldowns(save.story.cooldownsByEventId);
  const rng = createSeededRandomSource(save.randomState.seed);
  for (let index = 0; index < save.randomState.sequencePosition; index += 1) rng.next();
  const eligible = filterEligibleYouthEvents([...events], {
    ...save,
    story: { ...save.story, cooldownsByEventId },
  });
  const selected =
    eligible.length > 0 && rng.next() < 0.34 ? selectEvent(eligible, rng) : undefined;
  const event = selected ? instantiateYouthEvent(selected, save) : null;
  return {
    event,
    save: {
      ...save,
      story: {
        ...save.story,
        cooldownsByEventId: selected
          ? { ...cooldownsByEventId, [selected.id]: selected.cooldownWeeks }
          : cooldownsByEventId,
        pendingEvent: event,
      },
      monthlyAdvance: event
        ? { ...save.monthlyAdvance, status: 'awaiting-decision' }
        : save.monthlyAdvance,
      randomState: { ...save.randomState, sequencePosition: rng.getPosition() },
    },
  };
};

const instantiateYouthEvent = (
  definition: EventDefinition,
  save: CareerSaveV2,
): YouthEventInstance => {
  const participantIds = (definition.participantRoles ?? []).flatMap((role) => {
    const matches = save.relationships.persons.filter((person) => person.role === role);
    return role === 'teammate'
      ? matches.slice(0, 2).map(({ id }) => id)
      : matches.slice(0, 1).map(({ id }) => id);
  });
  const factRefs = definition.condition.requireFactType
    ? save.ledger
        .filter(({ type }) => type === definition.condition.requireFactType)
        .slice(-3)
        .map(({ id }) => id)
    : [];
  return {
    eventId: definition.id,
    title: definition.title,
    description: definition.description,
    choices: definition.choices,
    resolvedChoiceId: null,
    participantIds,
    factRefs,
    storyId: definition.storyId ?? null,
    nextEventIds: definition.nextEvents ?? [],
  };
};

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
  const decrementedCooldowns = decrementEventCooldowns(save.story.cooldowns ?? {});

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
