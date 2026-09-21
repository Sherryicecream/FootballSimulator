import type { CareerLedgerEntryV2, CareerMoment, CareerSaveV6Like } from '@football/contracts';

const isProfessionalPhase = (phase: CareerSaveV6Like['careerPhase']): boolean =>
  phase === 'pro-season' || phase === 'pro-offseason' || phase === 'free-agent';

export function careerMoment(save: CareerSaveV6Like): CareerMoment {
  const pro = save.proSeason;
  if (isProfessionalPhase(save.careerPhase) && pro) {
    return {
      seasonId: pro.id,
      date: pro.currentDate,
      weekIndex: pro.currentWeek,
    };
  }

  return {
    seasonId: save.season.id,
    date: save.season.currentDate,
    weekIndex: save.season.currentWeek,
  };
}

export function makeFactId(seasonId: string, weekIndex: number, ordinal: number): string {
  const seasonCode = seasonId.length > 25 ? seasonId.slice(0, 25) : seasonId;
  return `${seasonCode}-w${weekIndex}-${ordinal}`;
}

export type CareerFactMoment = Partial<CareerMoment>;

const nextFactOrdinal = (save: CareerSaveV6Like): number => {
  const maxExistingOrdinal = save.ledger.reduce((max, fact) => Math.max(max, fact.ordinal ?? 0), 0);
  return Math.max(save.ledger.length, maxExistingOrdinal) + 1;
};

/**
 * 为 v7 新事实写入统一时间地址。
 * v3-v6 事实保持原始形态，迁移不会猜测历史日期。
 */
export function stampCareerFacts(
  save: CareerSaveV6Like,
  facts: readonly CareerLedgerEntryV2[],
  override: CareerFactMoment = {},
): CareerLedgerEntryV2[] {
  if (save.schemaVersion !== 7 && save.schemaVersion !== 8) return [...facts];

  const moment = { ...careerMoment(save), ...override };
  const firstOrdinal = nextFactOrdinal(save);
  return facts.map((fact, index) => ({
    ...fact,
    id: makeFactId(moment.seasonId, moment.weekIndex, firstOrdinal + index),
    occurredOn: moment.date,
    seasonId: moment.seasonId,
    ordinal: firstOrdinal + index,
  }));
}

export function stampCareerFact(
  save: CareerSaveV6Like,
  fact: CareerLedgerEntryV2,
  override: CareerFactMoment = {},
): CareerLedgerEntryV2 {
  return stampCareerFacts(save, [fact], override)[0]!;
}
