const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROVIDER_ID = 'claude';
const SOURCE = 'anthropic_oauth_api';

function getRunnerPath() {
  const candidates = [
    path.join(__dirname, '..', 'runner.py')
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

function envelope(status, metrics, source, error) {
  return {
    provider: PROVIDER_ID,
    type: 'code',
    status,
    metrics: metrics || {},
    updatedAt: new Date().toISOString(),
    source,
    error: error || null
  };
}

function parseUsage(parsed) {
  const limits = parsed.usage.limits || [];
  let sessionUsed = null;
  let weeklyUsed = null;
  let sessionReset = parsed.usage.five_hour?.resets_at || '';
  let weeklyReset = parsed.usage.seven_day?.resets_at || '';

  if (parsed.usage.five_hour && parsed.usage.five_hour.utilization !== undefined) {
    sessionUsed = Math.round(parsed.usage.five_hour.utilization);
  }
  if (parsed.usage.seven_day && parsed.usage.seven_day.utilization !== undefined) {
    weeklyUsed = Math.round(parsed.usage.seven_day.utilization);
  }

  for (const item of limits) {
    if (item.kind === 'session') {
      if (item.percent !== undefined && item.percent !== null) sessionUsed = item.percent;
      if (item.resets_at) sessionReset = item.resets_at;
    } else if (item.kind === 'weekly_all' || item.group === 'weekly') {
      if (item.percent !== undefined && item.percent !== null) weeklyUsed = item.percent;
      if (item.resets_at) weeklyReset = item.resets_at;
    }
  }

  return {
    session: { used: sessionUsed, remaining: Number.isFinite(sessionUsed) ? Math.max(0, Math.min(100, 100-sessionUsed)) : null, resetAt: sessionReset },
    weekly: { used: weeklyUsed, remaining: Number.isFinite(weeklyUsed) ? Math.max(0, Math.min(100, 100-weeklyUsed)) : null, resetAt: weeklyReset }
  };
}

// Fetches quota purely based on OAuth credential availability — never gated on
// whether the Claude.exe process happens to be running.
function fetchClaudeProvider() {
  return new Promise((resolve) => {
    const runnerPath = getRunnerPath();
    const runnerDir = path.dirname(runnerPath);

    execFile('python', [runnerPath], { cwd: runnerDir, timeout: 15000, windowsHide: true }, (err, stdout) => {
      if (err || !stdout) {
        resolve(envelope('error', {}, SOURCE, err ? err.message : 'Empty runner output'));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (e) {
        resolve(envelope('error', {}, SOURCE, `Failed to parse runner output: ${e.message}`));
        return;
      }

      if (parsed.status === 'not_authenticated') {
        resolve(envelope('not_authenticated', {}, SOURCE, parsed.error));
        return;
      }

      if (parsed.status !== 'ok' || !parsed.usage) {
        resolve(envelope('error', {}, SOURCE, parsed.error || 'Unknown Claude usage error'));
        return;
      }

      resolve(envelope('ok', parseUsage(parsed), SOURCE, null));
    });
  });
}

module.exports = { fetchClaudeProvider };
