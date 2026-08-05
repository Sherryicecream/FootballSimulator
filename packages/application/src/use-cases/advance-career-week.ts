import { type CareerSave, type CareerLedgerEntry, type PlayerCareer, type EventDefinition } from '@football/contracts';
import { advanceCareerWeek, createSeededRandomSource } from '@football/simulation';

/**
 * Creates an advance career week use case factory.
 * Validates the save has no pending events, then advances one week.
 * Accepts optional event definitions for narrative event selection.
 */
export function createAdvanceCareerWeek(events?: EventDefinition[]) {
  return (save: CareerSave): CareerSave => {
    if (save.context.pendingEvent) {
      throw new Error('存档有未处理的事件，无法推进周');
    }

    const rng = createSeededRandomSource(save.randomState.seed + save.world.weekNumber);
    const result = advanceCareerWeek(save, rng, events);

    // Build ledger entries
    const newEntries: CareerLedgerEntry[] = [
      {
        type: 'week-advanced',
        date: result.date,
        week: result.week,
      },
    ];

    // Add training ledger entry
    if (result.trainingSummary && result.trainingSummary.attributeChanges.length > 0) {
      newEntries.push({
        type: 'training-week',
        date: result.date,
        week: result.week,
        focus: result.trainingSummary.focus,
        attributeChanges: result.trainingSummary.attributeChanges,
      } as CareerLedgerEntry);
    }

    // Add match ledger entry
    if (result.matchResult) {
      newEntries.push({
        type: 'match-week',
        date: result.date,
        week: result.week,
        opponent: result.matchResult.opponent,
        isHome: result.matchResult.isHome,
        homeScore: result.matchResult.homeScore,
        awayScore: result.matchResult.awayScore,
        played: result.matchResult.played,
        minutesPlayed: result.matchResult.minutesPlayed,
        rating: result.matchResult.rating,
        goals: result.matchResult.goals,
        assists: result.matchResult.assists,
      } as CareerLedgerEntry);
    }

    // Apply attribute changes to player
    let player = { ...save.player };
    if (result.trainingSummary) {
      for (const change of result.trainingSummary.attributeChanges) {
        player = applyAttributeChange(player, change);
      }
    }

    // Build updated player state from result
    const findState = (key: string): number | undefined => {
      const found = result.stateChanges.find((s) => s.key === key);
      return found?.newValue;
    };

    return {
      ...save,
      player,
      world: {
        currentDate: result.date,
        season: result.season,
        weekNumber: result.week,
      },
      context: {
        ...save.context,
        playerState: {
          fitness: clamp(findState('fitness') ?? save.context.playerState.fitness, 0, 100),
          morale: clamp(findState('morale') ?? save.context.playerState.morale, 0, 100),
          coachTrust: clamp(findState('coachTrust') ?? save.context.playerState.coachTrust, 0, 100),
          fatigue: clamp(findState('fatigue') ?? save.context.playerState.fatigue, 0, 100),
          teamStatus: save.context.playerState.teamStatus,
        },
        pendingEvent: result.event,
      },
      ledger: [...save.ledger, ...newEntries],
      randomState: {
        ...save.randomState,
        sequencePosition: rng.getPosition(),
      },
    };
  };
}

function applyAttributeChange(
  player: PlayerCareer,
  change: { attribute: string; newValue: number },
): PlayerCareer {
  const { technical, physical, mental } = player.attributes;
  if (change.attribute in technical) {
    return {
      ...player,
      attributes: {
        ...player.attributes,
        technical: { ...technical, [change.attribute]: change.newValue },
      },
    };
  }
  if (change.attribute in physical) {
    return {
      ...player,
      attributes: {
        ...player.attributes,
        physical: { ...physical, [change.attribute]: change.newValue },
      },
    };
  }
  if (change.attribute in mental) {
    return {
      ...player,
      attributes: {
        ...player.attributes,
        mental: { ...mental, [change.attribute]: change.newValue },
      },
    };
  }
  return player;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
