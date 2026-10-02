
# Stake High Roller — Pro Wrestling Watcher

A 24/7 Node.js + Playwright watcher that monitors Stake's High Rollers table via Chrome DevTools Protocol (CDP) and sends instant Telegram alerts for **Pro Wrestling High Roller bets only**, including championship and special event markets.

> This project does not place bets or provide betting recommendations. It forwards detected High Roller information to Telegram.

## What it does

For each newly detected Pro Wrestling High Roller bet, the watcher dispatches:

- 👤 User: Username (or `Hidden`)
- 🎯 Selection: Wrestler / Winner / Selection
- 🏆 Event: Event name (e.g. Royal Rumble, WrestleMania, Money in the Bank)
- 📊 Market: Market name (e.g. World Heavyweight Championship, Match Winner)
- 📈 Odds: Decimal odds
- 💰 Stake: Bet amount
- 🕐 Stake Time: Timestamp shown on Stake
- ⚡ Live Detected: Real-time IST timestamp
- 🆔 Bet ID: Extracted from detail modal (when `PREVIEW_DETAILS=true`)

The watcher polls every 1000ms by default (`POLL_MS=1000`). Existing rows present when the process starts are seeded during initial sync to prevent spamming Telegram with historical bets.

## Pro Wrestling Detection Logic

The watcher captures all Pro Wrestling bets:
- **Sport-Level Detection**: Matches `Pro Wrestling`, `Wrestling`, `WWE`, or `AEW` icons / sport attributes.
- **Event-Only Rows**: Detects rows even if the visible text only says `Pro Wrestling`.
- **Special / Championship Markets**: Captures `Money in the Bank`, `Royal Rumble Match Winner`, `World Heavyweight Championship`, `WrestleMania`, etc.
- **Wrestler Selections**: Matches individual wrestler names without requiring the word "wrestling".
- **Strict Isolation**: Explicitly ignores all other sports (Soccer, Basketball, Cricket, Baseball, Ice Hockey, Tennis, Table Tennis, Multi bets, etc.).

## Requirements

- Linux (Ubuntu 22.04/24.04 LTS VPS recommended) or macOS / Windows 10/11
- Node.js LTS (v18+)
- Google Chrome / Chromium with remote debugging port (`--remote-debugging-port=9222`)
- Telegram bot token and chat ID

## Installation

```bash
npm install
npm test
```

## Configuration

Configure `.env` (copy from `.env.example`):

```dotenv
CDP_URL=http://127.0.0.1:9222
POLL_MS=1000

TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=8957540925:AAEMwVj0M7J7bNFeFyRck3Ncsd840FIsvKg
TELEGRAM_CHAT_ID=5167354900

PREVIEW_DETAILS=true
TARGET_SPORT=wrestling

STAKE_URL=https://stake.jp/sports/high/all
DEBUG=true
LOG_FILE=data/bets.jsonl
```

## Notification Example

```text
🤼 PRO WRESTLING HIGH ROLLER

👤 User: Hidden
🎯 Selection: Roman Reigns
🏆 Event: Money in the Bank 2026
📊 Market: World Heavyweight Championship
📈 Odds: 1.10
💰 Stake: ₹100,000.00
🕐 Stake Time: 7:14 PM
⚡ Live Detected: 12:44:15 AM IST
🆔 Bet ID: 881923145
```

## Running 24/7 Continuously

To keep the watcher running uninterrupted without sleep issues:

### 1. Prevent Mac Sleep (while on AC power)
In a separate terminal or background, run:
```bash
caffeinate -disu &
```
*(This prevents macOS from sleeping display or system idle while plugged in).*

### 2. Using PM2 (Recommended for 24/7 uptime)
Install PM2 globally if not installed:
```bash
npm install -g pm2
```
Start the watcher as a background daemon:
```bash
pm2 start src/index.js --name mlb-highroller
pm2 save
```
Manage:
- View live logs: `pm2 logs mlb-highroller`
- Status: `pm2 status`
- Stop: `pm2 stop mlb-highroller`

## Useful commands

```bash
npm install
npm test
npm run setup-telegram
npm start
```

## Troubleshooting

### npm is not recognized
Install Node.js LTS, close the terminal, open a new terminal, then retry.

### Chrome is not detected
Make sure the dedicated Chrome window was started with `--remote-debugging-port=9222` and remains open.

### Stake asks for human verification
Complete the verification normally in Chrome. Do not attempt to automate or bypass it.

### Telegram says no chat was found
Open the bot itself in Telegram, send `/start`, then run `npm run setup-telegram` again.

### No notifications
Check that `Telegram: enabled` appears, that a new candidate appears after `Initial sync complete`, and that both Chrome and `npm start` remain running.

## Project structure

```text
MLB-highroller/
├── src/
│   ├── index.js
│   ├── inspect.js
│   └── setup-telegram.js
├── scripts/
│   ├── start-chrome.bat
│   └── start-watcher.bat
├── data/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Security

Do not commit:

- Telegram bot tokens
- `.env`
- Stake credentials
- Browser cookies/session data
- Exported Chrome profiles
- Private account data

The repository ignores `.env`, `node_modules`, and JSONL logs.

## Disclaimer

This is a notification/monitoring utility. It is not financial advice, sports-betting advice, or a guarantee of any outcome. Use it in accordance with applicable laws and platform rules.
