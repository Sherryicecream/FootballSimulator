import { type CareerSave, type CareerLedgerEntry } from '@football/contracts';
import { addMemory } from '@football/simulation';

/**
 * Creates a submit event choice use case factory.
 * Validates the event exists and is unresolved, then applies effects.
 * If the chosen option has a memoryKey, records memories to relevant persons.
 */
export function createSubmitEventChoice() {
  return (save: CareerSave, choiceId: string): CareerSave => {
    if (!save.context.pendingEvent) {
      throw new Error('没有待处理的事件');
    }

    if (save.context.pendingEvent.resolvedChoiceId !== null) {
      throw new Error('该事件已经处理，不能重复提交');
    }

    const choice = save.context.pendingEvent.choices.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`无效的选择 ID: ${choiceId}`);
    }

    // Apply effects
    let playerState = { ...save.context.playerState };
    const effects = choice.effects || {};
    for (const [key, value] of Object.entries(effects)) {
      if (key === 'fitness' || key === 'morale' || key === 'coachTrust' || key === 'fatigue') {
        const oldVal = playerState[key];
        playerState = { ...playerState, [key]: Math.min(100, Math.max(0, oldVal + value)) };
      }
    }

    // Determine emotional impact from effects sum
    const totalEffect = Object.values(effects).reduce((sum, v) => sum + v, 0);
    const emotionalImpact: 'positive' | 'negative' | 'neutral' =
      totalEffect > 0 ? 'positive' : totalEffect < 0 ? 'negative' : 'neutral';

    // Add memory if choice has memoryKey
    let persons = [...save.relationships.persons];
    const memoryKey = (choice as Record<string, unknown>).memoryKey;
    if (memoryKey) {
      const evt = save.context.pendingEvent;
      const summary = `[${evt.title}] ${choice.text}`;
      const season = save.world.season;
      const week = save.world.weekNumber;

      // Add memory to coach (first person with role 'coach')
      const coachIdx = persons.findIndex((p) => p.role === 'coach');
      if (coachIdx !== -1) {
        const coach = persons[coachIdx];
        if (coach) {
          persons[coachIdx] = addMemory(coach, evt.eventId, summary, season, week, emotionalImpact);
        }
      }

      // Add memory to all teammates
      persons = persons.map((p) => {
        if (p && p.role === 'teammate') {
          return addMemory(p, evt.eventId, summary, season, week, emotionalImpact);
        }
        return p;
      });
    }

    // Add ledger entry
    const newEntry: CareerLedgerEntry = {
      type: 'event-week',
      date: save.world.currentDate,
      week: save.world.weekNumber,
      eventId: save.context.pendingEvent.eventId,
      title: save.context.pendingEvent.title,
      choiceId: choiceId,
    } as CareerLedgerEntry;

    return {
      ...save,
      context: {
        ...save.context,
        playerState,
        pendingEvent: null,
      },
      relationships: {
        ...save.relationships,
        persons,
      },
      ledger: [...save.ledger, newEntry],
    };
  };
}
