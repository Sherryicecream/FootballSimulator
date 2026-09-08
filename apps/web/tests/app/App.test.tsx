import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { createCareerSave } from '@football/application';
import { migrateCareerSaveV5, migrateCareerSaveV6 } from '@football/contracts';
import type { CareerSave, MonthlyReport } from '@football/contracts';

// Mock localStorage for persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let nextSetItemError: Error | null = null;
  let setItemAttempts: Array<{ key: string; value: string }> = [];
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      setItemAttempts.push({ key, value });
      if (nextSetItemError) {
        const error = nextSetItemError;
        nextSetItemError = null;
        throw error;
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
      nextSetItemError = null;
      setItemAttempts = [];
    },
    failNextSetItem: (error = new DOMException('Quota exceeded', 'QuotaExceededError')) => {
      nextSetItemError = error;
    },
    getSetItemAttempts: () => [...setItemAttempts],
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

  it('opens the archive when at least one career exists', async () => {
    storeSave(migrateCareerSaveV6(createCareerSave(startParams)));

    render(<App />);

    expect(await screen.findByRole('region', { name: '生涯档案' })).toBeVisible();
    expect(screen.getByRole('button', { name: /继续林岳的生涯/ })).toBeVisible();
  });

  it('keeps multiple saves in the archive until the player explicitly continues one', async () => {
    storeSave(migrateCareerSaveV6(createCareerSave(startParams)));
    storeSave(
      migrateCareerSaveV6(createCareerSave({ ...startParams, playerName: '周宁', seed: 7 })),
    );

    render(<App />);

    expect(await screen.findByRole('region', { name: '生涯档案' })).toBeVisible();
    expect(screen.getByRole('button', { name: /继续林岳的生涯/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /继续周宁的生涯/ })).toBeVisible();
    expect(screen.queryByText('青训生涯')).toBeNull();
  });

  it('continues only the selected career from the archive', async () => {
    const user = userEvent.setup();
    storeSave(migrateCareerSaveV6(createCareerSave(startParams)));
    storeSave(
      migrateCareerSaveV6(createCareerSave({ ...startParams, playerName: '周宁', seed: 7 })),
    );

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续周宁的生涯' }));

    expect(await screen.findByText('青训生涯')).toBeVisible();
    expect(screen.getByRole('heading', { name: '周宁' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '生涯档案' })).toBeNull();
  });

  it('starts an in-memory creation flow without deleting an archived career', async () => {
    const user = userEvent.setup();
    const existing = migrateCareerSaveV6(createCareerSave(startParams));
    storeSave(existing);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '创建新生涯' }));

    expect(await screen.findByLabelText('球员姓名')).toBeVisible();
    expect(localStorageMock.getItem(`football-save-${existing.careerId}`)).not.toBeNull();
  });

  it('keeps damaged careers visible and refreshes the archive after deletion', async () => {
    const user = userEvent.setup();
    localStorageMock.setItem('football-save-damaged', '{not-json');

    render(<App />);

    expect(await screen.findByText('无法读取此生涯档案')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '删除损坏的生涯' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));

    expect(await screen.findByText('还没有可继续的生涯档案。')).toBeVisible();
    expect(localStorageMock.getItem('football-save-damaged')).toBeNull();
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

    await user.click(screen.getByRole('button', { name: '生涯档案' }));
    expect(await screen.findByRole('button', { name: '继续林岳的生涯' })).toBeVisible();
  });

  it('resumes a saved pending event instead of opening the dashboard', async () => {
    const user = userEvent.setup();
    const save = createSaveWithPendingEvent();
    storeSave(save);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));

    expect(await screen.findByText('必须处理的事件')).toBeDefined();
    expect(screen.queryByText('青训生涯')).toBeNull();
  });

  it('does not offer a dashboard bypass while an event is pending', async () => {
    const user = userEvent.setup();
    storeSave(createSaveWithPendingEvent());

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));

    expect(await screen.findByText('必须处理的事件')).toBeDefined();
    expect(screen.queryByRole('button', { name: '返回仪表盘' })).toBeNull();
  });

  it('does not leave the current event when saving its choice fails', async () => {
    const user = userEvent.setup();
    storeSave(createSaveWithPendingEvent());
    localStorageMock.failNextSetItem();

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(screen.getByRole('button', { name: /^继续/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByText('必须处理的事件')).toBeVisible();
    expect(screen.queryByRole('region', { name: '事件反馈' })).toBeNull();
  });

  it('retries the failed event save and performs its original transition once', async () => {
    const user = userEvent.setup();
    const original = createSaveWithPendingEvent();
    storeSave(original);
    const attemptsBeforeChoice = localStorageMock.getSetItemAttempts().length;
    localStorageMock.failNextSetItem();

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(screen.getByRole('button', { name: /^继续/ }));
    await user.click(await screen.findByRole('button', { name: '重试保存' }));

    expect(await screen.findByRole('region', { name: '事件反馈' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('已自动保存');
    expect(screen.queryByRole('region', { name: '事件选择' })).toBeNull();
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();

    const stored = JSON.parse(
      localStorageMock.getItem(`football-save-${original.careerId}`) ?? 'null',
    ) as { data?: { schemaVersion?: number; story?: { pendingFeedback?: { choiceId?: string } } } };
    expect(stored.data).toMatchObject({
      schemaVersion: 6,
      story: { pendingFeedback: { choiceId: 'continue' } },
    });

    const retryAttempts = localStorageMock.getSetItemAttempts().slice(attemptsBeforeChoice);
    expect(retryAttempts).toHaveLength(2);
    expect(JSON.parse(retryAttempts[1]?.value ?? 'null').data).toEqual(
      JSON.parse(retryAttempts[0]?.value ?? 'null').data,
    );
  });

  it('restores the latest monthly report from a saved career', async () => {
    const user = userEvent.setup();
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
    await user.click(await screen.findByRole('button', { name: '继续林河的生涯' }));

    expect(await screen.findByRole('region', { name: '月报' })).toBeDefined();
    expect(screen.getByText('2024-09 月报')).toBeVisible();
  });
  it('restores an unacknowledged event feedback before opening the dashboard', async () => {
    const user = userEvent.setup();
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
    await user.click(await screen.findByRole('button', { name: '继续林河的生涯' }));

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

    await user.click(await screen.findByRole('button', { name: '查看Lin Yue的回顾' }));
    expect(await screen.findByRole('region')).toBeDefined();
    expect(document.querySelector('.career-review')).not.toBeNull();
    expect(screen.queryByLabelText('5�S�w^~)�u')).toBeNull();
    await user.click(screen.getByRole('button', { name: '开始新生涯' }));
    expect(await screen.findByRole('region', { name: '生涯档案' })).toBeDefined();
  });

  it('restores a professional contract into the dashboard', async () => {
    const user = userEvent.setup();
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
    await user.click(await screen.findByRole('button', { name: '继续林河的生涯' }));

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

const startParams = {
  playerName: '林岳',
  hometown: '上海',
  primaryPosition: 'CENTER_BACK' as const,
  preferredFoot: 'RIGHT' as const,
  regionId: 'shanghai',
  seed: 42,
};

const storeSave = (save: CareerSave | { careerId: string }): void => {
  localStorage.setItem(
    `football-save-${save.careerId}`,
    JSON.stringify({ version: 6, savedAt: '2030-06-30T12:00:00.000Z', data: save }),
  );
};
