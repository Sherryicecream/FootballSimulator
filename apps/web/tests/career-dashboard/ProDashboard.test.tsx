import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('provides a world-football reading space for fact-backed updates', () => {
    render(
      <ProDashboard
        save={createProSave() as CareerSaveV5Like}
        report={null}
        advancing={false}
        onOpenArchives={() => {}}
        worldNewsItems={[
          {
            id: 'world-news-1',
            occurredOn: '2028-06-01',
            category: 'domestic',
            relatedClubIds: ['en-london-foundry'],
            title: '伦敦铸潮：国内赛季动态',
            summary: '伦敦铸潮完成赛季结算。',
            relatedFactId: 'fact-1',
            relevance: 100,
            sourceWindow: 'season',
          },
        ]}
      />,
    );

    expect(screen.getByRole('region', { name: '世界足坛' })).toBeVisible();
    expect(screen.getByText('伦敦铸潮完成赛季结算。')).toBeVisible();
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
  it('keeps professional training controls and shows an honest zero-match cup state', () => {
    const base = createProSave();
    const save = {
      ...base,
      proSeason: {
        ...base.proSeason!,
        domesticCup: {
          id: 'domestic-cup-2027',
          name: '国内杯',
          competitionId: 'domestic-cup',
          entrants: Array.from({ length: 8 }, (_, index) => 'club-' + (index + 1)),
          fixtures: [
            {
              id: 'domestic-cup-qf-1',
              weekKey: '2027-W27',
              competitionId: 'domestic-cup',
              homeClubId: 'club-1',
              awayClubId: 'club-2',
              status: 'scheduled' as const,
              resultId: null,
            },
          ],
          currentRound: 'quarterfinal' as const,
          winnerClubId: null,
          completed: false,
        },
      },
    };

    render(
      <ProDashboard
        save={save as CareerSaveV5Like}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onOpenArchives={() => {}}
      />,
    );

    expect(screen.getByLabelText('训练重点')).toBeVisible();
    expect(screen.getByLabelText('训练强度')).toHaveValue('normal');
    expect(screen.getByText('尚未开赛')).toBeVisible();
    expect(screen.queryByText(/第 2/)).toBeNull();
  });

  it('disables training controls while event feedback awaits confirmation', () => {
    const base = createProSave();
    const save = {
      ...base,
      story: {
        ...base.story,
        pendingFeedback: {
          eventId: 'event-pending',
          title: '待处理事件',
          choiceId: 'choice-1',
          choiceText: '继续',
          response: '结果待确认',
          participantResponses: [],
          stateChanges: [],
          relationshipChanges: [],
          followUp: '请先确认结果。',
        },
      },
    } as CareerSaveV5Like;

    render(
      <ProDashboard
        save={save}
        report={null}
        advancing={false}
        onAdvance={() => {}}
        onOpenArchives={() => {}}
        onTrainingPlanChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('训练重点')).toBeDisabled();
    expect(screen.getByLabelText('训练强度')).toBeDisabled();
  });

  it('renders names for overseas clubs in the standings', () => {
    const base = createProSave();
    const save = {
      ...base,
      proSeason: {
        ...base.proSeason!,
        standings: base.proSeason!.standings.map((standing, index) =>
          index === 1 ? { ...standing, clubId: 'en-london-foundry' } : standing,
        ),
      },
    } as CareerSaveV5Like;

    render(<ProDashboard save={save} report={null} advancing={false} onOpenArchives={() => {}} />);

    fireEvent.click(screen.getByText(/\u67e5\u770b\u5b8c\u6574\u8054\u8d5b\u79ef\u5206\u699c/));

    expect(screen.getByText('\u4f26\u6566\u94f8\u6f6e')).toBeVisible();
    expect(screen.queryByText('en-london-foundry')).toBeNull();
  });
});
