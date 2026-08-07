import { describe, expect, it } from 'vitest';
import type { YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';

describe('createYouthCareerV2', () => {
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
