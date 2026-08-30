import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLocalStorageCareerV2Port,
  createLocalStorageSavePort,
} from '../../src/persistence/local-storage-save';
import { migrateCareerSaveV3, type CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1,
  contentVersion: 'bootstrap-1',
  careerId: 'test-career',
  player: {
    identity: {
      name: '测试',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-01-01',
      primaryPosition: 'MIDFIELDER',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: 'academy',
      personalityTendency: 'composed',
    },
    attributes: {
      technical: {
        firstTouch: 50,
        dribbling: 50,
        passing: 50,
        shooting: 40,
        defending: 30,
        aerialAbility: 30,
      },
      physical: { pace: 50, strength: 50, stamina: 50, agility: 50 },
      mental: {
        offTheBall: 50,
        vision: 50,
        decision: 50,
        composure: 50,
        determination: 50,
        discipline: 50,
      },
    },
    hiddenTraits: {
      potential: 80,
      stability: 60,
      professionalism: 70,
      pressureResistance: 60,
      adaptability: 50,
      injuryProneness: 30,
    },
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
    trainingFocus: null,
    trainingIntensity: 'normal',
  },
  relationships: { persons: [], activeRelations: [] },
  story: {
    bootstrapOpportunityWeek: 3,
    resolvedOpportunityIds: [],
    completedStoryIds: [],
    activeStorylines: [],
    cooldowns: {},
  },
  ledger: [
    {
      type: 'career-started',
      date: '2024-09-01',
      playerName: '测试',
      age: 16,
      position: 'MIDFIELDER',
    },
  ],
  randomState: { seed: 42, sequencePosition: 0 },
};

describe('createLocalStorageSavePort', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a career', async () => {
    const port = createLocalStorageSavePort();
    await port.save('test-career', mockSave);
    const loaded = await port.load('test-career');
    expect(loaded).toBeDefined();
    expect(loaded!.careerId).toBe('test-career');
  });

  it('returns undefined for non-existent slot', async () => {
    const port = createLocalStorageSavePort();
    const loaded = await port.load('non-existent');
    expect(loaded).toBeUndefined();
  });

  it('lists saved slots', async () => {
    const port = createLocalStorageSavePort();
    await port.save('slot1', mockSave);
    await port.save('slot2', { ...mockSave, careerId: 'slot2' });
    const slots = await port.list();
    expect(slots).toContain('slot1');
    expect(slots).toContain('slot2');
  });

  it('deletes a saved slot', async () => {
    const port = createLocalStorageSavePort();
    await port.save('test-career', mockSave);
    await port.delete('test-career');
    const loaded = await port.load('test-career');
    expect(loaded).toBeUndefined();
  });

  it('returns undefined for corrupted data', async () => {
    const port = createLocalStorageSavePort();
    localStorage.setItem('football-save-test-career', '{corrupted json');
    const loaded = await port.load('test-career');
    expect(loaded).toBeUndefined();
  });

  it('validates v2 saves before writing and loads them with a typed result', async () => {
    const port = createLocalStorageCareerV2Port();
    const v2 = migrateCareerSaveV3(mockSave);

    await port.save(v2.careerId, v2);
    const loaded = await port.load(v2.careerId);

    expect(loaded.status).toBe('loaded');
    if (loaded.status === 'loaded') {
      expect(loaded.save.schemaVersion).toBe(3);
    }
  });

  it('deterministically migrates a wrapped v1 save without deleting the raw data', async () => {
    const key = 'football-save-test-career';
    const raw = JSON.stringify({ version: 1, savedAt: '2024-09-01T00:00:00.000Z', data: mockSave });
    localStorage.setItem(key, raw);

    const loaded = await createLocalStorageCareerV2Port().load('test-career');

    expect(loaded.status).toBe('loaded');
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('returns a recoverable reason for a damaged save and keeps the raw data', async () => {
    const key = 'football-save-damaged';
    localStorage.setItem(key, '{damaged');

    const loaded = await createLocalStorageCareerV2Port().load('damaged');

    expect(loaded.status).toBe('invalid');
    if (loaded.status === 'invalid') {
      expect(loaded.reason).toContain('解析');
    }
    expect(localStorage.getItem(key)).toBe('{damaged');
  });
});
