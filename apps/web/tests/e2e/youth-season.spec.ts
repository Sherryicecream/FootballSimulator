import { expect, test, type Page } from '@playwright/test';

test.describe('Youth season monthly flow', () => {
  test('advances a month, resolves interruptions and restores after refresh', async ({ page }) => {
    await createCareer(page);
    const before = await page.locator('.career-meta').textContent();
    await page.getByRole('button', { name: '推进到下个月' }).click();
    await resolveUntilDashboard(page);
    await expect(page.getByLabel('月报')).toBeVisible();
    const after = await page.locator('.career-meta').textContent();
    expect(after).not.toBe(before);
    await page.reload();
    await expect(page.getByText('推进到下个月')).toBeVisible();
    await expect(page.locator('.career-meta')).toContainText(after?.split('第')[0]?.trim() ?? '');
  });

  test('completes the full youth season through monthly actions', async ({ page }) => {
    await createCareer(page);
    for (let guard = 0; guard < 80; guard += 1) {
      if (
        await page
          .getByText('赛季总结')
          .isVisible()
          .catch(() => false)
      )
        break;
      const advance = page.getByRole('button', { name: '推进到下个月' });
      if (await advance.isVisible().catch(() => false)) {
        await advance.click();
      } else {
        const choice = page.locator('main button').first();
        await expect(choice).toBeVisible();
        await choice.click();
      }
    }
    await expect(page.getByText('赛季总结')).toBeVisible();
    await expect(page.getByRole('button', { name: '推进到下个月' })).toBeDisabled();
    await page.reload();
    await expect(page.getByText('赛季总结')).toBeVisible();
  });
});

async function createCareer(page: Page) {
  await page.goto('/');
  await page.fill('input[aria-label="球员姓名"]', '林河');
  await page.selectOption('select[aria-label="家乡"]', 'shanghai');
  await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
  await page.click('label:has-text("右脚")');
  await page.fill('input[aria-label="随机种子"]', '42');
  await page.click('text=开始生涯');
  await expect(page.getByText('你的青训机会')).toBeVisible();
  await page.locator('button[aria-pressed]').first().click();
  await expect(page.getByRole('button', { name: '推进到下个月' })).toBeVisible();
}

async function resolveUntilDashboard(page: Page) {
  for (let guard = 0; guard < 20; guard += 1) {
    const dashboard = page.getByRole('button', { name: '推进到下个月' });
    if (await dashboard.isVisible().catch(() => false)) return;
    const choice = page.locator('main button').first();
    await expect(choice).toBeVisible();
    await choice.click();
  }
  throw new Error('事件链未在保护步数内返回仪表盘');
}
