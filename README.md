# Workday 3

An English-language Windows desktop widget for workday countdowns and overtime pay, a compact AI usage carousel, Caffeine keep-awake, break reminders, and Spotify controls with TWICE fan effects. YouTube is deferred.

## Install

Download `WorkCountdownWidgetSetup.exe` from the latest release (https://github.com/Skylimsk/work-countdown-widget/releases/latest) and run it. Current version: 3.0.0. The installer is unsigned, so Windows SmartScreen may ask you to confirm. System Python is required for the Claude and Spotify helpers.

## Use

Open **Settings** from the gear button or tray menu. Save to apply changes.

- Appearance defaults to **System**, following Windows dark/light changes immediately.
- AI cards support **Codex / ChatGPT**, **Antigravity**, and **Claude**. Each can follow its running desktop app, always show, or stay hidden.
- Antigravity contains Gemini and Claude / GPT groups. Missing quota data is shown as unavailable; cached readings are labeled.
- Click a card header to collapse it. Change card order and rotation interval in Settings.
- "Follow running app" shows a card only while its desktop app is open: Claude Desktop, ChatGPT or the Codex desktop app (Codex CLI helpers are ignored), and Antigravity.
- The default width is 260px (230–500). One AI is visible at a time, rotating every 6 seconds by default (3–30). Hover to pause or use arrows/dots.
- Widget layouts: **AI carousel** (default), **Clock only** for an even smaller widget, and **Music focus**.
- Appearance also covers always on top, opacity, text scale and reduced motion. System settings cover launch at startup and close to tray.
- The minus button hides the widget to the tray. The tray menu has Show widget, Settings, Spotify library, a Caffeine keep-awake toggle and Quit.

## Workday countdown and overtime

The clock counts down through three stages: **Start** (time until work starts), **Lunch** (time until lunch starts, then until it ends) and **Home** (time until the end of the shift), with a progress bar for the day. Configure work start/end, an optional lunch break and which weekdays are workdays. Times use your local time zone, and overnight shifts that end the next day are supported.

With overtime tracking enabled, **Start overtime** appears outside working hours and shows the pay earned so far. Pay is calculated from either an hourly rate or a monthly salary divided by workdays per month × work hours per day, multiplied by the overtime multiplier (default 1.5×). Currencies: MYR, USD, SGD, TWD and CNY.

## Break reminders

When enabled, a Windows notification reminds you to stand up and rest your eyes every 30 minutes by default (5–180). Reminders are skipped while the screen is locked.

## Caffeine

System-only or system-and-display keep-awake modes use Electron powerSaveBlocker. Caffeine automatically turns on at the start of configured work hours (also when the widget starts during a shift) and turns off at the end; this can be disabled in Settings. The optional activity mode also sends an F15 key-up every 59 seconds to prevent the screen saver and idle lock, matching Caffeine's default behavior. Choose 30/60/120 minutes or manual stop for manual activation. Lock-screen and battery pauses are configurable. Expiry and exit release the OS request.

Mouse movement is independent and disabled by default. It runs asynchronously and does not restore the cursor if you have moved it meanwhile. Keeping the system awake does not guarantee online status in Teams or other chat apps.

End-of-shift mode works only during the current scheduled shift. Choose a duration or manual mode outside working hours. The deadline continues while paused.

## Spotify and TWICE

Local Spotify detection and existing account connections are preserved, including playback, device/volume controls and Up Next. Artist/member themes, Feel Special roll call, One Spark fireworks, MISAMO confetti, Merry & Happy snow and member color cycles have been retained.

Spotify appears only during active playback and hides when paused or stopped. Track changes, reduced motion and the fan-effects toggle stop relevant animations. Spotify API playback control depends on the account and playback device. Existing Spotify token storage is unchanged.

## Development and packaging

Run from the project root:

    npm start
    npm test
    npm run test:ui
    npm run build
    npm run build:installer

Outputs:

- dist/win-unpacked/WorkCountdownWidget.exe
- dist/installer/WorkCountdownWidgetSetup.exe

The build command closes only this project’s running dist/win-unpacked widget before packaging to release locked files. The executable has the app icon and version metadata but is unsigned. Resource editing uses the local rcedit tool, avoiding the signing-tool extraction error on this Windows account. The installer preserves Electron/Chromium licenses and handles Squirrel shortcut events.

System Python is required for the existing Claude/Spotify helpers. Resources are unpacked so helpers resolve correctly. npm run obfuscate writes only a separate dist/obfuscated copy; normal builds use src.

## Verification

npm test covers settings migration/validation and bounds, overnight shifts and countdown stages, Caffeine lifecycle and work-hours auto-start, Codex desktop-app detection, TWICE member parsing, and the Spotify playlist/Liked Songs/artist/queue services (using fake HTTP responses).

npm run test:ui runs Electron in an isolated temporary profile with sample quotas. It checks three/single/no AI cards, system theme updates, carousel/clock-only layouts, English settings, settings saves, real OS keep-awake start/stop, Spotify content, TWICE timed roll call and effects-off behavior. Results/screenshots are written to dist/verification. No real account data is used by this test.

## Layout

    src/          UI, settings, services and providers
      core/       Config validation, schedules, AI visibility and Caffeine
    scripts/      Packaging, icon editing and Electron integration tests
    tests/        Unit/regression tests
    dist/         Build outputs and verification (generated, not committed)

Old preferences are backed up to user-config.json.v2-backup when migrated. Widget service credentials use OS safeStorage encryption when available. Exported settings exclude credentials. Settings and diagnostics remain local.

The Claude card reads the signed-in account's session (5-hour) and weekly limits from Anthropic's OAuth usage endpoint. It uses Claude Desktop's sign-in, found in `%LOCALAPPDATA%\Claude-Data\<package>` on current MSIX builds (older `%APPDATA%\Claude` and package `LocalCache` locations are still checked), then falls back to the Claude Code CLI sign-in in `~/.claude/.credentials.json`. Expired and narrow-scope tokens are skipped. The endpoint is rate limited, so Claude is checked at most once every five minutes regardless of the refresh interval, a 429 stops that check instead of retrying other tokens, and the last good reading is shown as cached in the meantime. If no valid sign-in is found, open Claude Desktop or run `claude` to sign in again.

Antigravity requires its existing local DevTools connection; when unavailable, its card reports the connection issue. The Codex / ChatGPT card shows the account's Codex limits, not ordinary ChatGPT conversation counts. It reads the actual limit windows returned for the signed-in account, so durations can vary by subscription (including ChatGPT Go) rather than assuming a fixed five-hour window.

TWICE color references: JYP's September 23, 2016 official notice specifies Apricot (Pantone 712C) and Neon Magenta (Pantone 812C), used together: https://twice.jype.com/Mobile/NoticeView?AnSeq=5676&NoticeNumber=31 . Member color families follow https://www.oricon.co.jp/special/69842/ : Nayeon sky blue, Jeongyeon yellow-green, Momo pink, Sana purple, Jihyo orange, Mina mint green, Dahyun white, Chaeyoung red, Tzuyu blue. RGB values are screen approximations, not a claimed official member HEX specification. Theme changes preserve accent hues; text/backgrounds provide readability.

Titles such as `Song (SANA, JIHYO, TZUYU)` rotate the displayed member and theme every three seconds, in the order written. Full-width parentheses and supported English/Korean/Chinese/Japanese member names are accepted; repeated names are deduplicated. A single listed member stays fixed. Rotation is active only while music is playing and artist themes are enabled. The original title remains visible and full artist metadata remains in its tooltip.

## Spotify playlists

Use the widget's music-note button, the tray's Spotify playlists entry, or Settings > Music > Browse Spotify playlists. The library opens separately so the widget stays compact and remains accessible while Spotify is paused. Browse playlists in pages of 50, filter loaded playlists by title/owner, select an available Spotify Connect device, and click Play. No playback starts just by opening the library.

Existing accounts may need Connect / reconnect once to grant playlist-read-private and playlist-read-collaborative. The PKCE sign-in uses a verified state value and expires after three minutes. Spotify Premium is required for API playback control; keep Spotify open on the selected device. Permission, authentication, missing-device, rate-limit and network errors are shown in the library. An uncertain playback request is never automatically retried.

Implementation references: https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists and https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback . Service tests use fake HTTP responses; the UI smoke test uses fixture playlists/devices and captures the requested playlist/device without playing real audio. Live account authorization and playback need verification in the signed-in app.

The compact player now uses separate track/artist and transport rows with consistent SVG controls. Music-note and More both open the same independent 800 × 730 music window (the Settings default size), including device transfer and volume controls. The old expanding widget popover is removed. Artist themes, member rotation, timed fan effects, reduced-motion preferences and pause-to-hide remain intact.

The music window now has Playlists, Liked Songs and Artists categories. Liked Songs uses the saved-tracks API (user-library-read; reconnect existing accounts to grant it), displays 50 saved entries per page and skips unavailable/local entries. Play this page plays its visible songs; selecting a song plays from that song to the end of the filtered page. Previous/next browse all pages. Open full Liked Songs in Spotify opens the full collection for continuous library playback. Artists supports explicit search and artist-context playback on the selected device. Playback started directly in Spotify continues to be reflected by the widget.

References: https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks , https://developer.spotify.com/documentation/web-api/reference/search , https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback . Tests cover saved-track paging, ordered playback URIs, artist search/contexts and corresponding UI interactions using fixtures; live authorization/playback are not exercised.

The compact player includes a Shuffle button beside Repeat. It reads `shuffle_state` from Spotify playback state, uses Spotify's `/me/player/shuffle` endpoint to toggle it, updates immediately on click and reconciles with the next server poll. The control stays hidden until Spotify is connected and does not change player height.

Users can add individual songs to the current Spotify queue. The compact player exposes Add current song to queue when Spotify provides a valid current track ID. Liked Songs exposes Queue on each playable track and sends the selected playback device. Playlist and artist results intentionally have no Queue action, and the main-process service accepts only one validated 22-character track ID, constructing a `spotify:track:` URI itself. Spotify's Add Item to Playback Queue endpoint requires Premium and an active playback device: https://developer.spotify.com/documentation/web-api/reference/add-to-queue .

Per-track Play and Queue actions in the music window use compact SVG icons with `title` and `aria-label` descriptions. Liked Songs browsing remains paginated because Spotify returns at most 50 saved tracks per request, while Search all Liked Songs follows every API page, searches song and artist names across the complete playable library, and shows one unpaginated result set. A successful full-library scan is cached for five minutes and cleared when the Spotify account connects or disconnects. Reference: https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks .
