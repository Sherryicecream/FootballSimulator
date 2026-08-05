import { describe, it, expect } from 'vitest';
import { createAdvanceCareerWeek } from '../../src/use-cases/advance-career-week';
import { CareerSaveSchema } from '@football/contracts';
import type { CareerSave } from '@football/contracts';

function createMockSave(seed: number = 42): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'test-career',
    player: {
      identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
      attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
      hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    },
    world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
    context: {
      academyId: 'shanghai-pujiang',
      pendingOpportunity: null,
      playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
      pendingEvent: null,
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
    ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '测试', age: 16, position: 'MIDFIELDER' }],
    randomState: { seed, sequencePosition: 0 },
  };
}

describe('createAdvanceCareerWeek', () => {
  it('advances a save without pending event', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    expect(result.world.currentDate).toBe('2024-09-15');
    expect(result.world.weekNumber).toBe(3);
  });

  it('throws if save has a pending event', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    save.context.pendingEvent = {
      eventId: 'test-event',
      title: '测试事件',
      description: '一个测试事件',
      choices: [{ id: 'c1', text: '选择1', riskLabel: 'low', effects: {} }],
      resolvedChoiceId: null,
    };
    expect(() => advanceWeek(save)).toThrow('未处理的事件');
  });

  it('returns a save that passes Zod validation', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    const parsed = CareerSaveSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('same seed produces same result', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save1 = createMockSave(42);
    const save2 = createMockSave(42);
    const result1 = advanceWeek(save1);
    const result2 = advanceWeek(save2);
    expect(result1.world.currentDate).toBe(result2.world.currentDate);
    expect(result1.world.weekNumber).toBe(result2.world.weekNumber);
  });

  it('does not mutate the original save', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const originalDate = save.world.currentDate;
    advanceWeek(save);
    expect(save.world.currentDate).toBe(originalDate);
  });

  it('adds ledger entries', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    expect(result.ledger.length).toBeGreaterThan(save.ledger.length);
  });
});