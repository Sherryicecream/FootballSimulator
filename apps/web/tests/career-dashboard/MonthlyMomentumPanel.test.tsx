import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MonthlyMomentum } from '@football/contracts';
import { MonthlyMomentumPanel } from '../../src/career-dashboard/MonthlyMomentumPanel';

const momentum: MonthlyMomentum = {
  tone: 'turning-point',
  title: '关键选择：低谷期的谈话',
  summary: '本月经历 4 个周度节点。低谷期的谈话：你选择了坦白说出自己的压力。',
  nextFocus: '后续影响正在发酵：继续观察低谷期的谈话在训练和比赛中的回应。',
  beats: [
    {
      weekKey: '2024-W02',
      kind: 'training',
      title: '训练节奏',
      detail: '完成技术训练安排。',
      intensity: 'routine',
    },
    {
      weekKey: '2024-W03',
      kind: 'match',
      title: '比赛日',
      detail: '浦江青年队 1:0；出场 30 分钟，评分 7.2',
      intensity: 'notable',
    },
  ],
};

describe('MonthlyMomentumPanel', () => {
  it('shows the month headline, next focus, and a visible beat timeline', () => {
    render(<MonthlyMomentumPanel monthKey="2024-09" momentum={momentum} />);

    expect(screen.getByRole('region', { name: '本月节奏' })).toBeDefined();
    expect(screen.getByRole('heading', { name: momentum.title })).toBeDefined();
    expect(screen.getByText(momentum.nextFocus)).toBeDefined();
    expect(screen.getByText('第 1 周')).toBeDefined();
    expect(screen.getByText('第 2 周')).toBeDefined();
    expect(screen.getByText('浦江青年队 1:0；出场 30 分钟，评分 7.2')).toBeDefined();
  });

  it('does not render a placeholder when older reports have no momentum', () => {
    const { container } = render(<MonthlyMomentumPanel monthKey="2024-09" momentum={undefined} />);

    expect(container.firstChild).toBeNull();
  });
});
