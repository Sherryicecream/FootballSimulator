import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CareerSaveV6Schema, migrateCareerSaveV6 } from '@football/contracts';
import { createProSave } from '../../../../packages/simulation/tests/fixtures/pro-save';
import { createYouthSave } from '../../../../packages/simulation/tests/fixtures/youth-save';
import type { CareerSlotRecord, LoadedCareerSlot } from '../../src/persistence/local-storage-save';
import { CareerSaveSelector } from '../../src/career-saves/CareerSaveSelector';
import { buildCareerSaveSummary } from '../../src/career-saves/career-save-summary';

const academyNames = new Map([['shanghai-pujiang', '浦江青训中心']]);

const youthSave = () => {
  const source = createYouthSave();
  return migrateCareerSaveV6({
    ...source,
    player: { ...source.player, identity: { ...source.player.identity, name: '林岳' } },
    season: { ...source.season, academyId: 'shanghai-pujiang' },
  });
};

const loadedSlot = (): LoadedCareerSlot => ({
  status: 'loaded',
  slotId: 'lin-yue',
  savedAt: '2026-09-07T08:00:00.000Z',
  save: youthSave(),
});

const proSlot = (): LoadedCareerSlot => {
  const source = migrateCareerSaveV6(createProSave());
  return {
    status: 'loaded',
    slotId: 'pro-lin-yue',
    savedAt: '2026-09-07T09:00:00.000Z',
    save: CareerSaveV6Schema.parse({
      ...source,
      player: { ...source.player, identity: { ...source.player.identity, name: '林岳' } },
      proSeason: { ...source.proSeason!, clubId: 'loan-club' },
      activeLoan: {
        parentClubId: 'pro-club-1',
        parentClubName: '职业俱乐部1',
        parentClubTier: 5,
        loanClubId: 'loan-club',
        loanClubName: '山谷联',
        loanClubTier: 6,
        startedOn: '2027-08-01',
        returnsOn: '2028-05-31',
        seasonId: 'pro-2027',
      },
    }),
  };
};

const terminalSlot = (): LoadedCareerSlot => {
  const save = youthSave();
  return {
    status: 'loaded',
    slotId: 'ended-lin-yue',
    savedAt: '2026-09-07T10:00:00.000Z',
    save: CareerSaveV6Schema.parse({
      ...save,
      careerPhase: 'retired',
      retiredOn: '2025-06-30',
      careerEnd: {
        kind: 'youth-no-contract',
        endedOn: '2025-06-30',
        summary: '青训阶段结束。',
        evidenceIds: [],
      },
    }),
  };
};

describe('buildCareerSaveSummary', () => {
  it('derives a youth career summary from the academy and youth date', () => {
    expect(buildCareerSaveSummary(loadedSlot(), academyNames)).toMatchObject({
      slotId: 'lin-yue',
      playerName: '林岳',
      location: '浦江青训中心',
      phaseLabel: '青训赛季',
      currentDate: '2024-09-01',
      terminal: false,
    });
  });

  it('prefers the active loan club and professional date over internal identifiers', () => {
    expect(buildCareerSaveSummary(proSlot(), academyNames)).toMatchObject({
      playerName: '林岳',
      location: '山谷联',
      phaseLabel: '职业赛季',
      currentDate: '2027-08-01',
      terminal: false,
    });
  });

  it('uses the contract club when there is no active loan', () => {
    const record = proSlot();
    const save = CareerSaveV6Schema.parse({ ...record.save, activeLoan: null });

    expect(buildCareerSaveSummary({ ...record, save }, academyNames).location).toBe('职业俱乐部1');
  });

  it('falls back safely when an academy name is unavailable', () => {
    const record = loadedSlot();
    const save = CareerSaveV6Schema.parse({
      ...record.save,
      season: { ...record.save.season, academyId: 'unlisted-academy' },
    });

    expect(buildCareerSaveSummary({ ...record, save }, academyNames).location).toBe('尚未选择球队');
  });

  it('uses the offseason start date when no professional season is active', () => {
    const record = loadedSlot();
    const save = CareerSaveV6Schema.parse({
      ...record.save,
      careerPhase: 'offseason',
      offseason: {
        briefing: {
          healthClearance: '身体状况良好。',
          attributeDrift: [],
          reputationChange: 0,
          ageUpdate: { from: 16, to: 17 },
        },
        graduationEligible: false,
        eligibilityReport: [],
        nextSeasonStart: '2025-09-01',
      },
    });

    expect(buildCareerSaveSummary({ ...record, save }, academyNames).currentDate).toBe(
      '2025-09-01',
    );
  });

  it('uses the terminal label for a completed career', () => {
    expect(buildCareerSaveSummary(terminalSlot(), academyNames)).toMatchObject({
      location: '青训生涯结束',
      phaseLabel: '生涯回顾',
      currentDate: '2024-09-01',
      terminal: true,
    });
  });
});

describe('CareerSaveSelector', () => {
  it('offers continue for active careers and review for terminal careers', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <CareerSaveSelector
        records={[loadedSlot(), terminalSlot()]}
        academyNames={academyNames}
        busy={false}
        onContinue={onContinue}
        onCreate={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: '继续林岳的生涯' }));
    await user.click(screen.getByRole('button', { name: '查看林岳的回顾' }));

    expect(onContinue).toHaveBeenNthCalledWith(1, 'lin-yue');
    expect(onContinue).toHaveBeenNthCalledWith(2, 'ended-lin-yue');
  });

  it('keeps a damaged slot separate and allows it to be deleted', () => {
    const damaged: CareerSlotRecord = {
      status: 'invalid',
      slotId: 'damaged-slot',
      savedAt: null,
      reason: '存档 JSON 解析失败',
    };
    render(
      <CareerSaveSelector
        records={[loadedSlot(), damaged]}
        academyNames={academyNames}
        busy={false}
        onContinue={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('无法读取此生涯档案')).toBeVisible();
    expect(screen.getByText('存档 JSON 解析失败')).toBeVisible();
    expect(screen.getByRole('button', { name: '删除损坏的生涯' })).toBeEnabled();
  });

  it('emits a create intent without deleting an existing career', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CareerSaveSelector
        records={[loadedSlot()]}
        academyNames={academyNames}
        busy={false}
        onContinue={vi.fn()}
        onCreate={onCreate}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: '创建新生涯' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('requires confirmation before deleting a named career', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CareerSaveSelector
        records={[loadedSlot()]}
        academyNames={academyNames}
        busy={false}
        onContinue={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: '删除林岳的生涯' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: '删除生涯确认' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(onDelete).toHaveBeenCalledWith('lin-yue');
  });

  it('closes the delete confirmation without a mutation when cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CareerSaveSelector
        records={[loadedSlot()]}
        academyNames={academyNames}
        busy={false}
        onContinue={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: '删除林岳的生涯' }));
    expect(screen.getByRole('button', { name: '取消删除' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '取消删除' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog', { name: '删除生涯确认' })).toBeNull();
    expect(screen.getByRole('button', { name: '删除林岳的生涯' })).toHaveFocus();
  });

  it('submits only one delete while the first deletion is still pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: (() => void) | undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    render(
      <CareerSaveSelector
        records={[loadedSlot()]}
        academyNames={academyNames}
        busy={false}
        onContinue={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: '删除林岳的生涯' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));

    expect(onDelete).toHaveBeenCalledOnce();
    resolveDelete?.();
    await waitFor(() => expect(screen.getByRole('button', { name: '创建新生涯' })).toHaveFocus());
  });

  it('disables actions while another save operation is busy', () => {
    render(
      <CareerSaveSelector
        records={[loadedSlot()]}
        academyNames={academyNames}
        busy
        onContinue={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('button', { name: '继续林岳的生涯' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '创建新生涯' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除林岳的生涯' })).toBeDisabled();
  });
});
