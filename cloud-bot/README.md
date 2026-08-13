# Cloud Bot

Standalone 24/7 Telegram bot for AI Quota. Independent Node service — deploy
it once, and it keeps answering `/quota`, `/code`, `/normal` and sending
low-quota alerts even when your PC and the desktop widget are off.

It does **not** fetch quota itself — it only knows what the widget last
pushed to it. Claude's OAuth token, Antigravity's local DevTools session, and
Cursor's cookie all only make sense on your PC, so the PC has to keep doing
the actual fetching and push the result here.

## How it fits together

```
PC (widget)  --push every ~60s-->  Cloud Bot (this folder)  <--/quota-->  Telegram
```

## Deploy (Railway / Render / Fly.io — same idea on all three)

1. Push this repo to GitHub if it isn't already (or deploy just the
   `cloud-bot/` subfolder if your platform supports subdirectory deploys).
2. Create a new service on your chosen platform, pointing at this folder
   (`cloud-bot/`) as the root/start directory.
3. Set these environment variables on the platform (copy from `.env.example`):
   - `TELEGRAM_BOT_TOKEN` — from @BotFather. If reusing the token currently
     hardcoded in `../telegramBotService.js`, consider rotating it via
     @BotFather first since it's been sitting in plaintext in the repo.
   - `TELEGRAM_CHAT_ID` — your allowed chat id (`5036217952` in the existing
     local bot, if you want to keep using the same chat).
   - `PUSH_SECRET` — generate a long random string, e.g. `openssl rand -hex 32`.
   - `LOW_QUOTA_THRESHOLD` — optional, defaults to `20` (percent).
   - `PORT` — most platforms set this automatically; leave unset unless
     testing locally.
4. Deploy. Build command: none needed beyond `npm install`. Start command:
   `npm start` (already in `package.json`).
5. Once it's up, hit `GET https://your-app.example/health` — should return
   `{"ok":true,"lastSyncAt":null}` (null until the PC pushes for the first time).

## Point the widget at it

In the widget's Settings panel:
- Check **"Use Cloud Bot (24/7, PC can be off)"**
- **Cloud Bot URL**: the deployed URL (e.g. `https://your-app.up.railway.app`)
- **Cloud Bot Secret**: the same string you set as `PUSH_SECRET` above

Enabling cloud mode stops the widget's own local Telegram polling (it hands
the bot token over to this service) — see `cloudSync.js` and the
`toggle-cloud-bot-mode` handler in `main.js` for how that handoff works. Two
pollers on the same bot token would otherwise fight and Telegram returns
`409 Conflict`.

## Local testing

```bash
cd cloud-bot
cp .env.example .env   # fill in the values
npm install
npm start
```

Then simulate a push from another terminal:
```bash
curl -X POST http://localhost:3000/api/quota/push \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_PUSH_SECRET","snapshot":{"providers":{"claude":{"provider":"claude","type":"code","status":"ok","metrics":{"session":{"used":29,"remaining":71,"resetAt":"2026-08-12T10:50:00Z"}},"updatedAt":"2026-08-12T08:00:00Z","source":"anthropic_oauth_api","error":null}},"updatedAt":"2026-08-12T08:00:00Z"}}'
```

Then message your bot `/quota`, `/code`, or `/normal` on Telegram.

## What's real vs placeholder right now

- Claude, Antigravity, Cursor: real data, once the PC pushes it.
- Codex, Gemini CLI: architecturally wired in, but neither tool is installed
  on the dev machine this was built on — they'll report `not_authenticated`
  until you install them and the credential-file paths in
  `../providers/codex.js` / `../providers/gemini_cli.js` get verified against
  a real install.
- ChatGPT / Gemini Web / Claude Web / Perplexity ("Normal AI"): pure
  placeholders (`not_configured`). None of these products have an official
  subscription usage API — getting real numbers would mean scraping each
  one's internal web session via a manually pasted cookie, which was
  explicitly deferred rather than built.
