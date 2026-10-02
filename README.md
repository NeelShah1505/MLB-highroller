
# Stake High Roller — Tennis Watcher

A resilient Node.js + Playwright watcher that monitors Stake's High Rollers table via Chrome DevTools Protocol (CDP) and sends instant Telegram alerts for **Tennis High Roller bets only**.

> This project does not place bets or provide betting recommendations. It forwards detected High Roller information to Telegram.

## What it does

For each newly detected Tennis High Roller bet, the watcher dispatches:

- 👤 User: Username (or `Hidden`)
- 🎾 Event: Tournament / Player match
- 💰 Amount: Bet amount in original currency
- 📈 Odds: Decimal odds
- 🕐 Time: Timestamp shown on Stake
- 🆔 Bet ID: Extracted from detail modal (when `PREVIEW_DETAILS=true`)

The watcher polls every 1000ms by default (`POLL_MS=1000`). Existing rows present when the process starts are seeded during initial sync to prevent spamming Telegram with historical bets.

## Tennis Detection Logic

The watcher strictly isolates Tennis bets:
- Matches sport icon `data-ds-icon="Tennis"`.
- Explicitly rejects non-tennis sports (Soccer, Basketball, Cricket, Baseball, Ice Hockey, Specials/Wrestling, etc.).
- Explicitly rejects **Table Tennis** (`TableTennis`).
- Explicitly rejects **Multi bets** (`BetMulti`, `Multi (x)`).

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

PLAYER_PROPS_ONLY=true
PREVIEW_DETAILS=true

STAKE_URL=https://stake.jp/sports/high/all
TARGET_SPORT=tennis
DEBUG=true
LOG_FILE=data/bets.jsonl
```

## Notification Example

```text
🎾 TENNIS HIGH ROLLER

👤 User: Hidden
🎾 Event: Valentin Royer
💰 Amount: ₹67,425.00
📈 Odds: 2.15
🕐 Time: 10:24 AM
🆔 Bet ID: 661868490
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
