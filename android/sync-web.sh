#!/bin/bash
# Sync web assets into Android assets folder
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$SCRIPT_DIR/app/src/main/assets"

rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

[ -f "$ROOT_DIR/index.html" ] && cp "$ROOT_DIR/index.html" "$ASSETS_DIR/index.html"
mkdir -p "$ASSETS_DIR/js"
[ -f "$ROOT_DIR/js/common.js" ] && cp "$ROOT_DIR/js/common.js" "$ASSETS_DIR/js/common.js"
mkdir -p "$ASSETS_DIR/js"
[ -f "$ROOT_DIR/js/ubike.js" ] && cp "$ROOT_DIR/js/ubike.js" "$ASSETS_DIR/js/ubike.js"
mkdir -p "$ASSETS_DIR/js"
[ -f "$ROOT_DIR/js/bottom-sheet.js" ] && cp "$ROOT_DIR/js/bottom-sheet.js" "$ASSETS_DIR/js/bottom-sheet.js"
[ -f "$ROOT_DIR/sw.js" ] && cp "$ROOT_DIR/sw.js" "$ASSETS_DIR/sw.js"
[ -f "$ROOT_DIR/manifest.webapp" ] && cp "$ROOT_DIR/manifest.webapp" "$ASSETS_DIR/manifest.webapp"
[ -f "$ROOT_DIR/favicon.ico" ] && cp "$ROOT_DIR/favicon.ico" "$ASSETS_DIR/favicon.ico"
mkdir -p "$ASSETS_DIR/img/"
cp -r "$ROOT_DIR/img/"* "$ASSETS_DIR/img/"

echo "Android assets synced."
