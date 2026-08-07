// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CareerCreationForm } from '../../src/career-creation/CareerCreationForm';
import { createBootstrapContent } from '../../src/app/bootstrap-dependencies';

describe('CareerCreationForm', () => {
  it('renders all form fields', () => {
    render(<CareerCreationForm onComplete={() => {}} content={createBootstrapContent()} />);
    expect(screen.getByLabelText('球员姓名')).toBeDefined();
    expect(screen.getByLabelText('家乡')).toBeDefined();
    expect(screen.getByLabelText('主位置')).toBeDefined();
    expect(screen.getByText('惯用脚')).toBeDefined();
    expect(screen.queryByLabelText('逆足')).toBeNull();
    expect(screen.queryByLabelText('成长背景')).toBeNull();
    expect(screen.queryByLabelText('性格倾向')).toBeNull();
    expect(screen.queryByLabelText('随机种子')).toBeNull();
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(<CareerCreationForm onComplete={() => {}} content={createBootstrapContent()} />);
    await user.click(screen.getByText((content) => content.includes('开始生涯')));
    expect(screen.getByText('请输入球员姓名')).toBeDefined();
  });

  it('calls onComplete with valid form data', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <CareerCreationForm
        onComplete={onComplete}
        content={createBootstrapContent()}
        seedFactory={() => 42}
      />,
    );

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByLabelText('右脚'));
    await user.click(screen.getByText((content) => content.includes('开始生涯')));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const save = onComplete.mock.calls[0][0];
    expect(save.player.identity.name).toBe('张伟');
    expect(save.player.identity.primaryPosition).toBe('CENTER_BACK');
    expect(save.randomState.seed).toBe(42);
    expect(save.player.identity.growthBackground).toBeTruthy();
    expect(save.player.identity.personalityTendency).toBeTruthy();
    expect(save.player.identity.weakFootLevel).toBeGreaterThanOrEqual(1);
  });
});
