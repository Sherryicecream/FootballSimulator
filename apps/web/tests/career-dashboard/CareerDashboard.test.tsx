import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { migrateCareerSave } from '@football/contracts';
import { createCareerSave } from '@football/application';
import { CareerDashboard } from '../../src/career-dashboard/CareerDashboard';

const save = migrateCareerSave(
  createCareerSave({
    playerName: '林河',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
    weakFootLevel: 30,
    growthBackground: 'academy',
    personalityTendency: 'composed',
    regionId: 'shanghai',
    seed: 42,
  }),
);

describe('CareerDashboard v2', () => {
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
        onNewCareer={() => {}}
      />,
    );
    expect(screen.getByText('林河')).toBeDefined();
    expect(screen.getByText('浦江青训中心')).toBeDefined();
    expect(screen.getByRole('button', { name: '推进到下个月' })).toBeDefined();
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
        onNewCareer={() => {}}
      />,
    );
    expect(screen.getByLabelText('训练重点')).toBeDefined();
    expect(screen.getByLabelText('训练强度')).toBeDefined();
    expect(screen.getByText('体能')).toBeDefined();
    expect(screen.getByText('教练评价')).toBeDefined();
  });
});
