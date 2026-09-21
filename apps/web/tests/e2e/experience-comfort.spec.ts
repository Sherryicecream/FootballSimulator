import { expect, test, type Page } from '@playwright/test';

test.describe('Experience comfort', () => {
  test('uses the primary action for node advancement and shows a transition brief', async ({
    page,
  }) => {
    await createCareer(page);

    await page.getByRole('button', { name: '推进到下一节点', exact: true }).click();

    await expect(page.getByRole('region', { name: '节点简报' })).toBeVisible();
    await expect(page.getByText('下一步关注')).toBeVisible();
    await expect(page.getByRole('region', { name: '月报' })).toHaveCount(0);
  });

  test('keeps the next-node action reachable across supported viewports', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await createCareer(page);

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 412, height: 915 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const actionBar = page.getByRole('region', { name: '生涯操作' });
      const advance = page.getByRole('button', { name: '推进到下一节点', exact: true });
      const monthly = page.getByRole('link', { name: '逐月推进', exact: true });

      await expect(actionBar).toBeVisible();
      await expect(actionBar).toHaveCSS('position', 'sticky');
      await expect(advance).toBeVisible();
      await expect(monthly).toBeVisible();
      const box = await advance.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await expect(page.getByText('当前关注')).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    }

    const primaryAdvance = page.getByRole('button', { name: '推进到下一节点', exact: true });
    await primaryAdvance.focus();
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', '推进到下一节点');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('逐月推进');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('生涯档案');

    await page.setViewportSize({ width: 412, height: 915 });
    const playerContext = page.locator('.career-player-context');
    await playerContext.evaluate((node) => {
      node.textContent =
        '舒适测试 · 16岁 · 中后卫 · 当前俱乐部：这是一个需要完整显示的超长俱乐部名称示例';
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expect(playerContext).toBeVisible();
    const contextBox = await playerContext.boundingBox();
    expect(contextBox).not.toBeNull();
    expect(contextBox!.width).toBeGreaterThan(0);
    const largeTextOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(largeTextOverflow).toBe(false);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
  });
});

async function createCareer(page: Page) {
  await page.goto('/');
  await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
  await page.fill('input[aria-label="球员姓名"]', '舒适测试');
  await page.selectOption('select[aria-label="家乡"]', 'shanghai');
  await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
  await page.click('label:has-text("右脚")');
  await page.click('text=开始生涯');
  await expect(page.getByText('你的青训机会')).toBeVisible();
  await page.locator('button[aria-pressed]').first().click();
  await expect(page.getByRole('region', { name: '青训生涯仪表盘' })).toBeVisible();
}
