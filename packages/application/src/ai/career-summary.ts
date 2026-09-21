import {
  CareerSummaryFactsSchema,
  type CareerArchiveV1,
  type CareerSaveV5Like,
  type CareerSaveV6Like,
  type CareerSummaryFacts,
  type CareerSummaryMode,
} from '@football/contracts';
import { buildCareerReview } from '@football/simulation';

type CareerSummarySave = CareerSaveV5Like | CareerSaveV6Like;
export type CareerSummarySource = CareerSummarySave | CareerArchiveV1;

const POSITION_LABELS: Record<string, string> = {
  FORWARD: '前锋',
  WINGER: '边锋',
  MIDFIELDER: '中场',
  FULL_BACK: '边后卫',
  CENTER_BACK: '中后卫',
  GOALKEEPER: '门将',
};

const isArchive = (source: CareerSummarySource): source is CareerArchiveV1 =>
  'review' in source && 'history' in source;

const clampSummary = (text: string, mode: CareerSummaryMode): string => {
  const min = mode === 'short' ? 150 : 400;
  const max = mode === 'short' ? 250 : 800;
  let result = text.replace(/\s+/g, ' ').trim();
  if (result.length > max) result = result.slice(0, max - 1) + '。';
  const padding =
    '这段经历没有被简单的成败概括，而是由每一次训练、每一次选择和每一个仍然愿意坚持的日子共同组成。';
  while (result.length < min) result += padding;
  return result.slice(0, max);
};

const positionLabel = (position: string): string => POSITION_LABELS[position] ?? position;

export const buildCareerSummaryFacts = (source: CareerSummarySource): CareerSummaryFacts => {
  const review = isArchive(source) ? source.review : buildCareerReview(source);
  const player = source.player;
  const nationalTeam = isArchive(source) ? source.history.nationalTeam : source.nationalTeam;
  const clubHistory = isArchive(source) ? source.history.clubHistory : source.clubHistory;
  const seasonHistory = isArchive(source) ? source.history.seasonHistory : source.seasonHistory;
  const careerEnd = isArchive(source)
    ? source.careerEnd
    : 'careerEnd' in source
      ? source.careerEnd
      : null;

  const timeline = review.timeline.map((season) => ({
    ...season,
    assists: seasonHistory.find(({ seasonId }) => seasonId === season.seasonId)?.assists ?? 0,
    evidenceIds: [season.seasonId],
  }));
  const endingEvidenceIds = careerEnd?.evidenceIds ?? [];
  const keyMoments =
    review.replay.length > 0
      ? review.replay.slice(0, 20).map(({ evidenceId, kind, title, summary }) => ({
          evidenceId,
          kind,
          title,
          summary,
        }))
      : timeline.slice(0, 1).map((season) => ({
          evidenceId: season.seasonId,
          kind: 'milestone',
          title: '赛季节点',
          summary:
            '赛季记录显示：出场 ' +
            season.appearances +
            ' 次，进球 ' +
            season.goals +
            ' 个，助攻 ' +
            season.assists +
            ' 次。',
        }));
  const evidenceIds = new Set<string>([
    ...review.replay.map(({ evidenceId }) => evidenceId),
    ...review.honours.map(({ evidenceId }) => evidenceId),
    ...review.timeline.map(({ seasonId }) => seasonId),
    ...review.goals.flatMap(({ evidenceIds: ids }) => ids),
    ...review.behindTheScenes.missedOpportunities.flatMap(({ evidenceIds: ids }) => ids),
    ...endingEvidenceIds,
  ]);
  keyMoments.forEach(({ evidenceId }) => evidenceIds.add(evidenceId));

  const facts = {
    player: {
      name: player.identity.name,
      hometown: player.identity.hometown,
      position: positionLabel(player.identity.primaryPosition),
      country: player.identity.country ?? null,
    },
    tierLabel: review.tierLabel,
    ending: review.ending
      ? {
          label: review.ending.label,
          summary: review.ending.summary,
          endedOn: review.ending.endedOn,
        }
      : null,
    seasons: review.seasons,
    clubs: review.clubs,
    totals: review.totals,
    nationalTeam: {
      capped: nationalTeam?.capped ?? false,
      caps: nationalTeam?.caps ?? 0,
      goals: nationalTeam?.goals ?? 0,
    },
    overseasSpells: review.overseasSpells,
    clubHistory: clubHistory.map(({ clubName, from, to, seasons, appearances, goals }) => ({
      clubName,
      from,
      to,
      seasons,
      appearances,
      goals,
      evidenceIds: [],
    })),
    honours: review.honours.map(({ evidenceId, kind, label, seasonId }) => ({
      evidenceId,
      kind,
      label,
      seasonId,
    })),
    seasonsTimeline: timeline,
    keyMoments,
    dimensions: review.dimensions,
    behindTheScenes: {
      potentials: review.behindTheScenes.potentials.map(({ label, fulfillment }) => ({
        label,
        fulfillment,
      })),
      traits: review.behindTheScenes.traits.map(({ label, value }) => ({ label, value })),
      missedOpportunities: review.behindTheScenes.missedOpportunities,
    },
    evidenceIds: [...evidenceIds],
  };
  return CareerSummaryFactsSchema.parse(facts);
};

const nationalSummary = (facts: CareerSummaryFacts): string =>
  facts.nationalTeam.capped
    ? '国家队留下了 ' +
      facts.nationalTeam.caps +
      ' 次出场和 ' +
      facts.nationalTeam.goals +
      ' 个进球'
    : '未入选国家队，没有国家队出场和进球记录';

const honoursSummary = (facts: CareerSummaryFacts): string =>
  facts.honours.length > 0
    ? '荣誉包括' + facts.honours.map(({ label }) => label).join('、')
    : '没有记录在案的生涯荣誉';

const turningPointSummary = (facts: CareerSummaryFacts): string =>
  facts.keyMoments[0]?.summary ?? '档案中没有可供复述的关键转折点，能够确认的事实将保持为空白';

export const generateCareerSummary = (
  facts: CareerSummaryFacts,
  mode: CareerSummaryMode,
): string => {
  const firstMoment = turningPointSummary(facts);
  const ending = facts.ending
    ? '最终以“' +
      facts.ending.label +
      '”结束，日期是 ' +
      facts.ending.endedOn +
      '。' +
      facts.ending.summary
    : '目前仍以生涯进行中的资料为依据，未添加退役结论。';
  const short =
    facts.player.name +
    '，来自' +
    facts.player.hometown +
    '的' +
    facts.player.position +
    '，留下了' +
    facts.tierLabel +
    '。生涯共 ' +
    facts.seasons +
    ' 个赛季，效力 ' +
    facts.clubs +
    ' 家俱乐部，累计出场 ' +
    facts.totals.appearances +
    ' 次、进球 ' +
    facts.totals.goals +
    ' 个、助攻 ' +
    facts.totals.assists +
    ' 次。' +
    firstMoment +
    nationalSummary(facts) +
    '；' +
    honoursSummary(facts) +
    '。' +
    ending;
  if (mode === 'short') return clampSummary(short, mode);

  const path =
    facts.clubHistory.length > 0
      ? '效力轨迹包括' +
        facts.clubHistory
          .map(
            ({ clubName, seasons, appearances, goals }) =>
              clubName + '（' + seasons + ' 个赛季，' + appearances + ' 次出场，' + goals + ' 球）',
          )
          .join('、') +
        '。'
      : '没有记录在案的俱乐部履历。';
  const seasons =
    facts.seasonsTimeline.length > 0
      ? '逐季记录中，' +
        facts.seasonsTimeline
          .map(
            ({ seasonId, appearances, goals, assists, avgRating }) =>
              seasonId +
              ' 出场 ' +
              appearances +
              ' 次、进球 ' +
              goals +
              ' 个、助攻 ' +
              assists +
              ' 次' +
              (avgRating == null ? '' : '，评分 ' + avgRating),
          )
          .join('；') +
        '。'
      : '没有可供展开的逐季统计。';
  const moments =
    facts.keyMoments.length > 0
      ? '关键节点包括' +
        facts.keyMoments.map(({ title, summary }) => title + '：' + summary).join('；') +
        '。'
      : '没有记录在案的关键节点。';
  const dimensions =
    facts.dimensions.length > 0
      ? '八维评价中，' +
        facts.dimensions
          .map(({ label, score, ratingLabel }) => label + score + '分（' + ratingLabel + '）')
          .join('、') +
        '。'
      : '没有可供展开的八维评价。';
  const behindScenes =
    facts.behindTheScenes.missedOpportunities.length > 0
      ? '幕后档案记录了' +
        facts.behindTheScenes.missedOpportunities.map(({ label }) => label).join('、') +
        '。'
      : '没有记录在案的错失机会；潜力与关系资料也只按存档中已有内容展示。';
  return clampSummary(
    short +
      path +
      seasons +
      moments +
      dimensions +
      behindScenes +
      '这份总结只复述已经结算的身份、履历、比赛与评价，不会用空白推断不存在的国家队经历、荣誉或人物故事。',
    mode,
  );
};
