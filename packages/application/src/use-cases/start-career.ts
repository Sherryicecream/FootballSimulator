import { type CareerSave, type Position, type PlayerState } from '@football/contracts';
import { createSeededRandomSource } from '@football/simulation';
import { createPlayer } from '@football/simulation';
import { createCalendar } from '@football/simulation';

export interface StartCareerParams {
  playerName: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  regionId: string;
  seed: number;
}

/**
 * 根据种子生成确定性生涯 ID
 */
function generateCareerId(seed: number): string {
  // 使用种子和固定前缀生成可复现的 ID
  const hash = ((seed * 2654435761) ^ (seed * 2246822519)) >>> 0;
  const hex = hash.toString(16).padStart(12, '0');
  return `career-${hex}`;
}

/**
 * 创建新的生涯存档
 * 生成 16 岁球员并初始化世界状态、空上下文和首条账本
 */
export function createCareerSave(params: StartCareerParams): CareerSave {
  if (!Number.isInteger(params.seed) || params.seed < 0 || params.seed > 2147483647) {
    throw new Error('随机种子必须是 0 到 2147483647 之间的整数');
  }

  const rng = createSeededRandomSource(params.seed);
  const profileRng = createSeededRandomSource(params.seed + 1701);

  const player = createPlayer(
    {
      name: params.playerName,
      hometown: params.hometown,
      primaryPosition: params.primaryPosition,
      ...(params.secondaryPosition !== undefined
        ? { secondaryPosition: params.secondaryPosition }
        : {}),
      preferredFoot: params.preferredFoot,
      regionId: params.regionId,
    },
    rng,
    profileRng,
  );

  const calendar = createCalendar('2024-09-01', 2024);

  // 确定性的机会出现周（第二周到第四周之间）
  const opportunityRng = createSeededRandomSource(params.seed + 999);
  const bootstrapOpportunityWeek = opportunityRng.nextInt(2, 4);

  const initialPlayerState: PlayerState = {
    fitness: 70,
    morale: 60,
    coachTrust: 35,
    fatigue: 5,
    teamStatus: 'fringe',
  };

  const save: CareerSave = {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: generateCareerId(params.seed),
    player,
    world: {
      currentDate: calendar.currentDate,
      season: calendar.season,
      weekNumber: 1,
    },
    context: {
      academyId: null,
      pendingOpportunity: null,
      playerState: initialPlayerState,
      pendingEvent: null,
      trainingFocus: null,
      trainingIntensity: 'normal',
    },
    relationships: {
      persons: [],
      activeRelations: [],
    },
    story: {
      bootstrapOpportunityWeek,
      resolvedOpportunityIds: [],
      completedStoryIds: [],
      activeStorylines: [],
      cooldowns: {},
    },
    ledger: [
      {
        type: 'career-started',
        date: calendar.currentDate,
        playerName: params.playerName,
        age: 16,
        position: params.primaryPosition,
      },
    ],
    randomState: {
      seed: params.seed,
      sequencePosition: rng.getPosition(),
    },
  };

  return save;
}
