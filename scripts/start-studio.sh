#!/usr/bin/env bash
set -e

STUDIO_DIR="$HOME/pwa-factory/apps/pwa-studio"
PORT="${1:-4173}"

cd "$STUDIO_DIR"
if ! tmux has-session -t pwa-studio 2>/dev/null; then
  tmux new-session -d -s pwa-studio "cd '$STUDIO_DIR' && npm run dev -- --host 0.0.0.0 --port $PORT"
fi

echo "✅ Pocket PWA Studio running at http://127.0.0.1:$PORT"
termux-open-url "http://127.0.0.1:$PORT" 2>/dev/null || true
