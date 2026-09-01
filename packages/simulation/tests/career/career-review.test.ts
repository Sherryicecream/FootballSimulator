import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, migrateCareerSaveV5 } from '@football/contracts';
import { buildCareerReview } from '../../src/career/career-review';
import { createYouthSave } from '../fixtures/youth-save';

describe('career review replay', () => {
  it('builds an explainable replay and long-term goals from persisted career facts', () => {
    const save = CareerSaveV5Schema.parse({
      ...migrateCareerSaveV5(createYouthSave()),
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      story: {
        ...createYouthSave().story,
        completedStoryIds: ['misunderstanding-clarification'],
      },
      clubHistory: [
        {
          clubId: 'pro-club-1',
          clubName: '东海职业',
          from: '2027-07-01',
          to: null,
          seasons: 10,
          appearances: 180,
          goals: 42,
        },
      ],
      nationalTeam: {
        capped: true,
        caps: 4,
        goals: 1,
        debutOn: '2030-09-01',
      },
      totals: { appearances: 180, goals: 42, assists: 28, minutes: 13200 },
      seasonHistory: Array.from({ length: 10 }, (_, index) => ({
        seasonId: index < 3 ? `season-202${4 + index}` : `pro-${2027 + index - 3}`,
        age: 16 + index,
        status: index === 2 ? 'graduated' : 'retained',
        appearances: 12 + index,
        goals: index,
        assists: 2,
        avgRating: 6.8,
        signals: ['professional-season'],
        endedOn: `20${24 + index}-06-30`,
      })),
      ledger: [
        {
          id: 'decision-clarify-12',
          weekKey: '2024-W12',
          type: 'decision',
          summary: '[训练场上的误会] 当面澄清误会',
          participantIds: ['coach-main'],
        },
        {
          id: 'pro-match-2030-01',
          weekKey: '2030-W08',
          type: 'pro-match',
          summary: '东海职业 2:1 击败北城联',
          participantIds: [],
          matchContext: {
            opponentStrength: 78,
            isHome: true,
            played: true,
            minutesPlayed: 90,
            rating: 8.1,
            goals: 1,
            assists: 1,
          },
        },
        {
          id: 'relationship-clarify-12',
          weekKey: '2024-W12',
          type: 'relationship',
          summary: '与周岚教练的信任上升',
          participantIds: ['coach-main'],
        },
        {
          id: 'national-debut-pro-2030',
          weekKey: '2030-W53',
          type: 'national-debut',
          summary: '完成国家队首秀',
          participantIds: [],
        },
      ],
    });

    const review = buildCareerReview(save);

    expect(review.replay.map(({ kind }) => kind)).toEqual([
      'story',
      'match',
      'relationship',
      'international',
    ]);
    expect(review.replay[0]).toMatchObject({
      evidenceId: 'decision-clarify-12',
      timeKey: '2024-W12',
      participantIds: ['coach-main'],
    });
    expect(review.goals.find(({ id }) => id === 'professional-contract')).toMatchObject({
      status: 'complete',
      progress: 1,
      target: 1,
    });
    expect(review.goals.find(({ id }) => id === 'international-cap')).toMatchObject({
      status: 'complete',
      progress: 4,
      target: 1,
    });
    expect(review.goals.find(({ id }) => id === 'long-career')).toMatchObject({
      status: 'complete',
      progress: 10,
      target: 10,
    });
    expect(
      review.replay.every(({ evidenceId }) => save.ledger.some(({ id }) => id === evidenceId)),
    ).toBe(true);
  });
});
