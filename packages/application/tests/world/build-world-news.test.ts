import { expect, it } from 'vitest';
import { buildWorldNewsForCareer } from '../../src/use-cases/build-world-news';

it('builds the player-related world news projection through application', () => {
  const result = buildWorldNewsForCareer({
    facts: [
      {
        id: 'fact-1',
        occurredOn: '2030-06-01',
        category: 'domestic',
        relatedClubIds: ['england-a'],
        summary: '伦敦先锋夺冠',
        window: 'summer',
      },
    ],
    clubs: [
      {
        id: 'england-a',
        name: '伦敦先锋',
        country: 'england',
        tier: 1,
        regionId: 'london',
        positionalNeeds: [],
        youthCycle: 'stable',
        overseas: true,
        wageBudget: 70,
      },
    ],
    viewerClubId: 'england-a',
    filter: {},
    limit: 5,
    cursor: null,
  });

  expect(result.items[0]?.relatedFactId).toBe('fact-1');
});
