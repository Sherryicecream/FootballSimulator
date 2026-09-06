import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineIndicator } from '../../src/pwa/OfflineIndicator';

const setOnline = (online: boolean) => {
  Object.defineProperty(window, 'navigator', {
    value: { ...window.navigator, onLine: online },
    configurable: true,
    writable: true,
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  setOnline(true);
});

describe('OfflineIndicator', () => {
  it('renders nothing while online', () => {
    setOnline(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.querySelector('.offline-chip')).toBeNull();
  });

  it('shows a visible offline status with data-safety wording', () => {
    setOnline(false);
    render(<OfflineIndicator />);
    const chip = screen.getByRole('status', { name: '离线状态' });
    expect(chip.textContent).toContain('离线运行中');
    expect(chip.textContent).toContain('保存在本机');
  });
});
