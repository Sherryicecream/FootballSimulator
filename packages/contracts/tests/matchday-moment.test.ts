import { describe, expect, it } from 'vitest';
import { MatchdayMomentSchema } from '../src/youth-season';

describe('MatchdayMoment', () => {
  it('accepts a structured pre-match and post-match replay', () => {
    const moment = MatchdayMomentSchema.parse({
      weekKey: '2024-W03',
      opponentName: '海港青年队',
      opponentStrength: 74,
      difficulty: 'difficult',
      scoreline: '2:1',
      result: 'win',
      playerStatus: 'played',
      preMatch: '对手强度 74，这是一场高强度检验。',
      postMatch: '球队拿下比赛；你出场 70 分钟，评分 7.8。',
    });

    expect(moment.difficulty).toBe('difficult');
    expect(moment.preMatch).toContain('高强度');
    expect(moment.postMatch).toContain('拿下');
  });
});
