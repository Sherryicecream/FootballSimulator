import {
  CareerArchiveV1Schema,
  type CareerArchiveV1,
  type CareerSaveV7,
} from '@football/contracts';
import { buildCareerReview } from '@football/simulation';

/**
 * Builds the immutable, read-only representation used by historical career archives.
 * Runtime state stays on the source save and is intentionally not copied here.
 */
export const buildCareerArchive = (save: CareerSaveV7): CareerArchiveV1 => {
  if (save.careerPhase !== 'retired' || save.careerEnd === null) {
    throw new Error('只有已结束的生涯可以生成历史档案');
  }

  const review = buildCareerReview(save);
  const honours = save.seasonHistory.flatMap(({ honours: seasonHonours }) => seasonHonours);

  return CareerArchiveV1Schema.parse({
    archiveVersion: 1,
    careerId: save.careerId,
    player: save.player,
    careerEnd: save.careerEnd,
    review,
    history: {
      seasonHistory: save.seasonHistory,
      clubHistory: save.clubHistory,
      loanHistory: save.loanHistory,
      nationalTeam: save.nationalTeam,
      totals: save.totals,
      honours,
    },
  });
};
