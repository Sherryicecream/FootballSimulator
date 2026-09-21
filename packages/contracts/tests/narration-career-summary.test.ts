import { describe, expect, it } from 'vitest';
import {
  CareerSummaryFactsSchema,
  CareerSummaryRequestSchema,
  buildCareerSummaryRequest,
} from '../src/narration';

const facts = {
  player: { name: '林河', hometown: '杭州', position: 'ST', country: '中国' },
  tierLabel: '稳健生涯',
  ending: { label: '主动退役', summary: '在合同结束后退役。', endedOn: '2030-06-30' },
  seasons: 8,
  clubs: 2,
  totals: { appearances: 168, minutes: 12_400, goals: 48, assists: 27 },
  nationalTeam: { capped: false, caps: 0, goals: 0 },
  overseasSpells: false,
  honours: [],
  seasonsTimeline: [
    {
      seasonId: 'pro-2030',
      status: 'retained',
      appearances: 26,
      goals: 9,
      assists: 6,
      avgRating: 7.1,
      evidenceIds: ['pro-2030'],
    },
  ],
  keyMoments: [
    {
      evidenceId: 'contract-1',
      kind: 'contract',
      title: '签下第一份职业合同',
      summary: '你在青训毕业后签下了第一份职业合同。',
    },
  ],
  dimensions: [
    { key: 'competition', label: '竞技水平', score: 56, ratingLabel: '合格', evidenceIds: [] },
  ],
  behindTheScenes: {
    potentials: [],
    traits: [],
    missedOpportunities: [],
  },
  evidenceIds: ['pro-2030', 'contract-1'],
};

describe('career summary contract', () => {
  it('keeps national-team facts internally consistent', () => {
    expect(CareerSummaryFactsSchema.parse(facts).nationalTeam).toEqual({
      capped: false,
      caps: 0,
      goals: 0,
    });
    expect(() =>
      CareerSummaryFactsSchema.parse({
        ...facts,
        nationalTeam: { capped: false, caps: 3, goals: 1 },
      }),
    ).toThrow();
  });

  it('rejects an honour whose evidence is not in the fact package', () => {
    expect(() =>
      CareerSummaryFactsSchema.parse({
        ...facts,
        honours: [
          {
            evidenceId: 'missing-evidence',
            kind: 'world-cup-champion',
            label: '世界杯冠军',
            seasonId: 'pro-2030',
          },
        ],
      }),
    ).toThrow();
  });

  it('builds versioned short and long requests with a canonical hash', () => {
    const request = buildCareerSummaryRequest({
      facts,
      mode: 'long',
      canonicalFactsHash: 'a'.repeat(64),
    });
    expect(CareerSummaryRequestSchema.parse(request)).toEqual(request);
    expect(request.kind).toBe('career-summary');
    expect(request.mode).toBe('long');
  });
});
