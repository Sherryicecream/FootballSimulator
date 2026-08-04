import { type CareerSave } from '@football/contracts';

export interface SavePort {
  save(slotId: string, data: CareerSave): Promise<void>;
  load(slotId: string): Promise<CareerSave | undefined>;
  list(): Promise<string[]>;
  delete(slotId: string): Promise<void>;
}

export type InMemorySaveStore = SavePort;

export function createInMemorySaveStore(): InMemorySaveStore {
  const store = new Map<string, CareerSave>();

  return {
    async save(slotId: string, data: CareerSave): Promise<void> {
      store.set(slotId, { ...data });
    },
    async load(slotId: string): Promise<CareerSave | undefined> {
      const data = store.get(slotId);
      return data ? { ...data } : undefined;
    },
    async list(): Promise<string[]> {
      return Array.from(store.keys());
    },
    async delete(slotId: string): Promise<void> {
      store.delete(slotId);
    },
  };
}
