import { describe, expect, it } from 'vitest';
import { SeasonHonourSchema } from '../src/graduation';

describe('SeasonHonour tournament kinds', () => {
  it('accepts national tournament honours', () => {
    for (const kind of ['asian-cup-champion', 'world-cup-champion', 'world-cup-runner-up']) {
      const honour = SeasonHonourSchema.parse({
        id: 'pro-2030-asian-cup',
        kind,
        label: '亚洲杯冠军',
        seasonId: 'pro-2029',
        clubId: 'pro-club-1',
        evidenceId: 'national-tournament-pro-2029',
      });
      expect(honour.kind).toBe(kind);
    }
  });

  it('still rejects unknown honour kinds', () => {
    expect(() =>
      SeasonHonourSchema.parse({
        id: 'x',
        kind: 'friendly-cup-champion',
        label: '友谊赛冠军',
        seasonId: 'pro-2029',
        clubId: 'pro-club-1',
        evidenceId: 'e',
      }),
    ).toThrow();
  });
});
