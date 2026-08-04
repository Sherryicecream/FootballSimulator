import { z } from 'zod';

export const TeamStrengthSchema = z.object({
  attack: z.number().int().min(0).max(100),
  midfield: z.number().int().min(0).max(100),
  defence: z.number().int().min(0).max(100),
  overall: z.number().int().min(0).max(100),
});

export type TeamStrength = z.infer<typeof TeamStrengthSchema>;

export const MatchResultSchema = z.object({
  homeTeam: z.string().min(1).max(40),
  awayTeam: z.string().min(1).max(40),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  homeStrength: TeamStrengthSchema,
  awayStrength: TeamStrengthSchema,
  homePossession: z.number().int().min(0).max(100),
  awayPossession: z.number().int().min(0).max(100),
  homeShots: z.number().int().min(0),
  awayShots: z.number().int().min(0),
  homeShotsOnTarget: z.number().int().min(0),
  awayShotsOnTarget: z.number().int().min(0),
  weekNumber: z.number().int().min(1).max(52),
  season: z.number().int().min(2000).max(2100),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const LeagueStandingSchema = z.object({
  clubId: z.string().min(1).max(40),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  points: z.number().int().min(0),
}).refine(
  (s) => s.won + s.drawn + s.lost === s.played,
  { message: '胜场+平局+负场必须等于比赛场次' },
);

export type LeagueStanding = z.infer<typeof LeagueStandingSchema>;