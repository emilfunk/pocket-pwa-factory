import Dexie, { type Table } from 'dexie';

export type ArchetypeId = 'tracker' | 'dashboard' | 'notes' | 'custom';

export interface PwaProject {
  id?: number;
  name: string;
  slug: string;
  archetype: ArchetypeId;
  accent: 'blue' | 'emerald' | 'violet' | 'amber';
  summary: string;
  dbTables: string;
  features: string[];
  uiPreset: string;
  tmuxSession: string;
  status: 'draft' | 'scaffolded' | 'building' | 'shipped';
  createdAt: number;
  updatedAt: number;
}

export interface ResourcePreset {
  id: string;
  name: string;
  category: 'template' | 'ui' | 'pwa' | 'motion';
  repo: string;
  bestFor: string;
  promptSnippet: string;
}

export const RESOURCE_PRESETS: ResourcePreset[] = [
  {
    id: 'shadcn-ui',
    name: 'shadcn/ui Mobile Blocks',
    category: 'ui',
    repo: 'shadcn-ui/ui',
    bestFor: 'Bottom sheets, cards, tabs, forms, clean mobile controls',
    promptSnippet: 'Use shadcn/ui style card, badge, tab, and dialog primitives with 48px touch targets.'
  },
  {
    id: 'shadcn-admin',
    name: 'Shadcn Admin KPI Layout',
    category: 'template',
    repo: 'satnaing/shadcn-admin',
    bestFor: 'Compact KPI cards, filterable lists, settings drawers',
    promptSnippet: 'Adapt satnaing/shadcn-admin KPI summary cards and filter bars into a single-column 360px mobile layout.'
  },
  {
    id: 'tweakcn',
    name: 'Tweakcn Theme Tokens',
    category: 'ui',
    repo: 'jnsahaj/tweakcn',
    bestFor: 'High-contrast dark mode & cohesive semantic color tokens',
    promptSnippet: 'Use semantic CSS/Tailwind tokens (background, card, primary, muted, border) with crisp dark-mode contrast.'
  },
  {
    id: 'motion-primitives',
    name: 'Motion Primitives',
    category: 'motion',
    repo: 'ibelick/motion-primitives',
    bestFor: 'Subtle micro-interactions and list transitions',
    promptSnippet: 'Use subtle, battery-friendly transitions and respect prefers-reduced-motion.'
  },
  {
    id: 'dexie-offline',
    name: 'Dexie Offline-First Store',
    category: 'pwa',
    repo: 'dexie/Dexie.js',
    bestFor: 'IndexedDB reactive queries + JSON backup/restore',
    promptSnippet: 'Store all user records in Dexie IndexedDB with useLiveQuery, plus JSON export/import backup.'
  },
  {
    id: 'vite-pwa',
    name: 'Vite PWA + Workbox',
    category: 'pwa',
    repo: 'vite-pwa/vite-plugin-pwa',
    bestFor: 'Installable manifest, offline asset precache, sw.js',
    promptSnippet: 'Ensure manifest.webmanifest, offline asset precaching, and mobile standalone viewport meta tags stay intact.'
  }
];

export function slugifyName(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'my-pwa'
  );
}

export function buildPiPrompt(project: PwaProject): string {
  const featureList = project.features.length
    ? project.features.map((f) => `- ${f}`).join('\n')
    : '- Offline CRUD with instant search and JSON export';

  return [
    `Build and verify the mobile-first PWA "${project.name}" (${project.slug}) in ~/pwa-factory/apps/${project.slug}.`,
    '',
    `## App Summary`,
    project.summary || 'Fast offline-first mobile utility app.',
    '',
    `## Data Model (Dexie IndexedDB in src/lib/db.ts)`,
    project.dbTables || 'items: ++id, title, category, createdAt',
    '',
    `## Key Features`,
    featureList,
    '',
    `## UI & Resource Direction`,
    `- Archetype: ${project.archetype} (${project.accent} accent)`,
    `- Preset guidance: ${project.uiPreset}`,
    `- Mobile-first 360px layout, sticky top bar, bottom action dock, >=48px touch targets, zero horizontal overflow.`,
    '',
    `## Required Verification Gate`,
    `1. Update src/lib/db.ts and src/lib/db.test.ts with unit tests covering the schema.`,
    `2. Implement the responsive UI in src/App.tsx.`,
    `3. Run ~/pwa-factory/scripts/verify-app.sh ~/pwa-factory/apps/${project.slug} and fix any errors until typecheck, Vitest, and Vite PWA build all pass.`
  ].join('\n');
}

export function buildCommands(project: PwaProject) {
  const slug = slugifyName(project.slug || project.name);
  const session = project.tmuxSession || 'rho';
  const appDir = `~/pwa-factory/apps/${slug}`;
  const escapedPrompt = buildPiPrompt(project).replace(/"/g, '\\"').replace(/\$/g, '\\$');

  return {
    scaffold: `~/pwa-factory/scripts/new-app.sh ${slug}`,
    tmuxPi: `tmux new-session -A -s ${session} -n ${slug} "cd ${appDir} || (~/pwa-factory/scripts/new-app.sh ${slug} && cd ${appDir}); pi \\"${escapedPrompt}\\"; exec bash"`,
    devServer: `cd ${appDir} && npm run dev -- --host 0.0.0.0`,
    verify: `~/pwa-factory/scripts/verify-app.sh ${appDir}`,
    exportApkFolder: `~/pwa-factory/scripts/export-app.sh ${slug}`
  };
}

export class StudioDatabase extends Dexie {
  projects!: Table<PwaProject, number>;

  constructor() {
    super('PocketPwaStudioDB');
    this.version(1).stores({
      projects: '++id, slug, name, archetype, status, updatedAt'
    });
  }
}

export const db = new StudioDatabase();

export async function ensureSeedProjects() {
  const count = await db.projects.count();
  if (count > 0) return;

  const now = Date.now();
  await db.projects.bulkAdd([
    {
      name: 'Crate Diggger',
      slug: 'crate-digger',
      archetype: 'tracker',
      accent: 'amber',
      summary: 'Vinyl record wishlist, crate notes, pressing rating, and offline shop checklist.',
      dbTables: 'records: ++id, artist, album, label, price, wanted, createdAt',
      features: [
        'Quick add record with artist, album, price, and wantlist toggle',
        'Filter by Wanted vs Owned and search offline',
        'One-tap JSON backup export'
      ],
      uiPreset: 'Use shadcn/ui cards, amber accent badges, and a sticky bottom quick-add bar.',
      tmuxSession: 'rho',
      status: 'draft',
      createdAt: now - 3600_000,
      updatedAt: now - 3600_000
    },
    {
      name: 'Pulse Habit Log',
      slug: 'pulse-habits',
      archetype: 'dashboard',
      accent: 'emerald',
      summary: 'Daily streak tracker and quick check-in dashboard with offline IndexedDB history.',
      dbTables: 'habits: ++id, title, streak, lastDoneDate, createdAt',
      features: [
        'KPI summary strip for today completion and best streak',
        'One-tap daily completion toggle with streak counter',
        'Offline persistence with reset & export options'
      ],
      uiPreset: 'Adapt satnaing/shadcn-admin KPI cards into a compact mobile grid with emerald highlights.',
      tmuxSession: 'rho',
      status: 'draft',
      createdAt: now,
      updatedAt: now
    }
  ]);
}
