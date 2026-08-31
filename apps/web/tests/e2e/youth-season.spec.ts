import { expect, test, type Page } from '@playwright/test';

test.describe('Youth season monthly flow', () => {
  test('advances a month, resolves interruptions and restores after refresh', async ({ page }) => {
    await createCareer(page);
    const before = await page.locator('.career-meta').textContent();
    await page.getByRole('button', { name: '推进到下个月' }).click();
    await resolveUntilDashboard(page);
    await expect(page.getByLabel('月报')).toBeVisible();
    await expect(page.getByLabel('本月节奏')).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expect(page.getByRole('status', { name: /体能/ })).toBeVisible();
    await expect(page.getByRole('status', { name: /教练评价/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const after = await page.locator('.career-meta').textContent();
    expect(after).not.toBe(before);
    await page.reload();
    await expect(page.getByText('推进到下个月')).toBeVisible();
    await expect(page.locator('.career-meta')).toContainText(after?.split('第')[0]?.trim() ?? '');
  });

  test('completes the full youth season through monthly actions', async ({ page }) => {
    await createCareer(page);
    const decisionsByMonth = new Map<string, number>();
    for (let guard = 0; guard < 30; guard += 1) {
      if (await isSeasonComplete(page)) break;
      const monthKey =
        (await page.locator('.career-meta span').nth(1).textContent()) ?? `month-${guard}`;
      const advance = page.getByRole('button', { name: '推进到下个月' });
      await expect(advance).toBeVisible();
      await advance.click();
      const decisions = await resolveUntilDashboard(page, true);
      decisionsByMonth.set(monthKey, decisions);
      expect(decisions, `month ${monthKey}`).toBeLessThanOrEqual(2);
    }
    expect([...decisionsByMonth.values()].every((count) => count <= 2)).toBe(true);
    await expect(page.getByText('赛季总结')).toBeVisible();
    await expect(page.getByRole('button', { name: '推进到下个月' })).toBeDisabled();
    await page.reload();
    await expect(page.getByText('赛季总结')).toBeVisible();
  });

  test('enters the offseason after the season and starts the next campaign', async ({ page }) => {
    await createCareer(page);
    await completeSeason(page);

    await page.getByRole('button', { name: '进入休赛期' }).click();
    await expect(page.getByText('休赛期简报')).toBeVisible();
    await expect(page.getByText('毕业资格评估')).toBeVisible();

    // 刷新后应恢复到休赛期阶段
    await page.reload();
    await expect(page.getByText('休赛期简报')).toBeVisible();

    await page.getByRole('button', { name: '开始下赛季' }).click();
    await expect(page.getByRole('button', { name: '推进到下个月' })).toBeEnabled();
    await page.getByRole('button', { name: '推进到下个月' }).click();
    await resolveUntilDashboard(page);
    await expect(page.getByLabel('月报')).toBeVisible();
    await expect(page.getByLabel('本月节奏')).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expect(page.getByRole('status', { name: /士气/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // 下个赛季刷新恢复
    await page.reload();
    await expect(page.getByRole('button', { name: '推进到下个月' })).toBeVisible();
  });
});

/** 反复推进月份直至赛季完成并显示赛季总结。 */
async function completeSeason(page: Page) {
  for (let guard = 0; guard < 40; guard += 1) {
    if (await isSeasonComplete(page)) return;
    const advance = page.getByRole('button', { name: '推进到下个月' });
    await expect(advance).toBeVisible();
    await advance.click();
    await resolveUntilDashboard(page, true);
  }
  throw new Error('赛季未在保护步数内完成');
}

async function createCareer(page: Page) {
  await page.goto('/');
  await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
  await page.fill('input[aria-label="球员姓名"]', '林河');
  await page.selectOption('select[aria-label="家乡"]', 'shanghai');
  await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
  await page.click('label:has-text("右脚")');
  await page.click('text=开始生涯');
  await expect(page.getByText('你的青训机会')).toBeVisible();
  await page.locator('button[aria-pressed]').first().click();
  await expect(page.getByRole('button', { name: '推进到下个月' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '球员档案' })).toBeVisible();
  // 隐藏型背景（late-bloomer）不显示成长背景行；其余背景展示真实出身
  const origin = page.getByText(/青训营|校园足球|社区足球/);
  if (!(await origin.isVisible().catch(() => false))) {
    await expect(page.getByText('成长背景')).toHaveCount(0);
  }
  await expect(page.locator('.strength-chips span')).toHaveCount(3);

  await expect(page.getByText('停球')).toBeVisible();
  await expect(page.getByText('关键人物')).toHaveCount(0);
}

async function resolveUntilDashboard(page: Page, allowSeasonEnd = false): Promise<number> {
  let decisions = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const dashboard = page.getByRole('button', { name: '推进到下个月' });
    if (await dashboard.isVisible().catch(() => false)) return decisions;
    if (allowSeasonEnd && (await isSeasonComplete(page))) return decisions;
    const feedback = page.getByRole('button', { name: '继续推进' });
    if (await feedback.isVisible().catch(() => false)) {
      await expect(page.getByTestId('scene-art')).toBeVisible();
      await expect(page.getByText('现场结果')).toBeVisible();
      await expect(page.getByText('人物回应')).toBeVisible();
      await expect(page.getByText('变化记录')).toBeVisible();
      await expect(page.getByText('后续影响')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await feedback.click();
      continue;
    }
    const choice = page.locator('main button').first();
    await expect(choice).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expect(page.getByText(/低风险|中风险|高风险/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    decisions += 1;
    await choice.click();
  }
  throw new Error('事件链未在保护步数内返回仪表盘');
}

const isSeasonComplete = (page: Page): Promise<boolean> =>
  page
    .getByText('赛季总结')
    .isVisible()
    .catch(() => false);

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}
