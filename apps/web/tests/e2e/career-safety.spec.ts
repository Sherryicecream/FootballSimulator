import { expect, test, type Page } from '@playwright/test';
import type { CareerSaveV6 } from '../../../../packages/contracts/src';
import {
  age22ProfessionalOffseasonV6,
  failedFinalYouthOffseasonV6,
  firstCareerV6,
  pendingEventV6,
  pendingFeedbackV6,
  secondCareerV6,
} from '../fixtures/career-safety';

const injectSaves = async (page: Page, saves: readonly CareerSaveV6[]) => {
  const records = saves.map((save) => ({
    key: `football-save-${save.careerId}`,
    value: JSON.stringify({ version: 6, savedAt: '2030-06-30T12:00:00.000Z', data: save }),
  }));
  await page.addInitScript((entries: readonly { key: string; value: string }[]) => {
    for (const { key, value } of entries) {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
    }
  }, records);
};

const injectSave = async (page: Page, save: CareerSaveV6) => injectSaves(page, [save]);

const continueCareer = async (page: Page, playerName: string) => {
  await page.getByRole('button', { name: `继续${playerName}的生涯` }).click();
};

const ageOn = (dateOfBirth: string, date: string) => {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  return (
    year! -
    birthYear! -
    (month! < birthMonth! || (month === birthMonth && day! < birthDay!) ? 1 : 0)
  );
};

test.describe('Iteration 1 career safety', () => {
  test('failed final youth career ends with a review and survives refresh', async ({ page }) => {
    const save = failedFinalYouthOffseasonV6();
    await injectSave(page, save);
    await page.goto('/');
    await continueCareer(page, save.player.identity.name);
    await page.getByRole('button', { name: '结束青训生涯' }).click();
    await page.getByRole('button', { name: '确认结束并查看回顾' }).click();
    await expect(page.getByRole('region', { name: '生涯回顾' })).toContainText('青训生涯结束');
    await page.reload();
    await page.getByRole('button', { name: `查看${save.player.identity.name}的回顾` }).click();
    await expect(page.getByRole('region', { name: '生涯回顾' })).toBeVisible();
  });

  test('two careers remain independently selectable and deletion is scoped', async ({ page }) => {
    await injectSaves(page, [firstCareerV6(), secondCareerV6()]);
    await page.goto('/');
    const archive = page.getByRole('region', { name: '生涯档案' });
    await expect(archive).toContainText('林岳');
    await expect(archive).toContainText('周川');
    await page.getByRole('button', { name: '删除林岳的生涯' }).click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText('林岳')).toHaveCount(0);
    await expect(page.getByText('周川')).toBeVisible();
  });

  test('an under-30 professional can cancel retirement confirmation', async ({ page }) => {
    const save = age22ProfessionalOffseasonV6();
    expect(save.player.age).toBe(22);
    expect(ageOn(save.player.identity.dateOfBirth, save.proSeason!.endDate)).toBe(22);
    await injectSave(page, save);
    await page.goto('/');
    await continueCareer(page, save.player.identity.name);
    await page.getByRole('button', { name: '宣布退役' }).click();
    await expect(page.getByRole('alertdialog', { name: '退役确认' })).toBeVisible();
    await page.getByRole('button', { name: '继续职业生涯' }).click();
    await expect(page.getByRole('button', { name: '宣布退役' })).toBeVisible();
  });

  test('an under-30 professional can confirm retirement', async ({ page }) => {
    const save = age22ProfessionalOffseasonV6();
    expect(save.player.age).toBe(22);
    expect(ageOn(save.player.identity.dateOfBirth, save.proSeason!.endDate)).toBe(22);
    await injectSave(page, save);
    await page.goto('/');
    await continueCareer(page, save.player.identity.name);
    await page.getByRole('button', { name: '宣布退役' }).click();
    await page.getByRole('button', { name: '确认退役' }).click();
    await expect(page.getByRole('region', { name: '生涯回顾' })).toBeVisible();
  });

  test('a pending event survives refresh before it is resolved', async ({ page }) => {
    const save = pendingEventV6();
    await injectSave(page, save);
    await page.goto('/');
    await continueCareer(page, save.player.identity.name);
    await expect(page.getByText(save.story.pendingEvent!.title)).toBeVisible();
    await page.reload();
    await continueCareer(page, save.player.identity.name);
    await expect(page.getByText(save.story.pendingEvent!.title)).toBeVisible();
  });

  test('pending event feedback survives refresh before continuing', async ({ page }) => {
    const save = pendingFeedbackV6();
    await injectSave(page, save);
    await page.goto('/');
    await continueCareer(page, save.player.identity.name);
    await expect(page.getByRole('region', { name: '事件反馈' })).toBeVisible();
    await page.reload();
    await continueCareer(page, save.player.identity.name);
    await expect(page.getByRole('region', { name: '事件反馈' })).toBeVisible();
  });

  test('the archive has no horizontal overflow on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await injectSaves(page, [firstCareerV6(), secondCareerV6()]);
    await page.goto('/');
    await expect(page.getByRole('region', { name: '生涯档案' })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });
});
