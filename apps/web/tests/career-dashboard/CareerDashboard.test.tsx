import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { migrateCareerSave, type CareerSaveV2, type MonthlyReport } from '@football/contracts';
import { createCareerSave } from '@football/application';
import { CareerDashboard } from '../../src/career-dashboard/CareerDashboard';

const baseSave = migrateCareerSave(
  createCareerSave({
    playerName: '林河',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
    regionId: 'shanghai',
    seed: 42,
  }),
);

const save: CareerSaveV2 = {
  ...baseSave,
  ledger: [
    {
      id: 'training-1',
      weekKey: '2024-W01',
      type: 'training',
      summary: 'internal training detail',
      participantIds: [],
    },
  ],
};

describe('CareerDashboard v2', () => {
  it('opens the career archive from the dashboard', async () => {
    const user = userEvent.setup();
    let opened = false;
    render(
      <CareerDashboard
        save={save}
        events={[]}
        academyName="浦江青训中心"
        report={null}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {
          opened = true;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '生涯档案' }));

    expect(opened).toBe(true);
  });

  it('shows the player, monthly action and no weekly advance action', () => {
    render(
      <CareerDashboard
        save={save}
        academyName="浦江青训中心"
        report={null}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {}}
      />,
    );
    expect(screen.getByText('林河')).toBeDefined();
    expect(screen.getByText('浦江青训中心')).toBeDefined();
    expect(screen.getByRole('button', { name: '推进到下一节点' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /推进一周/ })).toBeNull();
  });

  it('shows persistent training settings and core state', () => {
    render(
      <CareerDashboard
        save={save}
        academyName="浦江青训中心"
        report={null}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {}}
      />,
    );
    expect(screen.getByLabelText('训练重点')).toBeDefined();
    expect(screen.getByLabelText('训练强度')).toBeDefined();
    expect(screen.getByText('体能')).toBeDefined();
    expect(screen.getByText('教练评价')).toBeDefined();
  });

  it('shows Chinese attributes, hides relationships and consolidates recent records', () => {
    render(
      <CareerDashboard
        save={save}
        academyName="浦江青训中心"
        report={null}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    const attributeSummary = screen.getByText('查看完整球员属性');
    const attributeCard = attributeSummary.closest('section');
    expect(attributeCard).not.toBeNull();
    expect(within(attributeCard!).getByText('停球')).not.toBeVisible();
    expect(within(attributeCard!).getByText('无球跑动')).not.toBeVisible();
    fireEvent.click(attributeSummary);
    expect(within(attributeCard!).getByText('停球')).toBeVisible();
    expect(within(attributeCard!).getByText('无球跑动')).toBeVisible();
    expect(screen.queryByText('firstTouch')).toBeNull();
    expect(screen.queryByText('offTheBall')).toBeNull();
    expect(screen.queryByText('关键人物')).toBeNull();
    expect(screen.queryByText(/信任|尊重|亲近/)).toBeNull();
    expect(screen.queryByText('training')).toBeNull();
    expect(screen.getByText('本月按计划完成日常训练。')).toBeVisible();
  });

  it('shows the generated profile without hidden development or relationship values', () => {
    render(
      <CareerDashboard
        save={save}
        academyName="浦江青训中心"
        report={null}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: '球员档案' })).toBeVisible();
    // 隐藏型成长背景（late-bloomer）不展示，避免泄露成长节奏设定
    expect(screen.queryByText('成长背景')).toBeNull();
    expect(screen.queryByText('大器晚成')).toBeNull();
    expect(screen.getByText('性格倾向')).toBeVisible();
    expect(screen.getByText('沉稳')).toBeVisible();
    expect(screen.getByText('逆足评价')).toBeVisible();
    expect(screen.getByText('主要能力')).toBeVisible();
    expect(screen.queryByText(/潜力|职业素养|稳定性|抗压|适应力|伤病倾向/)).toBeNull();
  });

  it('uses Chinese attribute labels in the monthly report', () => {
    const report: MonthlyReport = {
      monthKey: '2024-09',
      facts: [],
      attributeChanges: [{ attribute: 'firstTouch', oldValue: 40, newValue: 41 }],
      stateSummary: { morale: 60, form: 50, confidence: 50, fitness: 70, fatigue: 10 },
      matchIds: [],
    };

    render(
      <CareerDashboard
        save={save}
        academyName="浦江青训中心"
        report={report}
        outcome={null}
        advancing={false}
        onAdvance={() => {}}
        onTrainingPlanChange={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    expect(screen.getByText(/停球 40→41/)).toBeVisible();
    expect(screen.queryByText(/firstTouch/)).toBeNull();
  });
});
