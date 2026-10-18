import Dexie, { type Table } from 'dexie';

export interface Item {
  id?: number;
  title: string;
  completed: boolean;
  createdAt: number;
}

export class AppDatabase extends Dexie {
  items!: Table<Item, number>;

  constructor() {
    super('PocketAppDB');
    this.version(1).stores({
      items: '++id, title, completed, createdAt'
    });
  }
}

export const db = new AppDatabase();
