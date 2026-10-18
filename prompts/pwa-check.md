---
description: Validate tests, types, and production build for a PWA
argument-hint: "[app-name]"
---
Validate the current PWA project:
1. Run `~/pwa-factory/scripts/verify-app.sh ${1:-.}`
2. Ensure all TypeScript checks, Dexie DB tests, and Vite build output pass without warnings.
