import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YouthOpportunityPanel } from '../../src/event-choice/YouthOpportunityPanel';
import type { YouthOpportunity } from '@football/contracts';

const mockOpportunity: YouthOpportunity = {
  week: 3,
  offers: [
    { id: 'offer-1', academyId: 'academy-a', academyName: '根宝青训基地', pathway: 'local-academy', riskLabel: 'low', description: '本地青训' },
    { id: 'offer-2', academyId: 'academy-b', academyName: '校园精英计划', pathway: 'school-elite', riskLabel: 'medium', description: '校园足球' },
    { id: 'offer-3', academyId: 'academy-c', academyName: '鲁能足校（外地）', pathway: 'relocation-academy', riskLabel: 'high', description: '外地青训' },
  ],
};

describe('YouthOpportunityPanel', () => {
  it('renders all offers', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('根宝青训基地')).toBeDefined();
    expect(screen.getByText('校园精英计划')).toBeDefined();
    expect(screen.getByText('鲁能足校（外地）')).toBeDefined();
  });

  it('shows risk labels', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('风险：低')).toBeDefined();
    expect(screen.getByText('风险：中')).toBeDefined();
    expect(screen.getByText('风险：高')).toBeDefined();
  });

  it('calls onChoose with selected offer id', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    await user.click(screen.getByText('根宝青训基地'));
    await user.click(screen.getByText('确认选择'));
    expect(onChoose).toHaveBeenCalledWith('offer-1');
  });

  it('disables button when no offer selected', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('确认选择')).toBeDisabled();
  });

  it('disables all interactions after choice', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    await user.click(screen.getByText('根宝青训基地'));
    await user.click(screen.getByText('确认选择'));
    expect(onChoose).toHaveBeenCalled();

    // 模拟父组件 disabled 状态
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} disabled={true} />);
    expect(screen.getByText('确认选择')).toBeDisabled();
  });
});