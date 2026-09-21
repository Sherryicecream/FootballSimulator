import type { WorldFact, WorldNewsFilter, WorldNewsPage, ClubProfile } from '@football/contracts';
import { buildWorldNews } from '@football/simulation';

export type BuildWorldNewsForCareerInput = {
  facts: readonly WorldFact[];
  clubs: readonly ClubProfile[];
  viewerClubId: string | null;
  filter: WorldNewsFilter;
  limit: number;
  cursor: string | null;
};

/** Application boundary for the read-only world-news projection. */
export const buildWorldNewsForCareer = (input: BuildWorldNewsForCareerInput): WorldNewsPage =>
  buildWorldNews(input);
