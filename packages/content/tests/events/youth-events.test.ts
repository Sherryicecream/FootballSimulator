import { describe, it, expect } from 'vitest';
import { getYouthEvents } from '../../src/events/youth-events';

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
});