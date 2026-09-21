import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MonthSummary, NodeBrief as NodeBriefData } from '@football/contracts';
import { NodeBrief } from '../../src/career-dashboard/NodeBrief';

const skippedMonths: MonthSummary[] = [
  {
    monthKey: '2026-08',
    matchCount: 2,
    goalsFor: 4,
    goalsAgainst: 3,
    fatigueTrend: 'flat',
    notableChange: null,
  },
];

const brief: NodeBriefData = {
  headline: '2026年8月—10月：3场比赛，无重大事件',
  skippedSummary: '3场比赛，球队进球 5，丢球 4；体能保持稳定。',
  changes: ['成长：传球 60→61'],
  nextFocus: '关键选择等待你决定。',
};

describe('NodeBrief', () => {
  it('shows the transition headline and keeps skipped month details collapsed by default', () => {
    render(<NodeBrief brief={brief} skippedMonths={skippedMonths} />);

    expect(screen.getByRole('region', { name: '节点简报' })).toBeVisible();
    expect(screen.getByRole('heading', { name: brief.headline })).toBeVisible();
    expect(screen.getByText(brief.skippedSummary)).toBeVisible();
    expect(screen.getByText(brief.nextFocus)).toBeVisible();
    expect(screen.queryByText('2026-08')).not.toBeVisible();
  });

  it('reveals month details only when the player expands them', () => {
    render(<NodeBrief brief={brief} skippedMonths={skippedMonths} />);

    fireEvent.click(screen.getByText('查看跳过月份详情'));

    expect(screen.getByText('2026-08')).toBeVisible();
    expect(screen.getByText('2 场比赛 · 4:3')).toBeVisible();
  });
});
