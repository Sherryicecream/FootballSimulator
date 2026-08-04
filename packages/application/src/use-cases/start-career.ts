import { type CareerSave, type Position } from '@football/contracts';
import { createSeededRandomSource } from '@football/simulation';
import { createPlayer } from '@football/simulation';

export interface StartCareerParams {
  playerName: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  weakFootLevel: number;
  growthBackground: string;
  personalityTendency: string;
  regionId: string;
  seed: number;
}

/**
 * 创建新的生涯存档
 * 生成 16 岁球员并初始化世界状态
 */
export function createCareerSave(params: StartCareerParams): CareerSave {
  const rng = createSeededRandomSource(params.seed);

  const player = createPlayer(
    {
      name: params.playerName,
      hometown: params.hometown,
      primaryPosition: params.primaryPosition,
      ...(params.secondaryPosition !== undefined ? { secondaryPosition: params.secondaryPosition } : {}),
      preferredFoot: params.preferredFoot,
      weakFootLevel: params.weakFootLevel,
      growthBackground: params.growthBackground,
      personalityTendency: params.personalityTendency,
      regionId: params.regionId,
    },
    rng,
  );

  const save: CareerSave = {
    schemaVersion: 1,
    player,
    world: {
      currentDate: '2024-09-01',
      season: 2024,
    },
    randomState: {
      seed: params.seed,
      sequencePosition: rng.getPosition(),
    },
  };

  return save;
}