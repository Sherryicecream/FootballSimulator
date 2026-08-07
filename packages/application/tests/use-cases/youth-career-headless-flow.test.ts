import { describe, expect, it } from 'vitest';
import type { EventDefinition, YouthAcademyProfile, YouthContentBundle } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { createYouthCareerV2 } from '../../src/use-cases/create-youth-career-v2';
import { advanceCareerMonth } from '../../src/use-cases/advance-career-month';
import { submitCareerDecision } from '../../src/use-cases/submit-career-decision';
import { completeYouthSeason } from '../../src/use-cases/complete-youth-season';
import { loadCareer } from '../../src/use-cases/load-career';

describe('headless youth career flow', () => {
  it('pauses, decides, reloads, resumes and completes 100 event seasons', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      let save = createYouthCareerV2(
        createCareerSave({
          playerName: '林河',
          hometown: '上海',
          primaryPosition: 'FORWARD',
          preferredFoot: 'RIGHT',
          weakFootLevel: 30,
          growthBackground: 'academy',
          personalityTendency: 'composed',
          regionId: 'shanghai',
          seed,
        }),
        content,
      );
      let decisions = 0;
      let guard = 0;
      let pendingDecisionIds: string[] = [];
      while (!save.season.completed && guard < 80) {
        const result = advanceCareerMonth(save, academies, [event]);
        save = result.save;
        if (result.status === 'awaiting-decision') {
          const fixtureState = save.season.fixtures.map(({ id, status }) => ({ id, status }));
          save = loadCareer(JSON.parse(JSON.stringify(save)), content);
          expect(save.season.fixtures.map(({ id, status }) => ({ id, status }))).toEqual(
            fixtureState,
          );
          save = submitCareerDecision(save, result.event.eventId, result.event.choices[0]!.id);
          pendingDecisionIds.push(save.ledger.at(-1)!.id);
          decisions += 1;
        } else {
          expect(result.report.facts.map(({ id }) => id)).toEqual(
            expect.arrayContaining(pendingDecisionIds),
          );
          pendingDecisionIds = [];
        }
        guard += 1;
      }
      expect(save.season.completed).toBe(true);
      expect(decisions).toBeGreaterThan(0);
      expect(save.season.fixtures.every(({ status }) => status === 'played')).toBe(true);
      const weeklyFactIds = save.ledger
        .filter(({ type }) => type === 'training')
        .map(({ id }) => id);
      expect(new Set(weeklyFactIds).size).toBe(weeklyFactIds.length);
      expect(completeYouthSeason(save).outcome.status).toMatch(/retained|released/);
    }
  });
});

const academy = (id: string, level: number): YouthAcademyProfile => ({
  id,
  name: `${id}青年队`,
  regionId: 'shanghai',
  pathway: 'local-academy',
  facilityLevel: level,
  coachingLevel: level,
  competitionLevel: level,
  competitionIntensity: level,
  developmentStyle: '均衡',
  firstTeamLevel: level,
  promotionTendency: 55,
  relocationPressure: 20,
});
const academies = [academy('home', 72), academy('away', 77)];
const event: EventDefinition = {
  id: 'coach-monthly-talk',
  version: 1,
  category: 'china-youth',
  rarity: 'common',
  title: '教练谈话',
  description: '教练在训练后与你交流本月表现。',
  condition: {},
  participantRoles: ['youth-coach'],
  choices: [
    { id: 'listen', text: '认真听取建议', riskLabel: 'low', effects: { morale: 1, trust: 1 } },
  ],
  cooldownWeeks: 2,
};
const content: YouthContentBundle = {
  academies,
  competitions: [
    {
      id: 'league',
      name: '青年联赛',
      participatingAcademyIds: academies.map(({ id }) => id),
      seasonStartMonth: 9,
      seasonEndMonth: 6,
      targetFixtureCount: { min: 18, max: 20 },
    },
  ],
  people: [],
  events: [event],
};
