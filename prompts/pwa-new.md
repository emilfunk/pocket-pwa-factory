---
description: Scaffold and build a new mobile PWA in the factory
argument-hint: "<app-name>"
---
Scaffold a new PWA using the factory template:
1. Run `~/pwa-factory/scripts/new-app.sh $1`
2. Update the Dexie DB schema in `~/pwa-factory/apps/$1/src/lib/db.ts` to match requirements
3. Build the UI in `~/pwa-factory/apps/$1/src/App.tsx`
4. Run `~/pwa-factory/scripts/verify-app.sh ~/pwa-factory/apps/$1`
