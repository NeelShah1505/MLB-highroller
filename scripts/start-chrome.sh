#!/usr/bin/env bash
# scripts/start-chrome.sh - Launch Chrome with CDP for macOS
set -euo pipefail

CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
USER_DATA_DIR="$HOME/Library/Application Support/StakeHighRollerChrome"
PORT=9222
TARGET_URL="https://stake.jp/sports/high/all"

if [ ! -d "/Applications/Google Chrome.app" ]; then
  echo "❌ Google Chrome is not installed at /Applications/Google Chrome.app"
  exit 1
fi

echo "🚀 Launching Google Chrome on port $PORT..."
open -na "Google Chrome" --args \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "$TARGET_URL"

echo "✅ Chrome launched. Waiting for CDP port $PORT to be ready..."
sleep 2

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null; then
  echo "✅ CDP connection verified on port $PORT."
  echo "👉 Complete any Cloudflare check in Chrome if needed, then run: npm start"
else
  echo "⚠️ Chrome launched, but port $PORT is not answering yet. Check your Chrome window."
fi
