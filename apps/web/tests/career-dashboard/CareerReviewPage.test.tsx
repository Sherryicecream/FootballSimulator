import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CareerSaveV5Schema,
  CareerSaveV6Schema,
  migrateCareerSaveV5,
  migrateCareerSaveV7,
  type CareerSummaryOutput,
} from '@football/contracts';
import { buildCareerArchive } from '@football/application';
import { CareerReviewPage } from '../../src/career-dashboard/CareerReviewPage';
import { createYouthSave } from '../../../../packages/simulation/tests/fixtures/youth-save';

describe('CareerReviewPage', () => {
  it('requests an optional retirement milestone evaluation from archived facts', async () => {
    const base = migrateCareerSaveV5(createYouthSave());
    const v6 = CareerSaveV6Schema.parse({
      ...base,
      schemaVersion: 6,
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      careerEnd: {
        kind: 'voluntary-retirement',
        endedOn: '2038-06-30',
        summary: '正式结束球员生涯。',
        evidenceIds: [],
      },
    });
    const archive = buildCareerArchive(migrateCareerSaveV7(v6));
    const narrativeClient = {
      summarize: async () => null,
      narrateMilestone: vi.fn(async () => ({
        narrative: 'AI 退役节点评价只复述荣誉、关键数据和已记录比赛事实。'.repeat(6),
      })),
    };

    render(
      <CareerReviewPage
        archive={archive}
        narrativeClient={narrativeClient}
        onOpenArchives={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByText('AI 退役节点评价')).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(narrativeClient.narrateMilestone).toHaveBeenCalledTimes(1);
    expect(narrativeClient.narrateMilestone.mock.calls[0]![0].input).toMatchObject({
      kind: 'retirement',
      careerOverview: {
        appearances: archive.review.totals.appearances,
        goals: archive.review.totals.goals,
      },
      honours: [],
      signatureMatches: [],
    });
  });

  it('always renders a local career summary and keeps AI enhancement separate', () => {
    const save = migrateCareerSaveV5(createYouthSave());
    const narrativeClient = {
      polish: async () => null,
      summarize: async () =>
        ({
          summary: '这是对已存在事实的语言增强，不会覆盖本地总结。'.repeat(10),
        }) as CareerSummaryOutput,
    };
    render(
      <CareerReviewPage
        save={save}
        narrativeClient={narrativeClient}
        onOpenArchives={() => undefined}
      />,
    );

    expect(screen.getByRole('group', { name: '人生总结' })).toBeInTheDocument();
    expect(screen.getByText('本地生涯总结')).toBeInTheDocument();
  });

  it('shows the AI short summary asynchronously and requests the long version on demand', async () => {
    const save = migrateCareerSaveV5(createYouthSave());
    const narrativeClient = {
      polish: async () => null,
      summarize: vi.fn(async (request: { mode: 'short' | 'long' }) => ({
        summary:
          request.mode === 'short'
            ? 'AI 短版叙事增强。'.repeat(12)
            : 'AI 长版叙事增强，仍然只复述事实包中的内容。'.repeat(20),
      })),
    };
    render(
      <CareerReviewPage
        save={save}
        narrativeClient={narrativeClient}
        onOpenArchives={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByText('AI 叙事增强')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '展开 AI 人生总结' }));
    await waitFor(() => expect(screen.getByText('AI 长版叙事增强')).toBeInTheDocument());
    expect(narrativeClient.summarize).toHaveBeenCalledTimes(2);
  });
  it('shows a youth-only ending without claiming a professional career', () => {
    const youthSave = migrateCareerSaveV5(createYouthSave());
    const save = CareerSaveV6Schema.parse({
      ...youthSave,
      schemaVersion: 6,
      careerPhase: 'retired',
      retiredOn: '2027-06-30',
      careerEnd: {
        kind: 'youth-no-contract',
        endedOn: '2027-06-30',
        summary: '没有得到职业合同，青训生涯在这里结束。',
        evidenceIds: ['career-end-youth-2027'],
      },
      clubHistory: [],
      loanHistory: [],
      totals: { appearances: 0, goals: 0, assists: 0, minutes: 0 },
      ledger: [
        ...youthSave.ledger,
        {
          id: 'career-end-youth-2027',
          weekKey: '2027-W26',
          type: 'retirement',
          summary: '没有得到职业合同，青训生涯在这里结束。',
          participantIds: [],
        },
      ],
    });

    render(<CareerReviewPage save={save} onOpenArchives={() => undefined} />);

    expect(screen.getByText('青训生涯结束')).toBeInTheDocument();
    expect(screen.getAllByText('没有得到职业合同，青训生涯在这里结束。').length).toBeGreaterThan(0);
    expect(screen.queryByText('职业生涯')).not.toBeInTheDocument();
  });

  it('shows long-term goals and explainable replay moments', () => {
    const base = migrateCareerSaveV5(createYouthSave());
    const save = CareerSaveV5Schema.parse({
      ...base,
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      seasonHistory: [
        {
          seasonId: 'pro-2027',
          age: 19,
          status: 'retained',
          appearances: 20,
          goals: 4,
          assists: 3,
          avgRating: 7.1,
          signals: ['professional-season'],
          endedOn: '2028-06-30',
          honours: [
            {
              id: 'honour-cup-2027',
              kind: 'cup-champion',
              label: '国内杯冠军',
              seasonId: 'pro-2027',
              clubId: 'pro-club-1',
              evidenceId: 'pro-season-outcome-pro-2027',
            },
          ],
        },
      ],
      nationalTeam: {
        capped: true,
        caps: 4,
        goals: 1,
        debutOn: '2030-01-01',
      },
      totals: { appearances: 20, goals: 4, assists: 3, minutes: 1800 },
      clubHistory: [
        {
          clubId: 'pro-club-1',
          clubName: '东海职业',
          from: '2027-07-01',
          to: null,
          seasons: 1,
          appearances: 20,
          goals: 4,
        },
      ],
      loanHistory: [
        {
          seasonId: 'pro-2028',
          parentClubId: 'pro-club-1',
          parentClubName: '东海职业',
          loanClubId: 'ov-albion-rovers',
          loanClubName: '山谷联',
          from: '2028-08-01',
          to: '2029-05-31',
          appearances: 12,
          goals: 4,
          assists: 2,
          minutes: 900,
          competitionTier: 5,
          outcomeEvidenceId: 'pro-season-outcome-pro-2028',
        },
      ],
      ledger: [
        {
          id: 'decision-clarify-12',
          weekKey: '2024-W12',
          type: 'decision',
          summary: '[训练场上的误会] 当面澄清误会',
          participantIds: ['coach-main'],
        },
      ],
    });

    render(<CareerReviewPage save={save} onOpenArchives={() => undefined} />);

    expect(screen.getByRole('group', { name: '长期目标' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '全生涯回放' })).toBeInTheDocument();
    expect(screen.getByText('关键选择')).toBeInTheDocument();
    expect(screen.getByText('[训练场上的误会] 当面澄清误会')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '生涯荣誉' })).toHaveTextContent('国内杯冠军');
    expect(screen.getByRole('group', { name: '租借经历' })).toHaveTextContent('租借');
    expect(screen.getByRole('group', { name: '租借经历' })).toHaveTextContent('山谷联');
    expect(screen.getByRole('group', { name: '租借经历' })).toHaveTextContent('出场 12 次');
    expect(screen.getByRole('group', { name: '俱乐部履历' })).toHaveTextContent('东海职业');
    expect(screen.getByRole('group', { name: '俱乐部履历' })).toHaveTextContent('出场 20 次');
    expect(screen.getByRole('group', { name: '国家队履历' })).toHaveTextContent('4 场 1 球');
    expect(screen.getByText('1800 分钟')).toBeInTheDocument();
  });
});

describe('CareerReviewPage dimensions and behind-the-scenes', () => {
  it('renders the eight career dimensions and the behind-the-scenes archive', () => {
    const base = migrateCareerSaveV5(createYouthSave());
    const save = CareerSaveV5Schema.parse({
      ...base,
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
    });
    render(<CareerReviewPage save={save} onOpenArchives={() => {}} />);

    expect(screen.getByRole('group', { name: '生涯八维' })).toBeDefined();
    for (const label of ['竞技水平', '团队荣誉', '忠诚与身份', '国家队贡献', '传奇时刻']) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getAllByRole('progressbar').length).toBe(8);

    expect(screen.getByRole('group', { name: '幕后档案' })).toBeDefined();
    expect(screen.getAllByText('潜力兑现').length).toBe(3);
    expect(screen.getByText('隐藏特质')).toBeDefined();
    expect(screen.getByText('错过的机会')).toBeDefined();
    expect(screen.getByText('没有记录在案的错过。')).toBeDefined();
  });

  it('lists evidence-backed missed opportunities when they exist', () => {
    const base = migrateCareerSaveV5(createYouthSave());
    const save = CareerSaveV5Schema.parse({
      ...base,
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      story: {
        ...base.story,
        completedStoryIds: ['national-team-debut'],
      },
      nationalTeam: null,
      freeAgentSeasons: 1,
    });
    render(<CareerReviewPage save={save} onOpenArchives={() => {}} />);
    expect(screen.getByText('婉拒过国家队首召')).toBeDefined();
    expect(screen.getByText('自由球员滞留')).toBeDefined();
  });

  it('returns to archives from the review without starting a new career', () => {
    const onOpenArchives = vi.fn();
    const save = CareerSaveV5Schema.parse({
      ...migrateCareerSaveV5(createYouthSave()),
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
    });
    render(<CareerReviewPage save={save} onOpenArchives={onOpenArchives} />);

    fireEvent.click(screen.getByRole('button', { name: '返回生涯档案' }));

    expect(onOpenArchives).toHaveBeenCalledTimes(1);
  });

  it('renders a compact historical archive from its precomputed review', () => {
    const source = migrateCareerSaveV7(
      CareerSaveV6Schema.parse({
        ...migrateCareerSaveV5(createYouthSave()),
        schemaVersion: 6,
        careerPhase: 'retired',
        retiredOn: '2038-06-30',
        careerEnd: {
          kind: 'voluntary-retirement',
          endedOn: '2038-06-30',
          summary: '正式结束球员生涯。',
          evidenceIds: [],
        },
      }),
    );
    const archive = buildCareerArchive(source);
    const historicalCommentary = '这段历史档案使用已经结算的生涯评价。';
    const historicalArchive = {
      ...archive,
      review: { ...archive.review, commentary: historicalCommentary },
    };

    render(<CareerReviewPage archive={historicalArchive} onOpenArchives={() => undefined} />);

    expect(screen.getByText(historicalCommentary)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '生涯回顾' })).toBeInTheDocument();
  });
});
