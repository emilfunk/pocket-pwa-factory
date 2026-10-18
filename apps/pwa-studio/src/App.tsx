import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  ensureSeedProjects,
  slugifyName,
  buildPiPrompt,
  buildCommands,
  RESOURCE_PRESETS,
  type PwaProject,
  type ArchetypeId
} from './lib/db';
import {
  Layers,
  Terminal,
  Sparkles,
  Plus,
  Play,
  CheckCircle2,
  Copy,
  Check,
  FolderGit2,
  PackageCheck,
  Trash2,
  Cpu,
  WifiOff,
  Radio,
  Wrench
} from 'lucide-react';

interface BridgeStatus {
  online: boolean;
  installedApps: string[];
  tmuxWindows: string[];
}

export default function App() {
  const projects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), []) || [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'blueprints' | 'resources' | 'console'>('blueprints');
  const [showNewModal, setShowNewModal] = useState(false);

  // Form state for new blueprint
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState<ArchetypeId>('tracker');
  const [accent, setAccent] = useState<'blue' | 'emerald' | 'violet' | 'amber'>('blue');
  const [summary, setSummary] = useState('');
  const [dbTables, setDbTables] = useState('items: ++id, title, status, createdAt');
  const [featuresText, setFeaturesText] = useState(
    'Offline-first CRUD with instant search\nSticky mobile header and bottom action bar\nJSON export backup'
  );
  const [uiPreset, setUiPreset] = useState(
    'Use shadcn/ui cards, 48px touch targets, and Tweakcn dark zinc tokens.'
  );
  const [tmuxSession, setTmuxSession] = useState('rho');

  // Bridge & execution state
  const [bridge, setBridge] = useState<BridgeStatus>({
    online: false,
    installedApps: [],
    tmuxWindows: []
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [consoleLog, setConsoleLog] = useState<string>(
    'Ready. Select a blueprint to copy commands or trigger Termux + tmux + Pi directly.'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    ensureSeedProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0 && selectedId === null) {
      setSelectedId(projects[0].id ?? null);
    }
  }, [projects, selectedId]);

  const refreshBridge = async () => {
    try {
      const res = await fetch('/api/factory/status');
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      setBridge({
        online: Boolean(data.ok),
        installedApps: data.installedApps || [],
        tmuxWindows: data.tmuxWindows || []
      });
    } catch {
      setBridge((prev) => ({ ...prev, online: false }));
    }
  };

  useEffect(() => {
    refreshBridge();
    const timer = setInterval(refreshBridge, 8000);
    return () => clearInterval(timer);
  }, []);

  const activeProject: PwaProject | undefined =
    projects.find((p) => p.id === selectedId) || projects[0];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    const slug = slugifyName(name);
    const id = await db.projects.add({
      name: name.trim(),
      slug,
      archetype,
      accent,
      summary: summary.trim() || `Mobile-first ${archetype} PWA built on Android.`,
      dbTables: dbTables.trim(),
      features: featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      uiPreset: uiPreset.trim(),
      tmuxSession: tmuxSession.trim() || 'rho',
      status: 'draft',
      createdAt: now,
      updatedAt: now
    });
    setSelectedId(id);
    setName('');
    setSummary('');
    setShowNewModal(false);
  };

  const handleDeleteProject = async (id?: number) => {
    if (!id) return;
    await db.projects.delete(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const injectPresetIntoActive = async (snippet: string) => {
    if (!activeProject?.id) return;
    const merged = activeProject.uiPreset.includes(snippet)
      ? activeProject.uiPreset
      : `${activeProject.uiPreset} ${snippet}`.trim();
    await db.projects.update(activeProject.id, {
      uiPreset: merged,
      updatedAt: Date.now()
    });
    setActiveTab('console');
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setConsoleLog(text);
    }
  };

  const runFactoryAction = async (
    action: 'scaffold' | 'tmux-pi' | 'verify' | 'export',
    project: PwaProject
  ) => {
    const cmds = buildCommands(project);
    if (!bridge.online) {
      const fallback =
        action === 'scaffold'
          ? cmds.scaffold
          : action === 'tmux-pi'
            ? cmds.tmuxPi
            : action === 'verify'
              ? cmds.verify
              : cmds.exportApkFolder;
      await copyText(action, fallback);
      setConsoleLog(
        `[Offline Mode] Copied ${action} command to clipboard:\n\n${fallback}`
      );
      setActiveTab('console');
      return;
    }

    setBusyAction(action);
    setActiveTab('console');
    setConsoleLog(`==> Running '${action}' for ${project.slug}...`);

    try {
      const res = await fetch('/api/factory/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          slug: project.slug,
          tmuxSession: project.tmuxSession || 'rho',
          prompt: buildPiPrompt(project)
        })
      });
      const data = await res.json();
      setConsoleLog(
        data.output || data.error || (data.ok ? 'Completed successfully.' : 'Action failed.')
      );
      if (data.ok && project.id) {
        const nextStatus =
          action === 'scaffold'
            ? 'scaffolded'
            : action === 'tmux-pi'
              ? 'building'
              : action === 'export'
                ? 'shipped'
                : project.status;
        await db.projects.update(project.id, {
          status: nextStatus,
          updatedAt: Date.now()
        });
      }
      await refreshBridge();
    } catch (err: any) {
      setConsoleLog(`Bridge error: ${err?.message || 'Failed to reach local Termux server'}`);
    } finally {
      setBusyAction(null);
    }
  };

  const cmds = activeProject ? buildCommands(activeProject) : null;
  const fullPrompt = activeProject ? buildPiPrompt(activeProject) : '';

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background text-foreground border-x border-border">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Pocket PWA Studio</h1>
            <p className="text-[11px] text-muted-foreground">tmux + Pi + Software Factory</p>
          </div>
        </div>

        <button
          onClick={refreshBridge}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition ${
            bridge.online
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-muted border-border text-muted-foreground'
          }`}
        >
          {bridge.online ? (
            <>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Termux Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Spec</span>
            </>
          )}
        </button>
      </header>

      {/* Compact KPI Strip */}
      <section className="grid grid-cols-3 gap-2 p-3 border-b border-border bg-card/40">
        <div className="bg-card border border-border rounded-xl p-2.5">
          <span className="text-[11px] text-muted-foreground block">Blueprints</span>
          <span className="text-lg font-bold">{projects.length}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-2.5">
          <span className="text-[11px] text-muted-foreground block">Apps on Disk</span>
          <span className="text-lg font-bold text-primary">{bridge.installedApps.length}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-2.5">
          <span className="text-[11px] text-muted-foreground block">tmux Windows</span>
          <span className="text-lg font-bold text-emerald-400">{bridge.tmuxWindows.length}</span>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 space-y-4 overflow-y-auto pb-24">
        {activeTab === 'blueprints' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PWA Blueprints
              </h2>
              <button
                onClick={() => setShowNewModal(!showNewModal)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-medium flex items-center gap-1.5 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                New App
              </button>
            </div>

            {showNewModal && (
              <form
                onSubmit={handleCreateProject}
                className="bg-card border border-primary/40 rounded-2xl p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">Create New PWA Blueprint</span>
                  <span className="text-[11px] text-muted-foreground">
                    slug: {slugifyName(name || 'my-pwa')}
                  </span>
                </div>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="App Name (e.g. Lift Log, Pocket Budget)"
                  className="w-full bg-muted px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={archetype}
                    onChange={(e) => setArchetype(e.target.value as ArchetypeId)}
                    className="bg-muted px-3 py-2.5 rounded-xl text-xs"
                  >
                    <option value="tracker">Tracker / Logger</option>
                    <option value="dashboard">KPI Dashboard</option>
                    <option value="notes">Offline Notes / Vault</option>
                    <option value="custom">Custom Utility</option>
                  </select>

                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value as any)}
                    className="bg-muted px-3 py-2.5 rounded-xl text-xs"
                  >
                    <option value="blue">Blue Accent</option>
                    <option value="emerald">Emerald Accent</option>
                    <option value="amber">Amber Accent</option>
                    <option value="violet">Violet Accent</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short description of what the app does..."
                  className="w-full bg-muted px-3.5 py-2 rounded-xl text-xs"
                />

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Dexie IndexedDB Table Schema
                  </label>
                  <input
                    type="text"
                    value={dbTables}
                    onChange={(e) => setDbTables(e.target.value)}
                    className="w-full bg-muted px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Key Features (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    className="w-full bg-muted px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    UI Resource Preset Guidance
                  </label>
                  <input
                    type="text"
                    value={uiPreset}
                    onChange={(e) => setUiPreset(e.target.value)}
                    className="w-full bg-muted px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tmuxSession}
                    onChange={(e) => setTmuxSession(e.target.value)}
                    placeholder="tmux session (rho)"
                    className="w-1/2 bg-muted px-3 py-2 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="w-1/2 min-h-[42px] bg-primary text-white rounded-xl text-xs font-semibold"
                  >
                    Save Blueprint
                  </button>
                </div>
              </form>
            )}

            {/* Blueprint Cards */}
            <div className="space-y-3">
              {projects.map((proj) => {
                const isSelected = proj.id === activeProject?.id;
                const onDisk = bridge.installedApps.includes(proj.slug);
                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedId(proj.id ?? null)}
                    className={`rounded-2xl border p-3.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-card border-primary ring-1 ring-primary/40'
                        : 'bg-card/60 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{proj.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {proj.slug}
                          </span>
                          {onDisk && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
                              on disk
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{proj.summary}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj.id);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-red-400"
                        aria-label="Delete blueprint"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 text-[11px] font-mono text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg truncate">
                      db: {proj.dbTables}
                    </div>

                    {/* Action Bar */}
                    <div className="grid grid-cols-2 gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={busyAction !== null}
                        onClick={() => runFactoryAction('scaffold', proj)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <FolderGit2 className="w-4 h-4 text-primary" />
                        1. Scaffold App
                      </button>

                      <button
                        disabled={busyAction !== null}
                        onClick={() => runFactoryAction('tmux-pi', proj)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <Play className="w-4 h-4" />
                        2. Build in tmux + Pi
                      </button>

                      <button
                        disabled={busyAction !== null}
                        onClick={() => runFactoryAction('verify', proj)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        3. Verify Gate
                      </button>

                      <button
                        disabled={busyAction !== null}
                        onClick={() => runFactoryAction('export', proj)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <PackageCheck className="w-4 h-4 text-amber-400" />
                        4. Export Dist
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Downloaded PWA Resource Presets
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved in ~/storage/downloads/pwa-resources. Tap to inject into{' '}
                <span className="text-foreground font-medium">
                  {activeProject?.name || 'your blueprint'}
                </span>
                .
              </p>
            </div>

            {RESOURCE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="bg-card border border-border rounded-2xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{preset.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {preset.repo}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{preset.bestFor}</p>
                <div className="text-[11px] bg-muted/60 p-2 rounded-lg text-muted-foreground">
                  “{preset.promptSnippet}”
                </div>
                <button
                  onClick={() => injectPresetIntoActive(preset.promptSnippet)}
                  className="w-full min-h-[42px] rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Inject into {activeProject?.slug || 'Active Spec'}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'console' && activeProject && cmds && (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  Active Target: {activeProject.name} ({activeProject.slug})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  tmux: {activeProject.tmuxSession}:{activeProject.slug}
                </span>
              </div>

              <pre className="text-[11px] font-mono bg-black/50 border border-border rounded-xl p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
                {consoleLog}
              </pre>
            </div>

            {/* One-tap Termux / tmux / Pi commands */}
            {[
              { key: 'scaffold', label: '1. Scaffold App in Factory', cmd: cmds.scaffold },
              { key: 'tmux', label: '2. Launch tmux + Pi Builder Agent', cmd: cmds.tmuxPi },
              { key: 'verify', label: '3. Run Verification Gate', cmd: cmds.verify },
              { key: 'export', label: '4. Export Production PWA to Downloads', cmd: cmds.exportApkFolder }
            ].map((item) => (
              <div
                key={item.key}
                className="bg-card border border-border rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{item.label}</span>
                  <button
                    onClick={() => copyText(item.key, item.cmd)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-muted text-xs flex items-center gap-1"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-muted/60 p-2.5 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">
                  {item.cmd}
                </pre>
              </div>
            ))}

            <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Generated Pi SPEC.md Prompt</span>
                <button
                  onClick={() => copyText('spec', fullPrompt)}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-muted text-xs flex items-center gap-1"
                >
                  {copiedKey === 'spec' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Spec
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-muted/60 p-2.5 rounded-xl overflow-x-auto whitespace-pre-wrap">
                {fullPrompt}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Mobile Navigation Bar (>=48px touch targets) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur border-t border-border grid grid-cols-3 p-1.5 z-20">
        <button
          onClick={() => setActiveTab('blueprints')}
          className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition ${
            activeTab === 'blueprints' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Blueprints</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition ${
            activeTab === 'resources' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Resources</span>
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition ${
            activeTab === 'console' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>tmux + Pi</span>
        </button>
      </nav>
    </div>
  );
}
