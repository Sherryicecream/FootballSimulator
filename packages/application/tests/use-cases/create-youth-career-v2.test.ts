import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { completeYouthSeason } from '../../src/use-cases/complete-youth-season';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { enterOffseason } from '../../src/use-cases/enter-offseason';

describe('createYouthCareerV2', () => {
  it('initializes newly created careers as v8 with a world registry', () => {
    const created = createYouthCareerV2(
      createCareerSave({
        playerName: '林岳',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
      createContent(),
    );

    expect(created.schemaVersion).toBe(8);
    expect(created.worldRegistry).toEqual({ entries: [], clubPulses: [] });
  });

  it('creates the same fixed full-season schedule from the same seed and content', () => {
    const legacy = createCareerSave({
      playerName: '林岳',
      hometown: '上海',
      primaryPosition: 'CENTER_BACK',
      preferredFoot: 'RIGHT',
      regionId: 'shanghai',
      seed: 42,
    });
    const content = createContent();

    const first = createYouthCareerV2(legacy, content);
    const second = createYouthCareerV2(legacy, content);

    expect(first).toEqual(second);
    expect(first.season.fixtures.length).toBeGreaterThanOrEqual(18);
    expect(first.season.fixtures.length).toBeLessThanOrEqual(26);
    expect(new Set(first.season.fixtures.map(({ weekKey }) => weekKey)).size).toBe(
      first.season.fixtures.length,
    );
    expect(first.season.fixtures.every(({ awayClubId }) => awayClubId !== 'unknown')).toBe(true);
  });

  it('preserves a final youth window that did not earn graduation when hydrating', () => {
    const content = createContent();
    const created = createYouthCareerV2(
      createCareerSave({
        playerName: '林岳',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
      content,
    );
    const finalSeason = {
      ...created,
      player: {
        ...created.player,
        age: 20,
        identity: { ...created.player.identity, dateOfBirth: '2005-01-01' },
      },
      season: { ...created.season, completed: true },
    };
    const completed = completeYouthSeason(finalSeason);
    const offseason = enterOffseason(completed.save, content.academies).save;
    const persisted = {
      ...offseason,
      offseason: { ...offseason.offseason!, graduationEligible: false },
    };

    const hydrated = createYouthCareerV2(JSON.parse(JSON.stringify(persisted)), content);

    expect(hydrated.offseason?.graduationEligible).toBe(false);
  });

  it('preserves a failed final youth window when migrating a legacy v4-shaped save', () => {
    const content = createContent();
    const created = createYouthCareerV2(
      createCareerSave({
        playerName: '林岳',
        hometown: '上海',
        primaryPosition: 'CENTER_BACK',
        preferredFoot: 'RIGHT',
        regionId: 'shanghai',
        seed: 42,
      }),
      content,
    );
    const finalSeason = {
      ...created,
      player: {
        ...created.player,
        age: 20,
        identity: { ...created.player.identity, dateOfBirth: '2005-01-01' },
      },
      season: { ...created.season, completed: true },
    };
    const completed = completeYouthSeason(finalSeason);
    const offseason = enterOffseason(completed.save, content.academies).save;
    const legacyV4 = Object.fromEntries(
      Object.entries({
        ...offseason,
        schemaVersion: 4 as const,
        offseason: { ...offseason.offseason!, graduationEligible: false },
      }).filter(
        ([key]) =>
          ![
            'activeLoan',
            'careerEnd',
            'clubHistory',
            'freeAgentSeasons',
            'loanHistory',
            'mechanicsVersion',
            'moments',
            'nationalTeam',
            'overseasSince',
            'retiredOn',
            'totals',
            'worldRegistry',
          ].includes(key),
      ),
    );

    const hydrated = createYouthCareerV2(JSON.parse(JSON.stringify(legacyV4)), content);

    expect(hydrated.offseason?.graduationEligible).toBe(false);
  });
});

const academy = (id: string, regionId: string): YouthAcademyProfile => ({
  id,
  name: `${id}青年队`,
  regionId,
  pathway: 'local-academy',
  facilityLevel: 70,
  coachingLevel: 70,
  competitionLevel: 70,
  competitionIntensity: 70,
  developmentStyle: '均衡',
  firstTeamLevel: 65,
  promotionTendency: 55,
  relocationPressure: 20,
});

const createContent = (): YouthContentBundle => {
  const academies = [
    academy('shanghai-one', 'shanghai'),
    academy('shanghai-two', 'shanghai'),
    academy('shandong-one', 'shandong'),
    academy('guangdong-one', 'guangdong'),
  ];
  return {
    academies,
    competitions: [
      {
        id: 'test-league',
        name: '测试青年联赛',
        participatingAcademyIds: academies.map(({ id }) => id),
        seasonStartMonth: 9,
        seasonEndMonth: 6,
        targetFixtureCount: { min: 18, max: 22 },
      },
    ],
    people: [],
    events: [],
  };
};
