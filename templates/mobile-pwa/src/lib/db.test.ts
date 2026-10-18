import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';

describe('AppDatabase (Dexie)', () => {
  beforeEach(async () => {
    await db.items.clear();
  });

  it('adds and queries an item', async () => {
    const id = await db.items.add({
      title: 'Test Offline Task',
      completed: false,
      createdAt: Date.now()
    });
    expect(id).toBeDefined();

    const item = await db.items.get(id);
    expect(item?.title).toBe('Test Offline Task');
    expect(item?.completed).toBe(false);
  });

  it('updates an item completion state', async () => {
    const id = await db.items.add({
      title: 'Finish PWA Factory',
      completed: false,
      createdAt: Date.now()
    });
    await db.items.update(id, { completed: true });

    const item = await db.items.get(id);
    expect(item?.completed).toBe(true);
  });
});
