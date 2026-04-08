#!/bin/bash
# Sync web assets into iOS bundle Web/ folder
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$SCRIPT_DIR/Youbike/Youbike/Web"

rm -rf "$WEB_DIR"
mkdir -p "$WEB_DIR"

[ -f "$ROOT_DIR/index.html" ] && cp "$ROOT_DIR/index.html" "$WEB_DIR/index.html"
mkdir -p "$WEB_DIR/js"
[ -f "$ROOT_DIR/js/common.js" ] && cp "$ROOT_DIR/js/common.js" "$WEB_DIR/js/common.js"
mkdir -p "$WEB_DIR/js"
[ -f "$ROOT_DIR/js/ubike.js" ] && cp "$ROOT_DIR/js/ubike.js" "$WEB_DIR/js/ubike.js"
mkdir -p "$WEB_DIR/js"
[ -f "$ROOT_DIR/js/bottom-sheet.js" ] && cp "$ROOT_DIR/js/bottom-sheet.js" "$WEB_DIR/js/bottom-sheet.js"
[ -f "$ROOT_DIR/sw.js" ] && cp "$ROOT_DIR/sw.js" "$WEB_DIR/sw.js"
[ -f "$ROOT_DIR/manifest.webapp" ] && cp "$ROOT_DIR/manifest.webapp" "$WEB_DIR/manifest.webapp"
[ -f "$ROOT_DIR/favicon.ico" ] && cp "$ROOT_DIR/favicon.ico" "$WEB_DIR/favicon.ico"
mkdir -p "$WEB_DIR/img/"
cp -r "$ROOT_DIR/img/"* "$WEB_DIR/img/"

echo "iOS Web assets synced."
