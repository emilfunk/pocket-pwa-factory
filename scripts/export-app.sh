#!/usr/bin/env bash
set -e

APP_NAME="$1"
if [ -z "$APP_NAME" ]; then
  echo "Usage: $0 <app-name>"
  exit 1
fi

APP_DIR="$HOME/pwa-factory/apps/$APP_NAME"
EXPORT_DIR="$HOME/storage/downloads/PWA-Exports/$APP_NAME"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: App $APP_DIR does not exist."
  exit 1
fi

echo "==> Building fresh production distribution..."
cd "$APP_DIR"
npm run build

echo "==> Exporting to $EXPORT_DIR..."
mkdir -p "$EXPORT_DIR"
cp -r "$APP_DIR/dist/"* "$EXPORT_DIR/"

echo "✅ App exported to Android Downloads: $EXPORT_DIR"
