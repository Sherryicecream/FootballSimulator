import { describe, it, expect } from 'vitest';
import {
  createCalendar,
  advanceOneWeek,
  advanceToNextMonth,
  getSeasonWeekRange,
} from '../../src/career/calendar';

describe('Calendar', () => {
  it('从指定日期创建日历', () => {
    const cal = createCalendar('2024-09-01', 2024);
    expect(cal.currentDate).toBe('2024-09-01');
    expect(cal.season).toBe(2024);
    expect(cal.weekNumber).toBe(1);
    expect(cal.month).toBe(9);
  });

  it('推进一周', () => {
    const cal = createCalendar('2024-09-01', 2024);
    const next = advanceOneWeek(cal);

    expect(next.currentDate).toBe('2024-09-08');
    expect(next.weekNumber).toBe(2);
    expect(next.season).toBe(2024);
  });

  it('推进到下一月', () => {
    const cal = createCalendar('2024-09-01', 2024);
    const nextMonth = advanceToNextMonth(cal);

    expect(nextMonth.currentDate).toBe('2024-10-01');
    expect(nextMonth.month).toBe(10);
  });

  it('跨年推进到新赛季', () => {
    const cal = createCalendar('2024-12-25', 2024);
    let current = cal;

    current = advanceOneWeek(current); // 2025-01-01
    expect(current.season).toBe(2025);
    expect(current.month).toBe(1);
  });

  it('获取赛季周范围', () => {
    const range = getSeasonWeekRange();
    expect(range.startWeek).toBe(1);
    expect(range.endWeek).toBe(52);
  });

  it('推进 4 周后日期正确', () => {
    const cal = createCalendar('2024-09-01', 2024);
    let current = cal;

    for (let i = 0; i < 4; i++) {
      current = advanceOneWeek(current);
    }

    expect(current.currentDate).toBe('2024-09-29');
    expect(current.weekNumber).toBe(5);
  });
});
