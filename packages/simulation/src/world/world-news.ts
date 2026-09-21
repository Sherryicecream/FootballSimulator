import type {
  ClubProfile,
  WorldFact,
  WorldNewsCategory,
  WorldNewsFilter,
  WorldNewsItem,
  WorldNewsPage,
} from '@football/contracts';

export type BuildWorldNewsInput = {
  facts: readonly WorldFact[];
  clubs: readonly ClubProfile[];
  viewerClubId: string | null;
  filter: WorldNewsFilter;
  limit: number;
  cursor: string | null;
};

const categoryLabels: Record<WorldNewsCategory, string> = {
  domestic: '国内赛季动态',
  continental: '洲际赛事动态',
  transfer: '转会动态',
  rumour: '市场传闻',
  injury: '伤病消息',
  milestone: '生涯里程碑',
};

const majorFactPattern = /冠军|升级|降级|决赛|晋级|退出|签约|官宣/;

const parseCursor = (cursor: string | null): number => {
  if (cursor === null) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
};

const relevanceFor = (
  fact: WorldFact,
  relatedClubs: readonly ClubProfile[],
  viewerClubId: string | null,
): number => {
  const viewerClub = relatedClubs.find(({ id }) => id === viewerClubId);
  const viewer = viewerClub !== undefined;
  const sameCountry = viewerClub
    ? relatedClubs.some(({ country }) => country === viewerClub.country)
    : false;
  const importance = majorFactPattern.test(fact.summary) ? 120 : 0;
  const categoryWeight =
    fact.category === 'continental' ? 40 : fact.category === 'transfer' ? 20 : 0;
  return importance + categoryWeight + (viewer ? 300 : 0) + (sameCountry ? 10 : 0);
};

const isMajorFact = (fact: WorldFact): boolean =>
  fact.category === 'continental' || majorFactPattern.test(fact.summary);

export const buildWorldNews = (input: BuildWorldNewsInput): WorldNewsPage => {
  const clubsById = new Map(input.clubs.map((club) => [club.id, club]));
  const latestByCooldown = new Map<string, WorldFact>();

  for (const fact of input.facts) {
    const relatedClubs = fact.relatedClubIds.map((clubId) => clubsById.get(clubId));
    if (relatedClubs.some((club) => club === undefined)) continue;
    const clubs = relatedClubs as ClubProfile[];
    if (input.filter.category !== undefined && fact.category !== input.filter.category) continue;
    if (input.filter.window !== undefined && fact.window !== input.filter.window) continue;
    if (
      input.filter.country !== undefined &&
      !clubs.some(({ country }) => country === input.filter.country)
    )
      continue;
    if (input.filter.tier !== undefined && !clubs.some(({ tier }) => tier === input.filter.tier))
      continue;

    const cooldownKeys = fact.relatedClubIds.map(
      (clubId) => `${clubId}:${fact.category}:${fact.window ?? 'none'}`,
    );
    const previous = cooldownKeys
      .map((key) => latestByCooldown.get(key))
      .filter((candidate): candidate is WorldFact => candidate !== undefined)
      .sort(
        (left, right) =>
          right.occurredOn.localeCompare(left.occurredOn) || left.id.localeCompare(right.id),
      )[0];
    if (
      previous &&
      !isMajorFact(fact) &&
      !isMajorFact(previous) &&
      fact.occurredOn <= previous.occurredOn
    )
      continue;
    if (previous && !isMajorFact(fact) && !isMajorFact(previous)) {
      for (const key of cooldownKeys) latestByCooldown.set(key, fact);
    } else if (!previous || fact.occurredOn >= previous.occurredOn) {
      for (const key of cooldownKeys) latestByCooldown.set(key, fact);
    }
  }

  const selectedFacts = new Map([...latestByCooldown.values()].map((fact) => [fact.id, fact]));
  const items: WorldNewsItem[] = [...selectedFacts.values()]
    .map((fact) => {
      const relatedClubs = fact.relatedClubIds.map(
        (clubId) => clubsById.get(clubId) as ClubProfile,
      );
      const firstClub = relatedClubs[0]!;
      return {
        id: `world-news-${fact.id}`,
        occurredOn: fact.occurredOn,
        category: fact.category,
        relatedClubIds: fact.relatedClubIds,
        title: `${firstClub.name}：${categoryLabels[fact.category]} · ${fact.summary}`.slice(
          0,
          120,
        ),
        summary: fact.summary,
        relatedFactId: fact.id,
        relevance: relevanceFor(fact, relatedClubs, input.viewerClubId),
        sourceWindow: fact.window,
      };
    })
    .sort(
      (left, right) =>
        right.relevance - left.relevance ||
        right.occurredOn.localeCompare(left.occurredOn) ||
        left.id.localeCompare(right.id),
    );

  const safeLimit = Math.max(1, Math.min(24, Math.trunc(input.limit)));
  const offset = parseCursor(input.cursor);
  const pageItems = items.slice(offset, offset + safeLimit);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
  };
};
