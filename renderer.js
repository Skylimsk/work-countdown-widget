const { ipcRenderer } = require('electron');

// DPI-aware font scaling
(function applyDpiScale() {
  try {
    const scaleFactor = ipcRenderer.sendSync('get-screen-scale') || 1;
    // Only upscale for high-DPI screens (scale > 1.25)
    if (scaleFactor > 1.25) {
      const zoom = Math.min(scaleFactor, 2.0);
      document.documentElement.style.fontSize = `${zoom * 10}px`;
      document.body.style.zoom = zoom;
    }
  } catch (e) {}
})();

// ─── Day-of-Week Dynamic Theme System ────────────────────────
function applyDayTheme() {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  document.body.setAttribute('data-day', day);
}
applyDayTheme();

// Automatically update theme at midnight
(function scheduleMidnightTheme() {
  const now = new Date();
  const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  setTimeout(() => { applyDayTheme(); scheduleMidnightTheme(); }, msToMidnight);
})();

// Load stored user presets
let config = ipcRenderer.sendSync('get-config');

// Elements
const timerDisplay = document.getElementById('timerDisplay');
const phaseEmoji   = document.getElementById('phaseEmoji');
const phaseTime    = document.getElementById('phaseTime');
const caffeineIcon = document.getElementById('caffeineIcon');
const progressBar = document.getElementById('progressBar');
const progressSection = document.getElementById('progressSection');
const quotaSection = document.getElementById('quotaSection');
const otPayRow = document.getElementById('otPayRow');
const otMoneyVal = document.getElementById('otMoneyVal');

// APP Sections
const sectionClaudeApp = document.getElementById('sectionClaudeApp');
const sectionAntigravityApp = document.getElementById('sectionAntigravityApp');
const sectionCursorApp = document.getElementById('sectionCursorApp');
const sectionChatgptApp = document.getElementById('sectionChatgptApp');
const sectionApiKeysApp = document.getElementById('sectionApiKeysApp');

// APP 1: Standalone Claude App Elements
const claudeSessionBar = document.getElementById('claudeSessionBar');
const claudeSessionVal = document.getElementById('claudeSessionVal');
const claudeSessionReset = document.getElementById('claudeSessionReset');
const claudeWeeklyBar = document.getElementById('claudeWeeklyBar');
const claudeWeeklyVal = document.getElementById('claudeWeeklyVal');
const claudeWeeklyReset = document.getElementById('claudeWeeklyReset');
const claudeWeeklyRow = document.getElementById('claudeWeeklyRow');

// APP 2: Google Antigravity - Gemini Models Elements
const agGeminiSessionBar = document.getElementById('agGeminiSessionBar');
const agGeminiSessionVal = document.getElementById('agGeminiSessionVal');
const agGeminiSessionReset = document.getElementById('agGeminiSessionReset');
const agGeminiWeeklyBar = document.getElementById('agGeminiWeeklyBar');
const agGeminiWeeklyVal = document.getElementById('agGeminiWeeklyVal');
const agGeminiWeeklyReset = document.getElementById('agGeminiWeeklyReset');
const agGeminiWeeklyRow = document.getElementById('agGeminiWeeklyRow');

// APP 2: Google Antigravity - Claude & GPT Models Elements
const agClaudeSessionBar = document.getElementById('agClaudeSessionBar');
const agClaudeSessionVal = document.getElementById('agClaudeSessionVal');
const agClaudeSessionReset = document.getElementById('agClaudeSessionReset');
const agClaudeWeeklyBar = document.getElementById('agClaudeWeeklyBar');
const agClaudeWeeklyVal = document.getElementById('agClaudeWeeklyVal');
const agClaudeWeeklyReset = document.getElementById('agClaudeWeeklyReset');
const agClaudeWeeklyRow = document.getElementById('agClaudeWeeklyRow');

// Platform Selectors Checkboxes & Credentials Inputs
const platClaude = document.getElementById('platClaude');
const platAntigravity = document.getElementById('platAntigravity');
const platCursor = document.getElementById('platCursor');
const platChatgpt = document.getElementById('platChatgpt');
const platApiKeys = document.getElementById('platApiKeys');

const inputCursorToken = document.getElementById('inputCursorToken');
const inputDeepseekKey = document.getElementById('inputDeepseekKey');

// OT Settings Inputs & Automatic Prompt Elements
const checkEnableOt = document.getElementById('checkEnableOt');
const selectSalaryType = document.getElementById('selectSalaryType');
const hourlyRateGroup = document.getElementById('hourlyRateGroup');
const monthlySalaryGroup = document.getElementById('monthlySalaryGroup');
const inputHourlyRate = document.getElementById('inputHourlyRate');
const inputMonthlySalary = document.getElementById('inputMonthlySalary');
const inputWorkDaysMonth = document.getElementById('inputWorkDaysMonth');
const inputWorkHoursDay = document.getElementById('inputWorkHoursDay');
const inputOtMultiplier = document.getElementById('inputOtMultiplier');

const otPromptView = document.getElementById('otPromptView');
const btnConfirmOtYes = document.getElementById('btnConfirmOtYes');
const btnConfirmOtNo = document.getElementById('btnConfirmOtNo');

const statusDot = document.getElementById('statusDot');
const settingsView = document.getElementById('settingsView');
const celebrationView = document.getElementById('celebrationView');

// Controls
const btnThemeToggle = document.getElementById('btnThemeToggle');
const widgetContainer = document.getElementById('widgetContainer');
const btnQuotaToggle = document.getElementById('btnQuotaToggle');
const btnSettings = document.getElementById('btnSettings');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnDismissParty = document.getElementById('btnDismissParty');

// Theme Management
let currentTheme = config.theme || 'dark';

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    btnThemeToggle.textContent = '☀️';
    btnThemeToggle.title = 'Switch to Dark Mode';
  } else {
    document.body.classList.remove('light-mode');
    btnThemeToggle.textContent = '🌙';
    btnThemeToggle.title = 'Switch to Light Mode';
  }
  config.theme = theme;
  ipcRenderer.send('save-config', config);
}

applyTheme(currentTheme);

btnThemeToggle.addEventListener('click', () => {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
});


// Inputs
const inputStartTime = document.getElementById('inputStartTime');
const inputEndTime = document.getElementById('inputEndTime');
const checkEnableLunch = document.getElementById('checkEnableLunch');
const inputLunchStart = document.getElementById('inputLunchStart');
const inputLunchEnd = document.getElementById('inputLunchEnd');
const checkShowQuota = document.getElementById('checkShowQuota');
const checkShowWeekly = document.getElementById('checkShowWeekly');
const checkKeepAwake = document.getElementById('checkKeepAwake');
const checkAlwaysOnTop = document.getElementById('checkAlwaysOnTop');
const checkEnableTelegramBot = document.getElementById('checkEnableTelegramBot');

let isWorkDoneCelebrated = false;
let isOtPromptAnswered = false;
let isUserWorkingOt = false;
let showQuota = config.showQuota !== false;
let showWeekly = config.showWeekly !== false;

function formatTimeRemaining(isoResetString) {
  if (!isoResetString) return 'refresh in --';
  const targetDate = new Date(isoResetString);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'resetting...';

  const diffMins = Math.ceil(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const days = Math.floor(hours / 24);

  let countdownStr = '';
  if (days >= 1) countdownStr = `${days}d ${hours % 24}h`;
  else if (hours >= 1) countdownStr = `${hours}h ${mins}m`;
  else countdownStr = `${mins}m`;

  const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  let datePrefix = '';
  const isToday = now.toDateString() === targetDate.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = tomorrow.toDateString() === targetDate.toDateString();

  if (isToday) {
    datePrefix = 'Today';
  } else if (isTomorrow) {
    datePrefix = 'Tomorrow';
  } else {
    datePrefix = targetDate.toLocaleDateString([], { weekday: 'short' });
  }

  return `${countdownStr} (${datePrefix} ${timeStr})`;
}

// Listen for Separate AI Quota Data & Process Status
ipcRenderer.on('claude-quota-data', (event, data) => {
  if (data) {
    const enabled = config.enabledPlatforms || {};
    const claudeActive = (data.claudeRunning !== false) && enabled.claude;
    const antigravityActive = (data.antigravityRunning !== false) && enabled.antigravity;

    // Dynamically show/hide Claude section
    if (claudeActive) {
      sectionClaudeApp.classList.remove('hidden');
    } else {
      sectionClaudeApp.classList.add('hidden');
    }

    // Dynamically show/hide Antigravity section
    if (antigravityActive) {
      sectionAntigravityApp.classList.remove('hidden');
    } else {
      sectionAntigravityApp.classList.add('hidden');
    }

    // Dynamically show/hide Cursor / ChatGPT / API Keys sections
    if (enabled.cursor) sectionCursorApp.classList.remove('hidden');
    else sectionCursorApp.classList.add('hidden');

    if (enabled.chatgpt) sectionChatgptApp.classList.remove('hidden');
    else sectionChatgptApp.classList.add('hidden');

    if (enabled.deepseekApi || enabled.openaiApi) sectionApiKeysApp.classList.remove('hidden');
    else sectionApiKeysApp.classList.add('hidden');

    // 1. Render Standalone Claude App
    const claudeData = data.claude || {};
    const cSessionUsed = Number(claudeData.session) || 0;
    const cWeeklyUsed = Number(claudeData.weekly) || 0;
    const isOffline = (data.error && cSessionUsed === 0 && cWeeklyUsed === 0);

    const cSessionRemaining = Math.max(0, 100 - cSessionUsed);
    const cWeeklyRemaining = Math.max(0, 100 - cWeeklyUsed);

    function renderRefreshText(txt) {
      if (!txt) return 'refresh in --';
      if (txt.startsWith('refresh in') || txt.startsWith('ERR:')) return txt;
      return `refresh in ${txt}`;
    }

    claudeSessionBar.style.width = isOffline ? '0%' : `${cSessionRemaining}%`;
    claudeSessionVal.textContent = isOffline ? 'N/A' : `${cSessionRemaining}%`;
    claudeSessionReset.textContent = isOffline ? 'offline' : renderRefreshText(formatTimeRemaining(claudeData.sessionReset));

    claudeWeeklyBar.style.width = isOffline ? '0%' : `${cWeeklyRemaining}%`;
    claudeWeeklyVal.textContent = isOffline ? 'N/A' : `${cWeeklyRemaining}%`;
    claudeWeeklyReset.textContent = isOffline ? 'offline' : renderRefreshText(formatTimeRemaining(claudeData.weeklyReset));

    // 2. Render Google Antigravity - Gemini Models
    const agGeminiData = data.antigravityGemini || { session: 0, weekly: 0 };
    const aggSession = Number(agGeminiData.session);
    const aggWeekly = Number(agGeminiData.weekly);

    agGeminiSessionBar.style.width = `${aggSession}%`;
    agGeminiSessionVal.textContent = `${aggSession}%`;
    if (agGeminiSessionReset) agGeminiSessionReset.textContent = renderRefreshText(agGeminiData.sessionResetText);

    agGeminiWeeklyBar.style.width = `${aggWeekly}%`;
    agGeminiWeeklyVal.textContent = `${aggWeekly}%`;
    if (agGeminiWeeklyReset) agGeminiWeeklyReset.textContent = renderRefreshText(agGeminiData.weeklyResetText);

    // 3. Render Google Antigravity - Claude & GPT Models
    const agClaudeData = data.antigravityClaudeGpt || { session: 0, weekly: 0 };
    const agcSession = Number(agClaudeData.session);
    const agcWeekly = Number(agClaudeData.weekly);

    agClaudeSessionBar.style.width = `${agcSession}%`;
    agClaudeSessionVal.textContent = `${agcSession}%`;
    if (agClaudeSessionReset) agClaudeSessionReset.textContent = renderRefreshText(agClaudeData.sessionResetText);

    agClaudeWeeklyBar.style.width = `${agcWeekly}%`;
    agClaudeWeeklyVal.textContent = `${agcWeekly}%`;
    if (agClaudeWeeklyReset) agClaudeWeeklyReset.textContent = renderRefreshText(agClaudeData.weeklyResetText);

    // 4. Render Cursor IDE
    if (data.cursor) {
      const cursorFastBar = document.getElementById('cursorFastBar');
      const cursorFastVal = document.getElementById('cursorFastVal');
      const cursorFastReset = document.getElementById('cursorFastReset');
      if (cursorFastBar) cursorFastBar.style.width = `${data.cursor.fastPct}%`;
      if (cursorFastVal) cursorFastVal.textContent = `${data.cursor.fastPct}%`;
      if (cursorFastReset && data.cursor.numRequests !== undefined) {
        cursorFastReset.textContent = `Used ${data.cursor.numRequests} / ${data.cursor.maxRequests} fast reqs`;
      }
    }

    applyQuotaLayout();
  }
});

// Populate Inputs with Saved User Presets
inputStartTime.value = config.startTime;
inputEndTime.value = config.endTime;
checkEnableLunch.checked = config.enableLunch;
inputLunchStart.value = config.lunchStart;
inputLunchEnd.value = config.lunchEnd;
checkShowQuota.checked = showQuota;
checkShowWeekly.checked = showWeekly;
checkKeepAwake.checked = config.enableKeepAwake !== false;
checkAlwaysOnTop.checked = config.alwaysOnTop;
checkEnableTelegramBot.checked = config.enableTelegramBot !== false;

// OT Mode & Salary Basis Populate
checkEnableOt.checked = config.enableOt !== false;
selectSalaryType.value = config.salaryType || 'hourly';
inputHourlyRate.value = config.hourlyRate || 15;
inputMonthlySalary.value = config.monthlySalary || 3000;
inputWorkDaysMonth.value = config.workDaysPerMonth || 22;
inputWorkHoursDay.value = config.workHoursPerDay || 8;
inputOtMultiplier.value = config.otMultiplier || 1.5;

function toggleSalaryTypeUI() {
  if (selectSalaryType.value === 'monthly') {
    hourlyRateGroup.classList.add('hidden');
    monthlySalaryGroup.classList.remove('hidden');
  } else {
    hourlyRateGroup.classList.remove('hidden');
    monthlySalaryGroup.classList.add('hidden');
  }
}
selectSalaryType.addEventListener('change', toggleSalaryTypeUI);
toggleSalaryTypeUI();

// Universal AI Platform Checkboxes Populate
const platConfig = config.enabledPlatforms || {};
platClaude.checked = platConfig.claude !== false;
platAntigravity.checked = platConfig.antigravity !== false;
platCursor.checked = platConfig.cursor === true;
platChatgpt.checked = platConfig.chatgpt === true;
platApiKeys.checked = (platConfig.openaiApi || platConfig.deepseekApi) === true;

// Credentials Populate
const credsConfig = config.credentials || {};
inputCursorToken.value = credsConfig.cursorToken || '';
inputDeepseekKey.value = credsConfig.deepseekKey || '';

let isSettingsOpen = false;

btnMinimize.addEventListener('click', () => {
  ipcRenderer.send('minimize-app');
});

btnClose.addEventListener('click', () => {
  ipcRenderer.send('close-app');
});

btnSettings.addEventListener('click', () => {
  toggleSettings();
});

btnQuotaToggle.addEventListener('click', () => {
  showQuota = !showQuota;
  config.showQuota = showQuota;
  checkShowQuota.checked = showQuota;
  ipcRenderer.send('save-config', config);
  applyQuotaLayout();
  if (showQuota) refreshQuota();
});

checkEnableLunch.addEventListener('change', () => {
  const lunchTimesGroup = document.getElementById('lunchTimesGroup');
  if (checkEnableLunch.checked) {
    lunchTimesGroup.classList.remove('hidden');
  } else {
    lunchTimesGroup.classList.add('hidden');
  }
});

btnSaveSettings.addEventListener('click', () => {
  config.startTime = inputStartTime.value || '09:00';
  config.endTime = inputEndTime.value || '18:00';
  config.enableLunch = checkEnableLunch.checked;
  config.lunchStart = inputLunchStart.value || '12:00';
  config.lunchEnd = inputLunchEnd.value || '13:00';
  config.showQuota = checkShowQuota.checked;
  showQuota = checkShowQuota.checked;
  config.showWeekly = checkShowWeekly.checked;
  showWeekly = checkShowWeekly.checked;
  config.enableKeepAwake = checkKeepAwake.checked;
  config.alwaysOnTop = checkAlwaysOnTop.checked;

  config.enableTelegramBot = checkEnableTelegramBot.checked;

  config.enableOt = checkEnableOt.checked;
  config.salaryType = selectSalaryType.value;
  config.hourlyRate = parseFloat(inputHourlyRate.value) || 15;
  config.monthlySalary = parseFloat(inputMonthlySalary.value) || 3000;
  config.workDaysPerMonth = parseFloat(inputWorkDaysMonth.value) || 22;
  config.workHoursPerDay = parseFloat(inputWorkHoursDay.value) || 8;
  config.otMultiplier = parseFloat(inputOtMultiplier.value) || 1.5;

  config.enabledPlatforms = {
    claude: platClaude.checked,
    antigravity: platAntigravity.checked,
    cursor: platCursor.checked,
    chatgpt: platChatgpt.checked,
    deepseekApi: platApiKeys.checked
  };

  config.credentials = {
    cursorToken: inputCursorToken.value.trim(),
    deepseekKey: inputDeepseekKey.value.trim()
  };

  ipcRenderer.send('save-config', config);
  ipcRenderer.send('toggle-always-on-top', config.alwaysOnTop);
  ipcRenderer.send('toggle-telegram-bot', config.enableTelegramBot);

  toggleSettings(false);
  applyQuotaLayout();
  updateTimer();
  refreshQuota();
});

let isStudyLeisureMode = false;
let studyStartTime = null;
let lastRestReminderTime = null;

function playRestChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.16);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.16);
    osc2.stop(ctx.currentTime + 1.5);
  } catch(e) {}
}

btnConfirmOtYes.addEventListener('click', () => {
  isOtPromptAnswered = true;
  isUserWorkingOt = true;
  isStudyLeisureMode = false;
  otPromptView.classList.add('hidden');
  applyQuotaLayout();
});

btnConfirmOtNo.addEventListener('click', () => {
  isOtPromptAnswered = true;
  isUserWorkingOt = false;
  isStudyLeisureMode = true;
  studyStartTime = Date.now();
  lastRestReminderTime = Date.now();
  otPromptView.classList.add('hidden');
  applyQuotaLayout();
});

btnDismissParty.addEventListener('click', () => {
  celebrationView.classList.add('hidden');
  timerDisplay.classList.remove('hidden');
  progressSection.classList.remove('hidden');
  applyQuotaLayout();
});

function applyQuotaLayout() {
  if (isSettingsOpen || !otPromptView.classList.contains('hidden')) return;

  if (showWeekly) {
    claudeWeeklyRow.classList.remove('hidden');
  } else {
    claudeWeeklyRow.classList.add('hidden');
  }
  // Antigravity official API does not provide weekly limits, always hide dummy weekly rows!
  agGeminiWeeklyRow.classList.add('hidden');
  agClaudeWeeklyRow.classList.add('hidden');

  if (showQuota) {
    quotaSection.classList.remove('hidden');
    
    // Calculate required height based on visible sections
    const claudeVisible = !sectionClaudeApp.classList.contains('hidden');
    const agVisible = !sectionAntigravityApp.classList.contains('hidden');
    const cursorVisible = !sectionCursorApp.classList.contains('hidden');
    const chatgptVisible = !sectionChatgptApp.classList.contains('hidden');
    const apiVisible = !sectionApiKeysApp.classList.contains('hidden');

    let totalCardHeight = 0;
    if (claudeVisible) totalCardHeight += showWeekly ? 90 : 55;
    if (agVisible) totalCardHeight += 120;
    if (cursorVisible) totalCardHeight += 55;
    if (chatgptVisible) totalCardHeight += 55;
    if (apiVisible) totalCardHeight += 55;

    const otExtraHeight = (!otPayRow.classList.contains('hidden')) ? 16 : 0;

    let baseHeight = 42 + otExtraHeight + (totalCardHeight > 0 ? totalCardHeight + 10 : 0);
    baseHeight = Math.min(380, baseHeight);

    if (totalCardHeight === 0) baseHeight = 42 + otExtraHeight;

    ipcRenderer.send('resize-window', { width: 195, height: baseHeight });
  } else {
    quotaSection.classList.add('hidden');
    const otExtraHeight = (!otPayRow.classList.contains('hidden')) ? 16 : 0;
    ipcRenderer.send('resize-window', { width: 195, height: 42 + otExtraHeight });
  }
}

function toggleSettings(show) {
  if (show === undefined) show = !isSettingsOpen;
  isSettingsOpen = show;

  if (isSettingsOpen) {
    ipcRenderer.send('resize-window', { width: 230, height: 350 });
    settingsView.classList.remove('hidden');
    progressSection.classList.add('hidden');
    quotaSection.classList.add('hidden');
    celebrationView.classList.add('hidden');
    otPromptView.classList.add('hidden');
  } else {
    settingsView.classList.add('hidden');
    progressSection.classList.remove('hidden');
    applyQuotaLayout();
  }
}

function refreshQuota() {
  ipcRenderer.send('fetch-claude-quota');
}

let currentCaffeinePulses = 0;

ipcRenderer.on('caffeine-pulse', (event, data) => {
  if (data && data.count !== undefined) {
    currentCaffeinePulses = data.count;
  } else {
    currentCaffeinePulses++;
  }
  caffeineIcon.title = `☕ Caffeine Active: ${currentCaffeinePulses} pulses (Teams keep-alive active)`;
  
  caffeineIcon.classList.remove('caffeine-pulse');
  void caffeineIcon.offsetWidth; // Force reflow
  caffeineIcon.classList.add('caffeine-pulse');
});

// Check Caffeine & Update Status
function updateCaffeineState() {
  const isEnabled = checkKeepAwake.checked;
  ipcRenderer.send('set-keep-awake', isEnabled);
  if (isEnabled) {
    caffeineIcon.classList.remove('hidden');
    caffeineIcon.title = `☕ Caffeine Active: ${currentCaffeinePulses} pulses (Teams keep-alive active)`;
  } else {
    caffeineIcon.classList.add('hidden');
  }
}

function updateTimer() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  if (isStudyLeisureMode) {
    statusDot.className = 'status-indicator paused';
    statusDot.title = 'Mode: Study & Leisure (Non-OT)';
    phaseEmoji.textContent = '☕';

    const elapsedMs = Date.now() - (studyStartTime || Date.now());
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    phaseTime.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    progressBar.style.width = `${Math.min(100, (totalSecs % 1800) / 1800 * 100)}%`; // 30 min cycle fill
    otPayRow.classList.add('hidden');

    // 30-Minute Rest Reminder & Chime
    if (lastRestReminderTime && (Date.now() - lastRestReminderTime >= 30 * 60 * 1000)) {
      lastRestReminderTime = Date.now();
      playRestChime();
      try {
        new Notification("☕ 30-Minute Rest Reminder", {
          body: "You've been focused for 30 minutes! Take a break to rest your eyes and stretch your legs."
        });
      } catch(e) {}
    }

    ipcRenderer.send('update-tray-tooltip', `Study Time: ${mins}m`);
    applyQuotaLayout();
    return;
  }

  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  let isLunchNow = false;

  if (config.enableLunch) {
    const [lunchStartH, lunchStartM] = config.lunchStart.split(':').map(Number);
    const [lunchEndH, lunchEndM] = config.lunchEnd.split(':').map(Number);

    const lunchStartTotal = lunchStartH * 60 + lunchStartM;
    const lunchEndTotal = lunchEndH * 60 + lunchEndM;

    if (currentMinutes >= lunchStartTotal && currentMinutes < lunchEndTotal) {
      isLunchNow = true;
    }
  }

  updateCaffeineState();

  if (currentMinutes < startTotalMinutes) {
    statusDot.className = 'status-indicator';
    statusDot.title = 'Pre-work';
    timerDisplay.className = 'timer-text';
    // Show countdown to work start
    const minsToStart = startTotalMinutes - currentMinutes;
    const h = Math.floor(minsToStart / 60);
    const m = minsToStart % 60;
    phaseEmoji.textContent = '⏰';
    phaseTime.textContent = `Starts in ${h > 0 ? h + 'h ' : ''}${m}m`;
    progressBar.className = 'progress-bar-fill';
    progressBar.style.width = '0%';
    otPayRow.classList.add('hidden');
    otPromptView.classList.add('hidden');
    ipcRenderer.send('update-tray-tooltip', 'Not Started');
    return;
  }

  // --- AUTOMATIC OVERTIME (OT) CONFIRMATION MODAL TRIGGER ---
  if (currentMinutes >= endTotalMinutes) {
    // If OT prompt is NOT yet answered, automatically trigger the confirmation overlay!
    if (!isOtPromptAnswered) {
      otPromptView.classList.remove('hidden');
      ipcRenderer.send('resize-window', { width: 210, height: 115 });
      return;
    }

    // If user selected NO (Not working OT), exit!
    if (!isUserWorkingOt) {
      return;
    }

    // USER CONFIRMED YES (Working OT) -> Calculate & Display Red Glowing OT Timer & Pay
    const otSecondsTotal = ((currentMinutes - endTotalMinutes) * 60) + currentSeconds;
    const otHours = Math.floor(otSecondsTotal / 3600);
    const otMins = Math.floor((otSecondsTotal % 3600) / 60);
    const otSecs = Math.floor(otSecondsTotal % 60);

    const formattedOtTime = `+${String(otHours).padStart(2, '0')}:${String(otMins).padStart(2, '0')}:${String(otSecs).padStart(2, '0')}`;

    // Update Status Indicator & Glowing Red Timer
    statusDot.className = 'status-indicator overtime';
    statusDot.title = 'Status: Overtime (OT)';
    timerDisplay.className = 'timer-text overtime-text';
    phaseEmoji.textContent = '🔥';
    phaseTime.textContent = formattedOtTime;

    progressBar.className = 'progress-bar-fill overtime-fill';
    progressBar.style.width = '100%';

    // Calculate Overtime Money Earned (Supports both Hourly & Monthly Salary Calculation!)
    if (config.enableOt !== false) {
      let calculatedHourlyRate = 15;

      if (config.salaryType === 'monthly') {
        const monthly = config.monthlySalary || 3000;
        const days = config.workDaysPerMonth || 22;
        const hours = config.workHoursPerDay || 8;
        calculatedHourlyRate = monthly / (days * hours);
      } else {
        calculatedHourlyRate = config.hourlyRate || 15;
      }

      const otMultiplier = config.otMultiplier || 1.5;
      const otEffectiveRate = calculatedHourlyRate * otMultiplier;
      const otEarned = (otSecondsTotal / 3600) * otEffectiveRate;

      otMoneyVal.textContent = `+$${otEarned.toFixed(2)}`;
      otPayRow.classList.remove('hidden');
    } else {
      otPayRow.classList.add('hidden');
    }

    ipcRenderer.send('update-tray-tooltip', `OT: ${formattedOtTime}`);
    applyQuotaLayout();
    return;
  }

  // Normal Working Mode
  otPromptView.classList.add('hidden');
  otPayRow.classList.add('hidden');
  timerDisplay.className = 'timer-text';
  progressBar.className = 'progress-bar-fill';

  if (isLunchNow) {
    statusDot.className = 'status-indicator paused';
    statusDot.title = 'Status: Lunch Break';
  } else {
    statusDot.className = 'status-indicator';
    statusDot.title = 'Status: Working';
  }

  // --- Phase determination: are we counting down to lunch or to work-end? ---
  let totalWorkMinutes = endTotalMinutes - startTotalMinutes;
  let elapsedMinutes = currentMinutes - startTotalMinutes;
  let phase = 'work'; // 'work' = counting to end of day
  let phaseLabel = '';
  let phaseSecondsTotal;

  if (config.enableLunch) {
    const [lStartH, lStartM] = config.lunchStart.split(':').map(Number);
    const [lEndH, lEndM] = config.lunchEnd.split(':').map(Number);
    const lStartTotal = lStartH * 60 + lStartM;
    const lEndTotal = lEndH * 60 + lEndM;
    const lunchDurationMinutes = lEndTotal - lStartTotal;

    totalWorkMinutes -= lunchDurationMinutes;

    if (currentMinutes < lStartTotal) {
      // PHASE 1: Before lunch — count down to lunch start
      phase = 'lunch';
      phaseLabel = '🍽 → Lunch';
      phaseSecondsTotal = ((lStartTotal - currentMinutes) * 60) - currentSeconds;
      elapsedMinutes = currentMinutes - startTotalMinutes;
    } else if (currentMinutes >= lStartTotal && currentMinutes < lEndTotal) {
      // Currently IN lunch — count down to lunch end
      phase = 'lunch-end';
      phaseLabel = '🍽 Break ends in';
      phaseSecondsTotal = ((lEndTotal - currentMinutes) * 60) - currentSeconds;
      elapsedMinutes = lStartTotal - startTotalMinutes;
    } else {
      // PHASE 2: After lunch — count to work end
      phase = 'work';
      phaseLabel = '🏁 → End of Work';
      elapsedMinutes -= lunchDurationMinutes;
    }
  } else {
    phaseLabel = '🏁 → End of Work';
  }

  let remainingSecondsTotal;
  if (phase === 'lunch' || phase === 'lunch-end') {
    remainingSecondsTotal = phaseSecondsTotal;
  } else {
    const remainingMinutesTotal = totalWorkMinutes - elapsedMinutes;
    remainingSecondsTotal = (remainingMinutesTotal * 60) - currentSeconds;
  }

  remainingSecondsTotal = Math.max(0, remainingSecondsTotal);

  const rHours = Math.floor(remainingSecondsTotal / 3600);
  const rMins = Math.floor((remainingSecondsTotal % 3600) / 60);
  const rSecs = Math.floor(remainingSecondsTotal % 60);

  const formattedTime = `${String(rHours).padStart(2, '0')}:${String(rMins).padStart(2, '0')}:${String(rSecs).padStart(2, '0')}`;

  // Split emoji (natural color) from time digits (themed color)
  const emojiMap = { 'lunch': '🍽', 'lunch-end': '🍽', 'work': '🏁' };
  phaseEmoji.textContent = emojiMap[phase] || '';
  phaseTime.textContent = formattedTime;
  ipcRenderer.send('update-tray-tooltip', formattedTime);

  // Progress bar — always show overall workday progress
  const progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / (totalWorkMinutes || 1)) * 100));
  progressBar.style.width = `${progressPercent}%`;
}

// Timers
setInterval(updateTimer, 1000);
updateTimer();

setInterval(refreshQuota, 30000);
refreshQuota();

// ======================== Spotify Integration ========================
const spotifyBar          = document.getElementById('spotifyBar');
const spotifyTrack        = document.getElementById('spotifyTrack');
const spotifyArtist       = document.getElementById('spotifyArtist');
const spotifyRollcallName = document.getElementById('spotifyRollcallName');
const fireworksLayer      = document.getElementById('fireworksLayer');
const confettiLayer       = document.getElementById('confettiLayer');
const christmasLayer      = document.getElementById('christmasLayer');
const btnSpotifyPlay      = document.getElementById('btnSpotifyPlay');
const btnSpotifyNext      = document.getElementById('btnSpotifyNext');
const btnSpotifyPrev      = document.getElementById('btnSpotifyPrev');
const spotifyProgressFill = document.getElementById('spotifyProgressFill');
const spotifyProgressBg   = document.getElementById('spotifyProgressBg');
const spotifyTimeText     = document.getElementById('spotifyTimeText');
const spotifyNextRow      = document.getElementById('spotifyNextRow');
const spotifyNextText     = document.getElementById('spotifyNextText');
const spotifyConnectRow   = document.getElementById('spotifyConnectRow');
const btnSpotifyConnect   = document.getElementById('btnSpotifyConnect');
const btnSpotifyMore      = document.getElementById('btnSpotifyMore');
const spotifyPopover      = document.getElementById('spotifyPopover');
const spotifyVolumeSlider = document.getElementById('spotifyVolumeSlider');
const spotifyDeviceList   = document.getElementById('spotifyDeviceList');

let spotifyConnected = false;

// Optimistic state — Spotify's WinRT status is unreliable, track ourselves
let spotifyIsPlaying  = false;  // assume paused until we know
let spotifyLastTrack  = null;   // detect track changes

// Progress tick state — updates once per second, not smooth/interpolated
let currentPosSec = 0;
let currentDurSec = 0;
let lastSyncTime  = Date.now();
let progressTickTimer = null;

function formatSecs(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setPlayIcon(playing) {
  btnSpotifyPlay.textContent = playing ? '⏸' : '▶';
}

// Artist fan colors (應援色) — override the day-of-week accent for known artists
const ARTIST_THEME_CLASSES = [
  'artist-twice', 'artist-ag5', 'artist-taylorswift', 'artist-mayday', 'artist-weibird',
  // TWICE members
  'artist-nayeon', 'artist-jeongyeon', 'artist-momo', 'artist-sana',
  'artist-jihyo', 'artist-mina', 'artist-dahyun', 'artist-chaeyoung', 'artist-tzuyu',
  // TWICE sub-units
  'artist-misamo', 'artist-taste',
  // Candy Bong glow animation + Feel Special rollcall
  'candy-bong-active', 'feel-special-rollcall'
];

// TWICE member detection — checks artist name AND track name
function detectTwiceMember(artist, track) {
  const a = (artist || '').toLowerCase();
  const t = (track || '').toLowerCase();
  const combined = a + ' ' + t;

  // Sub-units first (higher priority than solo matches)
  if (combined.includes('misamo')) return 'artist-misamo';
  if (combined.includes('taste') && (a.includes('tzuyu') || a.includes('sana') || t.includes('tzuyu') || t.includes('sana'))) return 'artist-taste';

  // Solo detection: artist name takes priority, fallback to track name
  // Use strict word-boundary-style checks to avoid false matches

  // Nayeon 娜琏 (also romanized Na-yeon)
  if (a === 'nayeon' || a === '나연' || a.includes('nayeon') || t.includes('nayeon')) return 'artist-nayeon';

  // Jeongyeon 定延
  if (a === 'jeongyeon' || a === '정연' || a.includes('jeongyeon') || t.includes('jeongyeon')) return 'artist-jeongyeon';

  // Momo — careful not to match 'moment' etc in track names
  if (a === 'momo' || a === '모모' || a.includes('momo') || t === 'momo') return 'artist-momo';

  // Sana
  if (a === 'sana' || a === '사나' || a.includes('sana') || t === 'sana') return 'artist-sana';

  // Jihyo 志效
  if (a === 'jihyo' || a === '지효' || a.includes('jihyo') || t.includes('jihyo')) return 'artist-jihyo';

  // Mina — careful with common English word 'mina'
  if (a === 'mina' || a === '미나' || a.includes('mina') || t === 'mina') return 'artist-mina';

  // Dahyun 多贤
  if (a === 'dahyun' || a === '다현' || a.includes('dahyun') || t.includes('dahyun')) return 'artist-dahyun';

  // Chaeyoung 彩瑛 (also Chae)
  if (a === 'chaeyoung' || a === '채영' || a.includes('chaeyoung') || t.includes('chaeyoung')) return 'artist-chaeyoung';

  // Tzuyu 子瑜
  if (a === 'tzuyu' || a === '쯔위' || a.includes('tzuyu') || t.includes('tzuyu')) return 'artist-tzuyu';

  return null;
}

function applyArtistTheme(artist, track) {
  const original = artist || '';
  const lower = original.toLowerCase();
  spotifyBar.classList.remove(...ARTIST_THEME_CLASSES);

  // 1. Check for TWICE member / sub-unit first
  const memberClass = detectTwiceMember(artist, track);
  if (memberClass) {
    spotifyBar.classList.add(memberClass);
    spotifyBar.classList.add('candy-bong-active'); // 🕯️ Candy Bong breathing glow!
    return;
  }

  // 2. TWICE group (only if artist explicitly says TWICE)
  if (lower.includes('twice')) {
    spotifyBar.classList.add('artist-twice');
    spotifyBar.classList.add('candy-bong-active'); // 🕯️ Candy Bong breathing glow!
    return;
  }

  // 3. Other artists — no candy bong
  spotifyBar.classList.remove('candy-bong-active');
  if (original.includes('告五人')) {
    spotifyBar.classList.add('artist-ag5');
  } else if (lower.includes('taylor swift')) {
    spotifyBar.classList.add('artist-taylorswift');
  } else if (original.includes('五月天') || lower.includes('mayday')) {
    spotifyBar.classList.add('artist-mayday');
  } else if (original.includes('韦礼安') || original.includes('韋禮安') || lower.includes('weibird')) {
    spotifyBar.classList.add('artist-weibird');
  }
}

// ── Feel Special Outro Name Roll Call (3:06 ~ 3:16, 10s total) ───────────
// Korean → Momo-chan! Sana-chan! Mina-chan! (direct, no jang beats) → Korean
// Segments are contiguous (each end === next start) so there's never a gap
// where the wrong color (or a color-less flash) could show. Reverts to
// normal TWICE candy bong the instant position >= 196 (3:16).
const FEEL_SPECIAL_ROLLCALL = [
  { member: 'Im Nayeon',      start: 186, end: 187, rgb: '162, 218, 226' },
  { member: 'Yoo Jeongyeon',  start: 187, end: 188, rgb: '200, 223, 82'  },
  { member: 'Momo Chan',      start: 188, end: 189, rgb: '242, 122, 143' }, // Momo-chan 🩷
  { member: 'Sana Chan',      start: 189, end: 190, rgb: '145, 93, 163'  }, // Sana-chan 💜
  { member: 'Park Jihyo',     start: 190, end: 191, rgb: '251, 203, 43'  },
  { member: 'Mina Chan',      start: 191, end: 192, rgb: '78, 192, 168'  }, // Mina-chan 🩵
  { member: 'Kim Dahyun',     start: 192, end: 193, rgb: '220, 230, 235' },
  { member: 'Son Chaeyoung',  start: 193, end: 194, rgb: '226, 35, 26'   },
  { member: 'Chou Tzuyu',     start: 194, end: 196, rgb: '100, 120, 240' },
];

function checkFeelSpecialRollcall(trackName, artistName, positionSec) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  if (!t.includes('feel special') || !a.includes('twice')) {
    // Not Feel Special — remove rollcall class if it was active
    if (spotifyBar.classList.contains('feel-special-rollcall')) {
      spotifyBar.classList.remove('feel-special-rollcall');
      spotifyBar.style.removeProperty('--glow-rgb');
      spotifyRollcallName.classList.remove('active');
    }
    return false;
  }

  const seg = FEEL_SPECIAL_ROLLCALL.find(s => positionSec >= s.start && positionSec < s.end);
  if (seg) {
    spotifyBar.classList.remove('candy-bong-active');
    spotifyBar.classList.add('feel-special-rollcall');
    spotifyBar.style.setProperty('--glow-rgb', seg.rgb);
    // Show the member's name alongside the breathing glow — colors alone
    // aren't always easy to tell apart at a glance.
    spotifyRollcallName.textContent = seg.member;
    spotifyRollcallName.classList.add('active');
    return true;
  } else {
    // Outside rollcall window — restore normal candy bong
    if (spotifyBar.classList.contains('feel-special-rollcall')) {
      spotifyBar.classList.remove('feel-special-rollcall');
      spotifyBar.style.removeProperty('--glow-rgb');
      spotifyBar.classList.add('candy-bong-active');
      spotifyRollcallName.classList.remove('active');
    }
    return false;
  }
}

// ── One Spark Fireworks (2:34 ~ 3:03) ────────────────────────────────────
// Layers a burst of sparks on top of the normal TWICE candy bong glow —
// no member colors here, just fireworks for the song's climax.
const ONE_SPARK_START = 154; // 2:34
const ONE_SPARK_END   = 183; // 3:03
const FIREWORK_COLORS = ['#FFD966', '#FF6FA5', '#7FE7FF', '#C6FF6B', '#FFFFFF', '#B98CFF'];
let fireworksSpawnTimer = null;

function spawnFireworkBurst() {
  const originX = 15 + Math.random() * 70; // % across the bar
  const originY = 20 + Math.random() * 55;
  const count = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 22;
    spark.style.setProperty('--x', originX + '%');
    spark.style.setProperty('--y', originY + '%');
    spark.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
    spark.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
    spark.style.setProperty('--spark-color', FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    spark.style.animationDelay = (Math.random() * 0.08) + 's';
    fireworksLayer.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove());
    setTimeout(() => spark.remove(), 1200); // fallback in case animationend is missed
  }
}

function stopFireworks() {
  if (fireworksSpawnTimer) {
    clearInterval(fireworksSpawnTimer);
    fireworksSpawnTimer = null;
  }
  spotifyBar.classList.remove('fireworks-active');
  fireworksLayer.innerHTML = '';
}

function checkOneSparkFireworks(trackName, artistName, positionSec) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const inWindow = t.includes('one spark') && a.includes('twice') &&
    positionSec >= ONE_SPARK_START && positionSec < ONE_SPARK_END;

  if (inWindow) {
    if (!fireworksSpawnTimer) {
      spotifyBar.classList.add('fireworks-active');
      spawnFireworkBurst();
      fireworksSpawnTimer = setInterval(spawnFireworkBurst, 380);
    }
  } else if (fireworksSpawnTimer) {
    stopFireworks();
  }
}

// ── MISAMO Confetti (1:30~1:41, 2:10~2:19) ───────────────────────────────
// Paper pieces fall through the bar on top of the normal MISAMO glow.
const CONFETTI_WINDOWS = [
  { start: 90,  end: 101 }, // 1:30 - 1:41
  { start: 130, end: 139 }, // 2:10 - 2:19
];
const CONFETTI_COLORS = ['#4EC0A8', '#915DA3', '#F27A8F', '#FFFFFF', '#FFD966'];
let confettiSpawnTimer = null;

function spawnConfettiPiece() {
  const piece = document.createElement('span');
  piece.className = 'confetti-piece';
  const rotStart = Math.random() * 360;
  const rotEnd = rotStart + 200 + Math.random() * 240;
  piece.style.setProperty('--cx', (Math.random() * 100) + '%');
  piece.style.setProperty('--confetti-color', CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
  piece.style.setProperty('--rot-start', rotStart + 'deg');
  piece.style.setProperty('--rot-end', rotEnd + 'deg');
  piece.style.setProperty('--drift', ((Math.random() * 40) - 20) + 'px');
  piece.style.setProperty('--fall-dur', (0.9 + Math.random() * 0.5) + 's');
  confettiLayer.appendChild(piece);
  piece.addEventListener('animationend', () => piece.remove());
  setTimeout(() => piece.remove(), 1700); // fallback in case animationend is missed
}

function spawnConfettiBurst() {
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) spawnConfettiPiece();
}

function stopConfetti() {
  if (confettiSpawnTimer) {
    clearInterval(confettiSpawnTimer);
    confettiSpawnTimer = null;
  }
  confettiLayer.innerHTML = '';
}

function checkMisamoConfetti(trackName, artistName, positionSec) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const inWindow = t.includes('confetti') && a.includes('misamo') &&
    CONFETTI_WINDOWS.some(w => positionSec >= w.start && positionSec < w.end);

  if (inWindow) {
    if (!confettiSpawnTimer) {
      spawnConfettiBurst();
      confettiSpawnTimer = setInterval(spawnConfettiBurst, 220);
    }
  } else if (confettiSpawnTimer) {
    stopConfetti();
  }
}

// ── Merry & Happy Christmas Atmosphere (whole song) ──────────────────────
// Falling snow + a twinkling red/green/gold light string, layered on top of
// the normal TWICE glow for the entire track (not a specific timestamp).
// Elements are built once and loop via CSS instead of being re-spawned on
// every tick, since this can run for the whole song length.
const TWINKLE_COLORS = ['#ff4d4d', '#3ecf6b', '#ffd54a'];
let christmasActive = false;

function startChristmasEffect() {
  if (christmasActive) return;
  christmasActive = true;

  for (let i = 0; i < 10; i++) {
    const flake = document.createElement('span');
    flake.className = 'snowflake';
    flake.style.setProperty('--sx', (Math.random() * 100) + '%');
    flake.style.setProperty('--snow-size', (2 + Math.random() * 2.5) + 'px');
    flake.style.setProperty('--snow-dur', (3 + Math.random() * 2.5) + 's');
    flake.style.setProperty('--snow-delay', (Math.random() * 4) + 's');
    flake.style.setProperty('--snow-drift', ((Math.random() * 30) - 15) + 'px');
    christmasLayer.appendChild(flake);
  }

  for (let i = 0; i < 8; i++) {
    const light = document.createElement('span');
    light.className = 'twinkle-light';
    light.style.setProperty('--tx-x', (4 + (i * 92 / 7)) + '%');
    light.style.setProperty('--tx-y', (Math.random() * 12) + '%');
    light.style.setProperty('--twinkle-color', TWINKLE_COLORS[i % TWINKLE_COLORS.length]);
    light.style.setProperty('--twinkle-dur', (1 + Math.random() * 1) + 's');
    light.style.setProperty('--twinkle-delay', (Math.random() * 1.5) + 's');
    christmasLayer.appendChild(light);
  }
}

function stopChristmasEffect() {
  if (!christmasActive) return;
  christmasActive = false;
  christmasLayer.innerHTML = '';
}

function checkMerryHappyChristmas(trackName, artistName) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const isMerryHappy = t.includes('merry') && t.includes('happy') && a.includes('twice');

  if (isMerryHappy) {
    startChristmasEffect();
  } else {
    stopChristmasEffect();
  }
}

function tickSmoothProgress() {
  if (currentDurSec > 0) {
    const now = Date.now();
    const dt = spotifyIsPlaying ? (now - lastSyncTime) / 1000 : 0;
    const estPos = Math.min(currentDurSec, Math.max(0, currentPosSec + dt));
    const pct = Math.min(100, Math.max(0, (estPos / currentDurSec) * 100));

    spotifyProgressFill.style.width = `${pct}%`;
    spotifyTimeText.textContent = `${formatSecs(estPos)} / ${formatSecs(currentDurSec)}`;

    // 🎀 Feel Special outro name roll call — light up each member's color!
    checkFeelSpecialRollcall(spotifyTrack.textContent, spotifyArtist.textContent, estPos);
    checkOneSparkFireworks(spotifyTrack.textContent, spotifyArtist.textContent, estPos);
    checkMisamoConfetti(spotifyTrack.textContent, spotifyArtist.textContent, estPos);
  } else {
    spotifyProgressFill.style.width = '0%';
    spotifyTimeText.textContent = '0:00 / 0:00';
  }
}

function updateSpotifyUI(data) {
  if (!data || !data.running) {
    spotifyBar.style.display = 'none';
    if (progressTickTimer) clearInterval(progressTickTimer);
    progressTickTimer = null;
    stopFireworks();
    stopConfetti();
    stopChristmasEffect();
    return;
  }
  spotifyBar.style.display = 'flex';

  // Synchronize real play/pause state from Windows Media Session
  spotifyIsPlaying = !data.paused;

  // Show track name always and update title tooltips for full song visibility
  if (data.track) {
    const fullText = `${data.track}${data.artist ? ' - ' + data.artist : ''}`;
    spotifyTrack.textContent = data.track;
    spotifyArtist.textContent = data.artist || '';
    spotifyBar.title = fullText;
    spotifyTrack.title = data.track;
    spotifyArtist.title = data.artist || '';
    spotifyLastTrack = data.track + '|' + (data.artist || '');
    applyArtistTheme(data.artist, data.track);
    checkMerryHappyChristmas(data.track, data.artist);
  } else {
    spotifyTrack.textContent = 'Spotify';
    spotifyArtist.textContent = '';
    spotifyBar.title = 'Spotify';
    spotifyTrack.title = '';
    spotifyArtist.title = '';
    applyArtistTheme('', '');
    checkMerryHappyChristmas('', '');
  }

  // Smooth position reconciliation
  const incomingPos = Math.max(0, data.position_sec || 0);
  const incomingDur = Math.max(0, data.duration_sec || 0);
  const now = Date.now();

  currentDurSec = incomingDur;

  // Reflect the Web API's device volume in the slider, unless the popover is
  // open (don't fight the user while they're dragging it)
  if (typeof data.volumePercent === 'number' && spotifyPopover.classList.contains('hidden')) {
    spotifyVolumeSlider.value = data.volumePercent;
  }

  if (!spotifyIsPlaying) {
    // PAUSED: Freeze position completely, stop the per-second tick loop!
    currentPosSec = incomingPos;
    lastSyncTime = now;
    if (progressTickTimer) {
      clearInterval(progressTickTimer);
      progressTickTimer = null;
    }
    // Render static paused state cleanly once
    if (currentDurSec > 0) {
      const pct = Math.min(100, Math.max(0, (currentPosSec / currentDurSec) * 100));
      spotifyProgressFill.style.width = `${pct}%`;
      spotifyTimeText.textContent = `${formatSecs(currentPosSec)} / ${formatSecs(currentDurSec)}`;
    } else {
      spotifyProgressFill.style.width = '0%';
      spotifyTimeText.textContent = '0:00 / 0:00';
    }
  } else {
    // PLAYING: Reconcile position if difference > 2.5s
    const currentEst = currentPosSec + (now - lastSyncTime) / 1000;
    if (Math.abs(incomingPos - currentEst) > 2.5) {
      currentPosSec = incomingPos;
      lastSyncTime = now;
    }
    if (!progressTickTimer) {
      tickSmoothProgress();
      // 200ms resolution — 1000ms was too coarse for the 1s-wide rollcall
      // windows and would occasionally skip a member's color entirely.
      progressTickTimer = setInterval(tickSmoothProgress, 200);
    }
  }

  setPlayIcon(spotifyIsPlaying);
  if (data.repeatState) {
    updateRepeatUI(data.repeatState);
  }
}

let spotifyRepeatState = 'off';
function updateRepeatUI(state) {
  spotifyRepeatState = state || 'off';
  if (!spotifyConnected) {
    btnSpotifyRepeat.classList.add('hidden');
    return;
  }
  btnSpotifyRepeat.classList.remove('hidden');

  if (spotifyRepeatState === 'track') {
    btnSpotifyRepeat.textContent = '🔂';
    btnSpotifyRepeat.classList.add('active');
    btnSpotifyRepeat.title = 'Repeat Mode: One';
  } else if (spotifyRepeatState === 'context') {
    btnSpotifyRepeat.textContent = '🔁';
    btnSpotifyRepeat.classList.add('active');
    btnSpotifyRepeat.title = 'Repeat Mode: All';
  } else {
    btnSpotifyRepeat.textContent = '🔁';
    btnSpotifyRepeat.classList.remove('active');
    btnSpotifyRepeat.title = 'Repeat Mode: Off';
  }
}

ipcRenderer.on('spotify-update', (event, data) => {
  updateSpotifyUI(data);
});

// ─── Up Next (requires connecting a Spotify account via Web API) ───
function showSpotifyNext(next) {
  if (next && next.track) {
    spotifyNextText.textContent = next.artist ? `${next.track} — ${next.artist}` : next.track;
    spotifyNextRow.classList.remove('hidden');
    spotifyConnectRow.classList.add('hidden');
  } else {
    spotifyNextRow.classList.add('hidden');
  }
}

function showSpotifyConnectPrompt(show) {
  spotifyConnectRow.classList.toggle('hidden', !show);
  if (show) spotifyNextRow.classList.add('hidden');
  spotifyConnected = !show;
  btnSpotifyMore.classList.toggle('hidden', show);
  btnSpotifyRepeat.classList.toggle('hidden', show);
  if (show) closeSpotifyPopover();
}

ipcRenderer.on('spotify-next-track', (event, next) => {
  showSpotifyNext(next);
});

ipcRenderer.invoke('spotify-auth-status').then((status) => {
  showSpotifyConnectPrompt(!status.connected);
}).catch(() => {});

btnSpotifyConnect.addEventListener('click', () => {
  btnSpotifyConnect.textContent = 'Waiting for Spotify login…';
  btnSpotifyConnect.disabled = true;
  ipcRenderer.invoke('spotify-connect').then((result) => {
    btnSpotifyConnect.disabled = false;
    if (result && result.success) {
      showSpotifyConnectPrompt(false);
    } else {
      btnSpotifyConnect.textContent = 'Connect failed — tap to retry';
    }
  }).catch(() => {
    btnSpotifyConnect.disabled = false;
    btnSpotifyConnect.textContent = 'Connect failed — tap to retry';
  });
});

// ─── Seek — click anywhere on the progress bar to jump there ───
spotifyProgressBg.addEventListener('click', (e) => {
  if (!spotifyConnected || currentDurSec <= 0) return;
  const rect = spotifyProgressBg.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  const seekSec = ratio * currentDurSec;

  // Optimistic UI: jump immediately instead of waiting for the next poll
  currentPosSec = seekSec;
  lastSyncTime = Date.now();
  tickSmoothProgress();

  ipcRenderer.send('spotify-seek', Math.round(seekSec * 1000));
});

// ─── Devices & Volume popover ───
function closeSpotifyPopover() {
  spotifyPopover.classList.add('hidden');
}

function deviceIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'computer') return '💻';
  if (t === 'smartphone') return '📱';
  if (t === 'speaker') return '🔊';
  if (t === 'tv') return '📺';
  return '🎧';
}

function loadSpotifyDevices() {
  spotifyDeviceList.textContent = '';
  ipcRenderer.invoke('spotify-get-devices').then((devices) => {
    spotifyDeviceList.textContent = '';
    if (!devices || devices.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'spotify-device-empty';
      empty.textContent = 'No devices found';
      spotifyDeviceList.appendChild(empty);
      return;
    }
    devices.forEach((d) => {
      const item = document.createElement('div');
      item.className = 'spotify-device-item' + (d.isActive ? ' active' : '');
      item.textContent = `${deviceIcon(d.type)} ${d.name}`;
      item.addEventListener('click', () => {
        ipcRenderer.send('spotify-switch-device', d.id);
        closeSpotifyPopover();
      });
      spotifyDeviceList.appendChild(item);
    });
  }).catch(() => {});
}

btnSpotifyMore.addEventListener('click', () => {
  const isHidden = spotifyPopover.classList.contains('hidden');
  if (isHidden) {
    spotifyPopover.classList.remove('hidden');
    loadSpotifyDevices();
  } else {
    closeSpotifyPopover();
  }
});

document.addEventListener('click', (e) => {
  if (!spotifyPopover.classList.contains('hidden') &&
      !spotifyPopover.contains(e.target) && e.target !== btnSpotifyMore) {
    closeSpotifyPopover();
  }
});

spotifyVolumeSlider.addEventListener('input', () => {
  ipcRenderer.send('spotify-set-volume', Number(spotifyVolumeSlider.value));
});

ipcRenderer.on('non-working-app-active', () => {
  const now = new Date();
  const day = now.getDay();
  const isWeekendDay = (day === 0 || day === 6);

  const [sH, sM] = (config.startTime || '09:00').split(':').map(Number);
  const [eH, eM] = (config.endTime || '18:00').split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  const isOffHours = isWeekendDay || (currentMins < startMins || currentMins >= endMins);

  if (isOffHours && !isOtPromptAnswered && !isSettingsOpen) {
    otPromptView.classList.remove('hidden');
    applyQuotaLayout();
  }
});

btnSpotifyPlay.addEventListener('click', () => {
  spotifyIsPlaying = !spotifyIsPlaying;
  lastSyncTime = Date.now();
  setPlayIcon(spotifyIsPlaying);
  ipcRenderer.send('spotify-play-pause');
});

btnSpotifyNext.addEventListener('click', () => {
  ipcRenderer.send('spotify-next');
  spotifyIsPlaying = true;
  lastSyncTime = Date.now();
  setPlayIcon(true);
});

btnSpotifyPrev.addEventListener('click', () => {
  ipcRenderer.send('spotify-prev');
  spotifyIsPlaying = true;
  lastSyncTime = Date.now();
  setPlayIcon(true);
});

btnSpotifyRepeat.addEventListener('click', () => {
  if (!spotifyConnected) return;
  let nextState = 'off';
  if (spotifyRepeatState === 'off') nextState = 'context';
  else if (spotifyRepeatState === 'context') nextState = 'track';
  else nextState = 'off';

  updateRepeatUI(nextState);
  ipcRenderer.send('spotify-repeat', nextState);
});
