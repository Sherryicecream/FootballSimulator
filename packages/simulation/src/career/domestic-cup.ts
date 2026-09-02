import type { ClubProfile, ProCupState, ProFixture } from '@football/contracts';
import { createSeededRandomSource } from '../randomness';

const CUP_ID = 'domestic-cup';
const CUP_NAME = '国内杯';
const QUARTERFINAL_WEEK = 27;
const SEMIFINAL_WEEK = 33;
const FINAL_WEEK = 39;
const CUP_SLOT_PREFIX = 'cup-slot-';

type CupRound = 'quarterfinal' | 'semifinal' | 'final' | 'complete';

/** 创建八队国内杯：签位和未来轮次 slot 在赛季开始时一次性固定。 */
export const createDomesticCup = (
  clubs: readonly ClubProfile[],
  playerClubId: string,
  effectiveTier: number,
  seasonYear: string,
  seed: number,
): ProCupState => {
  const playerClub = clubs.find(({ id }) => id === playerClubId);
  if (!playerClub) throw new Error(`杯赛球员俱乐部不存在：${playerClubId}`);
  if (playerClub.overseas) throw new Error('海外俱乐部不能参加国内杯');

  const candidates = clubs.filter(
    ({ id, tier, overseas }) =>
      id !== playerClubId && !overseas && Math.abs(tier - effectiveTier) <= 1,
  );
  if (candidates.length < 7) {
    throw new Error(`有效层级 ${effectiveTier} 附近国内俱乐部不足，无法组成国内杯`);
  }

  const rng = createSeededRandomSource(seed + Number(seasonYear) * 31 + 7400);
  const entrants = rng.shuffle([playerClubId, ...candidates.map(({ id }) => id)]).slice(0, 8);
  const fixtures = [
    ...makeRoundFixtures('qf', QUARTERFINAL_WEEK, seasonYear, entrants),
    ...makeRoundFixtures('sf', SEMIFINAL_WEEK, seasonYear, [
      'cup-slot-qf-1-winner',
      'cup-slot-qf-2-winner',
      'cup-slot-qf-3-winner',
      'cup-slot-qf-4-winner',
    ]),
    ...makeRoundFixtures('final', FINAL_WEEK, seasonYear, [
      'cup-slot-sf-1-winner',
      'cup-slot-sf-2-winner',
    ]),
  ];

  return {
    id: `${CUP_ID}-${seasonYear}`,
    name: CUP_NAME,
    competitionId: CUP_ID,
    entrants,
    fixtures,
    currentRound: 'quarterfinal',
    winnerClubId: null,
    completed: false,
  };
};

/** 结算一场杯赛并把赢家写入下一轮 slot；未完成轮次不会提前推进。 */
export const advanceDomesticCup = (
  cup: ProCupState,
  fixtureId: string,
  homeScore: number,
  awayScore: number,
  tieBreaker: number,
): ProCupState => {
  if (!Number.isInteger(homeScore) || homeScore < 0) throw new Error('杯赛主队比分非法');
  if (!Number.isInteger(awayScore) || awayScore < 0) throw new Error('杯赛客队比分非法');
  if (!Number.isInteger(tieBreaker)) throw new Error('杯赛平局判定种子非法');

  const fixture = cup.fixtures.find(({ id }) => id === fixtureId);
  if (!fixture) throw new Error(`杯赛赛程不存在：${fixtureId}`);
  if (fixture.status !== 'scheduled') throw new Error(`杯赛赛程已经结算：${fixtureId}`);
  const fixtureRound = roundForFixture(fixture);
  if (fixtureRound !== cup.currentRound) {
    throw new Error(`杯赛当前轮次为 ${cup.currentRound}，不能结算 ${fixtureRound}`);
  }
  if (isCupSlot(fixture.homeClubId) || isCupSlot(fixture.awayClubId)) {
    throw new Error(`杯赛赛程尚未确定对阵：${fixtureId}`);
  }

  const winnerClubId =
    homeScore > awayScore
      ? fixture.homeClubId
      : awayScore > homeScore
        ? fixture.awayClubId
        : tieBreaker % 2 === 0
          ? fixture.homeClubId
          : fixture.awayClubId;
  const updatedFixtures = cup.fixtures.map((item) =>
    item.id === fixtureId
      ? { ...item, status: 'played' as const, resultId: `cup-winner-${winnerClubId}` }
      : item,
  );
  const settled = { ...cup, fixtures: updatedFixtures };
  const roundFixtures = updatedFixtures.filter((item) => roundForFixture(item) === fixtureRound);
  if (roundFixtures.some(({ status }) => status !== 'played')) return settled;

  if (fixtureRound === 'quarterfinal') {
    return populateNextRound(settled, 'semifinal', roundWinners(roundFixtures));
  }
  if (fixtureRound === 'semifinal') {
    return populateNextRound(settled, 'final', roundWinners(roundFixtures));
  }

  return {
    ...settled,
    currentRound: 'complete',
    winnerClubId,
    completed: true,
  };
};

const makeRoundFixtures = (
  round: 'qf' | 'sf' | 'final',
  week: number,
  seasonYear: string,
  teams: readonly string[],
): ProFixture[] => {
  const fixtures: ProFixture[] = [];
  for (let index = 0; index < teams.length; index += 2) {
    const fixtureIndex = index / 2 + 1;
    fixtures.push({
      id: `${CUP_ID}-${round}-${fixtureIndex}`,
      weekKey: `${seasonYear}-W${String(week).padStart(2, '0')}`,
      competitionId: CUP_ID,
      homeClubId: teams[index]!,
      awayClubId: teams[index + 1]!,
      status: 'scheduled',
      resultId: null,
    });
  }
  return fixtures;
};

const roundForFixture = (fixture: ProFixture): Exclude<CupRound, 'complete'> => {
  if (fixture.id.includes('-qf-')) return 'quarterfinal';
  if (fixture.id.includes('-sf-')) return 'semifinal';
  if (fixture.id.includes('-final-')) return 'final';
  throw new Error(`未知杯赛轮次：${fixture.id}`);
};

const isCupSlot = (clubId: string): boolean => clubId.startsWith(CUP_SLOT_PREFIX);

const roundWinners = (fixtures: readonly ProFixture[]): string[] =>
  fixtures
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ resultId }) => {
      if (!resultId?.startsWith('cup-winner-')) throw new Error('已结算杯赛缺少赢家引用');
      return resultId.slice('cup-winner-'.length);
    });

const populateNextRound = (
  cup: ProCupState,
  nextRound: 'semifinal' | 'final',
  winners: readonly string[],
): ProCupState => {
  const prefix = nextRound === 'semifinal' ? 'sf' : 'final';
  const nextFixtures = cup.fixtures.map((fixture) => {
    if (!fixture.id.includes(`-${prefix}-`)) return fixture;
    const index = Number(fixture.id.split('-').at(-1)) - 1;
    return {
      ...fixture,
      homeClubId: winners[index * 2] ?? fixture.homeClubId,
      awayClubId: winners[index * 2 + 1] ?? fixture.awayClubId,
    };
  });
  return { ...cup, fixtures: nextFixtures, currentRound: nextRound };
};
