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
    // Select first offer
    const offers = page.locator('[role="button"][aria-pressed]');
    await offers.first().click();
    await page.click('text=确认选择');

    // Step 3: Career summary
    await expect(page.getByText('STEP 3 OF 3')).toBeVisible();
    await expect(page.getByText('林岳')).toBeVisible();
    await expect(page.getByText('生涯已启动')).toBeVisible();
  });

  test('same seed produces same result', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    // Get first offer name
    const firstOffer = await page.locator('[role="button"][aria-pressed]').first().textContent();

    await page.goto('/');
    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    const secondOffer = await page.locator('[role="button"][aria-pressed]').first().textContent();
    expect(firstOffer).toBe(secondOffer);
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(412);
  });
});