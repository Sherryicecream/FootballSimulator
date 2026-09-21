import type { CareerSaveV3Like, CareerSaveV6Like, YouthContentBundle } from '@football/contracts';
import {
  canStartNextYouthSeason as canStartNextYouthSeasonAt,
  startNextSeason,
} from '@football/simulation';
import { stampCareerFact } from '@football/simulation';

export const canContinueYouthSeason = <S extends CareerSaveV3Like>(save: S): boolean => {
  if (
    !['offseason', 'agent-preferences', 'offer-review'].includes(save.careerPhase) ||
    !save.offseason
  ) {
    return false;
  }
  return canStartNextYouthSeasonAt(
    save.player.identity.dateOfBirth,
    save.offseason.nextSeasonStart,
  );
};

export const startNextYouthSeason = <S extends CareerSaveV3Like>(
  save: S,
  content: YouthContentBundle,
  requestedAcademyId?: string,
): S => {
  const academyId = requestedAcademyId ?? save.season.academyId;
  const academy = content.academies.find(({ id }) => id === academyId);
  if (!academy) throw new Error(`青训机构 ${academyId} 不在内容包中`);
  const competition = content.competitions.find(({ participatingAcademyIds }) =>
    participatingAcademyIds.includes(academyId),
  );
  if (!competition) throw new Error(`青训机构 ${academyId} 没有可用赛事`);

  const next = startNextSeason(save, academy, competition);
  const fact = stampCareerFact(save as unknown as CareerSaveV6Like, {
    id: `season-start-${next.season.id}`,
    weekKey: `${next.season.startDate.slice(0, 4)}-W01`,
    type: 'decision',
    summary: `开启新赛季：${academy.name}，${next.season.fixtures.length} 场既定赛程`,
    participantIds: [],
  });
  return { ...next, ledger: [...next.ledger, fact] };
};
