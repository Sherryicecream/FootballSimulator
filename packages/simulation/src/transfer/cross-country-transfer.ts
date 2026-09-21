import type { CalendarBridge, Country } from '@football/contracts';

const EUROPEAN_COUNTRIES = new Set<Country>(['england', 'spain', 'germany', 'italy', 'france']);

const ASIAN_COUNTRIES = new Set<Country>(['china', 'japan', 'korea']);

/**
 * 计算目标国家对球员的跨国吸引力。
 * 吸引力是现有市场兴趣的乘数来源，不能替代能力层级上限。
 */
export const computeCountryAppeal = (
  country: Country,
  playerCountry: Country,
  languageBarrier: boolean,
): number => {
  if (country === playerCountry) return 100;

  const sameContinent =
    (EUROPEAN_COUNTRIES.has(country) && EUROPEAN_COUNTRIES.has(playerCountry)) ||
    (ASIAN_COUNTRIES.has(country) && ASIAN_COUNTRIES.has(playerCountry));
  if (sameContinent) return 70;

  return languageBarrier ? 38 : 45;
};

/**
 * 返回跨日历联赛之间的合同桥接年数。
 * 三月开赛的亚洲联赛与九月开赛的欧洲联赛之间按半年休整处理。
 */
export const bridgeContractYears = (fromCountry: Country, toCountry: Country): number => {
  if (fromCountry === toCountry) return 0;
  const fromMarchCalendar = ASIAN_COUNTRIES.has(fromCountry);
  const toMarchCalendar = ASIAN_COUNTRIES.has(toCountry);
  return fromMarchCalendar === toMarchCalendar ? 0 : 0.5;
};

export const isEuropeanCountry = (country: Country): boolean => EUROPEAN_COUNTRIES.has(country);

export const professionalSeasonStartMonth = (country: Country): 3 | 9 =>
  ASIAN_COUNTRIES.has(country) ? 3 : 9;

export interface ProfessionalSeasonDates {
  startDate: string;
  endDate: string;
}

/** 不同足球日历的完整职业赛季日期。日期统一使用 ISO 日历日，便于存档重放。 */
export const professionalSeasonDates = (
  country: Country,
  seasonYear: number,
): ProfessionalSeasonDates => {
  if (!Number.isInteger(seasonYear) || seasonYear <= 0) {
    throw new Error('职业赛季年份必须为正整数');
  }
  if (ASIAN_COUNTRIES.has(country)) {
    return {
      startDate: `${seasonYear}-03-01`,
      endDate: `${seasonYear}-11-30`,
    };
  }
  return {
    startDate: `${seasonYear}-09-01`,
    endDate: `${seasonYear + 1}-05-31`,
  };
};

/** 返回参考日之后最近的目标国家职业赛季开赛日。 */
export const nextProfessionalSeasonStartDate = (
  referenceDate: string,
  country: Country,
): string => {
  const year = Number(referenceDate.slice(0, 4));
  if (!Number.isInteger(year) || year <= 0) throw new Error('无法确定职业赛季年份');
  const month = professionalSeasonStartMonth(country);
  const candidate = `${year}-${String(month).padStart(2, '0')}-01`;
  return candidate > referenceDate ? candidate : `${year + 1}-${String(month).padStart(2, '0')}-01`;
};

/** 记录跨日历赛季之间的休整窗口，避免仅靠日期差推断玩家状态。 */
export const buildCalendarBridge = (
  fromCountry: Country,
  toCountry: Country,
  fromDate: string,
  toDate: string,
): CalendarBridge => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  const gapDays =
    Number.isFinite(from) && Number.isFinite(to)
      ? Math.max(0, Math.round((to - from) / 86_400_000))
      : 0;
  const bridgeYears = bridgeContractYears(fromCountry, toCountry);
  return {
    fromCountry,
    toCountry,
    fromDate,
    toDate,
    gapDays,
    bridgeYears,
    kind: gapDays > 90 ? 'long-break' : bridgeYears > 0 ? 'cross-calendar' : 'same-calendar',
  };
};
