import { describe, expect, it } from 'vitest';
import { summarizeExperience, summarizeExperienceBatch } from '../src/experience-metrics';
import { runYouthSeasons } from '../src/run-youth-seasons';

describe('experience metrics', () => {
  it('counts the whole required path without inventing play time', () => {
    expect(
      summarizeExperience([
        { kind: 'node-advance', requiredText: '' },
        { kind: 'decision', requiredText: '选择留队' },
        { kind: 'feedback', requiredText: '教练认可' },
      ]),
    ).toEqual({
      actionCount: 3,
      decisionCount: 1,
      nodeAdvanceCount: 1,
      requiredCharacters: 8,
    });
  });

  it('counts each interaction kind and Unicode characters consistently', () => {
    expect(
      summarizeExperience([
        { kind: 'node-advance', requiredText: '推进' },
        { kind: 'decision', requiredText: '选择' },
        { kind: 'feedback', requiredText: '结果' },
        { kind: 'contract', requiredText: '续约' },
        { kind: 'retirement', requiredText: '退役' },
      ]),
    ).toEqual({
      actionCount: 5,
      decisionCount: 1,
      nodeAdvanceCount: 1,
      requiredCharacters: 10,
    });
  });

  it('groups short and long careers without mixing their budgets', () => {
    const report = summarizeExperienceBatch([
      {
        careerSeasons: 3,
        trace: [
          { kind: 'node-advance', requiredText: '推进' },
          { kind: 'decision', requiredText: '选择留队' },
          { kind: 'feedback', requiredText: '教练认可' },
        ],
      },
      {
        careerSeasons: 14,
        trace: [
          { kind: 'node-advance', requiredText: '推进' },
          { kind: 'node-advance', requiredText: '推进' },
          { kind: 'decision', requiredText: '选择' },
          { kind: 'feedback', requiredText: '结果' },
          { kind: 'contract', requiredText: '签约' },
          { kind: 'retirement', requiredText: '退役' },
        ],
      },
    ]);

    expect(report.sampleCount).toBe(2);
    expect(report.lengthGroups.short).toMatchObject({
      sampleCount: 1,
      actionCountMedian: 3,
      decisionCountMedian: 1,
      nodeAdvanceCountMedian: 1,
      requiredCharactersMedian: 10,
      heaviestSurface: 'event-choice',
    });
    expect(report.lengthGroups.long).toMatchObject({
      sampleCount: 1,
      actionCountMedian: 6,
      decisionCountMedian: 1,
      nodeAdvanceCountMedian: 2,
      requiredCharactersMedian: 12,
      heaviestSurface: 'node-advance',
    });
  });

  it('reports separate full-career workload groups from the batch runner', () => {
    const report = runYouthSeasons(3, 1, { collectExperience: true });

    expect(report.experience.sampleCount).toBe(3);
    expect(report.experience.lengthGroups.short.sampleCount).toBeGreaterThan(0);
    expect(report.experience.lengthGroups.long.sampleCount).toBeGreaterThan(0);
    expect(report.experience.lengthGroups.long.requiredCharactersP90).toBeGreaterThan(0);
    expect(report.experience.lengthGroups.long.heaviestSurface).toBeTruthy();
    expect(report).not.toHaveProperty('playTimeMinutes');
  }, 30_000);

  it('keeps balance metrics identical when experience collection is enabled', () => {
    const withoutExperience = runYouthSeasons(3, 1);
    const withExperience = runYouthSeasons(3, 1, { collectExperience: true });

    expect(withExperience.metrics).toEqual(withoutExperience.metrics);
    expect(withExperience.summary).toEqual(withoutExperience.summary);
  }, 30_000);
});
