# Pocket PWA Software Factory

A mobile-first PWA software factory built to run directly on Android in Termux with `tmux` and the [Pi coding agent](https://pi.dev).

## What's Included

- **`templates/mobile-pwa/`** — Mobile-first Vite 6 + React 19 + TypeScript + Tailwind CSS + Dexie.js (IndexedDB) + Vite PWA (Workbox) starter template with Vitest + `fake-indexeddb` storage tests.
- **`apps/pwa-studio/`** — **Pocket PWA Studio**, a mobile PWA builder app for designing app blueprints, injecting curated UI/PWA resource presets (`shadcn/ui`, `shadcn-admin`, `Tweakcn`, `Motion Primitives`, `Dexie.js`, `Vite PWA`), and launching `tmux` + `pi` builds via a local Termux bridge or offline clipboard commands.
- **`apps/pwa-studio/public/architecture.html`** — Self-contained visual architecture explainer diagram.
- **`scripts/`**
  - `new-app.sh <slug>` — Scaffolds a new PWA, customizes metadata, installs dependencies, runs tests, and builds the production service worker.
  - `verify-app.sh [dir]` — Enforces the 3-stage verification gate (`tsc --noEmit`, `vitest run`, `vite build`).
  - `export-app.sh <slug>` — Builds and exports the static PWA distribution to `~/storage/downloads/PWA-Exports/<slug>`.
  - `start-studio.sh [port]` — Launches `pwa-studio` in a background `tmux` session and opens it in the Android browser.
- **`prompts/`** — Reusable Pi slash-command templates (`/pwa-new`, `/pwa-check`).
- **`research/inspiration.md`** — Research notes on spec-driven agent workflows and mobile PWA stacks.

## Quick Start on Android (Termux)

```bash
# Start Pocket PWA Studio on http://127.0.0.1:4173
~/pwa-factory/scripts/start-studio.sh

# Or scaffold a new PWA from the CLI
~/pwa-factory/scripts/new-app.sh my-app

# Run the verification gate
~/pwa-factory/scripts/verify-app.sh ~/pwa-factory/apps/my-app

# Export production build to Android Downloads
~/pwa-factory/scripts/export-app.sh my-app
```
