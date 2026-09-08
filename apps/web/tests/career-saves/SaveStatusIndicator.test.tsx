import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveStatusIndicator } from '../../src/career-saves/SaveStatusIndicator';

describe('SaveStatusIndicator', () => {
  it('announces saving progress without offering a retry', () => {
    render(<SaveStatusIndicator state={{ status: 'saving' }} onRetry={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('正在保存');
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
  });

  it('announces a completed automatic save without offering a retry', () => {
    render(<SaveStatusIndicator state={{ status: 'saved' }} onRetry={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('已自动保存');
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
  });

  it('offers retry after a failed save', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SaveStatusIndicator state={{ status: 'error', message: '保存失败' }} onRetry={onRetry} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('保存失败');
    await user.click(screen.getByRole('button', { name: '重试保存' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
