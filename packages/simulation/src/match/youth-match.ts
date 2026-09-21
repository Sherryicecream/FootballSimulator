import type { PlayerCareer, PlayerState, Position, YouthMatchResult } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { simulateMatch } from './match-engine';
import { allocatePlayerContribution } from './player-contribution';

export interface YouthMatchOpponent {
  name: string;
  competitionLevel: number;
}

/**
 * 模拟青训比赛
 * 复用现有比赛引擎，生成对手、比分和球员个人表现
 */
export function simulateYouthMatch(
  player: PlayerCareer,
  state: PlayerState,
  weekNumber: number,
  season: number,
  rng: SeededRandomSource,
  opponentProfile?: YouthMatchOpponent,
): YouthMatchResult {
  const opponent = opponentProfile?.name ?? `青年联赛对手 ${String(weekNumber).padStart(2, '0')}`;
  const isHome = rng.next() < 0.5;

  // Determine if player is selected
  const selectionThreshold = getSelectionThreshold(state.teamStatus);
  const adjustedFitness = state.fitness - state.fatigue * 0.3;
  const selectionScore = adjustedFitness * 0.4 + state.coachTrust * 0.4 + state.morale * 0.2;
  const played = selectionScore >= selectionThreshold;

  // Simulate match
  const playerTeamStrength = calculateTeamStrength(player);
  const opponentLevel = opponentProfile?.competitionLevel ?? 55;
  const opponentStrength = {
    attack: clamp(rng.nextInt(opponentLevel - 8, opponentLevel + 8), 0, 100),
    midfield: clamp(rng.nextInt(opponentLevel - 8, opponentLevel + 8), 0, 100),
    defence: clamp(rng.nextInt(opponentLevel - 8, opponentLevel + 8), 0, 100),
    overall: 0,
  };
  opponentStrength.overall = Math.round(
    (opponentStrength.attack + opponentStrength.midfield + opponentStrength.defence) / 3,
  );

  const matchResult = simulateMatch(
    isHome ? '我的球队' : opponent,
    isHome ? opponent : '我的球队',
    isHome ? playerTeamStrength : opponentStrength,
    isHome ? opponentStrength : playerTeamStrength,
    weekNumber,
    season,
    rng,
  );

  // Player performance
  const minutesPlayed = played ? getMinutesForStatus(state.teamStatus, rng) : 0;
  const ownGoals = isHome ? matchResult.homeScore : matchResult.awayScore;
  const contribution = allocatePlayerContribution({
    ownGoals,
    minutes: played ? minutesPlayed : 0,
    position: player.identity.primaryPosition as Position,
    shooting: player.attributes.technical.shooting,
    passing: player.attributes.technical.passing,
    rng,
  });
  const goals = contribution.goals;
  const assists = contribution.assists;
  const playerOverall = calculatePlayerOverall(player);
  const performanceBase = (playerOverall / 100) * 5 + 3;
  const performanceVariation = rng.nextInt(-2, 2);
  const rating = Math.min(
    10,
    Math.max(
      1,
      Math.round((performanceBase + goals * 0.7 + assists * 0.4 + performanceVariation) * 10) / 10,
    ),
  );

  const performanceSummary = played
    ? rating >= 8
      ? '表现出色，在场上发挥了关键作用'
      : rating >= 6
        ? '发挥正常，完成了教练的战术要求'
        : rating >= 4
          ? '表现一般，状态有待提升'
          : '表现不佳，未能达到预期水平'
    : '未获得出场机会';

  const fitnessChange = played ? -rng.nextInt(5, 12) : 0;
  const moraleChange = played
    ? rating >= 7
      ? rng.nextInt(2, 5)
      : rating >= 5
        ? rng.nextInt(-1, 2)
        : rng.nextInt(-5, -1)
    : rng.nextInt(-2, 0);
  const coachTrustChange = played
    ? rating >= 7
      ? rng.nextInt(1, 3)
      : rating >= 5
        ? rng.nextInt(0, 1)
        : rng.nextInt(-2, 0)
    : rng.nextInt(-1, 0);

  return {
    opponent,
    isHome,
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    played,
    minutesPlayed,
    rating,
    performanceSummary,
    goals,
    assists,
    fitnessChange,
    moraleChange,
    coachTrustChange,
  };
}

function getSelectionThreshold(teamStatus: string): number {
  switch (teamStatus) {
    case 'key':
      return 20;
    case 'regular':
      return 35;
    case 'rotation':
      return 50;
    case 'fringe':
      return 65;
    default:
      return 50;
  }
}

function getMinutesForStatus(teamStatus: string, rng: SeededRandomSource): number {
  switch (teamStatus) {
    case 'key':
      return rng.nextInt(70, 90);
    case 'regular':
      return rng.nextInt(45, 80);
    case 'rotation':
      return rng.nextInt(20, 60);
    case 'fringe':
      return rng.nextInt(1, 30);
    default:
      return rng.nextInt(1, 45);
  }
}

function calculateTeamStrength(player: PlayerCareer): {
  attack: number;
  midfield: number;
  defence: number;
  overall: number;
} {
  const attrs = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };
  const attack = Math.round((attrs.shooting + attrs.dribbling + attrs.offTheBall + attrs.pace) / 4);
  const midfield = Math.round((attrs.passing + attrs.vision + attrs.decision + attrs.stamina) / 4);
  const defence = Math.round(
    (attrs.defending + attrs.aerialAbility + attrs.strength + attrs.discipline) / 4,
  );
  const overall = Math.round((attack + midfield + defence) / 3);
  return { attack, midfield, defence, overall };
}

function calculatePlayerOverall(player: PlayerCareer): number {
  const allAttrs = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };
  const values = Object.values(allAttrs);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
