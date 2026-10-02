
# Stake High Roller Watcher (Dual Rules Active)

A 24/7 Node.js + Playwright watcher that monitors Stake's High Rollers table via Chrome DevTools Protocol (CDP) and sends instant Telegram alerts with two independent rules:

1. **RULE 1 — All Sports High Rollers**: Stake > $199,000 AND Decimal Odds > 1.50 (Soccer, Basketball, Tennis, Cricket, Baseball, etc.).
2. **RULE 2 — Pro Wrestling**: Every Pro Wrestling bet regardless of stake or odds, including WWE, AEW, Royal Rumble, Money in the Bank, WrestleMania, and championship markets.

> This project does not place bets or provide betting recommendations. It forwards detected High Roller information to Telegram.

## Notification Format (Exact 1–8 Sequence)

Notifications follow Naksh's exact field hierarchy:
`1. Sport/type → 2. Username → 3. Selection → 4. Event → 5. Market → 6. Stake → 7. Odds → 8. Time`

### Rule 1 Example (All Sports High Roller):
```text
🚨 HIGH ROLLER BET ALERT (Stake > $199K & Odds > 1.50)

1️⃣ Sport/Type: Soccer
2️⃣ Username: WhaleBettor
3️⃣ Selection: Real Madrid
4️⃣ Event: Real Madrid - Barcelona
5️⃣ Market: Match Winner
6️⃣ Stake: $250,000.00
7️⃣ Odds: 2.15
8️⃣ Time: 7:14 PM
⚡ Live Detected: 1:05:04 AM IST
🆔 Bet ID: 992817263
```

### Rule 2 Example (Pro Wrestling):
```text
🤼 PRO WRESTLING BET ALERT

1️⃣ Sport/Type: Pro Wrestling
2️⃣ Username: Hidden
3️⃣ Selection: Roman Reigns
4️⃣ Event: Money in the Bank 2026
5️⃣ Market: World Heavyweight Championship
6️⃣ Stake: ₹100,000.00
7️⃣ Odds: 1.10
8️⃣ Time: 7:14 PM
⚡ Live Detected: 12:44:15 AM IST
🆔 Bet ID: 881923145
```

## Qualification Examples

| Bet | Criteria Check | Alert Sent? |
|---|---|---|
| `$199,001` @ `1.51` (Soccer) | Stake > $199k & Odds > 1.50 | ✅ **YES** |
| `$250,000` @ `2.00` (Basketball) | Stake > $199k & Odds > 1.50 | ✅ **YES** |
| `$199,000` @ `2.00` (Tennis) | Stake not > $199k | ❌ **NO** |
| `$300,000` @ `1.50` (Cricket) | Odds not > 1.50 | ❌ **NO** |
| `$150,000` @ `3.00` (Hockey) | Stake not > $199k | ❌ **NO** |
| `$50` @ `1.05` (Pro Wrestling) | Pro Wrestling (Rule 2) | ✅ **YES** |
| `$250,000` @ `1.20` (Pro Wrestling) | Pro Wrestling (Rule 2) | ✅ **YES** |

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
