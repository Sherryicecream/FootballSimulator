import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageCareerV4Port,
  createLocalStorageCareerPort,
  createLocalStorageSavePort,
} from '../../src/persistence/local-storage-save';
import {
  migrateCareerSaveV5,
  migrateCareerSaveV6,
  migrateCareerSaveV7,
  type CareerSave,
} from '@football/contracts';

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
    const port = createLocalStorageCareerV4Port();
    const v5 = migrateCareerSaveV5(mockSave);

    await port.save(v5.careerId, v5);
    const loaded = await port.load(v5.careerId);

    expect(loaded.status).toBe('loaded');
    if (loaded.status === 'loaded') {
      expect(loaded.save.schemaVersion).toBe(5);
    }
  });

  it('deterministically migrates a wrapped v1 save without deleting the raw data', async () => {
    const key = 'football-save-test-career';
    const raw = JSON.stringify({ version: 1, savedAt: '2024-09-01T00:00:00.000Z', data: mockSave });
    localStorage.setItem(key, raw);

    const loaded = await createLocalStorageCareerV4Port().load('test-career');

    expect(loaded.status).toBe('loaded');
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('returns a recoverable reason for a damaged save and keeps the raw data', async () => {
    const key = 'football-save-damaged';
    localStorage.setItem(key, '{damaged');

    const loaded = await createLocalStorageCareerV4Port().load('damaged');

    expect(loaded.status).toBe('invalid');
    if (loaded.status === 'invalid') {
      expect(loaded.reason).toContain('解析');
    }
    expect(localStorage.getItem(key)).toBe('{damaged');
  });
});

describe('createLocalStorageCareerPort', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes a v8 wrapper with a timestamp and an empty world registry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));

    try {
      const save = migrateCareerSaveV6(mockSave);
      await createLocalStorageCareerPort().save(save.careerId, save);

      expect(JSON.parse(localStorage.getItem('football-save-test-career') ?? '')).toMatchObject({
        version: 8,
        savedAt: '2026-03-01T12:00:00.000Z',
        data: { schemaVersion: 8, careerId: 'test-career', worldRegistry: { entries: [] } },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('round-trips v7 mechanics and ledger timing metadata without downgrading', async () => {
    const source = migrateCareerSaveV7(mockSave);
    const save = {
      ...source,
      ledger: [
        {
          ...source.ledger[0]!,
          occurredOn: '2024-09-08',
          seasonId: source.season.id,
          ordinal: 1,
        },
      ],
    };

    await createLocalStorageCareerPort().save(save.careerId, save);
    const loaded = await createLocalStorageCareerPort().load(save.careerId);

    expect(loaded.status).toBe('loaded');
    if (loaded.status === 'loaded') {
      expect(loaded.save.schemaVersion).toBe(8);
      expect(loaded.save.mechanicsVersion).toBe('experience-v1');
      expect(loaded.save.ledger[0]).toMatchObject({
        occurredOn: '2024-09-08',
        seasonId: source.season.id,
        ordinal: 1,
      });
    }
  });
  it('loads a legacy wrapper without rewriting it', async () => {
    const key = 'football-save-test-career';
    const raw = JSON.stringify({ version: 1, savedAt: '2024-09-01T00:00:00.000Z', data: mockSave });
    localStorage.setItem(key, raw);

    const loaded = await createLocalStorageCareerPort().load('test-career');

    expect(loaded).toMatchObject({
      status: 'loaded',
      slotId: 'test-career',
      savedAt: '2024-09-01T00:00:00.000Z',
      save: { schemaVersion: 8, careerId: 'test-career', worldRegistry: { entries: [] } },
    });
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('upgrades an active v7 wrapper to v8 without losing its world registry', async () => {
    const key = 'football-save-v7-career';
    const source = migrateCareerSaveV7(mockSave);
    const raw = JSON.stringify({
      storageVersion: 2,
      version: 7,
      kind: 'active',
      savedAt: '2026-01-01T00:00:00.000Z',
      data: {
        ...source,
        worldRegistry: {
          entries: [
            {
              country: 'china',
              source: 'player',
              seasonId: 'pro-china-tier-6',
              completed: false,
              promoted: [],
              relegated: [],
            },
          ],
        },
      },
    });
    localStorage.setItem(key, raw);

    const loaded = await createLocalStorageCareerPort().load('v7-career');

    expect(loaded.status).toBe('loaded');
    if (loaded.status === 'loaded') {
      expect(loaded.save.schemaVersion).toBe(8);
      expect(loaded.save.worldRegistry.entries).toHaveLength(1);
      expect(loaded.save.worldRegistry.entries[0]?.seasonId).toBe('pro-china-tier-6');
    }
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('lists valid saves newest first and keeps damaged slots isolated', async () => {
    localStorage.setItem('football-save-alpha', '{damaged');
    localStorage.setItem('football-save-broken', '{damaged');
    storeWrapped('older', migrateCareerSaveV6(mockSave), '2026-01-01T00:00:00.000Z');
    storeWrapped(
      'newer',
      migrateCareerSaveV6({ ...mockSave, careerId: 'newer' }),
      '2026-02-01T00:00:00.000Z',
    );

    const slots = await createLocalStorageCareerPort().list();

    expect(slots.map(({ slotId }) => slotId)).toEqual(['newer', 'older', 'alpha', 'broken']);
    expect(slots.at(-1)).toMatchObject({ status: 'invalid', slotId: 'broken', savedAt: null });
    expect(localStorage.getItem('football-save-broken')).toBe('{damaged');
  });

  it('sorts loaded slots by their timestamp instant with a slot-id tie-breaker', async () => {
    storeWrapped(
      'offset-later',
      migrateCareerSaveV6({ ...mockSave, careerId: 'offset-later' }),
      '2026-02-01T00:30:00-01:00',
    );
    storeWrapped(
      'utc-earlier',
      migrateCareerSaveV6({ ...mockSave, careerId: 'utc-earlier' }),
      '2026-02-01T01:00:00.000Z',
    );
    storeWrapped(
      'equal-b',
      migrateCareerSaveV6({ ...mockSave, careerId: 'equal-b' }),
      '2026-02-01T02:00:00+01:00',
    );
    storeWrapped(
      'equal-a',
      migrateCareerSaveV6({ ...mockSave, careerId: 'equal-a' }),
      '2026-02-01T01:00:00.000Z',
    );

    const slots = await createLocalStorageCareerPort().list();

    expect(slots.map(({ slotId }) => slotId)).toEqual([
      'offset-later',
      'equal-a',
      'equal-b',
      'utc-earlier',
    ]);
  });

  it('reports an empty slot with its requested id', async () => {
    await expect(createLocalStorageCareerPort().load('missing')).resolves.toEqual({
      status: 'empty',
      slotId: 'missing',
    });
  });

  it('rejects malformed v6 data before replacing the previous raw save', async () => {
    const key = 'football-save-test-career';
    const raw = JSON.stringify({ version: 6, savedAt: '2026-01-01T00:00:00.000Z', data: mockSave });
    localStorage.setItem(key, raw);

    await expect(
      createLocalStorageCareerPort().save('test-career', {
        ...migrateCareerSaveV6(mockSave),
        careerId: '',
      } as never),
    ).rejects.toThrow();
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('reports a failed write without replacing the previous raw save', async () => {
    const port = createLocalStorageCareerPort();
    const save = migrateCareerSaveV6(mockSave);
    await port.save('test-career', save);
    const raw = localStorage.getItem('football-save-test-career');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    try {
      await expect(port.save('test-career', { ...save, careerId: 'next-career' })).rejects.toThrow(
        '存储空间不足，无法保存生涯',
      );
      expect(localStorage.getItem('football-save-test-career')).toBe(raw);
    } finally {
      setItem.mockRestore();
    }
  });

  it('reports a failed delete without removing the raw save', async () => {
    const port = createLocalStorageCareerPort();
    const save = migrateCareerSaveV6(mockSave);
    await port.save('test-career', save);
    const raw = localStorage.getItem('football-save-test-career');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    try {
      await expect(port.delete('test-career')).rejects.toThrow('无法删除存档，请稍后重试');
      expect(localStorage.getItem('football-save-test-career')).toBe(raw);
    } finally {
      removeItem.mockRestore();
    }
  });
  it('exports the exact raw contents of a damaged slot without parsing or rewriting it', async () => {
    const raw = '{damaged archive with trailing bytes\n';
    localStorage.setItem('football-save-damaged', raw);

    const port = createLocalStorageCareerPort() as unknown as {
      exportRaw(slotId: string): Promise<string>;
    };

    await expect(port.exportRaw('damaged')).resolves.toBe(raw);
    expect(localStorage.getItem('football-save-damaged')).toBe(raw);
  });

  it('exports a valid slot without changing its serialized wrapper', async () => {
    const save = migrateCareerSaveV6(mockSave);
    await createLocalStorageCareerPort().save(save.careerId, save);
    const raw = localStorage.getItem('football-save-test-career');

    const port = createLocalStorageCareerPort() as unknown as {
      exportRaw(slotId: string): Promise<string>;
    };

    await expect(port.exportRaw('test-career')).resolves.toBe(raw);
    expect(localStorage.getItem('football-save-test-career')).toBe(raw);
  });
  it('writes and reads a read-only archive envelope', async () => {
    const { buildCareerArchive } = await import('@football/application');
    const migrated = migrateCareerSaveV7(mockSave);
    const terminal = migrateCareerSaveV7({
      ...migrated,
      careerPhase: 'retired',
      retiredOn: '2024-09-08',
      careerEnd: {
        kind: 'voluntary-retirement',
        endedOn: '2024-09-08',
        summary: '正式宣布退役，结束球员生涯。',
        evidenceIds: ['retirement-1'],
      },
    });
    const archive = buildCareerArchive(terminal);
    const port = createLocalStorageCareerPort() as unknown as {
      saveArchive(slotId: string, archive: typeof archive): Promise<void>;
    };

    await port.saveArchive('archive-career', archive);

    expect(JSON.parse(localStorage.getItem('football-save-archive-career') ?? '')).toMatchObject({
      storageVersion: 2,
      kind: 'archive',
      data: { archiveVersion: 1, careerId: archive.careerId },
    });
    const loaded = await createLocalStorageCareerPort().load('archive-career');
    expect(loaded.status).toBe('archived');
    if (loaded.status === 'archived') {
      expect(loaded.archive.review.tier).toBe(archive.review.tier);
      expect(loaded.archive.history).toEqual(archive.history);
    }
  });

  it('returns a permission-coded invalid result when local storage reads are blocked', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    try {
      await expect(createLocalStorageCareerPort().load('blocked')).resolves.toMatchObject({
        status: 'invalid',
        errorCode: 'permission',
      });
    } finally {
      getItem.mockRestore();
    }
  });
});

const storeWrapped = (
  slotId: string,
  data: ReturnType<typeof migrateCareerSaveV6>,
  savedAt: string,
) => {
  localStorage.setItem(`football-save-${slotId}`, JSON.stringify({ version: 6, savedAt, data }));
};
