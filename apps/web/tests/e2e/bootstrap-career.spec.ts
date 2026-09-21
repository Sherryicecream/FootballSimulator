import { test, expect } from '@playwright/test';

test.describe('Bootstrap Career Flow', () => {
  test('complete flow on desktop', async ({ page }) => {
    await page.goto('/');

    // Step 1: Create player
    await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
    await page.fill('input[aria-label="球员姓名"]', '林岳');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.click('text=开始生涯');

    // Step 2: Youth opportunity
    await expect(page.getByText('STEP 2 OF 3')).toBeVisible();
    await expect(page.getByText('你的青训机会')).toBeVisible();
    const offers = page.locator('button[aria-pressed]');
    await offers.first().click();

    // Step 3: Career dashboard
    await expect(page.getByLabel('青训生涯仪表盘')).toBeVisible();
    await expect(page.getByRole('heading', { name: '林岳' })).toBeVisible();
    await expect(page.getByText('推进到下一节点')).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expect(page.getByRole('status', { name: /体能/ })).toBeVisible();
  });

  test('generated profile controls stay hidden', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByLabel('逆足')).toHaveCount(0);
    await expect(page.getByLabel('成长背景')).toHaveCount(0);
    await expect(page.getByLabel('性格倾向')).toHaveCount(0);
    await expect(page.getByLabel('随机种子')).toHaveCount(1);
    await expect(
      page.locator('details').filter({ hasText: '世界种子（可选）' }),
    ).not.toHaveAttribute('open');

    await page.getByText('世界种子（可选）').click();
    await page.fill('input[aria-label="随机种子"]', '123');
    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.click('text=开始生涯');

    await expect(page.getByText('你的青训机会')).toBeVisible();
    await expect(page.locator('button[aria-pressed]').first()).toBeVisible();
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(412);
  });
});
