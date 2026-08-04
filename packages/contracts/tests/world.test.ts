import { describe, it, expect } from 'vitest';
import { WorldStateSchema } from '../src/world';

describe('WorldState', () => {
  it('validates a minimal world state', () => {
    const valid = WorldStateSchema.parse({
      currentDate: '2024-09-01',
      season: 2024,
    });
    expect(valid.currentDate).toBe('2024-09-01');
    expect(valid.season).toBe(2024);
  });

  it('rejects missing season', () => {
    expect(() => WorldStateSchema.parse({ currentDate: '2024-09-01' })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => WorldStateSchema.parse({ currentDate: 'not-a-date', season: 2024 })).toThrow();
  });
});