import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { createCareerSave } from '@football/application';
import { migrateCareerSaveV5 } from '@football/contracts';
import type { CareerSave, MonthlyReport } from '@football/contracts';

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

  it('restores the latest monthly report from a saved career', async () => {
    const migrated = migrateCareerSaveV5(
      createCareerSave({
        playerName: '林河',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
    );
    const lastMonthlyReport: MonthlyReport = {
      monthKey: '2024-09',
      facts: [],
      attributeChanges: [],
      stateSummary: { morale: 60, form: 55, confidence: 58, fitness: 72, fatigue: 14 },
      matchIds: [],
    };
    storeSave({ ...migrated, lastMonthlyReport });

    render(<App />);

    expect(await screen.findByRole('region', { name: '月报' })).toBeDefined();
    expect(screen.getByText('2024-09 月报')).toBeVisible();
  });
  it('restores an unacknowledged event feedback before opening the dashboard', async () => {
    const migrated = migrateCareerSaveV5(
      createCareerSave({
        playerName: '林河',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
    );
    const withFeedback = {
      ...migrated,
      story: {
        ...migrated.story,
        pendingFeedback: {
          eventId: 'feedback-1',
          title: '训练场上的误会',
          choiceId: 'clarify',
          choiceText: '当面澄清误会',
          response: '你把事情说清楚了。',
          participantResponses: [],
          stateChanges: [],
          relationshipChanges: [],
          followUp: '接下来会看到影响。',
        },
      },
    };
    storeSave(withFeedback);

    render(<App />);

    expect(await screen.findByRole('region', { name: '事件反馈' })).toBeDefined();
    expect(screen.getByText('你把事情说清楚了。')).toBeDefined();
    expect(screen.queryByText('青训生涯')).toBeNull();
  });

  it('restores a retired v5 save into the review page', async () => {
    const user = userEvent.setup();
    const migrated = migrateCareerSaveV5(
      createCareerSave({
        playerName: 'Lin Yue',
        hometown: 'Shanghai',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
    );
    const retired = {
      ...migrated,
      careerPhase: 'retired',
      retiredOn: '2025-06-30',
    } as const;
    storeSave(retired);

    render(<App />);

    expect(await screen.findByRole('region')).toBeDefined();
    expect(document.querySelector('.career-review')).not.toBeNull();
    expect(screen.queryByLabelText('5�S�w^~)�u')).toBeNull();
    await user.click(screen.getByRole('button', { name: '开始新生涯' }));
    expect(await screen.findByLabelText('球员姓名')).toBeDefined();
  });

  it('restores a professional contract into the dashboard', async () => {
    const migrated = migrateCareerSaveV5(
      createCareerSave({
        playerName: '林河',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
    );
    const professionalContract = {
      ...migrated,
      careerPhase: 'professional-contract',
      season: { ...migrated.season, completed: true },
    } as const;
    storeSave(professionalContract);

    render(<App />);

    expect(await screen.findByRole('button', { name: '开启职业赛季' })).toBeDefined();
  });
});

const createSaveWithPendingEvent = (): CareerSave => {
  const save = createCareerSave({
    playerName: '林岳',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
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

const storeSave = (save: CareerSave | { careerId: string }): void => {
  localStorage.setItem(
    `football-save-${save.careerId}`,
    JSON.stringify({ version: 1, savedAt: '2024-09-01T00:00:00.000Z', data: save }),
  );
};
