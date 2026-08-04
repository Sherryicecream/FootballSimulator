import { describe, it, expect } from 'vitest';
import { createLeagueStandings, updateStandings, getStandings } from '../../src/world/league-season';
import { LeagueStandingSchema } from '@football/contracts';

describe('LeagueSeason', () => {
  const clubs = ['shanghai-wings', 'beijing-dragons', 'guangzhou-tigers', 'shenzhen-bay'];

  it('创建联赛初始积分榜', () => {
    const standings = createLeagueStandings(clubs);
    expect(standings.length).toBe(4);
    for (const s of standings) {
      expect(s.played).toBe(0);
      expect(s.points).toBe(0);
    }
  });

  it('更新积分榜（主队胜）', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 2, 0);

    const home = updated.find(s => s.clubId === 'shanghai-wings')!;
    const away = updated.find(s => s.clubId === 'beijing-dragons')!;

    expect(home.played).toBe(1);
    expect(home.won).toBe(1);
    expect(home.points).toBe(3);
    expect(home.goalsFor).toBe(2);
    expect(home.goalsAgainst).toBe(0);

    expect(away.played).toBe(1);
    expect(away.lost).toBe(1);
    expect(away.points).toBe(0);
  });

  it('更新积分榜（平局）', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 1, 1);

    const home = updated.find(s => s.clubId === 'shanghai-wings')!;
    expect(home.drawn).toBe(1);
    expect(home.points).toBe(1);
  });

  it('积分榜通过 Zod 校验', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 3, 1);

    for (const s of updated) {
      const result = LeagueStandingSchema.safeParse(s);
      expect(result.success).toBe(true);
    }
  });

  it('按积分降序排列', () => {
    const standings = createLeagueStandings(clubs);
    const afterResults = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 2, 0);
    const sorted = getStandings(afterResults);

    expect(sorted[0]!.clubId).toBe('shanghai-wings');
    expect(sorted[0]!.points).toBe(3);
  });
});