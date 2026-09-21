import { describe, expect, it } from 'vitest';
import { summarizeWorldEcosystem, type WorldEcosystemMetric } from '../src/world-ecosystem-metrics';

const makeWorldMetrics = (): WorldEcosystemMetric[] =>
  Array.from({ length: 240 }, (_, index) =>
    Array.from({ length: 5 }, (_, seasonIndex) => ({
      clubId: `club-${index}`,
      seasonId: `season-${seasonIndex}`,
      tier: index < 24 ? 8 : 7,
      topTier: index < 24,
      domesticActive: true,
      continentalOpportunity: index % 3 !== 0,
      worldMentioned: index % 10 !== 0,
      transferActive: true,
      headlineKey: `headline-${index}-${seasonIndex}`,
      factLinked: true,
      reloadStable: true,
    })),
  ).flat();

describe('world ecosystem metrics', () => {
  it('requires full domestic coverage and bounded repetition', () => {
    const summary = summarizeWorldEcosystem(makeWorldMetrics());

    expect(summary.domesticClubCoverageRate).toBe(1);
    expect(summary.continentalOpportunityRate3Y).toBeGreaterThanOrEqual(0.6);
    expect(summary.continentalOpportunityRate3Y).toBeLessThanOrEqual(0.7);
    expect(summary.topTierWorldMentionRate5Y).toBeGreaterThanOrEqual(0.8);
    expect(summary.repeatHeadlineRate).toBeLessThanOrEqual(0.35);
    expect(summary.factLinkedNewsRate).toBe(1);
    expect(summary.worldStateReloadStable).toBe(true);
  });

  it('exposes the first unstable or unlinked world record in diagnostics', () => {
    const metrics = makeWorldMetrics();
    metrics[0] = { ...metrics[0]!, factLinked: false, reloadStable: false };

    const summary = summarizeWorldEcosystem(metrics);

    expect(summary.factLinkedNewsRate).toBeLessThan(1);
    expect(summary.worldStateReloadStable).toBe(false);
    expect(summary.firstFailure).toEqual({
      clubId: 'club-0',
      seasonId: 'season-0',
    });
  });
});
