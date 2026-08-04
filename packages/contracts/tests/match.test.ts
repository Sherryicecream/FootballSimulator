import { describe, it, expect } from 'vitest';
import { MatchResultSchema, TeamStrengthSchema, LeagueStandingSchema } from '../src/match';

describe('TeamStrength', () => {
  it('验证球队实力', () => {
    const valid = TeamStrengthSchema.parse({
      attack: 75,
      midfield: 70,
      defence: 68,
      overall: 71,
    });
    expect(valid.overall).toBe(71);
  });

  it('拒绝无效的实力值', () => {
    expect(() => TeamStrengthSchema.parse({
      attack: 150, midfield: 50, defence: 50, overall: 50,
    })).toThrow();
  });
});

describe('MatchResult', () => {
  it('验证完整比赛结果', () => {
    const valid = MatchResultSchema.parse({
      homeTeam: 'shanghai-wings',
      awayTeam: 'beijing-dragons',
      homeScore: 2,
      awayScore: 1,
      homeStrength: { attack: 75, midfield: 70, defence: 68, overall: 71 },
      awayStrength: { attack: 65, midfield: 68, defence: 70, overall: 68 },
      homePossession: 55,
      awayPossession: 45,
      homeShots: 12,
      awayShots: 8,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 3,
      weekNumber: 5,
      season: 2024,
    });
    expect(valid.homeScore).toBe(2);
    expect(valid.awayScore).toBe(1);
  });

  it('拒绝负分', () => {
    expect(() => MatchResultSchema.parse({
      homeTeam: 'a', awayTeam: 'b',
      homeScore: -1, awayScore: 0,
      homeStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      awayStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      homePossession: 50, awayPossession: 50,
      homeShots: 0, awayShots: 0,
      homeShotsOnTarget: 0, awayShotsOnTarget: 0,
      weekNumber: 1, season: 2024,
    })).toThrow();
  });

  it('拒绝控球率之和不等于100', () => {
    expect(() => MatchResultSchema.parse({
      homeTeam: 'a', awayTeam: 'b',
      homeScore: 1, awayScore: 1,
      homeStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      awayStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      homePossession: 60, awayPossession: 35,
      homeShots: 0, awayShots: 0,
      homeShotsOnTarget: 0, awayShotsOnTarget: 0,
      weekNumber: 1, season: 2024,
    })).toThrow();
  });
});

describe('LeagueStanding', () => {
  it('验证联赛积分榜条目', () => {
    const valid = LeagueStandingSchema.parse({
      clubId: 'shanghai-wings',
      played: 10,
      won: 6,
      drawn: 2,
      lost: 2,
      goalsFor: 18,
      goalsAgainst: 10,
      points: 20,
    });
    expect(valid.points).toBe(20);
  });

  it('拒绝胜场数多于比赛数', () => {
    expect(() => LeagueStandingSchema.parse({
      clubId: 'test', played: 5, won: 6, drawn: 0, lost: 0,
      goalsFor: 10, goalsAgainst: 5, points: 18,
    })).toThrow();
  });

  it('拒绝积分与胜平不一致', () => {
    expect(() => LeagueStandingSchema.parse({
      clubId: 'test', played: 5, won: 3, drawn: 1, lost: 1,
      goalsFor: 10, goalsAgainst: 5, points: 99,
    })).toThrow();
  });
});