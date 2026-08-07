const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const configPath = path.join(app.getPath('userData'), 'user-config.json');

const defaultConfig = {
  startTime: '09:00',
  endTime: '18:00',
  enableLunch: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  alwaysOnTop: true,
  enableKeepAwake: true,
  showQuota: true,
  showWeekly: true,
  theme: 'dark', // 'dark' or 'light'
  enableTelegramBot: true, // Telegram Bot always on by default, user can toggle in Settings!
  // Overtime (OT) Mode & Salary Mode Configs
  enableOt: true,
  salaryType: 'hourly', // 'hourly' or 'monthly'
  hourlyRate: 15,
  monthlySalary: 3000,
  workDaysPerMonth: 22,
  workHoursPerDay: 8,
  otMultiplier: 1.5,
  // Universal AI Platform Selectors
  enabledPlatforms: {
    claude: true,
    antigravity: true,
    cursor: false,
    chatgpt: false,
    openaiApi: false,
    deepseekApi: false
  },
  // Universal Credentials / API Keys
  credentials: {
    cursorToken: '',
    chatgptCookie: '',
    openaiKey: '',
    deepseekKey: ''
  },
  x: null,
  y: null,
  width: 170,
  height: 330
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      return {
        ...defaultConfig,
        ...parsed,
        enabledPlatforms: { ...defaultConfig.enabledPlatforms, ...(parsed.enabledPlatforms || {}) },
        credentials: { ...defaultConfig.credentials, ...(parsed.credentials || {}) }
      };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return defaultConfig;
}

function saveConfig(newConfig) {
  try {
    const current = loadConfig();
    const updated = {
      ...current,
      ...newConfig,
      enabledPlatforms: { ...current.enabledPlatforms, ...(newConfig.enabledPlatforms || {}) },
      credentials: { ...current.credentials, ...(newConfig.credentials || {}) }
    };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

module.exports = { loadConfig, saveConfig };
