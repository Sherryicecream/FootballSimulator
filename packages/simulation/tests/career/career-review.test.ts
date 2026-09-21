import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, CareerSaveV6Schema, migrateCareerSaveV5 } from '@football/contracts';
import { buildCareerReview } from '../../src/career/career-review';
import { createYouthSave } from '../fixtures/youth-save';

const youthNoContractReviewSave = () => {
  const youthSave = migrateCareerSaveV5(createYouthSave());
  return CareerSaveV6Schema.parse({
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
};

describe('career review replay', () => {
  it('builds an honest review for a youth career without a contract', () => {
    const ended = youthNoContractReviewSave();
    const review = buildCareerReview(ended);

    expect(review.ending).toEqual({
      kind: 'youth-no-contract',
      label: '青训生涯结束',
      summary: ended.careerEnd!.summary,
      endedOn: ended.careerEnd!.endedOn,
    });
    expect(review.clubs).toBe(0);
    expect(review.totals).toEqual({ appearances: 0, goals: 0, assists: 0, minutes: 0 });
    expect(review.replay.some(({ evidenceId }) => evidenceId.startsWith('career-end-youth-'))).toBe(
      true,
    );
  });

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

describe('career review dimensions and behind-the-scenes', () => {
  const baseSave = (overrides: Record<string, unknown> = {}) =>
    CareerSaveV5Schema.parse({
      ...migrateCareerSaveV5(createYouthSave()),
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      ...overrides,
    });

  it('exposes all eight dimensions with valid ranges and rating labels', () => {
    const review = buildCareerReview(baseSave());
    expect(review.dimensions.map(({ key }) => key)).toEqual([
      'competition',
      'team-honours',
      'individual',
      'loyalty',
      'national-team',
      'off-pitch',
      'relationships',
      'legendary',
    ]);
    for (const dimension of review.dimensions) {
      expect(dimension.score).toBeGreaterThanOrEqual(0);
      expect(dimension.score).toBeLessThanOrEqual(100);
      expect(['卓越', '出色', '合格', '平凡']).toContain(dimension.ratingLabel);
      expect(dimension.label.length).toBeGreaterThan(0);
    }
  });

  it('scores profiles according to the documented formulas', () => {
    const loyalSave = baseSave({
      player: {
        ...migrateCareerSaveV5(createYouthSave()).player,
        reputation: 65,
      },
      clubHistory: [
        {
          clubId: 'pro-club-1',
          clubName: '东海职业',
          from: '2027-07-01',
          to: null,
          seasons: 12,
          appearances: 220,
          goals: 60,
        },
      ],
      nationalTeam: { capped: true, caps: 30, goals: 8, debutOn: '2030-09-01' },
    });
    const loyal = buildCareerReview(loyalSave);
    expect(loyal.dimensions.find(({ key }) => key === 'competition')).toMatchObject({
      score: 65,
      ratingLabel: '出色',
    });
    expect(loyal.dimensions.find(({ key }) => key === 'loyalty')).toMatchObject({ score: 90 });
    expect(loyal.dimensions.find(({ key }) => key === 'national-team')).toMatchObject({
      score: Math.min(100, 30 * 2.5 + 8),
    });

    const wanderer = baseSave({
      clubHistory: [1, 2, 3, 4, 5].map((index) => ({
        clubId: `pro-club-${index}`,
        clubName: `俱乐部${index}`,
        from: `${2027 + index}-07-01`,
        to: `${2028 + index}-06-30`,
        seasons: 1,
        appearances: 20,
        goals: 3,
      })),
      loanHistory: [
        {
          seasonId: 'pro-2032',
          parentClubId: 'pro-club-2',
          parentClubName: '俱乐部2',
          loanClubId: 'pro-club-9',
          loanClubName: '俱乐部9',
          from: '2032-07-01',
          to: '2033-05-31',
          appearances: 18,
          goals: 2,
          assists: 1,
          minutes: 1400,
          competitionTier: 5,
          outcomeEvidenceId: 'pro-2032-loan-return',
        },
      ],
      nationalTeam: null,
    });
    const wandererReview = buildCareerReview(wanderer);
    expect(wandererReview.dimensions.find(({ key }) => key === 'loyalty')).toMatchObject({
      score: 20,
    });
    expect(wandererReview.dimensions.find(({ key }) => key === 'national-team')).toMatchObject({
      score: 0,
    });
  });

  it('reveals potential fulfillment and hidden traits from the save', () => {
    const raw = migrateCareerSaveV5(createYouthSave());
    const save = baseSave();
    const review = buildCareerReview(save);
    expect(review.behindTheScenes.potentials.map(({ group }) => group)).toEqual([
      'technical',
      'physical',
      'mental',
    ]);
    const shooting = review.behindTheScenes.potentials
      .flatMap(({ items }) => items)
      .find(({ key }) => key === 'shooting');
    expect(shooting).toMatchObject({
      potential: raw.player.development.attributePotential.technical.shooting,
      achieved: raw.player.attributes.technical.shooting,
    });
    const traitValue = (key: string) =>
      review.behindTheScenes.traits.find(({ key: traitKey }) => traitKey === key)?.value;
    const traitRaw = (key: string) =>
      review.behindTheScenes.traits.find(({ key: traitKey }) => traitKey === key)?.rawValue;
    expect(traitRaw('maturationPace')).toBe(raw.player.development.maturationPace);
    expect(traitValue('professionalism')).toBe(String(raw.player.development.professionalism));
    expect(traitRaw('injuryProneness')).toBe(String(raw.player.development.injuryProneness));
  });

  it('lists evidence-backed missed opportunities and stays honest when none exist', () => {
    const missedSave = baseSave({
      story: {
        ...migrateCareerSaveV5(createYouthSave()).story,
        completedStoryIds: ['national-team-debut'],
      },
      nationalTeam: null,
      promiseReviews: [
        {
          seasonId: 'pro-2030',
          share: 0.4,
          promisedShare: 0.6,
          status: 'broken',
          cause: 'injury',
          evaluatedOn: '2031-06-30',
        },
      ],
      freeAgentSeasons: 2,
      ledger: [
        {
          id: 'health-severe-2030',
          weekKey: '2030-W22',
          type: 'health',
          summary: '重伤：膝盖韧带，预计休战 24 周',
          participantIds: [],
        },
      ],
    });
    const missedIds = buildCareerReview(missedSave).behindTheScenes.missedOpportunities.map(
      ({ id }) => id,
    );
    expect(missedIds).toEqual(
      expect.arrayContaining([
        'declined-national-debut',
        'broken-promise-injury',
        'free-agent-seasons',
        'severe-injury',
      ]),
    );

    const cleanReview = buildCareerReview(baseSave());
    expect(cleanReview.behindTheScenes.missedOpportunities).toEqual([]);
  });
});

describe('tournament honours in review', () => {
  it('keeps a domestic cup title meaningful but below a league title in legendary weight', () => {
    const makeSave = (kind: 'league-champion' | 'cup-champion') =>
      CareerSaveV5Schema.parse({
        ...migrateCareerSaveV5(createYouthSave()),
        careerPhase: 'retired',
        retiredOn: '2038-06-30',
        seasonHistory: [
          {
            seasonId: 'pro-2029',
            age: 21,
            status: 'retained',
            appearances: 20,
            goals: 4,
            assists: 3,
            avgRating: 7,
            signals: ['professional-season'],
            endedOn: '2030-06-30',
            honours: [
              {
                id: 'pro-2029-' + kind,
                kind,
                label: kind === 'league-champion' ? '联赛冠军' : '国内杯冠军',
                seasonId: 'pro-2029',
                clubId: 'pro-club-1',
                evidenceId: 'pro-2029-outcome',
              },
            ],
          },
        ],
      });

    const leagueReview = buildCareerReview(makeSave('league-champion'));
    const cupReview = buildCareerReview(makeSave('cup-champion'));
    const legendaryScore = (review: ReturnType<typeof buildCareerReview>) =>
      review.dimensions.find(({ key }) => key === 'legendary')!.score;

    expect(legendaryScore(cupReview)).toBeLessThan(legendaryScore(leagueReview));
    expect(legendaryScore(cupReview)).toBeGreaterThan(0);
  });

  it('counts national tournament honours into team honours and legendary dimensions', () => {
    const save = CareerSaveV5Schema.parse({
      ...migrateCareerSaveV5(createYouthSave()),
      careerPhase: 'retired',
      retiredOn: '2038-06-30',
      seasonHistory: [
        {
          seasonId: 'pro-2029',
          age: 21,
          status: 'retained',
          appearances: 20,
          goals: 4,
          assists: 3,
          avgRating: 7.0,
          signals: ['professional-season'],
          endedOn: '2030-06-30',
          honours: [
            {
              id: 'pro-2029-asian-cup',
              kind: 'asian-cup-champion',
              label: '亚洲杯冠军',
              seasonId: 'pro-2029',
              clubId: 'pro-club-1',
              evidenceId: 'national-tournament-pro-2029',
            },
          ],
        },
      ],
    });
    const review = buildCareerReview(save);
    expect(review.honours.map(({ kind }) => kind)).toContain('asian-cup-champion');
    expect(
      review.dimensions.find(({ key }) => key === 'team-honours')?.score,
    ).toBeGreaterThanOrEqual(5);
    expect(review.dimensions.find(({ key }) => key === 'legendary')?.evidenceIds).toContain(
      'national-tournament-pro-2029',
    );
  });
});
