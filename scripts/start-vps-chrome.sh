#!/usr/bin/env bash
# scripts/start-vps-chrome.sh - Run Xvfb and Google Chrome with CDP on Linux VPS

# 1. Clean up any stale Xvfb locks or orphaned Chrome instances
pkill -9 -f "chrome" 2>/dev/null || true
pkill -9 -f "Xvfb :99" 2>/dev/null || true
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

# 2. Launch Xvfb (Virtual display :99)
Xvfb :99 -screen 0 1920x1080x24 -ac &
sleep 2

export DISPLAY=:99

echo "🚀 Starting Google Chrome on port 9222 under Xvfb display :99..."

# 3. Launch Google Chrome with remote debugging enabled
exec google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/root/.stake-chrome" \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --window-size=1920,1080 \
  "https://stake.jp/sports/high/all"
