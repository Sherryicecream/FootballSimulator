import type { CareerSaveV5Like } from '@football/contracts';

export type CareerTier = 'legend' | 'world-class' | 'national' | 'solid' | 'ordinary';

export interface CareerReviewData {
  tier: CareerTier;
  tierLabel: string;
  commentary: string;
  seasons: number;
  totals: { appearances: number; goals: number; assists: number; minutes: number };
  caps: number;
  nationalGoals: number;
  clubs: number;
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

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    commentary: COMMENTARY[tier],
    seasons: save.seasonHistory.length,
    totals: save.totals,
    caps,
    nationalGoals: save.nationalTeam?.goals ?? 0,
    clubs: save.clubHistory.length,
    overseasSpells: save.clubHistory.some(
      ({ clubId }) => save.overseasSince !== null || clubId.startsWith('ov-'),
    ),
    timeline: save.seasonHistory.map(({ seasonId, status, appearances, goals, avgRating }) => ({
      seasonId,
      status,
      appearances,
      goals,
      avgRating,
    })),
  };
};
