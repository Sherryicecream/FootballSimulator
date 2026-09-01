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
});
