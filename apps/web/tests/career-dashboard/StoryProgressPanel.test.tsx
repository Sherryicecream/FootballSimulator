import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { StoryProgressSnapshot } from '@football/contracts';
import { StoryProgressPanel } from '../../src/career-dashboard/StoryProgressPanel';

const progress: StoryProgressSnapshot = {
  entries: [
    {
      storyId: 'selection-opened',
      title: '入选边缘的信号',
      status: 'active',
      completedNodes: 1,
      totalNodes: 2,
      progressPercent: 50,
      activeNodeTitles: ['名单之前的训练计划'],
      waitReason: '等待下一场比赛记录',
    },
  ],
  recentChoice: {
    eventTitle: '入选边缘的信号',
    choiceText: '询问训练计划',
    weekKey: '2024-W08',
  },
};

describe('StoryProgressPanel', () => {
  it('shows the recent choice, explainable wait reason, and progress bar', () => {
    render(<StoryProgressPanel progress={progress} />);

    expect(screen.getByRole('region', { name: '故事进度' })).toBeDefined();
    expect(screen.getByRole('heading', { name: '正在发生的故事' })).toBeDefined();
    expect(screen.getByText('最近选择 · 2024-W08')).toBeDefined();
    expect(screen.getByText('你选择了「询问训练计划」')).toBeDefined();
    expect(screen.getByText('等待下一场比赛记录')).toBeDefined();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('does not render an empty story area', () => {
    const { container } = render(
      <StoryProgressPanel progress={{ entries: [], recentChoice: null }} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
