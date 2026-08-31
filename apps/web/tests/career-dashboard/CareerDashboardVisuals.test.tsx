import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createCareerSave } from '@football/application';
import { migrateCareerSave, type CareerSaveV4Like, type MonthlyReport } from '@football/contracts';
import { CareerDashboard } from '../../src/career-dashboard/CareerDashboard';

const report: MonthlyReport = {
  monthKey: '2024-09',
  facts: [],
  attributeChanges: [],
  stateSummary: { morale: 66, form: 72, confidence: 68, fitness: 84, fatigue: 18 },
  matchIds: [],
  momentum: {
    tone: 'turning-point',
    title: '误会正在被澄清',
    summary: '一次训练场上的沟通，让你和教练重新找到节奏。',
    nextFocus: '把这次信任转化为下一场比赛的执行力。',
    beats: [
      {
        weekKey: '2024-W03',
        kind: 'relationship',
        title: '教练在场边叫住你',
        detail: '你选择澄清误会，训练组的气氛开始缓和。',
        intensity: 'turning-point',
      },
    ],
  },
};

const createSave = (): CareerSaveV4Like =>
  migrateCareerSave(
    createCareerSave({
      playerName: '林河',
      hometown: '上海',
      primaryPosition: 'CENTER_BACK',
      preferredFoot: 'RIGHT',
      regionId: 'shanghai',
      seed: 42,
    }),
  );

const dashboardProps = (save: CareerSaveV4Like, nextReport: MonthlyReport | null = report) => ({
  save,
  events: [],
  academyName: '浦江青训中心',
  report: nextReport,
  outcome: null,
  advancing: false,
  onAdvance: () => {},
  onTrainingPlanChange: () => {},
  onNewCareer: () => {},
});

describe('CareerDashboard football visuals', () => {
  it('shows a lead football scene, five semantic state badges, and a prominent player heading', () => {
    render(<CareerDashboard {...dashboardProps(createSave())} />);

    expect(screen.getByRole('region', { name: '足球场景：教练在场边叫住你' })).toBeVisible();
    expect(screen.getAllByRole('status')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: '林河' })).toBeVisible();
  });

  it('shows injury text together with a dangerous injury status badge', () => {
    const save = createSave();
    const injuredSave: CareerSaveV4Like = {
      ...save,
      health: {
        ...save.health,
        activeInjury: {
          id: 'injury-1',
          kind: 'minor',
          bodyArea: '右脚踝',
          occurredWeek: '2024-W04',
          expectedRecoveryWeeks: 2,
          recoveredWeeks: 0,
          recurrenceRisk: 0.1,
        },
      },
    };

    render(<CareerDashboard {...dashboardProps(injuredSave, null)} />);

    expect(screen.getByText(/伤情：右脚踝/)).toBeVisible();
    expect(screen.getByRole('status', { name: '伤病 2周' })).toHaveClass('status-badge--danger');
  });
});
