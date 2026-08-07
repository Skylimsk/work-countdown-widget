const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { fetchAntigravityRealQuota, fetchCursorRealQuota } = require('./agQuotaService');

const logFile = "C:\\Users\\skyli\\widget-debug.log";

function writeLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch (e) {}
}

let quotaCache = {
  claudeRunning: true,
  antigravityRunning: true,
  claude: { session: 0, weekly: 0, sessionReset: '', weeklyReset: '' },
  antigravityGemini: { session: 0, weekly: 0, sessionResetText: 'Connecting...' },
  antigravityClaudeGpt: { session: 0, weekly: 0, sessionResetText: 'Connecting...' },
  cursor: { fastPct: 100, numRequests: 0, maxRequests: 500 },
  error: null
};

function getRunnerPath() {
  const candidates = [
    path.join(__dirname, 'runner.py')
  ];

  if (process.resourcesPath) {
    candidates.unshift(path.join(process.resourcesPath, 'runner.py'));
    candidates.push(path.join(process.resourcesPath, 'app', 'runner.py'));
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'runner.py'));
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return candidates[0];
}

function checkRunningProcesses() {
  return new Promise((resolve) => {
    exec('tasklist /NH', (err, stdout) => {
      let claudeRunning = false;
      let antigravityRunning = false;

      if (!err && stdout) {
        const lower = stdout.toLowerCase();
        claudeRunning = lower.includes('claude.exe');
        antigravityRunning = lower.includes('antigravity.exe');
      } else {
        claudeRunning = true;
        antigravityRunning = true;
      }

      writeLog(`Process check result: claudeRunning=${claudeRunning}, antigravityRunning=${antigravityRunning}`);
      resolve({ claudeRunning, antigravityRunning });
    });
  });
}

async function fetchClaudeQuota() {
  const procStatus = await checkRunningProcesses();
  quotaCache.claudeRunning = procStatus.claudeRunning;
  quotaCache.antigravityRunning = procStatus.antigravityRunning;

  return new Promise((resolve) => {
    const runnerPath = getRunnerPath();
    const runnerDir = path.dirname(runnerPath);

    execFile('python', [runnerPath], { cwd: runnerDir }, async (err, stdout, stderr) => {
      if (err || !stdout) {
        writeLog(`Python runner execution error or empty stdout: ${err}`);
        resolve(quotaCache);
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.usage) {
          const limits = parsed.usage.limits || [];
          let sessionPct = 0;
          let weeklyPct = 0;
          let sessionReset = parsed.usage.five_hour?.resets_at || '';
          let weeklyReset = parsed.usage.seven_day?.resets_at || '';

          if (parsed.usage.five_hour && parsed.usage.five_hour.utilization !== undefined) {
            sessionPct = Math.round(parsed.usage.five_hour.utilization);
          }
          if (parsed.usage.seven_day && parsed.usage.seven_day.utilization !== undefined) {
            weeklyPct = Math.round(parsed.usage.seven_day.utilization);
          }

          for (const item of limits) {
            if (item.kind === 'session') {
              if (item.percent !== undefined && item.percent !== null) sessionPct = item.percent;
              if (item.resets_at) sessionReset = item.resets_at;
            } else if (item.kind === 'weekly_all' || item.group === 'weekly') {
              if (item.percent !== undefined && item.percent !== null) weeklyPct = item.percent;
              if (item.resets_at) weeklyReset = item.resets_at;
            }
          }

          // 1. Standalone Claude App
          quotaCache.claude = {
            session: sessionPct,
            weekly: weeklyPct,
            sessionReset: sessionReset,
            weeklyReset: weeklyReset
          };

          // 2. Real-time Google Antigravity Sub-models Activity calculation!
          try {
            const agReal = await fetchAntigravityRealQuota();
            if (agReal) {
              if (agReal.error) {
                // Directly display the real error message to UI! No fallback!
                quotaCache.antigravityGemini = {
                  session: 0,
                  weekly: 0,
                  sessionResetText: agReal.error,
                  weeklyResetText: ''
                };
                quotaCache.antigravityClaudeGpt = {
                  session: 0,
                  weekly: 0,
                  sessionResetText: agReal.error,
                  weeklyResetText: ''
                };
              } else {
                function formatTimeRemaining(isoStr) {
                  if (!isoStr) return '';
                  const targetDate = new Date(isoStr);
                  const diffMs = targetDate.getTime() - Date.now();
                  if (diffMs <= 0) return 'ready';

                  const totalMins = Math.floor(diffMs / (1000 * 60));
                  const days = Math.floor(totalMins / (60 * 24));
                  const hours = Math.floor((totalMins % (60 * 24)) / 60);
                  const mins = totalMins % 60;

                  let countdownStr = '';
                  if (days > 0) countdownStr = `${days}d ${hours}h`;
                  else if (hours > 0) countdownStr = `${hours}h ${mins}m`;
                  else countdownStr = `${mins}m`;

                  const now = new Date();
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

                quotaCache.antigravityGemini = {
                  session: agReal.gemini.session,
                  weekly: agReal.gemini.weekly,
                  sessionResetText: formatTimeRemaining(agReal.gemini.sessionReset),
                  weeklyResetText: formatTimeRemaining(agReal.gemini.weeklyReset),
                  sessionResetIso: agReal.gemini.sessionReset,
                  weeklyResetIso: agReal.gemini.weeklyReset
                };

                quotaCache.antigravityClaudeGpt = {
                  session: agReal.claudeGpt.session,
                  weekly: agReal.claudeGpt.weekly,
                  sessionResetText: formatTimeRemaining(agReal.claudeGpt.sessionReset),
                  weeklyResetText: formatTimeRemaining(agReal.claudeGpt.weeklyReset),
                  sessionResetIso: agReal.claudeGpt.sessionReset,
                  weeklyResetIso: agReal.claudeGpt.weeklyReset
                };
              }
            }
          } catch (agErr) {
            writeLog(`Antigravity real-time quota fetch warning: ${agErr}`);
            quotaCache.antigravityGemini.sessionResetText = `ERR: ${agErr.message}`;
          }

          // 3. Real-time Cursor Quota calculation
          try {
            const { loadConfig } = require('./store');
            const cfg = loadConfig();
            if (cfg && cfg.credentials && cfg.credentials.cursorToken) {
              const curData = await fetchCursorRealQuota(cfg.credentials.cursorToken);
              if (curData) {
                quotaCache.cursor = {
                  fastPct: curData.remainingPct,
                  numRequests: curData.numRequests,
                  maxRequests: curData.maxRequests
                };
              }
            }
          } catch (curErr) {
            writeLog(`Cursor quota fetch warning: ${curErr}`);
          }

          quotaCache.error = null;
        } else if (parsed.error) {
          quotaCache.error = parsed.error;
        }
      } catch (e) {
        writeLog(`Failed to parse quota output: ${e}`);
      }
      writeLog(`Sending quotaCache: claudeRunning=${quotaCache.claudeRunning}, antigravityRunning=${quotaCache.antigravityRunning}`);
      resolve(quotaCache);
    });
  });
}

module.exports = { fetchClaudeQuota, writeLog, logFile };
