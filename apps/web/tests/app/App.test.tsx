import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import {
  completeYouthSeason,
  createCareerSave,
  enterOffseason,
  generateContractOffers,
  signContract,
  startProfessionalSeason,
  submitAgentPreferences,
} from '@football/application';
import { getYouthContent } from '@football/content';
import { migrateCareerSaveV5, migrateCareerSaveV6 } from '@football/contracts';
import type { CareerSave, MonthlyReport } from '@football/contracts';
import {
  content as fixtureContent,
  createSave as createFixtureSave,
  finishSeason,
} from '../../../../packages/application/tests/fixtures/youth-save';

const persistenceControl = vi.hoisted(() => ({
  loadDelays: new Map<string, Promise<void>>(),
}));

vi.mock('../../src/persistence/local-storage-save', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/persistence/local-storage-save')>();
  return {
    ...actual,
    createLocalStorageCareerPort: () => {
      const port = actual.createLocalStorageCareerPort();
      return {
        ...port,
        load: async (slotId: string) => {
          await persistenceControl.loadDelays.get(slotId);
          return port.load(slotId);
        },
      };
    },
  };
});

// Mock localStorage for persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let nextSetItemFailure: {
    error: Error;
    matches: (key: string, value: string) => boolean;
  } | null = null;
  let setItemAttempts: Array<{ key: string; value: string }> = [];
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      setItemAttempts.push({ key, value });
      if (nextSetItemFailure?.matches(key, value)) {
        const { error } = nextSetItemFailure;
        nextSetItemFailure = null;
        throw error;
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
      nextSetItemFailure = null;
      setItemAttempts = [];
    },
    failNextSetItem: (error = new DOMException('Quota exceeded', 'QuotaExceededError')) => {
      nextSetItemFailure = { error, matches: () => true };
    },
    failNextSetItemMatching: (
      matches: (key: string, value: string) => boolean,
      error = new DOMException('Quota exceeded', 'QuotaExceededError'),
    ) => {
      nextSetItemFailure = { error, matches };
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
    persistenceControl.loadDelays.clear();
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

  it('commits a completed youth season before showing its dashboard outcome', async () => {
    const user = userEvent.setup();
    const completed = createCompletedYouthSave();
    storeSave(completed);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));

    expect(await screen.findByText('青训生涯')).toBeVisible();
    const stored = readStoredSave(completed.careerId);
    expect(stored.seasonHistory).toContainEqual(
      expect.objectContaining({ seasonId: completed.season.id }),
    );
    expect(stored.ledger).toContainEqual(
      expect.objectContaining({ id: `season-outcome-${completed.season.id}` }),
    );
  });

  it('keeps the archive visible when committing a restored season outcome fails', async () => {
    const user = userEvent.setup();
    storeSave(createCompletedYouthSave());
    localStorageMock.failNextSetItem();

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('region', { name: '生涯档案' })).toBeVisible();
    expect(screen.queryByText('青训生涯')).toBeNull();
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

  it('discards a failed career commit before continuing a different archive', async () => {
    const user = userEvent.setup();
    const first = migrateCareerSaveV6(createCareerSave(startParams));
    const second = migrateCareerSaveV6(
      createCareerSave({ ...startParams, playerName: '周宁', seed: 7 }),
    );
    storeSave(first);
    storeSave(second);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    localStorageMock.failNextSetItem();
    await user.selectOptions(screen.getByLabelText('训练重点'), 'physical');
    expect(await screen.findByRole('button', { name: '重试保存' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '生涯档案' }));
    expect(await screen.findByRole('region', { name: '生涯档案' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '继续周宁的生涯' }));

    expect(await screen.findByRole('heading', { name: '周宁' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
  });

  it('discards a failed career commit before starting an in-memory career', async () => {
    const user = userEvent.setup();
    storeSave(migrateCareerSaveV6(createCareerSave(startParams)));

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    localStorageMock.failNextSetItem();
    await user.selectOptions(screen.getByLabelText('训练重点'), 'physical');
    await user.click(await screen.findByRole('button', { name: '生涯档案' }));
    await user.click(screen.getByRole('button', { name: '创建新生涯' }));

    expect(await screen.findByLabelText('球员姓名')).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
  });

  it('disables archive actions while a career is opening', async () => {
    const first = migrateCareerSaveV6(createCareerSave(startParams));
    storeSave(first);

    render(<App />);
    const continueButton = await screen.findByRole('button', { name: '继续林岳的生涯' });
    const release = holdLoad(first.careerId);
    fireEvent.click(continueButton);

    expect(continueButton).toBeDisabled();
    expect(screen.getByRole('button', { name: '创建新生涯' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除林岳的生涯' })).toBeDisabled();

    await act(async () => release());
    expect(await screen.findByRole('heading', { name: '林岳' })).toBeVisible();
  });

  it('ignores an older load when two archive choices start together', async () => {
    const first = migrateCareerSaveV6(createCareerSave(startParams));
    const second = migrateCareerSaveV6(
      createCareerSave({ ...startParams, playerName: '周宁', seed: 7 }),
    );
    storeSave(first);
    storeSave(second);

    render(<App />);
    const firstButton = await screen.findByRole('button', { name: '继续林岳的生涯' });
    const secondButton = screen.getByRole('button', { name: '继续周宁的生涯' });
    const releaseFirst = holdLoad(first.careerId);
    act(() => {
      firstButton.click();
      secondButton.click();
    });

    expect(await screen.findByText('青训生涯')).toBeVisible();
    expect(screen.getByRole('heading', { name: '周宁', level: 2 })).toBeVisible();
    await act(async () => releaseFirst());
    expect(screen.getByRole('heading', { name: '周宁', level: 2 })).toBeVisible();
  });

  it('ignores an older load after starting a new in-memory career', async () => {
    const first = migrateCareerSaveV6(createCareerSave(startParams));
    storeSave(first);

    render(<App />);
    const continueButton = await screen.findByRole('button', { name: '继续林岳的生涯' });
    const createButton = screen.getByRole('button', { name: '创建新生涯' });
    const release = holdLoad(first.careerId);
    act(() => {
      continueButton.click();
      createButton.click();
    });

    expect(await screen.findByLabelText('球员姓名')).toBeVisible();
    await act(async () => release());
    expect(screen.getByLabelText('球员姓名')).toBeVisible();
    expect(screen.queryByRole('heading', { name: '林岳' })).toBeNull();
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

  it('keeps feedback recoverable when its automatic youth advance cannot be saved', async () => {
    const user = userEvent.setup();
    const original = createSaveWithPendingFeedback();
    storeSave(original);
    localStorageMock.failNextSetItemMatching((_key, value) => {
      const data = JSON.parse(value).data as typeof original;
      return (
        data.story.pendingFeedback === null &&
        (data.season.currentWeek !== original.season.currentWeek ||
          data.randomState.sequencePosition !== original.randomState.sequencePosition)
      );
    });

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(screen.getByRole('button', { name: '继续推进' }));

    expect(await screen.findByRole('button', { name: '重试保存' })).toBeVisible();
    expect(screen.getByText('你把事情说清楚了。')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '重试保存' }));

    await waitFor(() => {
      expect(screen.queryByText('你把事情说清楚了。')).toBeNull();
    });
    expect(screen.getByText('已自动保存')).toBeVisible();
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
    await user.click(screen.getByRole('button', { name: '返回生涯档案' }));
    expect(await screen.findByRole('region', { name: '生涯档案' })).toBeDefined();
    expect(readStoredSave(retired.careerId).careerPhase).toBe('retired');
  });

  it('stays in the final youth briefing when ending the career cannot be saved', async () => {
    const user = userEvent.setup();
    const finalYouth = createFinalYouthOffseason();
    storeSave(finalYouth);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(await screen.findByRole('button', { name: '结束青训生涯' }));
    localStorageMock.failNextSetItem();
    await user.click(screen.getByRole('button', { name: '确认结束并查看回顾' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('region', { name: '休赛期简报' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '生涯回顾' })).toBeNull();
  });

  it('commits a final youth ending before opening the review', async () => {
    const user = userEvent.setup();
    const finalYouth = createFinalYouthOffseason();
    storeSave(finalYouth);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(await screen.findByRole('button', { name: '结束青训生涯' }));
    await user.click(screen.getByRole('button', { name: '确认结束并查看回顾' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(finalYouth.careerId).careerEnd?.kind).toBe('youth-no-contract');
  });

  it('offers ending an age-exhausted youth career after a graduation-eligible offseason', async () => {
    const finalYouth = createFinalYouthOffseason(true);
    storeSave(finalYouth);

    render(<App />);
    await userEvent.setup().click(await screen.findByRole('button', { name: '继续林岳的生涯' }));

    expect(screen.getByRole('button', { name: '结束青训生涯' })).toBeVisible();
  });

  it('records an empty free-agent market exit separately from voluntary retirement', async () => {
    const user = userEvent.setup();
    const freeAgent = createEmptyFreeAgentSave();
    storeSave(freeAgent);

    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: `继续${freeAgent.player.identity.name}的生涯` }),
    );
    await user.click(await screen.findByRole('button', { name: '结束职业生涯' }));
    await user.click(screen.getByRole('button', { name: '确认离开职业足坛' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(freeAgent.careerId).careerEnd?.kind).toBe('market-exit');
  });

  it('uses the saved youth offseason date for a free-agent market exit', async () => {
    const user = userEvent.setup();
    const finalYouth = createFinalYouthOffseason();
    const freeAgent = {
      ...finalYouth,
      careerPhase: 'free-agent' as const,
      pendingOffers: [],
    };
    storeSave(freeAgent);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(await screen.findByRole('button', { name: '结束职业生涯' }));
    await user.click(screen.getByRole('button', { name: '确认离开职业足坛' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(freeAgent.careerId).careerEnd?.endedOn).toBe(
      finalYouth.offseason!.nextSeasonStart,
    );
  });

  it('uses a completed professional season date for a professional free-agent exit', async () => {
    const user = userEvent.setup();
    const freeAgent = createProfessionalFreeAgentSave();
    storeSave(freeAgent);

    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: `继续${freeAgent.player.identity.name}的生涯` }),
    );
    await user.click(await screen.findByRole('button', { name: '结束职业生涯' }));
    await user.click(screen.getByRole('button', { name: '确认离开职业足坛' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(freeAgent.careerId).careerEnd?.endedOn).toBe(
      freeAgent.proSeason!.endDate,
    );
  });

  it('commits voluntary retirement from the professional offseason confirmation', async () => {
    const user = userEvent.setup();
    const freeAgent = createProfessionalFreeAgentSave();
    const professionalOffseason = {
      ...freeAgent,
      careerPhase: 'pro-offseason' as const,
    };
    storeSave(professionalOffseason);

    render(<App />);
    await user.click(
      await screen.findByRole('button', {
        name: `继续${professionalOffseason.player.identity.name}的生涯`,
      }),
    );
    await user.click(await screen.findByRole('button', { name: '宣布退役' }));
    await user.click(screen.getByRole('button', { name: '确认退役' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(professionalOffseason.careerId).careerEnd?.kind).toBe(
      'voluntary-retirement',
    );
  });

  it('requires confirmation before a free agent with offers voluntarily retires', async () => {
    const user = userEvent.setup();
    const freeAgent = createFreeAgentWithOfferSave();
    storeSave(freeAgent);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(await screen.findByRole('button', { name: '宣布退役' }));

    expect(screen.getByRole('alertdialog', { name: '退役确认' })).toBeVisible();
    expect(readStoredSave(freeAgent.careerId).careerEnd).toBeNull();
    await user.click(screen.getByRole('button', { name: '确认退役' }));

    expect(await screen.findByRole('region', { name: '生涯回顾' })).toBeVisible();
    expect(readStoredSave(freeAgent.careerId).careerEnd?.kind).toBe('voluntary-retirement');
  });

  it('blocks free-agent offer actions while retirement confirmation is open and restores them on cancel', async () => {
    const user = userEvent.setup();
    const freeAgent = createFreeAgentWithOfferSave();
    storeSave(freeAgent);

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '继续林岳的生涯' }));
    await user.click(await screen.findByRole('button', { name: '宣布退役' }));

    expect(screen.queryByRole('button', { name: '选择这份要约' })).toBeNull();
    expect(screen.queryByRole('button', { name: '暂不签约，等待下一个窗口' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '继续职业生涯' }));

    expect(screen.getByRole('button', { name: '选择这份要约' })).toBeVisible();
    expect(screen.getByRole('button', { name: '暂不签约，等待下一个窗口' })).toBeVisible();
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

const createFinalYouthOffseason = (graduationEligible = false) => {
  const save = migrateCareerSaveV6(createCareerSave(startParams));
  const youthContent = getYouthContent();
  const academyId = youthContent.academies[0]?.id;
  if (!academyId) throw new Error('测试内容缺少青训机构');
  const finalYouthSeason = {
    ...save,
    player: {
      ...save.player,
      age: 20,
      identity: { ...save.player.identity, dateOfBirth: '2005-01-01' },
    },
    season: { ...save.season, academyId, completed: true },
  };
  const completed = completeYouthSeason(finalYouthSeason);
  const offseason = enterOffseason(completed.save, youthContent.academies).save;
  return migrateCareerSaveV6({
    ...offseason,
    offseason: { ...offseason.offseason!, graduationEligible },
  });
};

const createEmptyFreeAgentSave = () => {
  const save = migrateCareerSaveV6(createCareerSave(startParams));
  return {
    ...save,
    careerPhase: 'free-agent' as const,
    player: { ...save.player, age: 22 },
    pendingOffers: [],
  };
};

const createFreeAgentWithOfferSave = () => {
  const save = createEmptyFreeAgentSave();
  return {
    ...save,
    pendingOffers: [
      {
        id: 'offer-free-agent',
        clubId: 'club-free-agent',
        clubName: '海港城',
        clubTier: 4,
        salaryPerYear: 12000,
        contractYears: 2,
        squadRole: 'rotation' as const,
        promise: { kind: 'none' as const },
        releaseClauseNote: '',
      },
    ],
  };
};

const createProfessionalFreeAgentSave = () => {
  let youthSeason = finishSeason(createFixtureSave(42));
  youthSeason = {
    ...youthSeason,
    clubContext: { ...youthSeason.clubContext, coachEvaluation: 75, firstTeamStage: 'watchlist' },
    player: {
      ...youthSeason.player,
      age: 18,
      attributes: {
        technical: {
          firstTouch: 70,
          dribbling: 68,
          passing: 66,
          shooting: 72,
          defending: 50,
          aerialAbility: 60,
        },
        physical: { pace: 74, strength: 66, stamina: 70, agility: 68 },
        mental: {
          offTheBall: 72,
          vision: 64,
          decision: 66,
          composure: 68,
          determination: 74,
          discipline: 70,
        },
      },
    },
    seasonStats: { appearances: 20, goals: 6, assists: 3, ratingSum: 145, ratingCount: 20 },
  };
  const completed = completeYouthSeason(youthSeason);
  let offseason = enterOffseason(completed.save, fixtureContent.academies).save;
  offseason = submitAgentPreferences(offseason, {
    leagueTierBias: 'balanced',
    priority: 'playing-time',
  });
  offseason = generateContractOffers(offseason, fixtureContent);
  const contracted = signContract(offseason, offseason.pendingOffers[0]!.id);
  const started = startProfessionalSeason(migrateCareerSaveV6(contracted), fixtureContent.clubs);

  return migrateCareerSaveV6({
    ...started,
    careerPhase: 'free-agent',
    proPhase: 'settled',
    contract: null,
    pendingOffers: [],
    proSeason: {
      ...started.proSeason!,
      currentDate: started.proSeason!.endDate,
      currentMonth: started.proSeason!.endDate.slice(0, 7),
      currentWeek: 52,
      completed: true,
    },
  });
};

const createCompletedYouthSave = () => {
  const save = migrateCareerSaveV6(createCareerSave(startParams));
  return {
    ...save,
    season: {
      ...save.season,
      completed: true,
    },
  };
};

const createSaveWithPendingFeedback = () => {
  const save = migrateCareerSaveV6(createCareerSave(startParams));
  return {
    ...save,
    story: {
      ...save.story,
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
};

const readStoredSave = (careerId: string): ReturnType<typeof migrateCareerSaveV6> => {
  const wrapper = JSON.parse(localStorageMock.getItem(`football-save-${careerId}`) ?? 'null') as {
    data: unknown;
  };
  return migrateCareerSaveV6(wrapper.data);
};

const holdLoad = (slotId: string): (() => void) => {
  let release = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  persistenceControl.loadDelays.set(slotId, wait);
  return () => {
    persistenceControl.loadDelays.delete(slotId);
    release();
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
