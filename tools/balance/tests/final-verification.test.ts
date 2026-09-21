import { describe, expect, it } from 'vitest';
import { runYouthSeasonsParallel } from '../src/run-youth-seasons';
import { summarizeCountryExperienceCoverage } from '../src/country-experience-coverage';

describe('final 10,000-season verification', () => {
  it('reports country coverage for consecutive seed segments', () => {
    const report = summarizeCountryExperienceCoverage(
      [
        { seed: 1, experiencedCountries: ['china', 'england', 'spain'] },
        { seed: 2, experiencedCountries: ['china', 'germany', 'italy'] },
        { seed: 3, experiencedCountries: ['china', 'france', 'japan', 'korea'] },
        { seed: 4, experiencedCountries: ['china'] },
      ],
      { segmentSize: 2, minimumCountries: 3 },
    );

    expect(report.segments).toEqual([
      expect.objectContaining({
        seedStart: 1,
        seedEnd: 2,
        sampleCount: 2,
        countriesWithExperience: ['china', 'england', 'germany', 'italy', 'spain'],
        passed: true,
      }),
      expect.objectContaining({
        seedStart: 3,
        seedEnd: 4,
        sampleCount: 2,
        countriesWithExperience: ['china', 'france', 'japan', 'korea'],
        passed: true,
      }),
    ]);
    expect(report.allSegmentsPass).toBe(true);
  });

  it('asserts the real 1,000-season runner reaches at least six countries', async () => {
    const report = await runYouthSeasonsParallel(1000, 1, { parallelism: 4 });

    expect(report.countryExperience.allSegmentsPass).toBe(true);
    expect(report.countryExperience.segments).toHaveLength(1);
    expect(
      report.countryExperience.segments[0]!.countriesWithExperience.length,
    ).toBeGreaterThanOrEqual(6);
  }, 600_000);

  it('rejects invalid coverage samples and marks incomplete segments as failed', () => {
    expect(() =>
      summarizeCountryExperienceCoverage([
        { seed: 1, experiencedCountries: ['china'] },
        { seed: 3, experiencedCountries: ['china'] },
      ]),
    ).toThrow('连续种子');
    expect(() =>
      summarizeCountryExperienceCoverage([
        { seed: 1, experiencedCountries: ['not-a-country' as never] },
      ]),
    ).toThrow('未知的球员经历国家');
    expect(() =>
      summarizeCountryExperienceCoverage([{ seed: 1, experiencedCountries: ['china'] }], {
        segmentSize: 0,
      }),
    ).toThrow('segmentSize');

    const incomplete = summarizeCountryExperienceCoverage(
      [{ seed: 1, experiencedCountries: ['china', 'england'] }],
      { segmentSize: 2, minimumCountries: 1 },
    );
    expect(incomplete.allSegmentsPass).toBe(false);
    expect(incomplete.segments[0]!.passed).toBe(false);
  });

  it('keeps ten fixed-seed choice paths mechanically identical on replay', async () => {
    const first = await runYouthSeasonsParallel(10, 1, { parallelism: 2 });
    const replay = await runYouthSeasonsParallel(10, 1, { parallelism: 2 });

    expect(replay.metrics).toEqual(first.metrics);
    expect(replay.summary).toEqual(first.summary);
  }, 120_000);

  it('records only valid, unique countries for each professional experience', async () => {
    const report = await runYouthSeasonsParallel(4, 1, { parallelism: 2 });
    const validCountries = new Set([
      'china',
      'england',
      'spain',
      'germany',
      'italy',
      'france',
      'japan',
      'korea',
    ]);

    for (const metric of report.metrics) {
      expect(metric.experiencedCountries).toEqual([...new Set(metric.experiencedCountries)].sort());
      expect(metric.experiencedCountries.every((country) => validCountries.has(country))).toBe(
        true,
      );
    }
  }, 120_000);
});
