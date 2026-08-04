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
    render(<CareerCreationForm onComplete={onComplete} content={createBootstrapContent()} />);

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByLabelText('右脚'));
    await user.selectOptions(screen.getByLabelText('逆足'), '3');
    await user.selectOptions(screen.getByLabelText('成长背景'), 'academy');
    await user.selectOptions(screen.getByLabelText('性格倾向'), 'composed');
    await user.click(screen.getByText((content) => content.includes('开始生涯')));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const save = onComplete.mock.calls[0][0];
    expect(save.player.identity.name).toBe('张伟');
    expect(save.player.identity.primaryPosition).toBe('CENTER_BACK');
  });

  it('rejects a non-numeric seed instead of silently coercing it', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CareerCreationForm onComplete={onComplete} content={createBootstrapContent()} />);

    await user.type(screen.getByLabelText('球员姓名'), '林岳');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.type(screen.getByLabelText('随机种子'), 'abc');
    await user.click(screen.getByRole('button', { name: /开始生涯/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '随机种子必须是 0 到 2147483647 之间的整数',
    );
    expect(onComplete).not.toHaveBeenCalled();
  });
});
