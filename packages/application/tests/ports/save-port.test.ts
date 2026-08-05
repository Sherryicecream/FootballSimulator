import { describe, it, expect } from 'vitest';
import { createInMemorySaveStore } from '../../src/ports/save-port';
import { CareerSaveSchema, type CareerSave } from '@football/contracts';

function createMockSave(): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'career-test-001',
    player: {
      identity: {
        name: '张伟',
        hometown: '上海',
        homelandId: 'shanghai',
        dateOfBirth: '2008-06-15',
        primaryPosition: 'CENTER_BACK',
        secondaryPosition: 'FULL_BACK',
        preferredFoot: 'RIGHT',
        weakFootLevel: 30,
        growthBackground: '城市青训',
        personalityTendency: 'balanced',
      },
      attributes: {
        technical: {
          firstTouch: 60,
          dribbling: 65,
          passing: 70,
          shooting: 55,
          defending: 50,
          aerialAbility: 62,
        },
        physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
        mental: {
          offTheBall: 60,
          vision: 65,
          decision: 63,
          composure: 67,
          determination: 75,
          discipline: 70,
        },
      },
      hiddenTraits: {
        potential: 85,
        stability: 70,
        professionalism: 75,
        pressureResistance: 65,
        adaptability: 60,
        injuryProneness: 40,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    },
    world: { currentDate: '2024-09-01', season: 2024, weekNumber: 1 },
    context: {
      academyId: null,
      pendingOpportunity: null,
      playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
      pendingEvent: null,
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [], cooldowns: {} },
    ledger: [
      {
        type: 'career-started',
        date: '2024-09-01',
        playerName: '张伟',
        age: 16,
        position: 'CENTER_BACK',
      },
    ],
    randomState: { seed: 12345, sequencePosition: 0 },
  };
}

describe('SavePort', () => {
  it('保存并读取存档', async () => {
    const store = createInMemorySaveStore();
    const save = createMockSave();

    await store.save('career-1', save);
    const loaded = await store.load('career-1');

    expect(loaded).toBeDefined();
    expect(loaded!.player.identity.name).toBe('张伟');
  });

  it('返回未找到的存档为 undefined', async () => {
    const store = createInMemorySaveStore();
    const loaded = await store.load('nonexistent');
    expect(loaded).toBeUndefined();
  });

  it('列出所有存档', async () => {
    const store = createInMemorySaveStore();
    await store.save('career-1', createMockSave());
    await store.save('career-2', createMockSave());

    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list).toContain('career-1');
    expect(list).toContain('career-2');
  });

  it('删除存档', async () => {
    const store = createInMemorySaveStore();
    await store.save('career-1', createMockSave());
    await store.delete('career-1');

    const loaded = await store.load('career-1');
    expect(loaded).toBeUndefined();
  });

  it('保存的存档通过 Zod 校验', async () => {
    const store = createInMemorySaveStore();
    const save = createMockSave();

    await store.save('career-1', save);
    const loaded = await store.load('career-1');

    const result = CareerSaveSchema.safeParse(loaded);
    expect(result.success).toBe(true);
  });
});
