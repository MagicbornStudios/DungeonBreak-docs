import Dexie, { type Table } from "dexie";
import type { GameSnapshot } from "../core/types";

export interface SaveSlot {
  id: string;
  name: string;
  snapshot: GameSnapshot;
  updatedAt: number;
}

export interface PersistenceAdapter {
  saveSlot(id: string, snapshot: GameSnapshot, name?: string): Promise<void>;
  loadSlot(id: string): Promise<SaveSlot | null>;
  listSlots(): Promise<SaveSlot[]>;
  deleteSlot(id: string): Promise<void>;
}

class GameDb extends Dexie {
  slots!: Table<SaveSlot, string>;

  constructor() {
    super("escape_the_dungeon_browser");
    this.version(1).stores({
      slots: "id,updatedAt",
    });
  }
}

export class IndexedDbPersistence implements PersistenceAdapter {
  private readonly db: GameDb;

  constructor() {
    this.db = new GameDb();
  }

  async saveSlot(id: string, snapshot: GameSnapshot, name?: string): Promise<void> {
    await this.db.slots.put({
      id,
      name: name ?? id,
      snapshot,
      updatedAt: Date.now(),
    });
  }

  async loadSlot(id: string): Promise<SaveSlot | null> {
    const slot = await this.db.slots.get(id);
    return slot ?? null;
  }

  listSlots(): Promise<SaveSlot[]> {
    return this.db.slots.orderBy("updatedAt").reverse().toArray();
  }

  async deleteSlot(id: string): Promise<void> {
    await this.db.slots.delete(id);
  }
}

export class MemoryPersistence implements PersistenceAdapter {
  private readonly slots = new Map<string, SaveSlot>();

  saveSlot(id: string, snapshot: GameSnapshot, name?: string): Promise<void> {
    this.slots.set(id, {
      id,
      name: name ?? id,
      snapshot,
      updatedAt: Date.now(),
    });
    return Promise.resolve();
  }

  loadSlot(id: string): Promise<SaveSlot | null> {
    return Promise.resolve(this.slots.get(id) ?? null);
  }

  listSlots(): Promise<SaveSlot[]> {
    return Promise.resolve([...this.slots.values()].sort((a, b) => b.updatedAt - a.updatedAt));
  }

  deleteSlot(id: string): Promise<void> {
    this.slots.delete(id);
    return Promise.resolve();
  }
}

export const createPersistence = (): PersistenceAdapter => {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return new MemoryPersistence();
  }
  return new IndexedDbPersistence();
};
