import type { CareerLedgerEntryV2, MatchContext, MatchdayMoment } from '@football/contracts';

const DEFAULT_OPPONENT_STRENGTH = 55;
const MATCH_SUMMARY = /^(.+?)\s+(\d+):(\d+)(?:；|;)/;

export const buildMatchdayMoments = (facts: readonly CareerLedgerEntryV2[]): MatchdayMoment[] =>
  facts
    .filter((fact) => fact.type === 'match' || fact.type === 'pro-match')
    .map((fact) => buildMoment(fact))
    .filter((moment): moment is MatchdayMoment => moment !== null)
    .sort((left, right) => compareWeekKeys(left.weekKey, right.weekKey))
    .slice(0, 5);

const buildMoment = (fact: CareerLedgerEntryV2): MatchdayMoment | null => {
  const match = MATCH_SUMMARY.exec(fact.summary);
  if (!match) return null;
  const homeScore = Number(match[2]);
  const awayScore = Number(match[3]);
  const context = fact.matchContext ?? fallbackContext(fact.summary);
  const ownScore = context.isHome ? homeScore : awayScore;
  const opponentScore = context.isHome ? awayScore : homeScore;
  const result = ownScore > opponentScore ? 'win' : ownScore === opponentScore ? 'draw' : 'loss';
  const difficulty = difficultyFor(context.opponentStrength);
  const scoreline = homeScore + ':' + awayScore;
  const opponentName = match[1]!.trim();

  return {
    weekKey: fact.weekKey,
    opponentName,
    opponentStrength: context.opponentStrength,
    difficulty,
    scoreline,
    result,
    playerStatus: context.played ? 'played' : 'not-played',
    preMatch: preMatchCopy(opponentName, context.opponentStrength, difficulty),
    postMatch: postMatchCopy(opponentName, scoreline, result, context),
  };
};

const difficultyFor = (strength: number): MatchdayMoment['difficulty'] =>
  strength >= 68 ? 'difficult' : strength <= 48 ? 'favorable' : 'balanced';

const preMatchCopy = (
  opponentName: string,
  strength: number,
  difficulty: MatchdayMoment['difficulty'],
): string => {
  if (difficulty === 'difficult') {
    return '对手 ' + opponentName + ' 强度 ' + strength + '，这是一场高强度检验。';
  }
  if (difficulty === 'favorable') {
    return '对手 ' + opponentName + ' 强度 ' + strength + '，纸面上是一次可以拿分的机会。';
  }
  return '对手 ' + opponentName + ' 强度 ' + strength + '，双方实力接近，细节会决定比赛走向。';
};

const postMatchCopy = (
  opponentName: string,
  scoreline: string,
  result: MatchdayMoment['result'],
  context: MatchContext,
): string => {
  const outcome =
    result === 'win'
      ? '球队拿下 ' + opponentName + '（' + scoreline + '）'
      : result === 'draw'
        ? '球队与 ' + opponentName + ' 战平（' + scoreline + '）'
        : '球队对 ' + opponentName + ' 以 ' + scoreline + ' 告负';
  const performance = context.played
    ? '你出场 ' +
      context.minutesPlayed +
      ' 分钟' +
      (context.rating === null ? '' : '，评分 ' + context.rating)
    : '你没有获得出场机会';
  const contribution =
    context.goals + context.assists > 0
      ? '，贡献 ' + context.goals + ' 球 ' + context.assists + ' 助攻'
      : '';
  return outcome + '；' + performance + contribution + '。';
};

const fallbackContext = (summary: string): MatchContext => {
  const minutes = Number(/(?:出场|首发|替补)\s+(\d+)\s+分钟/.exec(summary)?.[1] ?? 0);
  const notPlayed = summary.includes('未出场');
  const rating = Number(/评分\s+(\d+(?:\.\d+)?)/.exec(summary)?.[1] ?? 0);
  const contribution = /(\d+)\s+球\s+(\d+)\s+助攻/.exec(summary);
  return {
    opponentStrength: DEFAULT_OPPONENT_STRENGTH,
    isHome: true,
    played: !notPlayed && minutes > 0,
    minutesPlayed: minutes,
    rating: rating > 0 ? rating : null,
    goals: Number(contribution?.[1] ?? 0),
    assists: Number(contribution?.[2] ?? 0),
  };
};

const compareWeekKeys = (left: string, right: string): number => {
  const leftNumber = Number(/-W(\d+)$/.exec(left)?.[1] ?? 0);
  const rightNumber = Number(/-W(\d+)$/.exec(right)?.[1] ?? 0);
  return leftNumber - rightNumber || left.localeCompare(right);
};
