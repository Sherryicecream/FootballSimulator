import { describe, expect, it } from 'vitest';
import { getYouthContent, validateYouthContent } from '../src';
import {
  countFamilies,
  countFamiliesByDomain,
  familiesBelowThreshold,
  storyFamilyRegistry,
} from '../src/story-family-registry';

describe('core story family coverage', () => {
  it('has at least 30 families with three nodes and two distinct resolutions', () => {
    const summary = countFamilies();

    expect(summary.familyCount).toBeGreaterThanOrEqual(30);
    expect(familiesBelowThreshold({ minNodes: 3, minResolutions: 2 })).toHaveLength(0);
  });

  it('covers every narrative domain with at least two independent families', () => {
    const byDomain = countFamiliesByDomain();

    expect(Object.keys(byDomain)).toHaveLength(8);
    for (const [domain, count] of Object.entries(byDomain)) {
      expect(count, `${domain} 故事家族不足`).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps family nodes and resolutions backed by validated content events', () => {
    const content = getYouthContent();
    const summary = countFamilies(content.events);

    expect(summary.missingEventIds).toEqual([]);
    expect(summary.families.every(({ resolutionCount }) => resolutionCount >= 2)).toBe(true);
    expect(validateYouthContent(content)).toEqual(content);
  });

  it('gates later nodes behind the previous node and closes completed families', () => {
    const events = new Map(getYouthContent().events.map((event) => [event.id, event]));

    for (const family of storyFamilyRegistry) {
      const [openingId, middleId, resolutionId] = family.nodeEventIds;
      const opening = events.get(openingId)!;
      const middle = events.get(middleId)!;
      const resolution = events.get(resolutionId)!;

      expect(middle.condition.requireStoryId).toBe(opening.storyId);
      expect(resolution.condition.requireStoryId).toBe(middle.storyId);
      expect(opening.condition.excludeStoryId).toBe(resolution.storyId);
    }
  });

  it('keeps node descriptions distinct from their visible titles', () => {
    for (const event of getYouthContent().events.filter((candidate) =>
      candidate.storyFamilyId?.startsWith('youth-'),
    )) {
      expect(event.description).not.toContain(event.title);
    }
  });
});
