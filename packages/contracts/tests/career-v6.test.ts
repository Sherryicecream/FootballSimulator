import { describe, expect, it } from 'vitest';
import {
  CareerSaveSchema,
  CareerSaveV5Schema,
  CareerSaveV6Schema,
  migrateCareerSaveV5,
  migrateCareerSaveV6,
} from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV6 terminal boundary', () => {
  it.each([
    { seasonId: 'pro-season-2030', loanClubId: 'loan-club' },
    { seasonId: 'pro-season-2031', loanClubId: 'other-club' },
  ])('rejects inconsistent v6 loan state: $seasonId / $loanClubId', (loan) => {
    const valid = loanSaveV5();
    const inconsistent = { ...valid, activeLoan: { ...valid.activeLoan!, ...loan } };
    expect(CareerSaveV5Schema.safeParse(inconsistent).success).toBe(true);
    expect(() => migrateCareerSaveV5(inconsistent)).toThrow(/租借/);
    const v6 = { ...inconsistent, schemaVersion: 6, careerEnd: null };
    expect(CareerSaveV6Schema.safeParse(v6).success).toBe(false);
    expect(() => migrateCareerSaveV6(v6)).toThrow();
    expect(() => migrateCareerSaveV6(inconsistent)).toThrow(/租借/);
  });

  it('preserves valid loan data and randomness across deterministic v5 and v6 migrations', () => {
    const v5 = loanSaveV5();
    const first = migrateCareerSaveV6(v5);
    expect(first).toEqual({ ...v5, schemaVersion: 6, careerEnd: null });
    expect(migrateCareerSaveV6(v5)).toEqual(first);
    expect(migrateCareerSaveV6(first)).toEqual(first);
  });

  it('deterministically migrates a v1 save through v6', () => {
    const v2 = buildYouthSaveV2Fixture();
    const v1 = CareerSaveSchema.parse({
      schemaVersion: 1,
      contentVersion: 'bootstrap-1',
      careerId: 'career-v1',
      player: {
        identity: v2.player.identity,
        attributes: v2.player.attributes,
        hiddenTraits: {
          potential: 80,
          stability: 60,
          professionalism: 70,
          pressureResistance: 60,
          adaptability: 60,
          injuryProneness: 20,
        },
        age: 16,
        careerStage: 'YOUTH',
        reputation: 10,
      },
      world: { currentDate: '2025-06-30', season: 2024, weekNumber: 44 },
      context: {
        academyId: 'home',
        pendingOpportunity: null,
        playerState: {
          fitness: 80,
          morale: 55,
          coachTrust: 60,
          fatigue: 12,
          teamStatus: 'regular',
        },
        pendingEvent: null,
        trainingFocus: null,
        trainingIntensity: 'normal',
      },
      relationships: v2.relationships,
      story: {
        bootstrapOpportunityWeek: 2,
        resolvedOpportunityIds: [],
        completedStoryIds: [],
        activeStorylines: [],
        cooldowns: {},
      },
      ledger: [
        {
          type: 'career-started',
          date: '2024-09-01',
          playerName: '林河',
          age: 16,
          position: 'FORWARD',
        },
      ],
      randomState: { seed: 42, sequencePosition: 7 },
    });
    const first = migrateCareerSaveV6(v1);
    const second = migrateCareerSaveV6(v1);
    expect(first).toEqual(second);
    expect(first.ledger).toEqual(second.ledger);
    expect(first.ledger).toHaveLength(1);
    expect(first.ledger[0].summary).toBe(JSON.stringify(v1.ledger[0]));
    expect(first.randomState).toEqual(v1.randomState);
  });
  it('migrates an active v5 save with no career ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'offseason',
    });
    const v6 = migrateCareerSaveV6(v5);
    expect(v6).toMatchObject({ schemaVersion: 6, careerPhase: 'offseason', careerEnd: null });
    expect(v6.randomState).toEqual(v5.randomState);
    expect(v6.ledger).toEqual(v5.ledger);
  });

  it('migrates a retired v5 save into a voluntary retirement ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    expect(migrateCareerSaveV6(v5).careerEnd).toMatchObject({
      kind: 'voluntary-retirement',
      endedOn: '2040-06-30',
    });
  });

  it('accepts each terminal ending kind with matching retired fields', () => {
    const base = migrateCareerSaveV6({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    for (const kind of ['youth-no-contract', 'voluntary-retirement', 'market-exit'] as const) {
      expect(
        CareerSaveV6Schema.safeParse({
          ...base,
          careerEnd: {
            kind,
            endedOn: '2040-06-30',
            summary: '职业生涯已结束。',
            evidenceIds: [],
          },
        }).success,
      ).toBe(true);
    }
  });
  it('rejects terminal fields that disagree', () => {
    const parsed = CareerSaveV6Schema.safeParse({
      ...migrateCareerSaveV6(buildYouthSaveV2Fixture()),
      careerPhase: 'retired',
      retiredOn: '2027-06-30',
      careerEnd: {
        kind: 'youth-no-contract',
        endedOn: '2027-06-29',
        summary: '青训年龄窗口结束，未获得职业合同。',
        evidenceIds: ['season-outcome-youth-2026'],
      },
    });
    expect(parsed.success).toBe(false);
  });
});

const loanSaveV5 = () =>
  CareerSaveV5Schema.parse({
    ...buildYouthSaveV2Fixture(),
    schemaVersion: 5,
    careerPhase: 'pro-season',
    proSeason: {
      id: 'pro-season-2031',
      startDate: '2031-08-01',
      endDate: '2032-05-31',
      currentDate: '2031-08-01',
      currentWeek: 1,
      currentMonth: '2031-08',
      clubId: 'loan-club',
      competitionId: 'tier-5',
      fixtures: [],
      standings: [],
      squad: Array.from({ length: 10 }, (_, index) => ({
        personId: `person-${index}`,
        name: `球员${index}`,
        primaryPosition: 'FORWARD',
        currentAbility: 50,
        age: 20,
        form: 50,
        fitness: 80,
        minutesPlayed: 0,
      })),
      depthChart: {
        CENTER_BACK: [],
        FULL_BACK: [],
        DEFENSIVE_MIDFIELDER: [],
        MIDFIELDER: [],
        WINGER: [],
        FORWARD: ['player'],
      },
      completed: false,
    },
    activeLoan: {
      parentClubId: 'parent-club',
      parentClubName: '母队',
      parentClubTier: 5,
      loanClubId: 'loan-club',
      loanClubName: '租借队',
      loanClubTier: 5,
      startedOn: '2031-08-01',
      returnsOn: '2032-06-30',
      seasonId: 'pro-season-2031',
    },
  });
