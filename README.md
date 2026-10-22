# Workday 3

A small always-on-top Windows widget for your workday:

| | |
|---|---|
| ⏱ **Countdown** | Time until work starts, lunch, and home, with overtime pay |
| 🤖 **AI usage** | Remaining limits for Claude, Codex / ChatGPT and Antigravity |
| ☕ **Caffeine** | Keeps your PC awake during work hours |
| 🔔 **Break reminders** | A nudge to stand up every 30 minutes |
| 🎵 **Spotify** | Compact player, library browser and TWICE fan effects |

---

## Install

1. Download `WorkCountdownWidgetSetup.exe` from the [latest release](https://github.com/Skylimsk/work-countdown-widget/releases/latest).
2. Run it. The installer is unsigned, so Windows SmartScreen may ask you to confirm (**More info → Run anyway**).

**Requires:** Windows and Python on your PATH (for the Claude and Spotify helpers).

---

## The widget at a glance

| Button | What it does |
|---|---|
| 🎵 Music note | Open the Spotify library window |
| ☕ Cup | Turn Caffeine on/off |
| ▤ Layout | Switch between the full widget and **Clock only** |
| ⚙ Gear | Open Settings |
| – Minus | Hide to the tray |

**Tray menu:** Show widget · Settings · Spotify library · Caffeine keep-awake · Quit

**Layouts** (Settings → Appearance):

| Layout | Shows |
|---|---|
| AI carousel (default) | Countdown, Caffeine, AI cards, Spotify |
| Clock only | Just the time and the Caffeine row |
| Music focus | Countdown and a larger Spotify player, no AI cards |

---

## Features

### ⏱ Workday countdown

The clock counts down through three stages:

| Stage | Counts down to |
|---|---|
| **Start** | The start of your next workday |
| **Lunch** | Lunch starting, then lunch ending |
| **Home** | The end of your shift |

- Set work hours, lunch break and workdays in **Settings → Work & overtime**.
- Uses your local time zone. Overnight shifts (e.g. 22:00 – 06:00) are supported.

**Overtime:** after your shift, press **Start overtime** to see the pay earned so far.

```
hourly pay = hourly rate
             or monthly salary ÷ (workdays per month × hours per day)
overtime   = hours × hourly pay × multiplier (default 1.5×)
```

Currencies: MYR, USD, SGD, TWD, CNY.

### 🤖 AI usage cards

One card is shown at a time and rotates every 6 seconds. Hover to pause, or use the arrows/dots. Click a card header to collapse it.

| Card | Shows | Needs |
|---|---|---|
| **Claude** | 5-hour session and weekly limits | Signed in to Claude Desktop or Claude Code |
| **Codex / ChatGPT** | Your account's Codex limits (window lengths depend on your plan) | Codex desktop app installed and signed in |
| **Antigravity** | Gemini and Claude / GPT groups | Antigravity open (uses its local DevTools connection) |

Each card can be set to:

- **Follow running app** (default): shown only while that desktop app is open
- **Always show**
- **Hide**

If a refresh fails, the card keeps the last good reading and marks it **Cached**.

> **Claude is checked at most once every 5 minutes.** Anthropic rate-limits its usage endpoint, and this keeps the card from being blocked.

### ☕ Caffeine

Keeps Windows awake. It turns on automatically when your work hours start and off when they end (you can disable this).

| Mode | Prevents |
|---|---|
| System only | PC sleep (screen may turn off) |
| System and display *(default)* | PC sleep and screen off |
| Prevent idle lock | Also screen saver and lock, by sending an F15 key every 59 s |

- **Stop automatically:** at the end of the shift, after 30 / 60 / 120 minutes, or never.
- **Pause** when the screen is locked or on battery (both optional).
- **Mouse movement** is a separate option and is off by default.

> Staying awake does not guarantee you show as "online" in Teams or other chat apps.

### 🔔 Break reminders

A Windows notification every 30 minutes (adjustable, 5 – 180) reminds you to stand up and rest your eyes. Skipped while the screen is locked.

### 🎵 Spotify

**Compact player** (shown only while music is playing): play/pause, previous/next, shuffle, repeat, add the current song to the queue, and Up Next.

**Library window** (music-note button, tray, or Settings → Music → *Browse Spotify library*):

| Tab | You can |
|---|---|
| Playlists | Browse 50 at a time, filter by name, play on a chosen device |
| Liked Songs | Browse 50 at a time, search your whole library, play from any song, add songs to the queue |
| Artists | Search and play an artist |

Device switching and volume are in the same window. Opening the library never starts playback by itself.

**Requirements**

- Click **Connect Spotify** in Settings → Music. If you connected before, you may need to reconnect once to grant the newer playlist and library permissions.
- Playback control needs **Spotify Premium** and Spotify open on the selected device.

### 💗 TWICE themes and effects

- The widget takes on TWICE colors (Apricot and Neon Magenta) and member colors.
- Songs titled like `Song (SANA, JIHYO, TZUYU)` rotate through those members' colors every 3 seconds. English, Korean, Chinese and Japanese member names are recognised.
- Song effects: Feel Special roll call, One Spark fireworks, MISAMO confetti, Merry & Happy snow.
- Turn them off in **Settings → Music**, or turn on **Reduce motion**.

<details>
<summary>Member colors</summary>

Nayeon sky blue · Jeongyeon yellow-green · Momo pink · Sana purple · Jihyo orange · Mina mint green · Dahyun white · Chaeyoung red · Tzuyu blue

Sources: [JYP official notice (2016-09-23)](https://twice.jype.com/Mobile/NoticeView?AnSeq=5676&NoticeNumber=31), [Oricon](https://www.oricon.co.jp/special/69842/). On-screen colors are approximations.
</details>

---

## Settings

| Tab | Contains |
|---|---|
| Appearance | Theme (System / Dark / Light), layout, width, text size, opacity, AI rotation speed, always on top, reduce motion |
| Work & overtime | Work hours, lunch, workdays, overtime, pay and currency |
| Caffeine | Mode, auto-start, auto-stop, pause rules, mouse movement |
| AI workspace | Show/hide each card, card order, refresh interval, *Test connections* |
| Music & fan effects | Spotify on/off, artist themes, fan effects, connect/disconnect |
| System & alerts | Launch at startup, close to tray, break reminders |
| Diagnostics & backup | Connection details, export/import settings |

**Privacy:** everything stays on your PC. Settings are kept in your Windows user profile, sign-in secrets are encrypted by Windows when possible, and exported settings never include tokens.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Claude: *No valid Claude sign-in found* | Open Claude Desktop (or run `claude`) and sign in again |
| Claude shows **Cached** | The last refresh failed, so the last good reading is shown. If every sign-in is rate limited, the card says when it will retry |
| Codex card shows an error | Install the Codex desktop app and sign in |
| Antigravity card shows an error | Open Antigravity so its local connection is available |
| An AI card is missing | By default it follows its desktop app. Open the app, or set the card to **Always show** |
| Spotify buttons do nothing | Needs Spotify Premium and an active device. Open Spotify, then pick the device in the library |
| Spotify library shows a permission error | Reconnect Spotify in **Settings → Music** |

---

## Development

```bash
npm install
npm start                # run from source
npm test                 # unit tests
npm run test:ui          # Electron smoke test with sample data
npm run build            # → dist/win-unpacked/WorkCountdownWidget.exe
npm run build:installer  # → dist/installer/WorkCountdownWidgetSetup.exe
```

- `npm run build` first closes this project's own running build so its files are not locked.
- `npm run obfuscate` writes a separate copy to `dist/obfuscated`. Normal builds use `src` as is.
- Builds are unsigned. The icon and version info are set with `rcedit`.

**Tests**

| Command | Covers |
|---|---|
| `npm test` | Settings validation and migration, countdown stages and overnight shifts, Caffeine, Codex app detection, TWICE name parsing, Spotify services (fake HTTP) |
| `npm run test:ui` | A real Electron window in a temporary profile: AI cards, themes, layouts, settings, keep-awake, Spotify and TWICE effects. Screenshots go to `dist/verification`. No real accounts are used. |

**Project layout**

```
src/        App windows, services and AI providers
  core/     Settings, schedule, AI visibility, Caffeine, Spotify and TWICE logic
scripts/    Build, packaging and smoke-test scripts
tests/      Unit tests
```

<details>
<summary>How the Claude card finds your sign-in</summary>

1. Claude Desktop's data folder: `%LOCALAPPDATA%\Claude-Data\<package>` on current builds (the older `%APPDATA%\Claude` and package `LocalCache` folders are still checked).
2. Claude Code CLI: `~/.claude/.credentials.json`.

Expired tokens are skipped, and the token that last worked is tried first. Anthropic rate-limits each token separately: a token that gets *429 Too Many Requests* is put on hold for the time Anthropic asks (usually up to ~30 min) and the next token is tried. Revoked or under-scoped tokens are skipped for 6 hours.
</details>

<details>
<summary>Spotify API references</summary>

- [Current user's playlists](https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists)
- [Saved tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks)
- [Search](https://developer.spotify.com/documentation/web-api/reference/search)
- [Start playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Add to queue](https://developer.spotify.com/documentation/web-api/reference/add-to-queue)
</details>
