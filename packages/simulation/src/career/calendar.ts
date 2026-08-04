/** 日历状态：跟踪游戏内时间 */
export interface CalendarState {
  currentDate: string;  // ISO 格式 YYYY-MM-DD
  season: number;       // 赛季年份
  weekNumber: number;   // 当前年第几周 (1-52)
  month: number;        // 当前月份 (1-12)
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 从日期字符串创建日历 */
export function createCalendar(dateStr: string, season: number): CalendarState {
  const date = parseDate(dateStr);

  return {
    currentDate: dateStr,
    season,
    weekNumber: 1,
    month: date.getMonth() + 1,
  };
}

/** 推进一周 */
export function advanceOneWeek(cal: CalendarState): CalendarState {
  const date = parseDate(cal.currentDate);
  date.setDate(date.getDate() + 7);

  const newDate = formatDate(date);
  const newYear = date.getFullYear();

  if (newYear !== cal.season) {
    // 跨年 -> 新赛季，重置周数
    return createCalendar(newDate, newYear);
  }

  return {
    currentDate: newDate,
    season: cal.season,
    weekNumber: cal.weekNumber + 1,
    month: date.getMonth() + 1,
  };
}

/** 推进到下一月的第一天 */
export function advanceToNextMonth(cal: CalendarState): CalendarState {
  const date = parseDate(cal.currentDate);
  date.setMonth(date.getMonth() + 1, 1);

  const newDate = formatDate(date);
  const newSeason = date.getFullYear();

  return createCalendar(newDate, newSeason);
}

/** 获取赛季的周范围 */
export function getSeasonWeekRange(season: number): { startWeek: number; endWeek: number } {
  return { startWeek: 1, endWeek: 52 };
}