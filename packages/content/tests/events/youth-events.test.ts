import { describe, it, expect } from 'vitest';
import { getYouthEvents } from '../../src/events/youth-events';
import { overseasClubs } from '../../src/clubs';
import { getYouthContent } from '../../src';

describe('youthEvents', () => {
  it('returns at least 5 events', () => {
    const events = getYouthEvents();
    expect(events.length).toBeGreaterThanOrEqual(5);
  });

  it('every event has a unique id', () => {
    const events = getYouthEvents();
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every event has at least 1 choice', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect(event.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every event has a valid category', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect([
        'china-youth',
        'dressing-room',
        'off-pitch',
        'asia-career',
        'europe-career',
        'national-team',
      ] as string[]).toContain(event.category);
    }
  });

  it('every event has a valid rarity', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect(['common', 'uncommon', 'rare', 'legendary'] as string[]).toContain(event.rarity);
    }
  });

  it('coach-praise effects are within valid range', () => {
    const events = getYouthEvents();
    const event = events.find((e) => e.id === 'coach-praise')!;
    expect(event).toBeDefined();
    for (const choice of event.choices) {
      for (const value of Object.values(choice.effects)) {
        expect(value).toBeGreaterThanOrEqual(-20);
        expect(value).toBeLessThanOrEqual(20);
      }
    }
  });

  it('contains a misunderstanding event with role-specific immediate responses', () => {
    const event = getYouthEvents().find(
      (candidate) => candidate.id === 'misunderstanding-clarification',
    );
    expect(event).toBeDefined();
    const choice = event?.choices[0];
    const responses = (choice as unknown as { responses?: Array<{ speakerRole: string }> })
      ?.responses;
    expect(choice?.response).toContain('说清楚');
    expect(responses?.map(({ speakerRole }) => speakerRole)).toEqual(['youth-coach', 'teammate']);
  });

  it('gives every interactive choice a specific result and follow-up', () => {
    const missing = getYouthContent().events.flatMap((event) =>
      event.interaction === 'decision'
        ? event.choices
            .filter((choice) => !choice.response || !choice.followUp)
            .map((choice) => `${event.id}:${choice.id}`)
        : [],
    );

    expect(missing).toEqual([]);
  });
});

describe('pro-phase event coverage', () => {
  it('covers asia-career, europe-career and national-team categories', () => {
    const events = getYouthEvents();
    const countBy = (category: string) =>
      events.filter((event) => event.category === category).length;
    expect(countBy('asia-career')).toBeGreaterThanOrEqual(6);
    expect(countBy('europe-career')).toBeGreaterThanOrEqual(6);
    expect(countBy('national-team')).toBeGreaterThanOrEqual(5);
  });

  it('every pro-phase event gates on overseas or national-team state', () => {
    const events = getYouthEvents().filter((event) =>
      ['asia-career', 'europe-career', 'national-team'].includes(event.category),
    );
    expect(events.length).toBeGreaterThanOrEqual(17);
    for (const event of events) {
      const gated =
        event.condition.requireOverseas === true ||
        event.condition.requireNationalTeam === true ||
        typeof event.condition.minCaps === 'number';
      expect(gated).toBe(true);
    }
  });

  it('provides japanese and korean overseas clubs for asia-career events', () => {
    expect(overseasClubs.filter((club) => club.overseasRegion === 'asia').length).toBeGreaterThanOrEqual(4);
    expect(overseasClubs.filter((club) => club.overseasRegion === 'europe').length).toBeGreaterThanOrEqual(10);
    for (const club of overseasClubs) {
      expect(club.overseas).toBe(true);
    }
  });

  it('key pro-phase choices provide three-tier authored resolutions', () => {
    const withResolution = getYouthEvents().filter(
      (event) =>
        ['asia-career', 'europe-career', 'national-team'].includes(event.category) &&
        event.choices.some((choice) => choice.resolution),
    );
    expect(withResolution.length).toBeGreaterThanOrEqual(6);
    for (const event of withResolution) {
      for (const choice of event.choices) {
        if (choice.resolution) {
          expect(Object.keys(choice.resolution.outcomes).sort()).toEqual([
            'failure',
            'partial',
            'success',
          ]);
        }
      }
    }
  });
});
