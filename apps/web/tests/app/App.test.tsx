import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';

// Mock localStorage for persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders creation form after loading', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('STEP 1 OF 3')).toBeDefined();
    });
    expect(screen.getByText('基本信息')).toBeDefined();
  });

  it('has a single level-one heading', async () => {
    render(<App />);
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
    });
  });

  it('advances a Shanghai player to the dashboard after full flow', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(async () => {
      expect(screen.getByLabelText('球员姓名')).toBeDefined();
    });

    await user.type(screen.getByLabelText('球员姓名'), '林岳');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByRole('button', { name: /开始生涯/ }));

    // Step 2: Youth opportunity
    await waitFor(() => {
      expect(screen.getByText('你的青训机会')).toBeDefined();
    });
    const offers = screen.getAllByRole('button', { pressed: false });
    await user.click(offers[0]);

    // Step 3: Dashboard
    await waitFor(() => {
      expect(screen.getByText('青训生涯')).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /推进一周/ })).toBeDefined();
  });
});
