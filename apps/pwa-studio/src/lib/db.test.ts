import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  ensureSeedProjects,
  slugifyName,
  buildPiPrompt,
  buildCommands,
  RESOURCE_PRESETS
} from './db';

describe('Pocket PWA Studio DB & Factory Generators', () => {
  beforeEach(async () => {
    await db.projects.clear();
  });

  it('seeds starter PWA blueprints into Dexie IndexedDB', async () => {
    await ensureSeedProjects();
    const all = await db.projects.toArray();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((p) => p.slug === 'crate-digger')).toBe(true);
  });

  it('slugifies app names cleanly and builds tmux + Pi + factory commands', async () => {
    const slug = slugifyName('My Awesome Tracker!');
    expect(slug).toBe('my-awesome-tracker');

    const proj = {
      name: 'My Awesome Tracker!',
      slug,
      archetype: 'tracker' as const,
      accent: 'blue' as const,
      summary: 'Offline workout and habit logger',
      dbTables: 'logs: ++id, exercise, reps, createdAt',
      features: ['Fast log entry', 'Offline search'],
      uiPreset: RESOURCE_PRESETS[0].promptSnippet,
      tmuxSession: 'rho',
      status: 'draft' as const,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const prompt = buildPiPrompt(proj);
    expect(prompt).toContain('~/pwa-factory/apps/my-awesome-tracker');
    expect(prompt).toContain('logs: ++id, exercise, reps, createdAt');

    const cmds = buildCommands(proj);
    expect(cmds.scaffold).toBe('~/pwa-factory/scripts/new-app.sh my-awesome-tracker');
    expect(cmds.tmuxPi).toContain('tmux new-session -A -s rho -n my-awesome-tracker');
    expect(cmds.verify).toBe('~/pwa-factory/scripts/verify-app.sh ~/pwa-factory/apps/my-awesome-tracker');
    expect(cmds.exportApkFolder).toBe('~/pwa-factory/scripts/export-app.sh my-awesome-tracker');
  });
});
