# ⏱️ Work Countdown & Universal AI Quota Widget (v2.0.1)

[![GitHub Release](https://img.shields.io/github/v/release/Skylimsk/work-countdown-widget?color=10b981&style=for-the-badge)](https://github.com/Skylimsk/work-countdown-widget/releases/tag/v2.0.1)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078d4?style=for-the-badge&logo=windows)](https://github.com/Skylimsk/work-countdown-widget/releases/download/v2.0.1/WorkCountdownWidgetSetup.exe)
[![License](https://img.shields.io/badge/License-MIT-6366f1?style=for-the-badge)](LICENSE)

A sleek, floating, non-intrusive desktop widget built with Electron. It combines **work end-time countdowns**, **overtime (OT) pay calculators**, **real-time AI model quota monitoring**, **theme-adaptive Spotify controls**, and **smart health rest reminders**.

> 💡 **Designed for developers, creators, and remote workers who want complete control over their workday productivity and AI usage.**

---

👉 **[⬇️ Download Latest Installer: WorkCountdownWidgetSetup.exe (v2.0.1)](https://github.com/Skylimsk/work-countdown-widget/releases/download/v2.0.1/WorkCountdownWidgetSetup.exe)**

---

## ✨ Key Features & Capabilities

### ⏱️ Workday & Overtime (OT) Pay Tracking
- **Precision Countdown**: Real-time countdown to work end time and lunch breaks.
- **OT Pay Calculator**: Live calculation of extra earnings during overtime based on your monthly or hourly rate and OT multipliers ($1.5\times$, $2.0\times$).
- **Lunch Break Mode**: Automatic phase switching (Work 💻 → Lunch 🍱 → Work 💻 → Party Time 🎉).

## 🚀 What's New in v2.0.1 (Major Release)

- **🔄 AutoStart Registry Sync**: Automatically registers the latest executable path in Windows Registry (`setLoginItemSettings`) upon launch or update.
- **🎵 Standalone Spotify Control (Login Required)**: Connects via Spotify OAuth Web API. Control playback on your phone, tablet, smart speaker, or web player without running the Spotify desktop exe! Simply click **Login with Spotify** in the Settings panel to authenticate your account.
- **🌐 Offline Protection (Without Internet)**: Handles network disconnections gracefully—removes quota cards and web services smoothly without crashing or showing corrupted UI.
- **⚡ 12s Extreme Real-Time Quota Polling**: High-frequency polling updates AI remaining quotas in real-time as you write code and prompts.
- **🕒 Estimated Reset Date & Time Display**: When a quota is exhausted (0%), the empty bar displays exact formatted reset timings like `refresh in 4h 18m (Today 15:47)` or `refresh in 2d 6h (Thu 17:29)`.
- **🎵 Spotify Curved Adaptive Player**: Floating rounded player with 60FPS smooth progress animation, zero pause-jittering, and adaptive Light/Dark mode.
- **⏰ Smart Off-Hours Auto-Awake & 30-Min Rest Chime (🔔)**: Auto-awakens on off-hours/weekends when dev apps (Cursor, Antigravity, VS Code, etc.) launch. Features **Study & Leisure Mode** with duration tracking and a pleasant 2-tone audio chime (🔔) every 30 minutes!
- **🌐 100% Crisp English UI Localization**: All modals, buttons, tooltips, and rest notifications localized to 100% clear English.

### 🧠 Universal Real-Time AI Quota Monitor
- **Google Antigravity & Standalone Claude**: Tracks 5-Hour dynamic session limits and remaining percentage for Gemini 3.6/3.5, Claude Sonnet/Opus 4.6, and GPT models.
- **12-Second Fast Polling**: Background quota sync updates every 12 seconds so your prompt usage is instantly reflected.
- **Estimated Reset Date & Time**: When a quota is exhausted (0%), the bar displays the formatted countdown alongside exact completion time (e.g., `refresh in 4h 18m (Today 15:47)` or `refresh in 2d 6h (Thu 17:29)`).
- **Raw Error Transparency**: Direct API error reporting (e.g., `ERR: DevTools Port Disconnected`) instead of masking data with false 100% fallbacks.
- **🌐 Offline Protection (Without Internet)**: If internet connectivity is disconnected, remote AI quotas and web services gracefully hide or display `Offline` status without crashing the widget.

### 🎵 Spotify Theme-Adaptive Floating Card
- **No Desktop EXE Required (Login Required)**: Connects seamlessly via Spotify OAuth Web API. Control playback on your phone, tablet, smart speaker, or web player even if the Spotify desktop app is not running. *(Requires one-time Spotify Account Login via the Settings panel).*
- **Dynamic Theme Matching**: Cards dynamically adapt to Light/Dark mode (`var(--bg-card)`), keeping text readable without forced album colors.
- **60FPS Monotonic Interpolation**: Smooth progress bar movement without jittering or jumping backward.
- **Pause State Freeze**: Automatically freezes animation frames when playback is paused to eliminate millisecond time fluctuations.
- **Full Media Controls**: Play/Pause, Next, and Previous track controls via Windows Media Session & Spotify Web API.

### ⏰ Smart Off-Hours Auto-Awake & Health Rest Reminder
- **Automated Popup**: Automatically activates during off-hours or weekends when developer tools (Cursor, Antigravity, VS Code, IntelliJ, PyCharm) are opened.
- **OT vs. Study Mode Prompt**: Modal dialog asks whether you are working OT (`🔥 Yes, Track Overtime`) or learning/studying (`☕ No, Free Usage`).
- **30-Minute Rest Reminder (🔔)**: In Study Mode, duration is continuously tracked (**`☕ 00:25:14`**). Every 30 minutes, a pleasant 2-tone audio chime plays alongside a health break notification.
- **Silent During Work Hours**: Strict time guards ensure zero false popups during regular working hours.

### 🍵 PC Sleep Prevention & Teams Keep-Alive (Caffeine)
- **Caffeine Toggle**: Prevents Windows display sleep and system standby while working.
- **Teams Jiggle**: Optional subtle mouse activity pulse to keep Microsoft Teams status active.

### 📱 Telegram Bot Remote Control
- **Remote Commands**: Interrogate AI quotas, trigger OT timers, or check current work status remotely via custom Telegram Bot commands.

### 🎨 Dynamic Day-of-Week Color Themes
- **7 Daily Palettes**: Interface background gradients dynamically evolve every day of the week (e.g., Tuesday Emerald 💚, Friday Sunset Violet 🌆).

---

## 🛠️ Architecture & Tech Stack

| Component | Technology Used |
| :--- | :--- |
| **Core Framework** | Electron v31.7.7 + Node.js |
| **UI & Styling** | Vanilla HTML5 / CSS3 (CSS Variables & Glassmorphism) |
| **Quota Service** | DevTools ActivePort WebSocket & Google LanguageServer Protocol |
| **Music Integration**| Windows Media Session API (winsdk / Python) & Spotify Web API |
| **Installer** | Squirrel `electron-winstaller` single Setup.exe |

---

## 🚀 Quick Start & Installation

1. **Download**: Grab the latest [`WorkCountdownWidgetSetup.exe`](https://github.com/Skylimsk/work-countdown-widget/releases/download/v2.0.1/WorkCountdownWidgetSetup.exe).
2. **Install**: Double-click the installer. It will automatically set up and launch the floating widget.
3. **Auto-Start**: Upon first launch or update, the application automatically registers with Windows Registry (`setLoginItemSettings`) for seamless startup.

---

## ⚙️ Configuration & Customization

Click the **⚙️ Settings Icon** on the top header bar to configure:
- **Work Hours**: Set your daily Start Time, End Time, and Lunch Break interval.
- **Overtime Rates**: Set Monthly Salary / Hourly Rate, Working Days per Month, Daily Hours, and OT Multiplier.
- **AI Quota Services**: Toggle monitoring for Claude App, Antigravity, Cursor, ChatGPT, or DeepSeek API.
- **Spotify & Caffeine**: Toggle Spotify player visibility and display sleep prevention.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
