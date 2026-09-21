import { describe, expect, it } from 'vitest';
import type { ClubProfile, WorldFact, WorldNewsFilter } from '@football/contracts';
import { buildWorldNews } from '../../src/world/world-news';

const clubs: ClubProfile[] = [
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
  {
    id: 'england-b',
    name: '泰晤士河联',
    country: 'england',
    tier: 2,
    regionId: 'london',
    positionalNeeds: [],
    youthCycle: 'stable',
    overseas: true,
    wageBudget: 50,
  },
  {
    id: 'japan-a',
    name: '东都飞翼',
    country: 'japan',
    tier: 1,
    regionId: 'tokyo',
    positionalNeeds: [],
    youthCycle: 'contending',
    overseas: true,
    wageBudget: 65,
  },
];

const facts: WorldFact[] = [
  {
    id: 'fact-old',
    occurredOn: '2030-05-01',
    category: 'domestic',
    relatedClubIds: ['england-a'],
    summary: '伦敦先锋取得联赛冠军',
    window: 'summer',
  },
  {
    id: 'fact-new',
    occurredOn: '2030-06-01',
    category: 'domestic',
    relatedClubIds: ['england-a'],
    summary: '伦敦先锋确认参加洲际赛事',
    window: 'summer',
  },
  {
    id: 'fact-japan',
    occurredOn: '2030-05-20',
    category: 'transfer',
    relatedClubIds: ['japan-a'],
    summary: '东都飞翼补强中场',
    window: 'summer',
  },
  {
    id: 'fact-unknown',
    occurredOn: '2030-06-02',
    category: 'transfer',
    relatedClubIds: ['missing-club'],
    summary: '未知球队活动',
    window: 'summer',
  },
];

describe('world news', () => {
  it('only emits fact-backed items with known club names', () => {
    const result = buildWorldNews({
      facts,
      clubs,
      viewerClubId: 'england-a',
      filter: {},
      limit: 10,
      cursor: null,
    });

    expect(result.items).toHaveLength(2);
    expect(
      result.items.every(
        ({ relatedFactId, relatedClubIds }) =>
          relatedFactId && relatedClubIds.every((id) => clubs.some((club) => club.id === id)),
      ),
    ).toBe(true);
    expect(result.items[0]).toMatchObject({
      relatedFactId: 'fact-new',
      relatedClubIds: ['england-a'],
    });
    expect(result.items[0]?.title).toContain('伦敦先锋');
  });

  it('applies country, tier, category and window filters with stable pagination', () => {
    const filter: WorldNewsFilter = {
      country: 'japan',
      tier: 1,
      category: 'transfer',
      window: 'summer',
    };
    const first = buildWorldNews({
      facts,
      clubs,
      viewerClubId: null,
      filter,
      limit: 1,
      cursor: null,
    });

    expect(first.items).toHaveLength(1);
    expect(first.items[0]?.relatedFactId).toBe('fact-japan');
    expect(first.nextCursor).toBeNull();
  });
});
