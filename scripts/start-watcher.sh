#!/usr/bin/env bash
# scripts/start-watcher.sh - Launch Watcher on macOS
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f ".env" ]; then
  echo "❌ .env file missing! Creating from .env.example..."
  cp .env.example .env
fi

echo "🔍 Checking Chrome CDP connection on port 9222..."
if ! curl -s "http://127.0.0.1:9222/json/version" > /dev/null; then
  echo "⚠️ Chrome is not running on port 9222."
  echo "👉 Starting Chrome now..."
  ./scripts/start-chrome.sh
  sleep 2
fi

echo "🚀 Starting MLB High Roller Watcher..."
npm start
