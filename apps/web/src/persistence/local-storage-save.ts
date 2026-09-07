import {
  type CareerSave,
  type CareerSaveV6,
  type CareerSaveV5,
  CareerSaveSchema,
  CareerSaveV6Schema,
  CareerSaveV5Schema,
  migrateCareerSaveV6,
  migrateCareerSaveV5,
} from '@football/contracts';
import type { SavePort } from '@football/application';

export type CareerSlotLoadResult =
  | { status: 'loaded'; slotId: string; savedAt: string; save: CareerSaveV6 }
  | { status: 'empty'; slotId: string }
  | { status: 'invalid'; slotId: string; savedAt: string | null; reason: string };

export type CareerSlotRecord = Exclude<CareerSlotLoadResult, { status: 'empty' }>;
export type LoadedCareerSlot = Extract<CareerSlotRecord, { status: 'loaded' }>;

export interface LocalStorageCareerPort {
  save(slotId: string, save: CareerSaveV6): Promise<void>;
  load(slotId: string): Promise<CareerSlotLoadResult>;
  list(): Promise<CareerSlotRecord[]>;
  delete(slotId: string): Promise<void>;
}

export const createLocalStorageCareerPort = (): LocalStorageCareerPort => ({
  async save(slotId, save) {
    const validated = CareerSaveV6Schema.parse(save);

    try {
      localStorage.setItem(
        STORAGE_PREFIX + slotId,
        JSON.stringify({ version: 6, savedAt: new Date().toISOString(), data: validated }),
      );
    } catch {
      throw new Error('存储空间不足，无法保存生涯');
    }
  },
  async load(slotId) {
    const raw = localStorage.getItem(STORAGE_PREFIX + slotId);
    if (raw === null) {
      return { status: 'empty', slotId };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: 'invalid', slotId, savedAt: null, reason: '存档 JSON 解析失败' };
    }

    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      return { status: 'invalid', slotId, savedAt: null, reason: '存档包装结构无效' };
    }

    const wrapper = parsed as { data: unknown; savedAt?: unknown };
    const savedAt = typeof wrapper.savedAt === 'string' ? wrapper.savedAt : null;
    if (savedAt === null || Number.isNaN(Date.parse(savedAt))) {
      return { status: 'invalid', slotId, savedAt, reason: '存档保存时间无效' };
    }

    try {
      return { status: 'loaded', slotId, savedAt, save: migrateCareerSaveV6(wrapper.data) };
    } catch (error) {
      return {
        status: 'invalid',
        slotId,
        savedAt,
        reason: error instanceof Error ? error.message : '存档迁移失败',
      };
    }
  },
  async list() {
    const slots = await Promise.all(listLocalStorageSlots().map((slotId) => this.load(slotId)));
    const records = slots.filter((slot): slot is CareerSlotRecord => slot.status !== 'empty');

    return records.sort((left, right) => {
      if (left.status === 'loaded' && right.status === 'loaded') {
        return right.savedAt.localeCompare(left.savedAt);
      }
      if (left.status === 'loaded') return -1;
      if (right.status === 'loaded') return 1;
      return left.slotId.localeCompare(right.slotId);
    });
  },
  async delete(slotId) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + slotId);
    } catch {
      throw new Error('无法删除存档，请稍后重试');
    }
  },
});

const STORAGE_PREFIX = 'football-save-';

export type CareerV4LoadResult =
  | { status: 'loaded'; save: CareerSaveV5 }
  | { status: 'empty' }
  | { status: 'invalid'; reason: string; raw: string };

export interface LocalStorageCareerV4Port {
  save(slotId: string, data: CareerSaveV5): Promise<void>;
  load(slotId: string): Promise<CareerV4LoadResult>;
  list(): Promise<string[]>;
  delete(slotId: string): Promise<void>;
}

export const createLocalStorageCareerV4Port = (): LocalStorageCareerV4Port => ({
  async save(slotId, data) {
    const validated = CareerSaveV5Schema.parse(data);
    localStorage.setItem(
      STORAGE_PREFIX + slotId,
      JSON.stringify({ version: 5, savedAt: new Date().toISOString(), data: validated }),
    );
  },
  async load(slotId) {
    const raw = localStorage.getItem(STORAGE_PREFIX + slotId);
    if (!raw) {
      return { status: 'empty' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: 'invalid', reason: '存档 JSON 解析失败', raw };
    }

    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      return { status: 'invalid', reason: '存档包装结构无效', raw };
    }

    try {
      return { status: 'loaded', save: migrateCareerSaveV5(parsed.data) };
    } catch (error) {
      return {
        status: 'invalid',
        reason: error instanceof Error ? error.message : '存档迁移失败',
        raw,
      };
    }
  },
  async list() {
    return listLocalStorageSlots();
  },
  async delete(slotId) {
    localStorage.removeItem(STORAGE_PREFIX + slotId);
  },
});

/**
 * Creates a localStorage-based SavePort adapter.
 * Uses versioned storage with Zod schema validation on load.
 */
export function createLocalStorageSavePort(): SavePort {
  return {
    async save(slotId: string, data: CareerSave): Promise<void> {
      try {
        const key = STORAGE_PREFIX + slotId;
        const json = JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          data,
        });
        localStorage.setItem(key, json);
      } catch (e) {
        console.error('Failed to save career:', e);
        throw new Error('存储空间不足，无法保存生涯');
      }
    },

    async load(slotId: string): Promise<CareerSave | undefined> {
      try {
        const key = STORAGE_PREFIX + slotId;
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;

        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.data) return undefined;

        const result = CareerSaveSchema.safeParse(parsed.data);
        if (!result.success) {
          console.error('存档数据损坏，校验失败:', result.error.issues);
          return undefined;
        }

        return result.data;
      } catch (e) {
        console.error('Failed to load career:', e);
        return undefined;
      }
    },

    async list(): Promise<string[]> {
      return listLocalStorageSlots();
    },

    async delete(slotId: string): Promise<void> {
      const key = STORAGE_PREFIX + slotId;
      localStorage.removeItem(key);
    },
  };
}

const listLocalStorageSlots = (): string[] => {
  const slots: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) {
      slots.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return slots;
};
