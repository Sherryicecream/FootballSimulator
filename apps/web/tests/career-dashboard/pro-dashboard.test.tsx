import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CareerSaveV4Schema } from '@football/contracts';
import { ProDashboard } from '../../src/career-dashboard/ProDashboard';
import { ProOffseasonPanel } from '../../src/career-dashboard/ProOffseasonPanel';

const proClubs = Array.from({ length: 6 }, (_, index) => ({
  id: `pro-club-${index + 1}`,
  name: `职业俱乐部${index + 1}`,
  tier: 5,
  regionId: 'test',
  positionalNeeds: ['FORWARD'],
  youthCycle: 'stable',
  wageBudget: 44,
}));

const baseV4 = CareerSaveV4Schema.parse({
  schemaVersion: 4,
  contentVersion: 'test-1',
  careerId: 'career-pro',
  player: {
    identity: {
      name: '林河',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-01-01',
      primaryPosition: 'FORWARD',
      preferredFoot: 'RIGHT',
      weakFootLevel: 35,
      growthBackground: 'academy',
      personalityTendency: 'composed',
    },
    attributes: {
      technical: {
        firstTouch: 60,
        dribbling: 60,
        passing: 60,
        shooting: 65,
        defending: 40,
        aerialAbility: 55,
      },
      physical: { pace: 70, strength: 60, stamina: 65, agility: 65 },
      mental: {
        offTheBall: 66,
        vision: 60,
        decision: 62,
        composure: 60,
        determination: 70,
        discipline: 65,
      },
    },
    development: {
      attributePotential: {
        technical: {
          firstTouch: 75,
          dribbling: 75,
          passing: 72,
          shooting: 80,
          defending: 50,
          aerialAbility: 60,
        },
        physical: { pace: 82, strength: 70, stamina: 74, agility: 72 },
        mental: {
          offTheBall: 78,
          vision: 70,
          decision: 70,
          composure: 68,
          determination: 80,
          discipline: 72,
        },
      },
      maturationPace: 'normal',
      professionalism: 70,
      stability: 60,
      pressureResistance: 60,
      adaptability: 60,
      injuryProneness: 20,
    },
    age: 18,
    careerStage: 'PROFESSIONAL',
    reputation: 20,
  },
  season: {
    id: 'season-2024',
    startDate: '2024-09-01',
    endDate: '2025-06-30',
    currentDate: '2025-06-30',
    currentWeek: 44,
    currentMonth: '2025-06',
    academyId: 'home',
    fixtures: [],
    completed: true,
  },
  clubContext: {
    squadMembers: [],
    positionDepth: {
      CENTER_BACK: [],
      FULL_BACK: [],
      DEFENSIVE_MIDFIELDER: [],
      MIDFIELDER: [],
      WINGER: [],
      FORWARD: [],
    },
    playerRole: 'starter',
    coachEvaluation: 65,
    firstTeamStage: 'watchlist',
  },
  health: { fitness: 90, fatigue: 10, recentLoad: 20, activeInjury: null, previousInjuries: [] },
  currentState: { morale: 60, form: 65, confidence: 60 },
  trainingPlan: { focus: 'technical', intensity: 'normal', positionFocus: null },
  relationships: { persons: [], activeRelations: [] },
  story: {
    activeStorylines: [],
    completedStoryIds: [],
    cooldownsByEventId: {},
    pendingDelayedEffects: [],
    pendingEvent: null,
  },
  monthlyAdvance: {
    monthKey: '2027-08',
    nextWeekIndex: 0,
    totalWeeks: 4,
    status: 'report-ready',
    developmentAccrual: {},
    factIds: [],
    matchIds: [],
  },
  ledger: [],
  randomState: { seed: 42, sequencePosition: 0 },
  careerPhase: 'pro-season',
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
  pendingOffers: [],
  agentPreferences: null,
  offseason: null,
  seasonHistory: [],
  graduationPressure: 0,
  proSeason: {
    id: 'pro-2027',
    startDate: '2027-08-01',
    endDate: '2028-05-31',
    currentDate: '2027-08-15',
    currentWeek: 3,
    currentMonth: '2027-08',
    clubId: 'pro-club-1',
    competitionId: 'pro-league',
    fixtures: [],
    standings: proClubs.map(({ id }) => ({
      clubId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    })),
    squad: Array.from({ length: 17 }, (_, index) => ({
      personId: `pro-club-1-p${index + 1}`,
      name: `队友${index + 1}`,
      primaryPosition: index < 3 ? 'FORWARD' : 'MIDFIELDER',
      currentAbility: 55 + (index % 5),
      age: 24,
      form: 55,
      fitness: 88,
      minutesPlayed: 0,
    })),
    depthChart: {
      CENTER_BACK: ['pro-club-1-p4', 'pro-club-1-p5'],
      FULL_BACK: ['pro-club-1-p6', 'pro-club-1-p7'],
      DEFENSIVE_MIDFIELDER: ['pro-club-1-p8', 'pro-club-1-p9'],
      MIDFIELDER: ['pro-club-1-p10', 'pro-club-1-p11', 'pro-club-1-p12'],
      WINGER: ['pro-club-1-p13', 'pro-club-1-p14'],
      FORWARD: ['player', 'pro-club-1-p1', 'pro-club-1-p2', 'pro-club-1-p3'],
    },
    completed: false,
  },
  proSeasonStats: {
    leagueAppearances: 2,
    reserveAppearances: 0,
    minutes: 150,
    goals: 1,
    assists: 1,
    ratingSum: 13.4,
    ratingCount: 2,
  },
  promiseReviews: [],
  proPhase: 'league',
});

const save = baseV4;

const competitionCup = {
  id: 'domestic-cup-2027',
  name: '国内杯',
  competitionId: 'domestic-cup',
  entrants: Array.from({ length: 8 }, (_, index) => 'pro-club-' + (index + 1)),
  fixtures: [
    {
      id: 'domestic-cup-qf-1',
      weekKey: '2027-W27',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-1',
      awayClubId: 'pro-club-2',
      status: 'played' as const,
      resultId: 'cup-winner-pro-club-1',
    },
    {
      id: 'domestic-cup-qf-2',
      weekKey: '2027-W27',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-3',
      awayClubId: 'pro-club-4',
      status: 'played' as const,
      resultId: 'cup-winner-pro-club-3',
    },
    {
      id: 'domestic-cup-qf-3',
      weekKey: '2027-W27',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-5',
      awayClubId: 'pro-club-6',
      status: 'played' as const,
      resultId: 'cup-winner-pro-club-5',
    },
    {
      id: 'domestic-cup-qf-4',
      weekKey: '2027-W27',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-7',
      awayClubId: 'pro-club-8',
      status: 'played' as const,
      resultId: 'cup-winner-pro-club-7',
    },
    {
      id: 'domestic-cup-sf-1',
      weekKey: '2027-W33',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-1',
      awayClubId: 'pro-club-3',
      status: 'scheduled' as const,
      resultId: null,
    },
    {
      id: 'domestic-cup-sf-2',
      weekKey: '2027-W33',
      competitionId: 'domestic-cup',
      homeClubId: 'pro-club-5',
      awayClubId: 'pro-club-7',
      status: 'scheduled' as const,
      resultId: null,
    },
    {
      id: 'domestic-cup-final-1',
      weekKey: '2027-W39',
      competitionId: 'domestic-cup',
      homeClubId: 'cup-slot-sf-1-winner',
      awayClubId: 'cup-slot-sf-2-winner',
      status: 'scheduled' as const,
      resultId: null,
    },
  ],
  currentRound: 'semifinal' as const,
  winnerClubId: null,
  completed: false,
};

const saveWithCompetitionDepth = CareerSaveV4Schema.parse({
  ...save,
  proSeason: {
    ...save.proSeason!,
    nextClubTier: 6,
    domesticCup: competitionCup,
    standings: save.proSeason!.standings.map((standing, index) => ({
      ...standing,
      played: 3,
      won: index === 1 ? 3 : index === 0 ? 2 : 0,
      drawn: index === 0 ? 1 : 0,
      lost: index < 2 ? 0 : 3,
      points: index === 1 ? 9 : index === 0 ? 7 : 0,
    })),
  },
  proSeasonStats: {
    ...save.proSeasonStats,
    cupAppearances: 2,
    cupMinutes: 150,
    cupGoals: 1,
    cupAssists: 1,
  },
});

const settledSaveWithHonours = CareerSaveV4Schema.parse({
  ...saveWithCompetitionDepth,
  careerPhase: 'pro-offseason',
  proSeason: {
    ...saveWithCompetitionDepth.proSeason!,
    completed: true,
    domesticCup: {
      ...competitionCup,
      currentRound: 'complete' as const,
      winnerClubId: 'pro-club-1',
      completed: true,
    },
  },
  seasonHistory: [
    {
      seasonId: 'pro-2027',
      age: 19,
      status: 'retained',
      appearances: 10,
      goals: 2,
      assists: 3,
      avgRating: 7.1,
      signals: ['稳定轮换'],
      endedOn: '2028-05-31',
      honours: [
        {
          id: 'honour-cup-2027',
          kind: 'cup-champion',
          label: '国内杯冠军',
          seasonId: 'pro-2027',
          clubId: 'pro-club-1',
          evidenceId: 'pro-season-outcome-pro-2027',
        },
      ],
    },
  ],
});

const legacySettledSave = CareerSaveV4Schema.parse({
  ...save,
  careerPhase: 'pro-offseason',
  proSeason: {
    ...save.proSeason!,
    completed: true,
    domesticCup: null,
    nextClubTier: null,
  },
});
describe('ProDashboard', () => {
  it('展示俱乐部、深度图排位、积分榜与合同剩余年限', () => {
    render(
      <ProDashboard
        save={save}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onNewCareer={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: '职业俱乐部1' })).toBeVisible();
    expect(screen.getByText('位置深度图（前锋）')).toBeVisible();
    expect(screen.getByText(/林河（你）/)).toBeVisible();
    expect(screen.getByText('联赛积分榜')).toBeVisible();
    expect(screen.getByText(/合同剩余/)).toBeVisible();
    expect(screen.getByRole('button', { name: '推进到下个月' })).toBeEnabled();
  });

  it('不把上一赛季的杯赛事实误显示为本赛季最近结果', () => {
    const previousSeason = CareerSaveV4Schema.parse({
      ...save,
      ledger: [
        {
          id: 'old-cup-match',
          weekKey: '2026-W39',
          type: 'pro-match' as const,
          summary: '上一赛季杯赛：旧对手 9:9',
          participantIds: ['player'],
          matchContext: {
            competitionId: 'domestic-cup',
            teamImpact: 0,
            opponentStrength: 55,
            isHome: true,
            played: true,
            minutesPlayed: 90,
            rating: 7,
            goals: 0,
            assists: 0,
          },
        },
      ],
    });
    render(
      <ProDashboard
        save={previousSeason}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onNewCareer={() => {}}
      />,
    );

    const region = screen.getByRole('region', { name: '本赛季赛事' });
    expect(region).not.toHaveTextContent('上一赛季杯赛');
    expect(region).toHaveTextContent('本赛季暂无杯赛记录');
  });

  it('积分榜表头加六支球队', () => {
    const withTable = CareerSaveV4Schema.parse({
      ...save,
      proSeason: {
        ...save.proSeason!,
        standings: save.proSeason!.standings.map((standing, index) => ({
          ...standing,
          played: 4,
          won: Math.max(0, 4 - index),
          lost: Math.min(4, index),
          points: Math.max(0, 4 - index) * 3,
        })),
      },
    });
    render(
      <ProDashboard
        save={withTable}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onNewCareer={() => {}}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(7);
  });
  it('展示联赛排名、杯赛轮次、最近结果与层级变化', () => {
    render(
      <ProDashboard
        save={saveWithCompetitionDepth}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onNewCareer={() => {}}
      />,
    );
    const region = screen.getByRole('region', { name: '本赛季赛事' });
    expect(region).toHaveTextContent('联赛第 2 名');
    expect(region).toHaveTextContent('半决赛');
    expect(region).toHaveTextContent('升级');
    expect(region).toHaveTextContent('最近杯赛');
    expect(screen.getByText('联赛出场')).toBeVisible();
    expect(screen.getByText('杯赛出场')).toBeVisible();
  });

  it('租借时区分实际参赛队与合同母队', () => {
    const loaned = {
      ...save,
      activeLoan: {
        parentClubId: 'pro-club-1',
        parentClubName: '东海职业',
        parentClubTier: 5,
        loanClubId: 'loan-club-1',
        loanClubName: '山谷联',
        loanClubTier: 6,
        startedOn: '2027-08-01',
        returnsOn: '2028-05-31',
        seasonId: 'pro-2027',
      },
    };
    render(
      <ProDashboard
        save={loaned}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onNewCareer={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: '山谷联' })).toBeVisible();
    expect(screen.getByRole('region', { name: '租借状态' })).toHaveTextContent(
      '合同归属：东海职业',
    );
    expect(screen.getByRole('region', { name: '租借状态' })).toHaveTextContent(
      '赛季末自动回归：2028-05-31',
    );
  });
});

describe('ProOffseasonPanel', () => {
  it('展示赛季数据与承诺对照，无到期合同时提供开始下赛季', () => {
    const settled = CareerSaveV4Schema.parse({
      ...save,
      careerPhase: 'pro-offseason',
      proSeason: { ...save.proSeason!, completed: true },
      promiseReviews: [
        {
          seasonId: save.proSeason!.id,
          share: 0.42,
          promisedShare: 0.3,
          status: 'kept',
          cause: 'none',
          evaluatedOn: save.proSeason!.endDate,
        },
      ],
      contract: save.contract
        ? { ...save.contract, seasonsCompleted: 1, promiseStatus: 'kept' }
        : null,
    });
    const onStart = vi.fn();
    render(
      <ProOffseasonPanel
        save={settled}
        onStartNextSeason={onStart}
        onAcceptRenewal={() => {}}
        onDeclineRenewal={() => {}}
      />,
    );
    expect(screen.getByText('职业赛季总结')).toBeVisible();
    expect(screen.getByRole('region', { name: '足球场景：职业赛季总结' })).toHaveAttribute(
      'data-scene-kind',
      'locker-room',
    );
    expect(screen.getByText('合同承诺对照：已兑现')).toBeVisible();
    expect(screen.getByText(/出场份额 42%（承诺 30%）/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '开始下个职业赛季' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('展示永久转会与租借机会入口，并标明当前租借归属', () => {
    const loanSave = {
      ...settledSaveWithHonours,
      activeLoan: {
        parentClubId: settledSaveWithHonours.contract!.clubId,
        parentClubName: settledSaveWithHonours.contract!.clubName,
        parentClubTier: settledSaveWithHonours.contract!.clubTier,
        loanClubId: 'loan-club-1',
        loanClubName: '山谷联',
        loanClubTier: 5,
        startedOn: '2028-08-01',
        returnsOn: '2029-05-31',
        seasonId: settledSaveWithHonours.proSeason!.id,
      },
    };
    const onRequestMarket = vi.fn();
    const onSignMarketOffer = vi.fn();
    render(
      <ProOffseasonPanel
        save={loanSave}
        onStartNextSeason={() => {}}
        onAcceptRenewal={() => {}}
        onDeclineRenewal={() => {}}
        onRetire={() => {}}
        onRequestMarket={onRequestMarket}
        onSignMarketOffer={onSignMarketOffer}
      />,
    );
    expect(screen.getByRole('button', { name: '寻找永久转会' })).toBeVisible();
    expect(screen.getByRole('button', { name: '寻找租借机会' })).toBeVisible();
    expect(screen.getByText(/当前参赛队：山谷联/)).toBeVisible();
    expect(screen.getByText(/合同归属：职业俱乐部1/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '寻找租借机会' }));
    expect(onRequestMarket).toHaveBeenCalledWith('loan');
  });

  it('合同到期展示续约确认，并可拒绝成为自由球员', () => {
    const expiring = CareerSaveV4Schema.parse({
      ...save,
      careerPhase: 'pro-offseason',
      proSeason: { ...save.proSeason!, completed: true },
      pendingOffers: [
        {
          id: 'renewal-pro-2027',
          clubId: 'pro-club-1',
          clubName: '职业俱乐部1',
          clubTier: 5,
          salaryPerYear: 9500,
          contractYears: 2,
          squadRole: 'rotation',
          promise: { kind: 'playing-time', minimumShare: 0.3 },
          releaseClauseNote: '',
        },
      ],
    });
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <ProOffseasonPanel
        save={expiring}
        onStartNextSeason={() => {}}
        onAcceptRenewal={onAccept}
        onDeclineRenewal={onDecline}
      />,
    );
    expect(screen.getByText('合同到期')).toBeVisible();
    expect(screen.getByText(/年薪 9,500/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '接受续约' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '拒绝续约，成为自由球员' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
  it('展示本赛季球队表现与荣誉，并兼容没有杯赛和荣誉的旧存档', () => {
    const { rerender } = render(
      <ProOffseasonPanel
        save={settledSaveWithHonours}
        onStartNextSeason={() => {}}
        onAcceptRenewal={() => {}}
        onDeclineRenewal={() => {}}
        onRetire={() => {}}
      />,
    );
    expect(screen.getByRole('region', { name: '球队赛季' })).toHaveTextContent('联赛第 2 名');
    expect(screen.getByRole('region', { name: '本赛季荣誉' })).toHaveTextContent('国内杯冠军');
    rerender(
      <ProOffseasonPanel
        save={legacySettledSave}
        onStartNextSeason={() => {}}
        onAcceptRenewal={() => {}}
        onDeclineRenewal={() => {}}
        onRetire={() => {}}
      />,
    );
    expect(screen.getByText('本赛季暂无荣誉')).toBeVisible();
    expect(screen.getByText('本赛季暂无杯赛记录')).toBeVisible();
  });
});
