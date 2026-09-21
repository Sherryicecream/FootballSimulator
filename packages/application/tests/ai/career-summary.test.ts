import { describe, expect, it } from 'vitest';
import { buildCareerSummaryFacts, generateCareerSummary } from '../../src/ai/career-summary';
import { createSave } from '../fixtures/youth-save';
import { migrateCareerSaveV5 } from '@football/contracts';

describe('career summary facts and local fallback', () => {
  it('builds a factual short summary with a real turning point', () => {
    const save = migrateCareerSaveV5(createSave(42));
    const facts = buildCareerSummaryFacts(save);
    const summary = generateCareerSummary(facts, 'short');

    expect(summary.length).toBeGreaterThanOrEqual(150);
    expect(summary.length).toBeLessThanOrEqual(250);
    expect(summary).toContain(save.player.identity.name);
    expect(summary).toContain(facts.keyMoments[0]?.summary ?? '');
    expect(summary).toContain('未入选国家队');
  });

  it('builds a longer local summary without inventing empty facts', () => {
    const save = migrateCareerSaveV5(createSave(42));
    const facts = buildCareerSummaryFacts(save);
    const summary = generateCareerSummary(facts, 'long');

    expect(summary.length).toBeGreaterThanOrEqual(400);
    expect(summary.length).toBeLessThanOrEqual(800);
    expect(summary).toContain('没有记录在案的生涯荣誉');
    expect(summary).not.toContain('世界杯冠军');
  });
});
