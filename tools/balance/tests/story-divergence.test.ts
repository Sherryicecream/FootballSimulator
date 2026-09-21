import { describe, expect, it } from 'vitest';
import {
  buildDivergenceReport,
  completeCareerTrace,
  createCareerTrace,
  measureDivergence,
  recordCareerChoice,
  type CareerTrace,
} from '../src/story-divergence';
import { runYouthSeasons } from '../src/run-youth-seasons';

describe('story divergence measurement', () => {
  it('reports zero family divergence for identical seeds and choices', () => {
    const a: CareerTrace = {
      storyFamilies: ['family-a', 'family-b'],
      mainResolutions: ['res-1', 'res-2'],
    };
    const b: CareerTrace = {
      storyFamilies: ['family-a', 'family-b'],
      mainResolutions: ['res-1', 'res-2'],
    };

    expect(measureDivergence([a, b]).familyOverlapRate).toBe(0);
  });

  it('reports divergence for completely different story families', () => {
    const a: CareerTrace = {
      storyFamilies: ['family-a'],
      mainResolutions: ['res-1'],
    };
    const b: CareerTrace = {
      storyFamilies: ['family-x'],
      mainResolutions: ['res-x'],
    };

    expect(measureDivergence([a, b]).familyOverlapRate).toBeGreaterThan(0);
    expect(measureDivergence([a, b]).uniqueTrajectories).toBe(2);
  });

  it('keeps the ordered nodes, choices, consequences, and retirement summary', () => {
    const trace = createCareerTrace(42);
    recordCareerChoice(trace, 'family-a-node-1', 'choice-1', '稳住位置');
    recordCareerChoice(trace, 'family-a-node-2', 'choice-2', '获得信任');
    recordCareerChoice(trace, 'family-a-node-3', 'choice-1', '完成收束');
    completeCareerTrace(trace, {
      careerSeasons: 12,
      proSeasonsPlayed: 9,
      transferCount: 2,
      overseasSpent: true,
      hadCaps: true,
      cupHonours: 1,
      promotions: 1,
      relegations: 0,
      retireAge: 31,
      retiredReputation: 76,
      earlyRetirement: false,
    });

    expect(trace.storyFamilies).toEqual(['family-a']);
    expect(trace.storyNodes['family-a']).toEqual([
      'family-a-node-1',
      'family-a-node-2',
      'family-a-node-3',
    ]);
    expect(trace.mainResolutions).toEqual(['family-a-node-3:choice-1:完成收束']);
    expect(trace.trajectory?.transferCount).toBe(2);
    expect(trace.retirement?.retiredReputation).toBe(76);
  });

  it('reports pairwise overlap and flags families above the content warning line', () => {
    const trace = (seed: number): CareerTrace => ({
      seed,
      storyFamilies: ['family-a'],
      storyNodes: {
        'family-a': ['family-a-node-1', 'family-a-node-2', 'family-a-node-3'],
      },
      mainResolutions: [`resolution-${seed}`],
    });
    const report = buildDivergenceReport([trace(1), trace(2), trace(3), trace(4)]);

    expect(report.pairwise).toHaveLength(6);
    expect(report.pairwise[0]?.familyOverlapRate).toBe(1);
    expect(report.mainStoryRepeatRate).toBe(1);
    expect(report.repeatedStoryFamilies[0]).toMatchObject({
      familyId: 'family-a',
      appearanceCount: 4,
      exceedsWarningLine: true,
    });
  });

  it('keeps normal balance metrics unchanged when divergence collection is enabled', () => {
    const normal = runYouthSeasons(1, 1);
    const measured = runYouthSeasons(1, 1, { measureDivergence: true });

    expect(measured.metrics).toEqual(normal.metrics);
    expect(measured.summary).toEqual(normal.summary);
    expect(measured.divergence).toMatchObject({ sampleCount: 1, uniqueTrajectories: 1 });
    expect(measured.divergence?.traces).toHaveLength(1);
    expect(normal).not.toHaveProperty('divergence');
  }, 30_000);
});
