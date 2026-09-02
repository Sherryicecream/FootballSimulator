import { expect, test, type Page } from '@playwright/test';
import { createCareerSave } from '../../../../packages/application/src/use-cases/start-career';
import { createYouthCareerV2 } from '../../../../packages/application/src/use-cases/create-youth-career-v2';
import { advanceCareerMonth } from '../../../../packages/application/src/use-cases/advance-career-month';
import { submitCareerDecision } from '../../../../packages/application/src/use-cases/submit-career-decision';
import { clearEventFeedback } from '../../../../packages/application/src/use-cases/clear-event-feedback';
import { completeYouthSeason } from '../../../../packages/application/src/use-cases/complete-youth-season';
import { enterOffseason } from '../../../../packages/application/src/use-cases/enter-offseason';
import {
  submitAgentPreferences,
  generateContractOffers,
  signContract,
} from '../../../../packages/application/src/use-cases/contract-flow';
import { startProfessionalSeason } from '../../../../packages/application/src/use-cases/pro-flow';
import { getYouthContent } from '../../../../packages/content/src';
import { CareerSaveV5Schema } from '../../../../packages/contracts/src';

const content = getYouthContent();

/** 无界面流程：青训 → 毕业签约 →（可选）完整职业赛季 → 返回 v4 存档。 */
function buildProSave(options: { completeSeason: boolean }) {
  let save = createYouthCareerV2(
    createCareerSave({
      playerName: '林河',
      hometown: '上海',
      primaryPosition: 'FORWARD',
      preferredFoot: 'RIGHT',
      regionId: 'shanghai',
      seed: 42,
    }),
    content,
  );
  let guard = 0;
  while (!save.season.completed && guard < 40) {
    const outcome = advanceCareerMonth(save, content.academies, content.events);
    save = outcome.save;
    if (outcome.status === 'awaiting-decision') {
      save = clearEventFeedback(
        submitCareerDecision(save, outcome.event.eventId, outcome.event.choices[0]!.id),
      );
    }
    guard += 1;
  }
  // 注入达标状态确保毕业资格（与应用层夹具一致）
  save = {
    ...save,
    clubContext: { ...save.clubContext, coachEvaluation: 75, firstTeamStage: 'watchlist' },
    player: {
      ...save.player,
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
  const completed = completeYouthSeason(save);
  save = enterOffseason(completed.save, content.academies).save;
  save = submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'playing-time' });
  save = generateContractOffers(save, content);
  save = signContract(save, save.pendingOffers[0]!.id);
  // 1 年合同便于测试到期续约分支
  save = {
    ...save,
    contract: save.contract ? { ...save.contract, contractYears: 1 } : null,
  };
  const debugInfo = {
    sv: (save as { schemaVersion?: number }).schemaVersion,
    keys: Object.keys(save).length,
    careerPhase: (save as { careerPhase?: string }).careerPhase,
  };
  if (!CareerSaveV5Schema.safeParse(save).success) {
    throw new Error(
      JSON.stringify(debugInfo) +
        JSON.stringify(CareerSaveV5Schema.safeParse(save).error?.issues.slice(0, 3)),
    );
  }
  const v4 = CareerSaveV5Schema.parse(save);
  const proSave = startProfessionalSeason(v4, content.clubs);
  if (!options.completeSeason) return proSave;

  let current = proSave;
  let proGuard = 0;
  while (!current.proSeason!.completed && proGuard < 40) {
    const outcome = advanceProMonthHeadless(current);
    current = outcome.save;
    if (outcome.status === 'awaiting-decision') {
      current = clearEventFeedback(
        submitCareerDecision(current, outcome.event.eventId, outcome.event.choices[0]!.id),
      );
    }
    proGuard += 1;
  }
  if (!current.proSeason!.completed) throw new Error('职业赛季未在保护步数内完成');
  return current;
}

// advanceProMonth 通过相对路径引入（避免循环使用 index 导出）
import { advanceProMonth } from '../../../../packages/application/src/use-cases/pro-flow';
import { completeProfessionalSeason } from '../../../../packages/application/src/use-cases/pro-flow';
function advanceProMonthHeadless(save: Parameters<typeof advanceProMonth>[0]) {
  return advanceProMonth(save, content.clubs, content.events);
}

const injectSave = async (page: Page, save: unknown) => {
  const payload = JSON.stringify({ version: 4, savedAt: new Date().toISOString(), data: save });
  await page.addInitScript((value) => {
    window.localStorage.clear();
    window.localStorage.setItem('football-save-pro-e2e', value);
  }, payload);
};

test.describe('职业赛季流程', () => {
  // 处理推进过程中的事件直至回到职业仪表盘
  async function resolveUntilProDashboard(page: Page) {
    for (let guard = 0; guard < 20; guard += 1) {
      const advance = page.getByRole('button', { name: '推进到下个月' });
      if (await advance.isVisible().catch(() => false)) return;
      const choice = page.locator('main button').first();
      await expect(choice).toBeVisible();
      await choice.click();
    }
    throw new Error('事件链未在保护步数内返回职业仪表盘');
  }
  test('开启职业赛季后按月推进并刷新恢复', async ({ page }) => {
    const proSave = buildProSave({ completeSeason: false });
    await injectSave(page, proSave);
    await page.goto('/');

    await expect(page.getByRole('region', { name: '职业仪表盘' })).toBeVisible();
    await expect(page.getByText('联赛积分榜')).toBeVisible();
    await expect(page.getByText('位置深度图')).toBeVisible();
    await expect(page.getByRole('region', { name: '本赛季赛事' })).toBeVisible();
    await expect(page.getByText('国内杯')).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expect(page.getByRole('status', { name: /体能/ })).toBeVisible();
    await expect(page.getByRole('status', { name: /教练评价/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: '推进到下个月' }).click();
    await resolveUntilProDashboard(page);

    for (let month = 0; month < 7; month += 1) {
      await page.getByRole('button', { name: '推进到下个月' }).click();
      await resolveUntilProDashboard(page);
    }
    await expect(page.getByRole('region', { name: '本赛季赛事' })).toContainText('国内杯');
    await expect(page.getByRole('region', { name: '本赛季赛事' })).toContainText(
      /已完成 [467]\/7 场/,
    );

    await page.reload();
    await expect(page.getByText('联赛积分榜')).toBeVisible();
    await expect(page.getByRole('button', { name: '推进到下个月' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('完成职业赛季后查看承诺对照并接受续约', async ({ page }) => {
    let proSave = buildProSave({ completeSeason: true });
    const settled = completeProfessionalSeason(proSave);
    proSave = settled.save;
    await injectSave(page, proSave);
    await page.goto('/');

    await expect(page.getByText('职业赛季总结')).toBeVisible();
    await expect(page.getByText(/合同承诺对照/)).toBeVisible();
    await expect(page.getByTestId('scene-art')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole('region', { name: '球队赛季' })).toBeVisible();
    await expect(page.getByRole('region', { name: '本赛季荣誉' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('职业赛季总结')).toBeVisible();

    if ((await page.getByRole('alertdialog').count()) > 0) {
      await page.getByRole('button', { name: '接受续约' }).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '开始下个职业赛季' })).toBeVisible();
      await page.reload();
      await expect(page.getByText('职业赛季总结')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}
