#!/usr/bin/env bash
set -e

APP_DIR="${1:-.}"
cd "$APP_DIR"

echo "==> Running full PWA validation suite in $(pwd)..."

echo "1/3 Typecheck..."
npx tsc --noEmit

echo "2/3 Unit & Storage tests (Vitest + fake-indexeddb)..."
npm test

echo "3/3 Production Build & Service Worker generation..."
npm run build

echo ""
echo "✅ All verification checks PASSED!"
