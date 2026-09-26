# MLB High Roller Watcher 10/10 Architecture & Resilience Design

## 1. Overview
The MLB High Roller Watcher connects to a live Google Chrome session running with remote debugging (`--remote-debugging-port=9222`) over the Chrome DevTools Protocol (CDP), monitors Stake's High Rollers feed (`https://stake.jp/sports/high/all`) every 2,000ms (2 seconds), filters for baseball player props, deduplicates events, logs them to `data/bets.jsonl`, and instantly sends formatted alerts to Telegram.

This design upgrades the codebase to **production-grade (10/10)** reliability and developer experience while **strictly preserving the exact detection and filtering logic**.

## 2. Core Constraints & Guarantees
- **No alterations to detection logic:**
  - Sport check: `looksBaseball(r)` matches `Baseball` icon or text containing `baseball`/`mlb`.
  - Player prop heuristic: `looksPlayerProp(r)` ignores `multi` and hyphenated team matchups `/\s[-–—]\s/`.
  - Polling interval: Configurable via `POLL_MS` (default 2000ms).
- **Zero data loss on alert dispatch:** Retries on network blips and handles Telegram 429 rate limits.
- **Resilient to Chrome restarts:** Auto-reconnects over CDP instead of crashing.
- **Zero duplicate notifications on restart:** Seeds the in-memory deduplication set from existing `data/bets.jsonl` entries on startup.

## 3. Architecture & Components

```
+-------------------------------------------------------------+
|                      Google Chrome                          |
|             (Live session on port 9222)                     |
|           https://stake.jp/sports/high/all                  |
+------------------------------+------------------------------+
                               | CDP WebSocket
                               v
+-------------------------------------------------------------+
|                 MLB High Roller Watcher                     |
|                                                             |
|  +------------------------+      +------------------------+ |
|  |     CDP Connection     | <--> |   DOM Row Extractor    | |
|  |   & Auto-Reconnect     |      |    (every 2000ms)      | |
|  +------------------------+      +-----------+------------+ |
|                                              |              |
|                                              v              |
|                                  +------------------------+ |
|                                  |   Detection Logic      | |
|                                  | (looksBaseball/Prop)   | |
|                                  +-----------+------------+ |
|                                              |              |
|                                              v              |
|  +------------------------+      +------------------------+ |
|  |    Storage / JSONL     | <--- |   Deduplication Set    | |
|  |    (data/bets.jsonl)   |      |  (Memory + Disk Sync)  | |
|  +------------------------+      +-----------+------------+ |
|                                              |              |
|                                              v              |
|                                  +------------------------+ |
|                                  |  Telegram Alert Dispatch|
|                                  |   (Retries + Markdown) | |
|                                  +-----------+------------+ |
|                                              |              |
+----------------------------------------------|--------------+
                                               v Telegram API
                                   +------------------------+
                                   |   User's Telegram Bot  |
                                   |      (Instant Alert)   |
                                   +------------------------+
```

### Component Breakdown

1. **Browser Connection Manager (`src/browser.js` / integrated in `src/index.js`):**
   - Connects to `CDP_URL` (`http://127.0.0.1:9222`).
   - If connection fails or disconnects (target closed, browser restart, network disconnect), it attempts reconnection with exponential backoff (e.g., 2s, 4s, 8s up to 15s) and logs clean reconnect status messages.
   - Detects the active High Rollers page tab or navigates to `STAKE_URL`.

2. **Deduplication Engine & Storage:**
   - On startup, loads up to 5,000 recent bet IDs from `data/bets.jsonl` into memory.
   - Newly discovered bets are added to the memory set and appended to `data/bets.jsonl` atomically.
   - Purges keys older than 6 hours when the map exceeds 5,000 entries.

3. **Telegram Dispatcher:**
   - Validates bot token and chat ID at boot with a silent `getMe` check.
   - Formats messages with Markdown for readability (bold tags, clean alignment, timestamp).
   - Handles HTTP 429 (`parameters.retry_after`) and network failures with automatic retry.

4. **Heartbeat & Telemetry:**
   - Every 60 seconds (or 30 poll cycles), logs a concise 1-line health check to the console:
     `[16:15:00] [HEALTHY] Polls: 150 | Matches: 2 | Errors: 0 | Chrome: Connected | Telegram: OK`

5. **macOS & Linux Shell Scripts:**
   - `scripts/start-chrome.sh`: Launches dedicated Chrome with remote debugging on port 9222 detached in the background with `open -na` or background process, avoiding terminal log pollution.
   - `scripts/start-watcher.sh`: Verifies `.env` exists, checks port 9222, and runs `npm start`.

## 4. Continuous 24/7 Running Strategy
To keep the watcher running 24/7 on macOS:
1. **Sleep Prevention:** Use macOS `caffeinate -disu` or configure system energy settings to keep network active while on AC power.
2. **Process Manager:** Support running under **PM2** (`pm2 start src/index.js --name mlb-highroller`) for automatic process restarts on crashes or reboots.
3. **Graceful Shutdown:** Intercepts `SIGINT` and `SIGTERM` to close browser CDP connections cleanly without orphan processes.

## 5. Testing & Verification Plan
1. **CDP Connection Test:** Run against active Chrome port 9222.
2. **Deduplication Persistence Test:** Restart watcher and verify no duplicate notifications for already logged rows.
3. **Telegram Transmission Test:** Verify Telegram alerts are delivered formatted and within <1s of bet appearance.
4. **Resilience Test:** Temporarily disconnect or minimize Chrome and verify watcher automatically reconnects without crashing.
