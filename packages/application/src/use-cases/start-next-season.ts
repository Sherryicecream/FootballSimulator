import type { CareerLedgerEntryV2, CareerSaveV3, YouthContentBundle } from '@football/contracts';
import { startNextSeason } from '@football/simulation';

export const startNextYouthSeason = (
  save: CareerSaveV3,
  content: YouthContentBundle,
  requestedAcademyId?: string,
): CareerSaveV3 => {
  const academyId = requestedAcademyId ?? save.season.academyId;
  const academy = content.academies.find(({ id }) => id === academyId);
  if (!academy) throw new Error(`青训机构 ${academyId} 不在内容包中`);
  const competition = content.competitions.find(({ participatingAcademyIds }) =>
    participatingAcademyIds.includes(academyId),
  );
  if (!competition) throw new Error(`青训机构 ${academyId} 没有可用赛事`);

  const next = startNextSeason(save, academy, competition);
  const fact: CareerLedgerEntryV2 = {
    id: `season-start-${next.season.id}`,
    weekKey: `${next.season.startDate.slice(0, 4)}-W01`,
    type: 'decision',
    summary: `开启新赛季：${academy.name}，${next.season.fixtures.length} 场既定赛程`,
    participantIds: [],
  };
  return { ...next, ledger: [...next.ledger, fact] };
};
