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

export type CareerDimensionKey =
  | 'competition'
  | 'team-honours'
  | 'individual'
  | 'loyalty'
  | 'national-team'
  | 'off-pitch'
  | 'relationships'
  | 'legendary';

export interface CareerDimension {
  key: CareerDimensionKey;
  label: string;
  score: number;
  ratingLabel: string;
  evidenceIds: string[];
}

export interface CareerPotentialItem {
  key: string;
  label: string;
  potential: number;
  achieved: number;
}

export interface CareerPotentialGroup {
  group: 'technical' | 'physical' | 'mental';
  label: string;
  items: CareerPotentialItem[];
  fulfillment: number;
}

export interface CareerTraitReveal {
  key: string;
  label: string;
  value: string;
  rawValue: string;
  note: string;
}

export interface CareerMissedOpportunity {
  id: string;
  label: string;
  detail: string;
  evidenceIds: string[];
}

export interface CareerBehindTheScenes {
  potentials: CareerPotentialGroup[];
  traits: CareerTraitReveal[];
  missedOpportunities: CareerMissedOpportunity[];
}

export interface CareerReviewData {
  tier: CareerTier;
  tierLabel: string;
  commentary: string;
  dimensions: CareerDimension[];
  behindTheScenes: CareerBehindTheScenes;
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

  const replay = buildReplay(save);
  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    commentary: COMMENTARY[tier],
    dimensions: buildDimensions(save, honours, replay),
    behindTheScenes: buildBehindTheScenes(save),
    replay,
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

const ATTRIBUTE_GROUP_LABELS: Record<'technical' | 'physical' | 'mental', string> = {
  technical: '技术',
  physical: '身体',
  mental: '精神',
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '空中能力',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '跑位',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '纪律',
};

const MATURATION_LABELS: Record<string, string> = {
  early: '早熟',
  normal: '常规',
  late: '晚熟',
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const ratingLabelFor = (score: number): string =>
  score >= 80 ? '卓越' : score >= 65 ? '出色' : score >= 45 ? '合格' : '平凡';

const dimension = (
  key: CareerDimensionKey,
  label: string,
  rawScore: number,
  evidenceIds: string[] = [],
): CareerDimension => {
  const score = clampScore(rawScore);
  return { key, label, score, ratingLabel: ratingLabelFor(score), evidenceIds };
};

const HONOUR_WEIGHTS: Record<SeasonHonour['kind'], number> = {
  'league-champion': 25,
  'cup-champion': 18,
  promotion: 8,
  relegation: -5,
};

const buildDimensions = (
  save: CareerSaveV5Like,
  honours: SeasonHonour[],
  replay: CareerReplayMoment[],
): CareerDimension[] => {
  const legendaryEvidence = replay.filter(
    ({ kind, sourceType }) =>
      kind === 'international' ||
      (kind === 'match' &&
        save.ledger.some(
          (entry) =>
            entry.id ===
            replay.find(({ evidenceId }) => evidenceId === entry.id)?.evidenceId,
        )),
  );
  const legendaryMatchCount = replay.filter(({ kind }) => kind === 'match').length;
  const championCount = honours.filter(
    ({ kind }) => kind === 'league-champion' || kind === 'cup-champion',
  ).length;

  const clubIds = new Set([
    ...save.clubHistory.map(({ clubId }) => clubId),
    ...save.loanHistory.map(({ loanClubId }) => loanClubId),
  ]);
  const clubCount = Math.max(clubIds.size, 1);
  const loyaltyBase = clubCount === 1 ? 90 : clubCount === 2 ? 60 : clubCount <= 4 ? 40 : 25;
  const loyaltyScore = loyaltyBase - (save.loanHistory.length > 0 ? 5 : 0);

  const proRatings = save.seasonHistory
    .filter(({ seasonId }) => seasonId.startsWith('pro-'))
    .map(({ avgRating }) => avgRating)
    .filter((rating): rating is number => rating !== null);
  const avgProRating =
    proRatings.length > 0 ? proRatings.reduce((a, b) => a + b, 0) / proRatings.length : 0;
  const doubleDigitGoalSeasons = save.seasonHistory.filter(({ goals }) => goals >= 10).length;

  const relationshipValues = save.relationships.persons.flatMap(({ relationship }) => [
    relationship.trust,
    relationship.respect,
    relationship.closeness,
  ]);
  const relationshipScore =
    relationshipValues.length > 0
      ? relationshipValues.reduce((a, b) => a + b, 0) / relationshipValues.length
      : 0;

  const legendaryScore =
    legendaryEvidence.length * 12 + legendaryMatchCount * 6 + championCount * 12;

  return [
    dimension('competition', '竞技水平', save.player.reputation),
    dimension(
      'team-honours',
      '团队荣誉',
      honours.reduce((total, { kind }) => total + HONOUR_WEIGHTS[kind], 0),
      honours.map(({ evidenceId }) => evidenceId),
    ),
    dimension(
      'individual',
      '个人表现',
      (avgProRating - 6.0) * 60 + doubleDigitGoalSeasons * 10,
      save.seasonHistory.filter(({ seasonId }) => seasonId.startsWith('pro-')).map(({ seasonId }) => seasonId),
    ),
    dimension('loyalty', '忠诚与身份', loyaltyScore, [...clubIds]),
    dimension(
      'national-team',
      '国家队贡献',
      (save.nationalTeam?.caps ?? 0) * 2.5 + (save.nationalTeam?.goals ?? 0),
      save.ledger.filter(({ type }) => type === 'national-debut').map(({ id }) => id),
    ),
    dimension(
      'off-pitch',
      '财富与场外人生',
      save.story.completedStoryIds.length * 8 + (save.overseasSince !== null ? 15 : 0),
      save.ledger.filter(({ type }) => type === 'event' || type === 'decision').map(({ id }) => id),
    ),
    dimension('relationships', '人际关系', relationshipScore),
    dimension('legendary', '传奇时刻', legendaryScore),
  ];
};

const buildBehindTheScenes = (save: CareerSaveV5Like): CareerBehindTheScenes => {
  const groups: CareerPotentialGroup['group'][] = ['technical', 'physical', 'mental'];
  const potentials = groups.map((group) => {
    const attributeRecord = save.player.attributes[group] as Record<string, number>;
    const potentialRecord = save.player.development.attributePotential[group] as Record<
      string,
      number
    >;
    const items = Object.keys(potentialRecord).map((key) => ({
      key,
      label: ATTRIBUTE_LABELS[key] ?? key,
      potential: potentialRecord[key] ?? 0,
      achieved: attributeRecord[key] ?? 0,
    }));
    const potentialMean =
      items.reduce((total, { potential }) => total + potential, 0) / Math.max(items.length, 1);
    const achievedMean =
      items.reduce((total, { achieved }) => total + achieved, 0) / Math.max(items.length, 1);
    return {
      group,
      label: ATTRIBUTE_GROUP_LABELS[group],
      items,
      fulfillment: potentialMean > 0 ? clampScore((achievedMean / potentialMean) * 100) : 0,
    };
  });

  const traits: CareerTraitReveal[] = [
    {
      key: 'maturationPace',
      label: '成长节奏',
      value: MATURATION_LABELS[save.player.development.maturationPace] ?? '常规',
      rawValue: save.player.development.maturationPace,
      note: '决定成长曲线早晚的隐藏倾向，退役后公开。',
    },
    {
      key: 'professionalism',
      label: '职业素养',
      value: String(save.player.development.professionalism),
      rawValue: String(save.player.development.professionalism),
      note: '影响训练收益与状态管理的长期稳定性。',
    },
    {
      key: 'stability',
      label: '稳定性',
      value: String(save.player.development.stability),
      rawValue: String(save.player.development.stability),
      note: '影响表现波动的幅度。',
    },
    {
      key: 'pressureResistance',
      label: '抗压能力',
      value: String(save.player.development.pressureResistance),
      rawValue: String(save.player.development.pressureResistance),
      note: '影响重要场合的临场发挥。',
    },
    {
      key: 'adaptability',
      label: '适应力',
      value: String(save.player.development.adaptability),
      rawValue: String(save.player.development.adaptability),
      note: '影响转会与留洋后的融入速度。',
    },
    {
      key: 'injuryProneness',
      label: '伤病倾向',
      value: String(save.player.development.injuryProneness),
      rawValue: String(save.player.development.injuryProneness),
      note: '影响伤病风险的隐藏体质。',
    },
  ];

  const missedOpportunities: CareerMissedOpportunity[] = [];
  for (const review of save.promiseReviews) {
    if (review.status !== 'broken') continue;
    const causeLabels: Record<string, string> = {
      injury: '伤病',
      club: '俱乐部原因',
      player: '自身原因',
    };
    missedOpportunities.push({
      id: `broken-promise-${review.cause}`,
      label: `承诺未能兑现（${causeLabels[review.cause] ?? review.cause}）`,
      detail: `${review.seasonId} 赛季的出场承诺最终兑现 ${Math.round(review.share * 100)}%（承诺 ${Math.round(review.promisedShare * 100)}%）。`,
      evidenceIds: [review.seasonId],
    });
  }
  if (
    save.story.completedStoryIds.includes('national-team-debut') &&
    save.nationalTeam?.capped !== true
  ) {
    missedOpportunities.push({
      id: 'declined-national-debut',
      label: '婉拒过国家队首召',
      detail: '你曾经拒绝了一次国家队征召，此后再没有等到下一次窗口。',
      evidenceIds: save.ledger
        .filter(({ summary }) => summary.includes('国家队'))
        .slice(-3)
        .map(({ id }) => id),
    });
  }
  if (save.freeAgentSeasons > 0) {
    missedOpportunities.push({
      id: 'free-agent-seasons',
      label: '自由球员滞留',
      detail: `生涯中有 ${save.freeAgentSeasons} 个休赛期未能及时找到下家，错过了在状态好时续约或转会的时机。`,
      evidenceIds: [],
    });
  }
  const severeInjuryFacts = save.ledger
    .filter(({ type, summary }) => type === 'health' && summary.includes('重伤'))
    .slice(-5);
  if (severeInjuryFacts.length > 0) {
    missedOpportunities.push({
      id: 'severe-injury',
      label: '严重伤病的代价',
      detail: `生涯共记录 ${severeInjuryFacts.length} 次严重伤病，每一次都改变了后续的出场与成长轨迹。`,
      evidenceIds: severeInjuryFacts.map(({ id }) => id),
    });
  }

  return { potentials, traits, missedOpportunities };
};
