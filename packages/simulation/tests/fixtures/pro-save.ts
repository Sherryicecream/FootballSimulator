import { CareerSaveV4Schema, type CareerSaveV4, type ClubProfile } from '@football/contracts';
import { createLeagueStandings } from '../../src/world/league-season';
import { createLeagueFixtures } from '../../src/career/league-fixtures';
import { buildDepthChart, generateProSquad } from '../../src/career/pro-squad';
import { createSeededRandomSource } from '../../src/randomness';
import { createYouthSave } from './youth-save';

export const proClubs: ClubProfile[] = Array.from({ length: 6 }, (_, index) => ({
  id: `pro-club-${index + 1}`,
  name: `职业俱乐部${index + 1}`,
  tier: 5,
  regionId: 'test',
  positionalNeeds: ['FORWARD'],
  youthCycle: 'stable',
  wageBudget: 44,
}));

/** 构造一名已签约、处于职业赛季中的 v4 存档。 */
export const createProSave = (overrides: Partial<CareerSaveV4> = {}): CareerSaveV4 => {
  const base = CareerSaveV4Schema.parse({
    ...createYouthSave(),
    schemaVersion: 4,
    careerPhase: 'professional-contract',
    contract: {
      id: 'offer-1',
      clubId: 'pro-club-1',
      clubName: '职业俱乐部1',
      clubTier: 5,
      salaryPerYear: 9000,
      contractYears: 3,
      squadRole: 'rotation',
      promise: { kind: 'playing-time', minimumShare: 0.3 },
      releaseClauseNote: '',
      signedOn: '2027-07-01',
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
  });

  const club = proClubs[0]!;
  const squad = generateProSquad(club, 'FORWARD', 60, createSeededRandomSource(99));
  const fixtures = createLeagueFixtures(
    proClubs.map(({ id }) => id),
    'pro-league',
    7,
    '2027',
  );
  const depthChart = buildDepthChart(squad);
  depthChart.FORWARD = ['player', ...(depthChart.FORWARD ?? [])];

  return CareerSaveV4Schema.parse({
    ...base,
    careerPhase: 'pro-season',
    proPhase: 'league',
    proSeason: {
      id: 'pro-2027',
      startDate: '2027-08-01',
      endDate: '2028-05-31',
      currentDate: '2027-08-01',
      currentWeek: 1,
      currentMonth: '2027-08',
      clubId: 'pro-club-1',
      competitionId: 'pro-league',
      fixtures,
      standings: createLeagueStandings(proClubs.map(({ id }) => id)),
      squad,
      depthChart,
      completed: false,
    },
    proSeasonStats: {
      leagueAppearances: 0,
      reserveAppearances: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
    },
    promiseReviews: [],
    ...overrides,
  });
};
