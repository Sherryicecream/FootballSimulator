import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YouthOpportunityPanel } from '../../src/event-choice/YouthOpportunityPanel';
import type { YouthOpportunity } from '@football/contracts';

const mockOpportunity: YouthOpportunity = {
  week: 3,
  offers: [
    {
      id: 'offer-1',
      academyId: 'academy-a',
      academyName: '浦江青训中心',
      pathway: 'local-academy',
      riskLabel: 'low',
      description: '本地青训',
    },
    {
      id: 'offer-2',
      academyId: 'academy-b',
      academyName: '校园精英计划',
      pathway: 'school-elite',
      riskLabel: 'medium',
      description: '校园足球',
    },
    {
      id: 'offer-3',
      academyId: 'academy-c',
      academyName: '齐鲁新星足校（外地）',
      pathway: 'relocation-academy',
      riskLabel: 'high',
      description: '外地青训',
    },
  ],
};

describe('YouthOpportunityPanel', () => {
  it('renders all offers', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    // 使用函数匹配器，因为文本被 emoji 分隔
    expect(screen.getByText((content) => content.includes('浦江青训中心'))).toBeDefined();
    expect(screen.getByText((content) => content.includes('校园精英计划'))).toBeDefined();
    expect(screen.getByText((content) => content.includes('齐鲁新星足校'))).toBeDefined();
  });

  it('shows risk labels', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText((content) => content.includes('风险：低'))).toBeDefined();
    expect(screen.getByText((content) => content.includes('风险：中'))).toBeDefined();
    expect(screen.getByText((content) => content.includes('风险：高'))).toBeDefined();
  });

  it('submits an ordinary choice with one click', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    const options = screen.getAllByRole('button');
    await user.click(options[0]!);
    expect(onChoose).toHaveBeenCalledWith('offer-1');
  });

  it('commits at most once when an option is double-clicked', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    const options = screen.getAllByRole('button');
    await user.dblClick(options[0]!);
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
