import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createProSave } from '../../../../packages/simulation/tests/fixtures/pro-save';
import type { CareerSaveV5Like, MonthlyReport } from '@football/contracts';
import { ProDashboard } from '../../src/career-dashboard/ProDashboard';

describe('ProDashboard', () => {
  it('shows the national-team card when the player has caps', () => {
    const save = {
      ...createProSave(),
      schemaVersion: 5,
      nationalTeam: { capped: true, caps: 12, goals: 4, debutOn: '2028-05-31' },
    } as CareerSaveV5Like;

    render(
      <ProDashboard
        save={save}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    expect(document.querySelector('.national-team-card')).not.toBeNull();
  });

  it('shows a lead match scene and semantic state badges in the professional workspace', () => {
    const report: MonthlyReport = {
      monthKey: '2027-08',
      facts: [],
      attributeChanges: [],
      stateSummary: { morale: 64, form: 70, confidence: 66, fitness: 88, fatigue: 14 },
      matchIds: [],
      momentum: {
        tone: 'progress',
        title: '替补席上的机会',
        summary: '密集赛程给了你进入比赛名单的窗口。',
        nextFocus: '继续争取稳定的比赛分钟。',
        beats: [
          {
            weekKey: '2027-W02',
            kind: 'match',
            title: '职业联赛首秀窗口',
            detail: '教练把你列入了比赛名单。',
            intensity: 'notable',
          },
        ],
      },
    };

    render(
      <ProDashboard
        save={createProSave() as CareerSaveV5Like}
        report={report}
        advancing={false}
        onAdvance={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    expect(screen.getByRole('region', { name: '足球场景：职业联赛首秀窗口' })).toBeVisible();
    expect(screen.getAllByRole('status')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: '当前状态' })).toBeVisible();
  });
});
