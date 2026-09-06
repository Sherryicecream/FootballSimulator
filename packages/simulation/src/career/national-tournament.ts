import type { CareerSaveV5Like, SeasonHonour } from '@football/contracts';
import { createSeededRandomSource } from '../randomness';
import { applyReputationGain } from './reputation';

export type TournamentCompetition = 'asian-cup' | 'world-cup';
export type TournamentRound = 'group' | 'quarterfinal' | 'semifinal' | 'final';

export interface TournamentResult {
  competition: TournamentCompetition;
  matchesPlayed: number;
  goals: number;
  bestRound: TournamentRound;
  honour: Pick<SeasonHonour, 'kind' | 'label'> | null;
  reputationDelta: number;
  summary: string;
}

/** 大赛赛历：赛季 pro-YYYY 结束后的夏天，%4==0 亚洲杯、%4==2 世界杯。 */
export const isTournamentYear = (year: number): TournamentCompetition | null => {
  const remainder = ((year % 4) + 4) % 4;
  if (remainder === 0) return 'asian-cup';
  if (remainder === 2) return 'world-cup';
  return null;
};

const TEAM_STRENGTH_BANDS: Array<{ min: number; strength: number }> = [
  { min: 80, strength: 74 },
  { min: 70, strength: 68 },
  { min: 60, strength: 62 },
  { min: 0, strength: 50 },
];

const teamStrengthFor = (reputation: number): number =>
  TEAM_STRENGTH_BANDS.find(({ min }) => reputation >= min)!.strength;

const clampProbability = (value: number): number => Math.max(0.15, Math.min(0.85, value));

const ROUND_LABELS: Record<TournamentRound, string> = {
  group: '小组赛',
  quarterfinal: '八强',
  semifinal: '四强',
  final: '决赛',
};

/**
 * 抽象国家队大赛（设计 §3）：小组赛 3 场 → 积分 ≥4 晋级 → QF/SF/F 单场决胜。
 * 纯函数：同存档同年份同种子结果一致；不修改存档。
 */
export const simulateSummerTournament = (
  save: CareerSaveV5Like,
  tournamentYear: number,
  seed?: number,
): TournamentResult | null => {
  const competition = isTournamentYear(tournamentYear);
  if (!competition) return null;
  if (!save.nationalTeam?.capped) return null;
  if (save.player.age > 35) return null;

  const strength = teamStrengthFor(save.player.reputation);
  const opponentBase = competition === 'world-cup' ? 71 : 58;
  const rng = createSeededRandomSource(
    save.randomState.seed + 9300 + tournamentYear * 13 + (seed ?? 0),
  );

  let points = 0;
  let matchesPlayed = 0;
  let goals = 0;
  for (let match = 0; match < 3; match += 1) {
    const opponent = opponentBase + rng.nextInt(-4, 4);
    const winProbability = clampProbability(0.5 + (strength - opponent) / 120);
    const draw = rng.next();
    matchesPlayed += 1;
    if (rng.next() < 0.25) goals += 1;
    if (draw < winProbability) points += 3;
    else if (draw < winProbability + (1 - winProbability) * 0.4) points += 1;
  }
  let bestRound: TournamentRound = 'group';
  let reputationDelta = 0;
  let honour: TournamentResult['honour'] = null;
  if (points < 4) {
    const label = competition === 'world-cup' ? '世界杯' : '亚洲杯';
    return {
      competition,
      matchesPlayed,
      goals,
      bestRound,
      honour: null,
      reputationDelta,
      summary: `${label}小组赛：${Math.floor(points / 3)}胜${
        points % 3 === 2 ? 2 : points % 3
      }平${(3 - Math.ceil(points / 3)).toString() === '' ? '' : ''}，止步小组赛，出场 ${matchesPlayed} 次，进球 ${goals} 个。`,
    };
  }

  bestRound = 'quarterfinal';
  const knockout = (round: TournamentRound): boolean => {
    const winProbability = clampProbability(0.5 + (strength - opponentBase - 2) / 120);
    if (rng.next() < winProbability || rng.next() < 0.5) {
      bestRound = round;
      matchesPlayed += 1;
      if (rng.next() < 0.25) goals += 1;
      return true;
    }
    matchesPlayed += 1;
    if (rng.next() < 0.25) goals += 1;
    return false;
  };
  if (knockout('quarterfinal')) {
    reputationDelta = 1;
    if (knockout('semifinal')) {
      reputationDelta = 2;
      if (knockout('final')) {
        reputationDelta = 4;
        bestRound = 'final';
        honour =
          competition === 'asian-cup'
            ? { kind: 'asian-cup-champion', label: '亚洲杯冠军' }
            : { kind: 'world-cup-champion', label: '世界杯冠军' };
      } else if (competition === 'world-cup') {
        honour = { kind: 'world-cup-runner-up', label: '世界杯亚军' };
      }
    }
  }

  reputationDelta =
    applyReputationGain(save.player.reputation, reputationDelta) - save.player.reputation;
  const label = competition === 'world-cup' ? '世界杯' : '亚洲杯';
  const roundText = honour ? '夺冠' : `止步${ROUND_LABELS[bestRound]}`;
  return {
    competition,
    matchesPlayed,
    goals,
    bestRound,
    honour,
    reputationDelta,
    summary: `${label}：${roundText}，出场 ${matchesPlayed} 次，进球 ${goals} 个。`,
  };
};
