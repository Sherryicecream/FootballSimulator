import { type CareerSave, type CareerLedgerEntry } from '@football/contracts';

/**
 * Creates a submit event choice use case factory.
 * Validates the event exists and is unresolved, then applies effects.
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
      ledger: [...save.ledger, newEntry],
    };
  };
}
