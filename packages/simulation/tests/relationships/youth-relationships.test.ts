import { describe, expect, it } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { initializeYouthRelationships } from '../../src/relationships/youth-relationships';
import { applyRelationshipEffects } from '../../src/relationships/relationship-effects';

describe('youth relationships', () => {
  it('creates coaches, key teammates, family and a same-position rival', () => {
    const graph = initializeYouthRelationships('FORWARD', createSeededRandomSource(42));
    expect(graph.persons.filter(({ role }) => role === 'youth-coach')).toHaveLength(1);
    expect(graph.persons.filter(({ role }) => role === 'assistant-coach')).toHaveLength(1);
    expect(graph.persons.filter(({ role }) => role === 'teammate').length).toBeGreaterThanOrEqual(
      3,
    );
    expect(graph.persons.find(({ role }) => role === 'rival')?.primaryPosition).toBe('FORWARD');
    expect(graph.persons.some(({ role }) => role === 'family')).toBe(true);
  });

  it('applies a choice only to explicitly participating people', () => {
    const graph = initializeYouthRelationships('FORWARD', createSeededRandomSource(42));
    const target = graph.persons.find(({ role }) => role === 'rival')!;
    const untouched = graph.persons.find(({ role }) => role === 'youth-coach')!;
    const updated = applyRelationshipEffects(
      graph,
      [target.id],
      { respect: 6, trust: -2 },
      { eventId: 'rival-talk', summary: '赛后交谈', season: 2024, week: 4, impact: 'neutral' },
    );
    expect(updated.persons.find(({ id }) => id === target.id)?.relationship.respect).toBe(
      target.relationship.respect + 6,
    );
    expect(updated.persons.find(({ id }) => id === target.id)?.memories).toHaveLength(1);
    expect(updated.persons.find(({ id }) => id === untouched.id)).toEqual(untouched);
  });
});
