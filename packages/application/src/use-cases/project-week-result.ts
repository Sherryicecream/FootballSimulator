import type {
  AttributeChange,
  CareerLedgerEntry,
  CareerSave,
  PlayerCareer,
  WeeklyAdvanceResult,
} from '@football/contracts';

export const projectWeekResult = (
  save: CareerSave,
  result: WeeklyAdvanceResult,
  nextRandomPosition: number,
): CareerSave => {
  let player = save.player;
  for (const change of result.trainingSummary?.attributeChanges ?? []) {
    player = applyAttributeChange(player, change);
  }

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
        fitness: getFinalStateValue(save, result, 'fitness'),
        morale: getFinalStateValue(save, result, 'morale'),
        coachTrust: getFinalStateValue(save, result, 'coachTrust'),
        fatigue: getFinalStateValue(save, result, 'fatigue'),
        teamStatus: save.context.playerState.teamStatus,
      },
      pendingEvent: result.event,
    },
    story: {
      ...save.story,
      cooldowns: result.eventCooldowns,
    },
    ledger: [...save.ledger, ...createLedgerEntries(result)],
    randomState: {
      ...save.randomState,
      sequencePosition: nextRandomPosition,
    },
  };
};

const getFinalStateValue = (
  save: CareerSave,
  result: WeeklyAdvanceResult,
  key: 'fitness' | 'morale' | 'coachTrust' | 'fatigue',
): number => {
  const changes = result.stateChanges.filter((change) => change.key === key);
  const value = changes.at(-1)?.newValue ?? save.context.playerState[key];
  return Math.min(100, Math.max(0, value));
};

const createLedgerEntries = (result: WeeklyAdvanceResult): CareerLedgerEntry[] => {
  const entries: CareerLedgerEntry[] = [
    {
      type: 'week-advanced',
      date: result.date,
      week: result.week,
    },
  ];

  if (result.trainingSummary && result.trainingSummary.attributeChanges.length > 0) {
    entries.push({
      type: 'training-week',
      date: result.date,
      week: result.week,
      focus: result.trainingSummary.focus,
      attributeChanges: result.trainingSummary.attributeChanges,
    });
  }

  if (result.matchResult) {
    entries.push({
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
    });
  }

  return entries;
};

const applyAttributeChange = (player: PlayerCareer, change: AttributeChange): PlayerCareer => {
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
};
