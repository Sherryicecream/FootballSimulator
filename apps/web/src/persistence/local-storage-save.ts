import {
  CareerArchiveV1Schema,
  CareerSaveEnvelopeSchema,
  type CareerArchiveV1,
  type CareerSave,
  type CareerSaveV6,
  type CareerSaveV7,
  type CareerSaveV8,
  type CareerSaveV5,
  CareerSaveSchema,
  CareerSaveV5Schema,
  migrateCareerSaveV8,
  migrateCareerSaveV5,
} from '@football/contracts';
import type { SavePort } from '@football/application';

export type CareerStorageErrorCode =
  'read' | 'parse' | 'quota' | 'permission' | 'migration' | 'write' | 'delete' | 'missing';

export class CareerStorageError extends Error {
  constructor(
    readonly code: CareerStorageErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CareerStorageError';
  }
}

export type CareerSlotLoadResult =
  | {
      status: 'loaded';
      kind: 'active';
      slotId: string;
      savedAt: string;
      save: CareerSaveV8;
    }
  | {
      status: 'archived';
      kind: 'archive';
      slotId: string;
      savedAt: string;
      archive: CareerArchiveV1;
    }
  | { status: 'empty'; slotId: string }
  | {
      status: 'invalid';
      slotId: string;
      savedAt: string | null;
      reason: string;
      errorCode?: CareerStorageErrorCode;
    };

export type CareerSlotRecord = Exclude<CareerSlotLoadResult, { status: 'empty' }>;
export type LoadedCareerSlot = Extract<CareerSlotRecord, { status: 'loaded' }>;
export type LoadedCareerArchiveSlot = Extract<CareerSlotRecord, { status: 'archived' }>;

export interface LocalStorageCareerPort {
  save(slotId: string, save: CareerSaveV6 | CareerSaveV7 | CareerSaveV8): Promise<void>;
  saveArchive(slotId: string, archive: CareerArchiveV1): Promise<void>;
  load(slotId: string): Promise<CareerSlotLoadResult>;
  list(): Promise<CareerSlotRecord[]>;
  exportRaw(slotId: string): Promise<string>;
  delete(slotId: string): Promise<void>;
}

export const createLocalStorageCareerPort = (): LocalStorageCareerPort => ({
  async save(slotId, save) {
    let validated: CareerSaveV8;
    try {
      validated = migrateCareerSaveV8(save);
    } catch (error) {
      throw new CareerStorageError('migration', '存档迁移失败，无法保存生涯', error);
    }

    const envelope = {
      storageVersion: 2 as const,
      version: 8 as const,
      kind: 'active' as const,
      savedAt: new Date().toISOString(),
      data: validated,
    };
    writeEnvelope(slotId, envelope, '保存生涯');
  },

  async saveArchive(slotId, archive) {
    let validated: CareerArchiveV1;
    try {
      validated = CareerArchiveV1Schema.parse(archive);
    } catch (error) {
      throw new CareerStorageError('migration', '历史档案校验失败，无法保存', error);
    }

    const envelope = {
      storageVersion: 2 as const,
      version: 1 as const,
      kind: 'archive' as const,
      savedAt: new Date().toISOString(),
      data: validated,
    };
    writeEnvelope(slotId, envelope, '保存历史档案');
  },

  async load(slotId) {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_PREFIX + slotId);
    } catch (error) {
      const code = classifyStorageError(error, 'read');
      return invalidRecord(slotId, null, storageReadMessage(code), code);
    }

    if (raw === null) {
      return { status: 'empty', slotId };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return invalidRecord(slotId, null, '存档 JSON 解析失败', 'parse');
    }

    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      return invalidRecord(slotId, null, '存档包装结构无效', 'migration');
    }

    const wrapper = parsed as { data: unknown; savedAt?: unknown; kind?: unknown };
    const savedAt = typeof wrapper.savedAt === 'string' ? wrapper.savedAt : null;
    if (savedAt === null || Number.isNaN(Date.parse(savedAt))) {
      return invalidRecord(slotId, savedAt, '存档保存时间无效', 'migration');
    }

    if (wrapper.kind === 'active' || wrapper.kind === 'archive') {
      const envelope = CareerSaveEnvelopeSchema.safeParse(parsed);
      if (!envelope.success) {
        return invalidRecord(
          slotId,
          savedAt,
          envelope.error.issues[0]?.message ?? '存档迁移失败',
          'migration',
        );
      }
      if (envelope.data.kind === 'archive') {
        return {
          status: 'archived',
          kind: 'archive',
          slotId,
          savedAt,
          archive: envelope.data.data,
        };
      }
      try {
        const save = migrateCareerSaveV8(envelope.data.data);
        return { status: 'loaded', kind: 'active', slotId, savedAt, save };
      } catch (error) {
        return invalidRecord(
          slotId,
          savedAt,
          error instanceof Error ? error.message : '存档迁移失败',
          'migration',
        );
      }
    }

    try {
      const save: CareerSaveV8 = migrateCareerSaveV8(wrapper.data);
      return { status: 'loaded', kind: 'active', slotId, savedAt, save };
    } catch (error) {
      return invalidRecord(
        slotId,
        savedAt,
        error instanceof Error ? error.message : '存档迁移失败',
        'migration',
      );
    }
  },

  async list() {
    const slots = await Promise.all(listLocalStorageSlots().map((slotId) => this.load(slotId)));
    const records = slots.filter((slot): slot is CareerSlotRecord => slot.status !== 'empty');

    return records.sort((left, right) => {
      const leftReadable = left.status === 'loaded' || left.status === 'archived';
      const rightReadable = right.status === 'loaded' || right.status === 'archived';
      if (leftReadable && rightReadable) {
        const timeDifference = Date.parse(right.savedAt) - Date.parse(left.savedAt);
        if (timeDifference !== 0) {
          return timeDifference;
        }
        return left.slotId.localeCompare(right.slotId);
      }
      if (leftReadable) return -1;
      if (rightReadable) return 1;
      return left.slotId.localeCompare(right.slotId);
    });
  },

  async exportRaw(slotId) {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_PREFIX + slotId);
    } catch (error) {
      const code = classifyStorageError(error, 'read');
      throw new CareerStorageError(code, storageReadMessage(code), error);
    }
    if (raw === null) {
      throw new CareerStorageError('missing', '存档不存在，无法导出', undefined);
    }
    return raw;
  },

  async delete(slotId) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + slotId);
    } catch (error) {
      throw new CareerStorageError('delete', '无法删除存档，请稍后重试', error);
    }
  },
});

const writeEnvelope = (
  slotId: string,
  envelope: unknown,
  operation: '保存生涯' | '保存历史档案',
): void => {
  let serialized: string;
  try {
    serialized = JSON.stringify(envelope);
  } catch (error) {
    throw new CareerStorageError('write', operation + '失败', error);
  }

  try {
    localStorage.setItem(STORAGE_PREFIX + slotId, serialized);
  } catch (error) {
    const code = classifyStorageError(error, 'write');
    throw new CareerStorageError(code, storageWriteMessage(code, operation), error);
  }
};

const invalidRecord = (
  slotId: string,
  savedAt: string | null,
  reason: string,
  errorCode: CareerStorageErrorCode,
): CareerSlotLoadResult => ({
  status: 'invalid',
  slotId,
  savedAt,
  reason,
  errorCode,
});

const classifyStorageError = (
  error: unknown,
  fallback: CareerStorageErrorCode,
): CareerStorageErrorCode => {
  const name =
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as { name?: unknown }).name === 'string'
      ? (error as { name: string }).name
      : null;
  if (name === 'QuotaExceededError') return 'quota';
  if (name === 'SecurityError') return 'permission';
  return fallback;
};

const storageReadMessage = (code: CareerStorageErrorCode): string => {
  if (code === 'permission') return '浏览器拒绝读取本地存档';
  return '读取本地存档失败';
};

const storageWriteMessage = (
  code: CareerStorageErrorCode,
  operation: '保存生涯' | '保存历史档案',
): string => {
  if (code === 'quota') {
    return operation === '保存生涯'
      ? '存储空间不足，无法保存生涯'
      : '存储空间不足，无法保存历史档案';
  }
  if (code === 'permission') return '浏览器拒绝' + operation;
  return operation + '失败，请稍后重试';
};
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
