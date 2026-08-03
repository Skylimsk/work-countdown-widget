const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { fetchAntigravityRealQuota } = require('./agQuotaService');

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
  antigravityGemini: { session: 100, weekly: 100, sessionResetHours: 4, sessionResetMins: 58, weeklyResetDays: 6 },
  antigravityClaudeGpt: { session: 100, weekly: 100, sessionResetHours: 5, sessionResetMins: 0, weeklyResetDays: 7 },
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
    // Standard tasklist process name check (rock solid & instant)
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
              function formatTimeRemaining(isoStr) {
                if (!isoStr) return '';
                const diffMs = new Date(isoStr).getTime() - Date.now();
                if (diffMs <= 0) return 'ready';
                const totalMins = Math.floor(diffMs / (1000 * 60));
                const days = Math.floor(totalMins / (60 * 24));
                const hours = Math.floor((totalMins % (60 * 24)) / 60);
                const mins = totalMins % 60;

                if (days > 0) return `${days}d ${hours}h`;
                if (hours > 0) return `${hours}h ${mins}m`;
                return `${mins}m`;
              }

              quotaCache.antigravityGemini = {
                session: agReal.gemini.session,
                weekly: agReal.gemini.weekly,
                sessionResetText: formatTimeRemaining(agReal.gemini.sessionReset),
                weeklyResetText: formatTimeRemaining(agReal.gemini.weeklyReset)
              };

              quotaCache.antigravityClaudeGpt = {
                session: agReal.claudeGpt.session,
                weekly: agReal.claudeGpt.weekly,
                sessionResetText: formatTimeRemaining(agReal.claudeGpt.sessionReset),
                weeklyResetText: formatTimeRemaining(agReal.claudeGpt.weeklyReset)
              };
            }
          } catch (agErr) {
            writeLog(`Antigravity real-time quota fetch warning: ${agErr}`);
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
