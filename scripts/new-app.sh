#!/usr/bin/env bash
set -e

APP_NAME="$1"
if [ -z "$APP_NAME" ]; then
  echo "Usage: $0 <app-name>"
  exit 1
fi

BASE_DIR="$HOME/pwa-factory"
TARGET_DIR="$BASE_DIR/apps/$APP_NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: Directory $TARGET_DIR already exists."
  exit 1
fi

echo "==> Creating app '$APP_NAME' from mobile-pwa template..."
mkdir -p "$TARGET_DIR"
cp -r "$BASE_DIR/templates/mobile-pwa/"* "$TARGET_DIR/"
cp "$BASE_DIR/templates/mobile-pwa/.*" "$TARGET_DIR/" 2>/dev/null || true

# Customize app name in package.json & index.html
sed -i "s/\"mobile-pwa-starter\"/\"$APP_NAME\"/g" "$TARGET_DIR/package.json"
sed -i "s/<title>Pocket PWA<\/title>/<title>$APP_NAME<\/title>/g" "$TARGET_DIR/index.html"
sed -i "s/Pocket PWA/$APP_NAME/g" "$TARGET_DIR/src/App.tsx"

echo "==> Installing dependencies in $TARGET_DIR..."
cd "$TARGET_DIR"
npm install --silent

echo "==> Running initial test & build validation..."
npm test
npm run build

echo ""
echo "✅ App '$APP_NAME' created and validated successfully!"
echo "Location: $TARGET_DIR"
echo "To develop: cd $TARGET_DIR && npm run dev -- --host 0.0.0.0"
