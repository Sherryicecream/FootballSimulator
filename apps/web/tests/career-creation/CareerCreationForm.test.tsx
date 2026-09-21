// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
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
    expect(screen.getByText((content) => content.includes('16岁的中国球员'))).toBeDefined();
    expect(screen.queryByLabelText('逆足')).toBeNull();
    expect(screen.queryByLabelText('成长背景')).toBeNull();
    expect(screen.queryByLabelText('性格倾向')).toBeNull();
    expect(screen.getByLabelText('随机种子')).toBeDefined();
    expect(screen.getByText('世界种子（可选）').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('radio', { name: '右脚' })).not.toHaveStyle({ display: 'none' });
    expect(screen.getByText((content) => content.includes('开始生涯'))).toHaveStyle({
      color: 'var(--color-ink)',
    });
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(<CareerCreationForm onComplete={() => {}} content={createBootstrapContent()} />);
    await user.click(screen.getByText((content) => content.includes('开始生涯')));
    expect(screen.getByText('请输入球员姓名')).toBeDefined();
  });

  it('accepts an explicit seed without calling the random seed factory', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const seedFactory = vi.fn(() => 99);
    render(
      <CareerCreationForm
        onComplete={onComplete}
        content={createBootstrapContent()}
        seedFactory={seedFactory}
      />,
    );

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByText('世界种子（可选）'));
    await user.type(screen.getByLabelText('随机种子'), '123');
    await user.click(screen.getByText((content) => content.includes('开始生涯')));

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0]?.[0].randomState.seed).toBe(123);
    expect(seedFactory).not.toHaveBeenCalled();
  });

  it('uses the random seed factory exactly once when the optional seed is blank', async () => {
    const user = userEvent.setup();
    const seedFactory = vi.fn(() => 99);
    render(
      <CareerCreationForm
        onComplete={vi.fn()}
        content={createBootstrapContent()}
        seedFactory={seedFactory}
      />,
    );

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByText((content) => content.includes('开始生涯')));

    expect(seedFactory).toHaveBeenCalledOnce();
  });

  it('rejects an invalid explicit seed before creating a career', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const seedFactory = vi.fn(() => 99);
    render(
      <CareerCreationForm
        onComplete={onComplete}
        content={createBootstrapContent()}
        seedFactory={seedFactory}
      />,
    );

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByText('世界种子（可选）'));
    await user.type(screen.getByLabelText('随机种子'), '1e3');
    await user.click(screen.getByText((content) => content.includes('开始生涯')));

    expect(screen.getByRole('alert')).toHaveTextContent('种子请输入非负整数');
    expect(onComplete).not.toHaveBeenCalled();
    expect(seedFactory).not.toHaveBeenCalled();
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
