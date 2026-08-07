const { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage, powerSaveBlocker, powerMonitor } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadConfig, saveConfig } = require('./store');
const { fetchClaudeQuota, writeLog } = require('./quotaService');
const { initTelegramBot, setBotActiveState, sendTelegramQuotaReport, ALLOWED_CHAT_ID } = require('./telegramBotService');
const { getSpotifyNowPlaying, spotifyPlayPause, spotifyNext, spotifyPrev } = require('./spotifyService');
const spotifyAuth = require('./spotifyAuth');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  writeLog("Another instance is already running. Exiting second instance.");
  app.quit();
  process.exit(0);
}

// Isolate Widget userData directory so it never overwrites Antigravity DevToolsActivePort
try {
  app.setPath('userData', path.join(app.getPath('appData'), 'WorkCountdownWidgetAppData'));
} catch (e) {}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow;
let tray = null;
let powerBlockerId = null;
let isScreenLocked = false;
let userHasCustomResized = false; // Flag to respect user custom size!
let mouseJiggleInterval = null; // Teams keep-active mouse jiggle timer

function configureAutoStart() {
  try {
    // Use Electron's native API — works correctly with Squirrel installer
    app.setLoginItemSettings({
      openAtLogin: true,
      name: 'WorkCountdownWidget',
      path: process.execPath
    });
    writeLog(`AutoStart registered via setLoginItemSettings: ${process.execPath}`);
  } catch (e) {
    writeLog(`AutoStart registration failed: ${e.message}`);
  }
}


function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function setupPowerMonitor() {
  powerMonitor.on('lock-screen', () => {
    isScreenLocked = true;
    if (mainWindow) {
      mainWindow.webContents.send('power-state-change', { locked: true });
    }
  });

  powerMonitor.on('unlock-screen', () => {
    isScreenLocked = false;
    if (mainWindow) {
      mainWindow.webContents.send('power-state-change', { locked: false });
    }
  });

  powerMonitor.on('suspend', () => {
    if (mainWindow) {
      mainWindow.webContents.send('power-state-change', { suspended: true });
    }
  });

  powerMonitor.on('resume', () => {
    if (mainWindow) {
      mainWindow.webContents.send('power-state-change', { suspended: false });
    }
  });
}

function createWindow() {
  const userConfig = loadConfig();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workWidth, height: workHeight } = primaryDisplay.workAreaSize;

  const defaultWidth = userConfig.width || 170;
  const defaultHeight = userConfig.height || 330;
  const defaultX = workWidth - defaultWidth - 20;
  const defaultY = workHeight - defaultHeight - 20;

  mainWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    minWidth: 160,
    minHeight: 42,
    maxWidth: 600,
    maxHeight: 900,
    x: userConfig.x !== null && userConfig.x !== undefined ? userConfig.x : defaultX,
    y: userConfig.y !== null && userConfig.y !== undefined ? userConfig.y : defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true, // Universal Resizable Window Enabled!
    show: false,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  });

  mainWindow.on('move', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      const cfg = loadConfig();
      cfg.x = x;
      cfg.y = y;
      saveConfig(cfg);
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [w, h] = mainWindow.getSize();
      userHasCustomResized = true;
      const cfg = loadConfig();
      cfg.width = w;
      cfg.height = h;
      saveConfig(cfg);
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Widget',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) mainWindow.hide();
          else {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Work Countdown Widget');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  configureAutoStart();
  setupPowerMonitor();
  createWindow();
  createTray();

  const userConfig = loadConfig();
  try {
    initTelegramBot(mainWindow);
    setBotActiveState(userConfig.enableTelegramBot !== false);
  } catch (e) {
    writeLog(`Telegram Bot init failed: ${e}`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('get-screen-scale', (event) => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    event.returnValue = primaryDisplay.scaleFactor || 1;
  } catch (e) {
    event.returnValue = 1;
  }
});


ipcMain.on('get-config', (event) => {
  event.returnValue = loadConfig();
});

ipcMain.on('save-config', (event, newConfig) => {
  saveConfig(newConfig);
});

ipcMain.on('resize-window', (event, { width, height, force }) => {
  if (mainWindow) {
    if (userHasCustomResized && !force) {
      return;
    }
    const currentSize = mainWindow.getSize();
    const targetWidth = Math.max(currentSize[0], width || 195);
    const targetHeight = Math.max(currentSize[1], height || 100);
    mainWindow.setSize(targetWidth, targetHeight);
  }
});

ipcMain.on('toggle-always-on-top', (event, alwaysOnTop) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver', 1);
  }
});

ipcMain.on('toggle-telegram-bot', (event, enable) => {
  setBotActiveState(enable);
});

ipcMain.on('fetch-claude-quota', async (event) => {
  try {
    const quotaData = await fetchClaudeQuota();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('claude-quota-data', quotaData);
    }
  } catch (e) {
    writeLog(`Error in fetch-claude-quota IPC: ${e}`);
  }
});

// Automatic 12-second fast quota polling so AI usage reflects in real time!
let quotaFastPollInterval = null;
app.whenReady().then(() => {
  setTimeout(() => {
    fetchClaudeQuota().then(quotaData => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('claude-quota-data', quotaData);
      }
    });
    quotaFastPollInterval = setInterval(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const quotaData = await fetchClaudeQuota();
          mainWindow.webContents.send('claude-quota-data', quotaData);
        } catch(e) {}
      }
    }, 12000);
  }, 2000);
});

let caffeineActiveCount = 0;

function startMouseJiggle() {
  if (mouseJiggleInterval) return; // Already running
  // Also block app suspension
  if (powerBlockerId === null || !powerSaveBlocker.isStarted(powerBlockerId)) {
    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  }
  // Jiggle mouse every 3 minutes to keep Teams Active
  mouseJiggleInterval = setInterval(() => {
    try {
      // Move mouse 1px right then 1px left — imperceptible but counts as user activity
      execSync(`powershell -NonInteractive -WindowStyle Hidden -Command "
        Add-Type -AssemblyName System.Windows.Forms;
        $p = [System.Windows.Forms.Cursor]::Position;
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($p.X + 1), $p.Y);
        Start-Sleep -Milliseconds 100;
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($p.X, $p.Y);
      "`, { timeout: 5000 });
      caffeineActiveCount++;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('caffeine-pulse', { count: caffeineActiveCount });
      }
    } catch (e) {
      writeLog(`Mouse jiggle error: ${e.message}`);
    }
  }, 3 * 60 * 1000); // Every 3 minutes
  writeLog('Caffeine ON: Mouse jiggle started (Teams will stay Active)');
}


function stopMouseJiggle() {
  if (mouseJiggleInterval) {
    clearInterval(mouseJiggleInterval);
    mouseJiggleInterval = null;
  }
  if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
  writeLog('Caffeine OFF: Mouse jiggle stopped');
}

ipcMain.on('set-keep-awake', (event, enable) => {
  if (enable) {
    startMouseJiggle();
  } else {
    stopMouseJiggle();
  }
});

ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-app', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('update-tray-tooltip', (event, text) => {
  if (tray) {
    tray.setToolTip(`Work Countdown: ${text}`);
  }
});

// Spotify IPC Handlers
ipcMain.handle('spotify-now-playing', async () => {
  return new Promise((resolve) => {
    getSpotifyNowPlaying((data) => resolve(data));
  });
});

// Real Web API playback control when connected (requires Premium), falls back
// to media-key simulation otherwise — tracked from the last poll so play/pause
// knows which direction to command.
let spotifyLastKnownPaused = true;

// A fallback media-key press is only safe when Spotify gave us a definitive
// rejection (result.attempted). On a network exception (result.attempted ===
// false) we don't know if the command already landed server-side, so we must
// NOT also fire the media key — that ambiguity is what caused "next" to skip
// two tracks (both the Web API call and the fallback executing).
ipcMain.on('spotify-play-pause', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webPlayPause(!spotifyLastKnownPaused);
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyPlayPause();
    return;
  }
  spotifyPlayPause();
});
ipcMain.on('spotify-next', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webNext();
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyNext();
    return;
  }
  spotifyNext();
});
ipcMain.on('spotify-prev', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webPrevious();
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyPrev();
    return;
  }
  spotifyPrev();
});

// Spotify Web API — up-next queue + real playback control (Windows Media Session has neither)
ipcMain.handle('spotify-auth-status', async () => {
  return { connected: spotifyAuth.isConnected() };
});

ipcMain.handle('spotify-connect', async () => {
  return new Promise((resolve) => {
    spotifyAuth.startAuthFlow((result) => resolve(result));
  });
});

ipcMain.on('spotify-disconnect', () => {
  spotifyAuth.disconnect();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('spotify-next-track', null);
  }
});

ipcMain.handle('spotify-get-devices', async () => {
  if (!spotifyAuth.isConnected()) return [];
  return spotifyAuth.getDevices();
});
ipcMain.on('spotify-switch-device', async (event, deviceId) => {
  await spotifyAuth.switchDevice(deviceId);
  refreshSpotifySoon();
});
ipcMain.on('spotify-set-volume', (event, percent) => {
  spotifyAuth.setVolume(percent);
});
ipcMain.on('spotify-seek', (event, positionMs) => {
  spotifyAuth.seek(positionMs);
});

// Push the current now-playing state to the renderer. When connected, the
// Web API's track/artist/paused/progress/volume are authoritative — the local
// Windows Media Session (SMTC) can lag several seconds behind a remotely
// issued command (e.g. right after a Web API skip), and its paused status is
// known to misreport for Spotify. It also works when spotify.exe isn't even
// running locally (e.g. controlling Spotify open on your phone), so an active
// Web API device takes over showing/driving the card in that case too.
function pushSpotifyNowPlaying() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  getSpotifyNowPlaying((localData) => {
    if (spotifyAuth.isConnected()) {
      spotifyAuth.getPlayerState().then((state) => {
        if (state && state.active) {
          localData.running = true;
          localData.paused = !state.isPlaying;
          localData.position_sec = state.progressMs / 1000;
          if (state.durationMs) localData.duration_sec = state.durationMs / 1000;
          localData.volumePercent = state.volumePercent;
          localData.deviceName = state.deviceName;
          if (state.track) {
            localData.track = state.track;
            localData.artist = state.artist;
          }
        }
        spotifyLastKnownPaused = !!localData.paused;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('spotify-update', localData);
        }
      }).catch(() => {
        spotifyLastKnownPaused = !!localData.paused;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('spotify-update', localData);
      });
    } else {
      spotifyLastKnownPaused = !!localData.paused;
      mainWindow.webContents.send('spotify-update', localData);
    }
  });
}

function pushSpotifyNextTrack() {
  if (!spotifyAuth.isConnected() || !mainWindow || mainWindow.isDestroyed()) return;
  spotifyAuth.getNextTrack().then((next) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('spotify-next-track', next);
    }
  });
}

// After a command actually changes something (skip/prev), refresh right away
// instead of waiting for the next scheduled poll — Spotify's servers are
// usually caught up within a few hundred ms of accepting the command.
function refreshSpotifySoon() {
  setTimeout(() => {
    pushSpotifyNowPlaying();
    pushSpotifyNextTrack();
  }, 400);
}

// Spotify polling: push now-playing + up-next updates to renderer every 4 seconds
app.whenReady().then(() => {
  configureAutoStart();
  
  // Start spotify polling after window ready
  setTimeout(() => {
    spotifyPollInterval = setInterval(() => {
      pushSpotifyNowPlaying();
      pushSpotifyNextTrack();
    }, 4000);
  }, 1000);

function isNonWorkingTime() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return true; // Weekend is non-working time

  const cfg = loadConfig();
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = (cfg.startTime || '09:00').split(':').map(Number);
  const [eH, eM] = (cfg.endTime || '18:00').split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  return currentMins < startMins || currentMins >= endMins;
}

  // Non-working hours / Weekend dev-app smart activity detector
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // STRICT GUARD: Only run during actual off-hours or weekends!
    if (!isNonWorkingTime()) return;

    const { exec } = require('child_process');
    const targetApps = ['cursor.exe', 'antigravity.exe', 'code.exe', 'idea64.exe', 'pycharm64.exe', 'devenv.exe', 'webstorm64.exe'];
    
    exec('tasklist /NH', { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return;
      const lower = stdout.toLowerCase();
      const hasDevApp = targetApps.some(app => lower.includes(app));
      
      if (hasDevApp) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        }
        mainWindow.webContents.send('non-working-app-active', { hasDevApp: true });
      }
    });
  }, 10000);
});
