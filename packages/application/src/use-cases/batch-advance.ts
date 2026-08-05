import { type CareerSave, type WeeklyAdvanceResult, type EventDefinition, type PlayerCareer } from '@football/contracts';
import { advanceCareerWeek, createSeededRandomSource } from '@football/simulation';

export interface BatchAdvanceResult {
  save: CareerSave;
  weekResults: WeeklyAdvanceResult[];
  totalWeeks: number;
  trainingCount: number;
  matchCount: number;
  eventCount: number;
  quietCount: number;
  summary: string;
}

/**
 * 批量推进周数，直到遇到事件或达到最大周数
 * 最大推进 10 周，防止无限循环
 */
export function createBatchAdvanceWeeks(events?: EventDefinition[]) {
  const MAX_WEEKS = 10;

  return (save: CareerSave): BatchAdvanceResult => {
    if (save.context.pendingEvent) {
      throw new Error('存档有未处理的事件，无法推进');
    }

    let currentSave = save;
    const weekResults: WeeklyAdvanceResult[] = [];
    let trainingCount = 0;
    let matchCount = 0;
    let eventCount = 0;
    let quietCount = 0;

    for (let i = 0; i < MAX_WEEKS; i++) {
      const rng = createSeededRandomSource(
        currentSave.randomState.seed + currentSave.world.weekNumber,
      );
      const result = advanceCareerWeek(currentSave, rng, events);

      // Apply state changes to build updated save
      currentSave = buildUpdatedSave(currentSave, result, rng);

      weekResults.push(result);

      if (result.activity === 'event') {
        eventCount++;
      } else if (result.activity === 'match') {
        matchCount++;
      } else if (result.activity === 'training') {
        trainingCount++;
      } else {
        quietCount++;
      }

      // Stop if event needs player choice
      if (result.hasPendingChoice) {
        break;
      }
    }

    const totalWeeks = weekResults.length;
    const summary = buildSummary(totalWeeks, trainingCount, matchCount, eventCount, quietCount);

    return {
      save: currentSave,
      weekResults,
      totalWeeks,
      trainingCount,
      matchCount,
      eventCount,
      quietCount,
      summary,
    };
  };
}

function buildSummary(
  total: number,
  training: number,
  match: number,
  event: number,
  quiet: number,
): string {
  const parts: string[] = [`跳过 ${total} 周`];
  if (training > 0) parts.push(`训练 ${training} 周`);
  if (match > 0) parts.push(`比赛 ${match} 周`);
  if (event > 0) parts.push(`事件 ${event} 次`);
  if (quiet > 0) parts.push(`平淡 ${quiet} 周`);
  return parts.join(' · ');
}

function buildUpdatedSave(
  save: CareerSave,
  result: WeeklyAdvanceResult,
  rng: ReturnType<typeof createSeededRandomSource>,
): CareerSave {
  // Apply attribute changes
  let player = { ...save.player };
  if (result.trainingSummary) {
    for (const change of result.trainingSummary.attributeChanges) {
      player = applyAttributeChange(player, change);
    }
  }

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
    story: {
      ...save.story,
      cooldowns: result.eventCooldowns,
    },
    randomState: {
      ...save.randomState,
      sequencePosition: rng.getPosition(),
    },
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