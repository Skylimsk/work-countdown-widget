# ⏳ Work Countdown & Universal AI Quota Desktop Widget
> A sleek, floating Windows desktop widget counting down to your work end time & lunch breaks, while real-time monitoring your AI Quotas (Claude, Google Antigravity Gemini & Claude/GPT models) and integrating seamlessly with Spotify!

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg)
![Electron](https://img.shields.io/badge/Electron-v31.7.7-47848F.svg)

---

## ✨ Features Highlight

### ⏰ Work & Overtime (OT) Countdown
- **Dynamic Phase Tracking**:
  - `⏰ Starts in Xh Ym` (Pre-work countdown)
  - `🍽 → Lunch` (Phase 1: Countdown to lunch break)
  - `🍽 Break ends in` (Lunch break active)
  - `🏁 → End of Work` (Phase 2: Countdown to official work end)
  - `🔥 +00:15:30` (Overtime prompt confirmation modal & live glowing red OT timer)
- **Salary & OT Money Calculation**:
  - Supports both **Hourly Rate** and **Monthly Salary** calculation modes.
  - Automatically calculates extra money earned in real-time during Overtime!

### 📊 Real-Time Universal AI Quota Monitor
- **Claude Standalone App**: Live usage monitoring directly via official API token.
- **Google Antigravity**:
  - **Gemini Models**: Real-time 5-Hour & Weekly quota tracking (Remaining %).
  - **Claude & GPT Models**: Real-time 5-Hour & Weekly quota tracking (Remaining %).
  - Dynamic live updates anchored to local transcript logs as you chat!

### 🎵 Spotify Dynamic Music Bar
- **60 FPS Smooth Progress Bar**: Ultra-smooth song progress interpolation at 60 frames per second.
- **Dynamic Album Theme Color Matching**: Automatically extracts the dominant solid color from each song's album art cover and dynamically re-themes the player card.
- **Media Controls**: `⏮` Previous, `⏯` Play/Pause, `⏭` Next buttons directly on your desktop widget without switching windows.

### ☕ Caffeine Keep-Awake (Anti-Away for Microsoft Teams)
- Moves mouse by 1px and back every 3 minutes to simulate real user activity — keeps Microsoft Teams showing **Active (Green)** without display sleep.

### 📱 Always-On Telegram Bot Integration
- Control your widget and query your AI quotas remotely via Telegram commands!
- Supports `/start`, `/quota`, `/status`, and inline interactive menu buttons. Can be toggled on/off in Settings.

### ☀️ Light Mode & 🌙 Dark Mode
- Instant header toggle button (`☀️`/`🌙`).
- Premium frosted glassmorphism UI designed for both bright daytime working environments and sleek night setups.

---

## 🚀 How to Use / Getting Started

### 1. Launching the App
Double-click `WorkCountdownWidget.exe` to run. The widget will float in the bottom-right corner of your screen (Always on Top).

### 2. Header Controls Overview
| Button | Icon | Function |
|---|---|---|
| **Theme Toggle** | `🌙` / `☀️` | Switch between Dark Mode and Light Mode |
| **Quota Toggle** | `📊` | Expand/Collapse the AI Quota Panel |
| **Settings** | `⚙️` | Open configuration panel |
| **Minimize** | `–` | Minimize widget |
| **Close** | `✕` | Close application |

### 3. Settings Configuration (`⚙️`)
Click `⚙️` to customize:
- **Work Hours**: Start Time, End Time, Lunch Break duration.
- **Overtime (OT)**: Hourly Rate / Monthly Salary, Work Days per Month, Work Hours per Day, OT Multiplier.
- **Telegram Bot**: Toggle Telegram Bot notifications & polling on/off.
- **Keep Awake (Caffeine)**: Keep Microsoft Teams Active.

---

## ⚠️ Important Notes & Troubleshooting

1. **Auto-Start on Boot**:
   - The app automatically registers itself in the Windows Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
   - If Windows Defender or antivirus prompts a permission notice, please select **Allow**.

2. **Offline Mode**:
   - If internet connection is lost, Claude API quota will display `N/A (offline)`.
   - **Local Work Countdown, Overtime Timer, and Antigravity Quotas will continue to work 100% offline!**

3. **Spotify Integration**:
   - Spotify Desktop App must be open.
   - If track name does not show immediately, play any track on Spotify to initiate Windows Media Session.

---

## 📧 Support & Contact

If you encounter any issues, bugs, or have feature suggestions, please feel free to reach out:

📩 **Contact Developer**: [skylimsk@hotmail.com](mailto:skylimsk@hotmail.com)

---
*Built with ❤️ by Skylim*

