import type {
  CareerEnd,
  CareerLedgerEntryV2,
  CareerSaveV5Like,
  CareerSaveV6,
  CareerSaveV6Like,
} from '@football/contracts';
import { CareerSaveV6Schema, migrateCareerSaveV6 } from '@football/contracts';
import { canContinueYouthSeason } from './start-next-season';

const retirementFact = (id: string, endedOn: string, summary: string): CareerLedgerEntryV2 => ({
  id,
  weekKey: `${endedOn.slice(0, 4)}-W30`,
  type: 'retirement',
  summary,
  participantIds: [],
});

const commitCareerEnd = (
  save: CareerSaveV6Like,
  ending: CareerEnd,
  fact: CareerLedgerEntryV2,
): CareerSaveV6 => {
  if (save.careerPhase === 'retired') return CareerSaveV6Schema.parse(save);
  return CareerSaveV6Schema.parse({
    ...save,
    schemaVersion: 6,
    careerPhase: 'retired',
    retiredOn: ending.endedOn,
    careerEnd: ending,
    pendingOffers: [],
    clubHistory: save.clubHistory.map((entry) =>
      entry.to === null ? { ...entry, to: ending.endedOn } : entry,
    ),
    ledger: save.ledger.some(({ id }) => id === fact.id) ? save.ledger : [...save.ledger, fact],
  });
};

export const canEndYouthCareer = (save: CareerSaveV6Like): boolean =>
  save.careerPhase === 'offseason' &&
  !canContinueYouthSeason(save) &&
  !save.story.pendingEvent &&
  !save.story.pendingFeedback;

export const endYouthCareer = (save: CareerSaveV6Like): CareerSaveV6 => {
  const normalized = migrateCareerSaveV6(save);
  if (normalized.careerPhase === 'retired') return normalized;
  if (!canEndYouthCareer(normalized)) throw new Error('青训生涯尚未达到结束条件');
  const endedOn = normalized.season.endDate;
  const fact = retirementFact(
    `career-end-youth-${endedOn}`,
    endedOn,
    '青训年龄窗口结束，未获得职业合同。',
  );
  return commitCareerEnd(
    normalized,
    {
      kind: 'youth-no-contract',
      endedOn,
      summary: '青训年龄窗口结束，未获得职业合同。',
      evidenceIds: [fact.id],
    },
    fact,
  );
};

export const endProfessionalCareer = (
  save: CareerSaveV6Like,
  endedOn: string,
  kind: 'voluntary-retirement' | 'market-exit' = 'voluntary-retirement',
): CareerSaveV6 => {
  const normalized = migrateCareerSaveV6(save);
  if (normalized.careerPhase === 'retired') return normalized;
  if (normalized.careerPhase === 'pro-season') throw new Error('职业赛季进行中不能结束生涯');
  if (kind === 'market-exit' && normalized.careerPhase !== 'free-agent') {
    throw new Error('只有自由球员可以离开职业足坛');
  }
  if (
    kind === 'voluntary-retirement' &&
    normalized.careerPhase !== 'pro-offseason' &&
    normalized.careerPhase !== 'free-agent'
  ) {
    throw new Error(`非法阶段转移：当前阶段 ${normalized.careerPhase} 不能退役`);
  }
  const fact = retirementFact(
    `career-end-${kind}-${endedOn}`,
    endedOn,
    kind === 'market-exit'
      ? '自由球员市场未有合适去处，结束职业生涯。'
      : '正式宣布退役，结束球员生涯。',
  );
  return commitCareerEnd(
    normalized,
    { kind, endedOn, summary: fact.summary, evidenceIds: [fact.id] },
    fact,
  );
};

/** 兼容既有调用：职业休赛期或自由球员窗口可主动退役。 */
export const retire = (save: CareerSaveV5Like, endedOn: string): CareerSaveV6 =>
  endProfessionalCareer(migrateCareerSaveV6(save), endedOn);
