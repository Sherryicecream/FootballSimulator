import { describe, expect, it } from 'vitest';
import { buildCareerSummaryPrompt } from '../../src/ai/career-summary-prompt';
import { CareerSummaryFactsSchema } from '@football/contracts';

const facts = CareerSummaryFactsSchema.parse({
  player: { name: '林河', hometown: '上海', position: '前锋', country: '中国' },
  tierLabel: '稳健生涯',
  ending: null,
  seasons: 1,
  clubs: 1,
  totals: { appearances: 10, minutes: 600, goals: 2, assists: 1 },
  nationalTeam: { capped: false, caps: 0, goals: 0 },
  overseasSpells: false,
  honours: [],
  seasonsTimeline: [],
  keyMoments: [],
  dimensions: [],
  behindTheScenes: { potentials: [], traits: [], missedOpportunities: [] },
  evidenceIds: [],
});

describe('career summary prompt', () => {
  it('keeps the prompt version, target mode and structured facts explicit', () => {
    const prompt = buildCareerSummaryPrompt(facts, 'short');
    expect(prompt).toContain('career-summary-v1');
    expect(prompt).toContain('150-250 字');
    expect(prompt).toContain('林河');
    expect(prompt).toContain('不得补写不存在');
    expect(prompt).toContain('数字、俱乐部、年龄、赛季、伤病');
    expect(prompt).toContain('事实检查');
  });
});
