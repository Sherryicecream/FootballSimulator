import type { CareerLedgerEntryV2, CareerSaveV5Like, SeasonHonour } from '@football/contracts';

export type CareerTier = 'legend' | 'world-class' | 'national' | 'solid' | 'ordinary';
export type CareerReplayMomentKind =
  'story' | 'match' | 'relationship' | 'international' | 'contract' | 'milestone' | 'health';

export interface CareerReplayMoment {
  evidenceId: string;
  timeKey: string;
  kind: CareerReplayMomentKind;
  title: string;
  summary: string;
  participantIds: string[];
  sourceType: CareerLedgerEntryV2['type'];
}

export type CareerGoalStatus = 'complete' | 'in-progress';

export interface CareerGoal {
  id: string;
  label: string;
  progress: number;
  target: number;
  status: CareerGoalStatus;
  evidenceIds: string[];
}

export interface CareerReviewData {
  tier: CareerTier;
  tierLabel: string;
  commentary: string;
  seasons: number;
  replay: CareerReplayMoment[];
  goals: CareerGoal[];
  totals: { appearances: number; goals: number; assists: number; minutes: number };
  caps: number;
  nationalGoals: number;
  clubs: number;
  honours: SeasonHonour[];
  overseasSpells: boolean;
  timeline: Array<{
    seasonId: string;
    status: string;
    appearances: number;
    goals: number;
    avgRating: number | null;
  }>;
}

const TIER_LABELS: Record<CareerTier, string> = {
  legend: '传奇生涯',
  'world-class': '世界级生涯',
  national: '国脚级生涯',
  solid: '稳健生涯',
  ordinary: '平凡生涯',
};

const COMMENTARY: Record<CareerTier, string> = {
  legend:
    '这是一个足以载入史册的名字。从青训营的清晨到世界之巅的夜晚，你用无数个决定的瞬间堆出了传奇——后来者会沿着你的足迹继续追梦。',
  'world-class':
    '你成为了世界足坛响当当的人物。不是每个人都能站上最高的领奖台，但你用稳定而耀眼的表现赢得了全世界的尊重。',
  national:
    '你披上了国家队的战袍，在最重要的赛场上代表了自己的祖国。这是一段值得骄傲、值得讲给孩子听的职业生涯。',
  solid:
    '没有惊天动地的荣誉，但你把职业生涯经营得踏实而长久。每一份合同、每一次出场，都是对足球最朴素的热爱。',
  ordinary:
    '这是一个普通人的足球生涯。有过高光，也有过迷茫，但你坚持到了最后一步——对热爱的事而言，坚持本身就是答案。',
};

/** 生涯回顾（设计 §9）：完全由存档数据确定，可对账。 */
export const buildCareerReview = (save: CareerSaveV5Like): CareerReviewData => {
  const reputation = save.player.reputation;
  const caps = save.nationalTeam?.caps ?? 0;
  const tier: CareerTier =
    reputation >= 80 || caps >= 80
      ? 'legend'
      : reputation >= 70
        ? 'world-class'
        : reputation >= 60 || caps >= 20
          ? 'national'
          : reputation >= 45
            ? 'solid'
            : 'ordinary';
  const careerClubIds = new Set([
    ...save.clubHistory.map(({ clubId }) => clubId),
    ...save.loanHistory.map(({ loanClubId }) => loanClubId),
  ]);
  const honours = save.seasonHistory.flatMap(({ honours: seasonHonours }) => seasonHonours);

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    commentary: COMMENTARY[tier],
    replay: buildReplay(save),
    goals: buildGoals(save),
    seasons: save.seasonHistory.length,
    totals: save.totals,
    caps,
    nationalGoals: save.nationalTeam?.goals ?? 0,
    clubs: careerClubIds.size,
    honours,
    overseasSpells:
      save.overseasSince !== null ||
      save.clubHistory.some(({ clubId }) => clubId.startsWith('ov-')) ||
      save.loanHistory.some(({ loanClubId }) => loanClubId.startsWith('ov-')),
    timeline: save.seasonHistory.map(({ seasonId, status, appearances, goals, avgRating }) => ({
      seasonId,
      status,
      appearances,
      goals,
      avgRating,
    })),
  };
};
const REPLAY_KIND_BY_LEDGER_TYPE: Partial<
  Record<CareerLedgerEntryV2['type'], CareerReplayMomentKind>
> = {
  event: 'story',
  decision: 'story',
  match: 'match',
  'pro-match': 'match',
  relationship: 'relationship',
  'national-debut': 'international',
  'contract-signed': 'contract',
  'renewal-offer': 'contract',
  'renewal-signed': 'contract',
  'transfer-signed': 'contract',
  health: 'health',
  'first-team': 'milestone',
  'season-outcome': 'milestone',
  'offseason-settlement': 'milestone',
  'promise-review': 'milestone',
  retirement: 'milestone',
};

const REPLAY_TITLES: Record<CareerReplayMomentKind, string> = {
  story: '关键选择',
  match: '关键比赛',
  relationship: '关系转折',
  international: '国家队节点',
  contract: '合同节点',
  milestone: '生涯节点',
  health: '身体状态',
};

const isKeyMatch = (entry: CareerLedgerEntryV2): boolean => {
  if (!entry.matchContext) return true;
  const { goals, assists, rating, opponentStrength } = entry.matchContext;
  return goals > 0 || assists > 0 || (rating !== null && rating >= 7.5) || opponentStrength >= 75;
};

const buildReplay = (save: CareerSaveV5Like): CareerReplayMoment[] => {
  const moments = save.ledger.flatMap((entry): CareerReplayMoment[] => {
    const kind = REPLAY_KIND_BY_LEDGER_TYPE[entry.type];
    if (!kind || (kind === 'match' && !isKeyMatch(entry))) return [];
    return [
      {
        evidenceId: entry.id,
        timeKey: entry.weekKey,
        kind,
        title: REPLAY_TITLES[kind],
        summary: entry.summary,
        participantIds: [...entry.participantIds],
        sourceType: entry.type,
      },
    ];
  });
  if (moments.length > 0) return moments;
  return save.seasonHistory.map((season) => ({
    evidenceId: season.seasonId,
    timeKey: season.endedOn,
    kind: 'milestone' as const,
    title: '赛季节点',
    summary: `第${season.age}岁赛季结束：出场 ${season.appearances} 次，进球 ${season.goals} 个，助攻 ${season.assists} 次。`,
    participantIds: [],
    sourceType: 'season-outcome' as const,
  }));
};

const goalStatus = (progress: number, target: number): CareerGoalStatus =>
  progress >= target ? 'complete' : 'in-progress';

const buildGoals = (save: CareerSaveV5Like): CareerGoal[] => {
  const evidenceIdsFor = (...types: CareerLedgerEntryV2['type'][]) =>
    save.ledger.filter((entry) => types.includes(entry.type)).map(({ id }) => id);
  const professionalAppearances = save.seasonHistory
    .filter(({ seasonId }) => seasonId.startsWith('pro-'))
    .reduce((total, season) => total + season.appearances, 0);
  const storyProgress = Math.min(save.story.completedStoryIds.length, 3);
  const goals: Array<Omit<CareerGoal, 'status'>> = [
    {
      id: 'professional-contract',
      label: '拿到第一份职业合同',
      progress: save.contract !== null || save.clubHistory.length > 0 ? 1 : 0,
      target: 1,
      evidenceIds: evidenceIdsFor('contract-signed', 'transfer-signed'),
    },
    {
      id: 'first-team-appearance',
      label: '在职业赛场留下脚印',
      progress: professionalAppearances > 0 ? 1 : 0,
      target: 1,
      evidenceIds: evidenceIdsFor('pro-match', 'first-team'),
    },
    {
      id: 'international-cap',
      label: '代表国家队出场',
      progress: save.nationalTeam?.caps ?? 0,
      target: 1,
      evidenceIds: evidenceIdsFor('national-debut'),
    },
    {
      id: 'long-career',
      label: '完成十个赛季',
      progress: Math.min(save.seasonHistory.length, 10),
      target: 10,
      evidenceIds: save.seasonHistory.map(({ seasonId }) => seasonId),
    },
    {
      id: 'story-decisions',
      label: '留下自己的选择',
      progress: storyProgress,
      target: 3,
      evidenceIds: evidenceIdsFor('event', 'decision'),
    },
  ];
  return goals.map((goal) => ({ ...goal, status: goalStatus(goal.progress, goal.target) }));
};
