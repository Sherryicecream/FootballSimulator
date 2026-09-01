import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, migrateCareerSaveV5 } from '@football/contracts';
import { CareerReviewPage } from '../../src/career-dashboard/CareerReviewPage';
import { createYouthSave } from '../../../../packages/simulation/tests/fixtures/youth-save';

describe('CareerReviewPage', () => {
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
        },
      ],
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

    render(<CareerReviewPage save={save} onNewCareer={() => undefined} />);

    expect(screen.getByRole('group', { name: '长期目标' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '全生涯回放' })).toBeInTheDocument();
    expect(screen.getByText('关键选择')).toBeInTheDocument();
    expect(screen.getByText('[训练场上的误会] 当面澄清误会')).toBeInTheDocument();
  });
});
