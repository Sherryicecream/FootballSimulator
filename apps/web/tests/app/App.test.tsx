import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { createCareerSave } from '@football/application';
import type { CareerSave } from '@football/contracts';

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
    expect(screen.getByRole('button', { name: '推进到下个月' })).toBeDefined();
  });

  it('resumes a saved pending event instead of opening the dashboard', async () => {
    const save = createSaveWithPendingEvent();
    storeSave(save);

    render(<App />);

    expect(await screen.findByText('必须处理的事件')).toBeDefined();
    expect(screen.queryByText('青训生涯')).toBeNull();
  });

  it('does not offer a dashboard bypass while an event is pending', async () => {
    storeSave(createSaveWithPendingEvent());

    render(<App />);

    expect(await screen.findByText('必须处理的事件')).toBeDefined();
    expect(screen.queryByRole('button', { name: '返回仪表盘' })).toBeNull();
  });
});

const createSaveWithPendingEvent = (): CareerSave => {
  const save = createCareerSave({
    playerName: '林岳',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
    weakFootLevel: 30,
    growthBackground: 'academy',
    personalityTendency: 'composed',
    regionId: 'shanghai',
    seed: 42,
  });

  return {
    ...save,
    context: {
      ...save.context,
      pendingEvent: {
        eventId: 'required-event',
        title: '必须处理的事件',
        description: '需要先作出决定。',
        choices: [
          {
            id: 'continue',
            text: '继续',
            riskLabel: 'low',
            effects: {},
          },
        ],
        resolvedChoiceId: null,
      },
    },
  };
};

const storeSave = (save: CareerSave): void => {
  localStorage.setItem(
    `football-save-${save.careerId}`,
    JSON.stringify({ version: 1, savedAt: '2024-09-01T00:00:00.000Z', data: save }),
  );
};
