import type {
  CareerEnd,
  CareerLedgerEntryV2,
  CareerSaveV5Like,
  CareerSaveV6,
  CareerSaveV6Like,
  CareerSaveV7,
  CareerSaveV7Like,
  CareerSaveV8,
  CareerSaveV8Like,
} from '@football/contracts';
import {
  CareerSaveV6Schema,
  CareerSaveV7Schema,
  CareerSaveV8Schema,
  migrateCareerSaveV8,
} from '@football/contracts';
import { canContinueYouthSeason } from './start-next-season';
import { stampCareerFact } from '@football/simulation';

/** Strip v7-only fields so that CareerSaveV6Schema (strict) accepts the object. */
const toV6Parse = (save: Record<string, unknown>): ReturnType<typeof CareerSaveV6Schema.parse> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mechanicsVersion, moments, worldRegistry, ...rest } = save;
  return CareerSaveV6Schema.parse({ ...rest, schemaVersion: 6 });
};

const retirementFact = (id: string, endedOn: string, summary: string): CareerLedgerEntryV2 => ({
  id,
  weekKey: `${endedOn.slice(0, 4)}-W30`,
  type: 'retirement',
  summary,
  participantIds: [],
});

const commitCareerEnd = (
  save: CareerSaveV7Like,
  ending: CareerEnd,
  fact: CareerLedgerEntryV2,
  preserveVersion: 7 | 8 | null,
): CareerSaveV6 | CareerSaveV7 | CareerSaveV8 => {
  if (save.careerPhase === 'retired') {
    if (preserveVersion === 8) return CareerSaveV8Schema.parse(save);
    if (preserveVersion === 7) return CareerSaveV7Schema.parse({ ...save, schemaVersion: 7 });
    return toV6Parse(save as unknown as Record<string, unknown>);
  }

  const stampedFact = preserveVersion
    ? stampCareerFact(save, fact, {
        seasonId: save.proSeason?.id ?? save.season.id,
        date: ending.endedOn,
        weekIndex: save.proSeason?.currentWeek ?? save.season.currentWeek,
      })
    : fact;
  const finalEnding: CareerEnd = {
    ...ending,
    evidenceIds: ending.evidenceIds.map((id) => (id === fact.id ? stampedFact.id : id)),
  };
  const next = {
    ...save,
    schemaVersion: preserveVersion ?? 7,
    careerPhase: 'retired' as const,
    retiredOn: finalEnding.endedOn,
    careerEnd: finalEnding,
    pendingOffers: [],
    clubHistory: save.clubHistory.map((entry) =>
      entry.to === null ? { ...entry, to: finalEnding.endedOn } : entry,
    ),
    ledger: save.ledger.some(({ id }) => id === stampedFact.id)
      ? save.ledger
      : [...save.ledger, stampedFact],
  };
  if (preserveVersion === 8) return CareerSaveV8Schema.parse(next);
  if (preserveVersion === 7) return CareerSaveV7Schema.parse(next);
  return toV6Parse(next as unknown as Record<string, unknown>);
};
export const canEndYouthCareer = (save: CareerSaveV6Like): boolean =>
  save.careerPhase === 'offseason' &&
  !canContinueYouthSeason(save) &&
  save.contract === null &&
  !save.story.pendingEvent &&
  !save.story.pendingFeedback;

export const endYouthCareer = (
  save: CareerSaveV6Like | CareerSaveV7Like | CareerSaveV8Like,
): CareerSaveV6 | CareerSaveV7 | CareerSaveV8 => {
  const preserveVersion = save.schemaVersion === 8 ? 8 : save.schemaVersion === 7 ? 7 : null;
  const normalized = migrateCareerSaveV8(save);
  if (normalized.careerPhase === 'retired') {
    if (preserveVersion === 8) return CareerSaveV8Schema.parse(normalized);
    if (preserveVersion === 7) return CareerSaveV7Schema.parse({ ...normalized, schemaVersion: 7 });
    return toV6Parse(normalized as unknown as Record<string, unknown>);
  }
  if (!canEndYouthCareer(normalized)) throw new Error('青训生涯尚未达到结束条件');
  const endedOn = normalized.season.endDate;
  const fact = retirementFact(
    'career-end-youth-' + endedOn,
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
    preserveVersion,
  );
};

export const endProfessionalCareer = (
  save: CareerSaveV6Like | CareerSaveV7Like | CareerSaveV8Like | CareerSaveV5Like,
  endedOn: string,
  kind: 'voluntary-retirement' | 'market-exit' = 'voluntary-retirement',
): CareerSaveV6 | CareerSaveV7 | CareerSaveV8 => {
  const preserveVersion = save.schemaVersion === 8 ? 8 : save.schemaVersion === 7 ? 7 : null;
  const normalized = migrateCareerSaveV8(save);
  if (normalized.careerPhase === 'retired') {
    if (preserveVersion === 8) return CareerSaveV8Schema.parse(normalized);
    if (preserveVersion === 7) return CareerSaveV7Schema.parse({ ...normalized, schemaVersion: 7 });
    return toV6Parse(normalized as unknown as Record<string, unknown>);
  }
  if (normalized.careerPhase === 'pro-season') throw new Error('职业赛季进行中不能结束生涯');
  if (kind === 'market-exit' && normalized.careerPhase !== 'free-agent') {
    throw new Error('只有自由球员可以离开职业足坛');
  }
  if (
    kind === 'voluntary-retirement' &&
    normalized.careerPhase !== 'pro-offseason' &&
    normalized.careerPhase !== 'free-agent'
  ) {
    throw new Error('非法阶段转移：当前阶段 ' + normalized.careerPhase + ' 不能退役');
  }
  if (normalized.story.pendingEvent || normalized.story.pendingFeedback) {
    throw new Error('请先处理待决事件或确认反馈，再结束职业生涯');
  }
  const fact = retirementFact(
    'career-end-' + kind + '-' + endedOn,
    endedOn,
    kind === 'market-exit'
      ? '自由球员市场未有合适去处，结束职业生涯。'
      : '正式宣布退役，结束球员生涯。',
  );
  return commitCareerEnd(
    normalized,
    { kind, endedOn, summary: fact.summary, evidenceIds: [fact.id] },
    fact,
    preserveVersion,
  );
};

/** 兼容既有调用：职业休赛期或自由球员窗口可主动退役。 */
export const retire = (save: CareerSaveV5Like, endedOn: string): CareerSaveV6 =>
  endProfessionalCareer(save, endedOn) as CareerSaveV6;
