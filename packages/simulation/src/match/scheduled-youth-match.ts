import type {
  CareerSaveV2,
  CareerSaveV2Like,
  ScheduledYouthFixture,
  YouthAcademyProfile,
  YouthMatchResultV2,
  Position,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness';
import { simulateMatch } from './match-engine';
import { allocatePlayerContribution } from './player-contribution';

export const simulateScheduledYouthMatch = (
  save: CareerSaveV2Like,
  fixture: ScheduledYouthFixture,
  academies: readonly YouthAcademyProfile[],
  rng: SeededRandomSource,
): YouthMatchResultV2 => {
  const ownAcademy = requireAcademy(academies, save.season.academyId);
  const opponentId =
    fixture.homeClubId === save.season.academyId ? fixture.awayClubId : fixture.homeClubId;
  const opponent = requireAcademy(academies, opponentId);
  const isHome = fixture.homeClubId === save.season.academyId;
  const ownStrength = academyStrength(ownAcademy, playerOverall(save));
  const opponentStrength = academyStrength(opponent);
  const result = simulateMatch(
    isHome ? ownAcademy.name : opponent.name,
    isHome ? opponent.name : ownAcademy.name,
    isHome ? ownStrength : opponentStrength,
    isHome ? opponentStrength : ownStrength,
    save.season.currentWeek,
    Number(save.season.startDate.slice(0, 4)),
    rng,
  );
  const canPlay = save.health.activeInjury === null && save.health.fitness >= 30;
  const selectionScore =
    save.clubContext.coachEvaluation * 0.45 +
    save.currentState.form * 0.25 +
    (save.health.fitness - save.health.fatigue * 0.35) * 0.3;
  const threshold = { fringe: 62, rotation: 52, regular: 42, starter: 25, 'first-team-radar': 38 }[
    save.clubContext.playerRole
  ];
  const played = canPlay && selectionScore + rng.nextInt(-8, 8) >= threshold;
  const minutesPlayed = played ? minutesForRole(save.clubContext.playerRole, rng) : 0;
  const ownGoals = isHome ? result.homeScore : result.awayScore;
  const contribution = allocatePlayerContribution({
    ownGoals,
    minutes: played ? minutesPlayed : 0,
    position: save.player.identity.primaryPosition as Position,
    shooting: save.player.attributes.technical.shooting,
    passing: save.player.attributes.technical.passing,
    rng,
  });
  // 保留旧版助攻抽样占用的随机位，避免贡献归因改变后续青训路径的随机节奏。
  if (played) rng.next();
  const goals = contribution.goals;
  const assists = contribution.assists;
  const rating = played
    ? Math.min(
        10,
        Math.max(
          1,
          Math.round(
            (5.4 + playerOverall(save) / 35 + goals * 1.2 + assists * 0.7 + rng.next() * 2 - 1) *
              10,
          ) / 10,
        ),
      )
    : null;

  return {
    id: `match-${save.season.startDate.slice(0, 4)}-${fixture.id}`,
    fixtureId: fixture.id,
    opponentId,
    opponentName: opponent.name,
    isHome,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    played,
    minutesPlayed,
    rating,
    goals,
    assists,
  };
};

const requireAcademy = (
  academies: readonly YouthAcademyProfile[],
  id: string,
): YouthAcademyProfile => {
  const academy = academies.find((candidate) => candidate.id === id);
  if (!academy) throw new Error(`固定赛程引用了未知青训机构：${id}`);
  return academy;
};

export const academyStrength = (academy: YouthAcademyProfile, playerAbility = 50) => {
  const base = academy.competitionLevel * 0.55 + academy.coachingLevel * 0.25 + playerAbility * 0.2;
  return {
    attack: Math.round(base + academy.promotionTendency / 20),
    midfield: Math.round(base + academy.facilityLevel / 25),
    defence: Math.round(base + academy.coachingLevel / 25),
    overall: Math.round(base),
  };
};

const playerOverall = (save: CareerSaveV2Like): number => {
  const values = Object.values(save.player.attributes).flatMap((group) => Object.values(group));
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const minutesForRole = (
  role: CareerSaveV2['clubContext']['playerRole'],
  rng: SeededRandomSource,
) => {
  const ranges: Record<CareerSaveV2['clubContext']['playerRole'], readonly [number, number]> = {
    fringe: [5, 30],
    rotation: [20, 60],
    regular: [45, 80],
    starter: [65, 90],
    'first-team-radar': [35, 75],
  };
  const range = ranges[role];
  return rng.nextInt(range[0], range[1]);
};
