const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function executable() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const root = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'OpenAI', 'Codex', 'bin');
  try {
    const candidates = fs.readdirSync(root).map(dir => path.join(root, dir, 'codex.exe'))
      .filter(file => fs.existsSync(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (candidates.length) return candidates[0];
  } catch (_) {}
  return process.platform === 'win32' ? 'codex.exe' : 'codex';
}
function envelope(status, metrics = {}, error = null) {
  return { provider: 'codex', type: 'code', status, metrics,
    updatedAt: new Date().toISOString(), source: 'codex_app_server', error };
}
function normalize(result) {
  const bucket = result.rateLimitsByLimitId ? result.rateLimitsByLimitId.codex : result.rateLimits;
  const metrics = {};
  for (const [key, window] of [['session', bucket?.primary], ['weekly', bucket?.secondary]]) {
    if (!window || !Number.isFinite(window.usedPercent)) continue;
    const reset = Number.isFinite(window.resetsAt) ? new Date(window.resetsAt * 1000) : null;
    metrics[key] = {
      remaining: Math.round(Math.max(0, Math.min(100, 100 - window.usedPercent))),
      usedPercent: window.usedPercent,
      windowDurationMins: window.windowDurationMins,
      resetAt: reset && Number.isFinite(reset.getTime()) ? reset.toISOString() : null
    };
  }
  return Object.keys(metrics).length ? envelope('ok', metrics)
    : envelope('unavailable', {}, 'Codex has not returned usage limits for this account');
}
let pending;
async function fetchCodexProvider() {
  if (pending) return pending;
  pending = new Promise(resolve => {
    const child = spawn(executable(), ['app-server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '', done = false;
    const finish = result => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.end();
      child.kill();
      resolve(result);
    };
    const timer = setTimeout(() => finish(envelope('unavailable', {}, 'Codex usage request timed out')), 10000);
    const send = message => { if (!done) child.stdin.write(JSON.stringify(message) + '\n'); };
    child.on('error', () => finish(envelope('not_configured', {}, 'Install Codex or set CODEX_BIN to its executable')));
    child.stdin.on('error', () => finish(envelope('unavailable', {}, 'Codex connection closed')));
    child.stderr.resume();
    child.on('exit', () => finish(envelope('unavailable', {}, 'Codex app-server exited before returning usage')));
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        let msg;
        try { msg = JSON.parse(line); } catch (_) { continue; }
        if (msg.id !== 1 && msg.id !== 2) continue;
        if (msg.error) {
          const auth = /auth|sign.?in|log.?in|unauthorized/i.test(msg.error.message || '');
          finish(envelope(auth ? 'not_authenticated' : 'unavailable', {}, auth
            ? 'Sign in to Codex with your ChatGPT account'
            : 'Codex could not return account limits; check your connection and sign-in'));
        } else if (msg.id === 1) {
          send({ method: 'initialized', params: {} });
          send({ id: 2, method: 'account/rateLimits/read' });
        } else finish(normalize(msg.result || {}));
      }
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'work_countdown_widget', version: '1.0.0' } } });
  });
  try { return await pending; } finally { pending = null; }
}
module.exports = { fetchCodexProvider, normalize };
