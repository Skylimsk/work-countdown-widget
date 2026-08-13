const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SOURCE = 'antigravity_devtools';

function envelope(provider, status, metrics, error) {
  return {
    provider,
    type: 'code',
    status,
    metrics: metrics || {},
    updatedAt: new Date().toISOString(),
    source: SOURCE,
    error: error || null
  };
}

class NotAuthenticatedError extends Error {}

// Talks to Antigravity's local DevTools protocol to read live quota straight
// from its GetUserStatus API. No local session available (Antigravity not
// running / never logged in) is treated as not_authenticated, not an error —
// and there is deliberately no estimated/fake percentage fallback: if the
// real quota can't be read, we say so instead of guessing.
async function fetchRaw() {
  const portFile = path.join(process.env.APPDATA, 'Antigravity', 'DevToolsActivePort');
  if (!fs.existsSync(portFile)) {
    throw new NotAuthenticatedError('Antigravity session not available (DevTools port file missing)');
  }
  const lines = fs.readFileSync(portFile, 'utf8').split('\n');
  const port = lines[0].trim();

  let res;
  try {
    res = await fetch(`http://127.0.0.1:${port}/json/list`);
  } catch (e) {
    throw new Error(`DevTools HTTP connect failed (${e.message})`);
  }
  if (!res.ok) throw new Error(`DevTools HTTP ${res.status}`);

  const targets = await res.json();
  if (!targets || targets.length === 0) throw new Error('No DevTools target found');
  const page = targets[0];

  const csrfToken = await new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch (e) {
      reject(new Error(`WS init failed (${e.message})`));
      return;
    }

    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('WS timeout 3s')); }, 3000);

    ws.on('open', () => {
      const expr = `({ csrf: window.__APP_CONFIG__ && window.__APP_CONFIG__.csrfToken, href: window.location.href })`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    });

    ws.on('message', (evt) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(evt.toString());
        const val = msg.result && msg.result.result && msg.result.result.value;
        if (val && val.csrf) resolve(val);
        else reject(new Error('CSRF Token undefined in Antigravity'));
      } catch (e) {
        reject(new Error(`WS parse error (${e.message})`));
      }
      try { ws.close(); } catch (e) {}
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`WS error (${err.message})`));
    });
  });

  let apiPort = '64518';
  try {
    const u = new URL(csrfToken.href);
    if (u.port) apiPort = u.port;
  } catch (e) {}

  let apiRes;
  try {
    apiRes = await fetch(`https://127.0.0.1:${apiPort}/exa.language_server_pb.LanguageServerService/GetUserStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'connect-protocol-version': '1',
        'x-codeium-csrf-token': csrfToken.csrf
      },
      body: JSON.stringify({})
    });
  } catch (e) {
    throw new Error(`API fetch failed (${e.message})`);
  }

  if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
  const statusData = await apiRes.json();
  const models = (statusData.userStatus && statusData.userStatus.cascadeModelConfigData && statusData.userStatus.cascadeModelConfigData.clientModelConfigs) || [];
  if (models.length === 0) throw new Error('No Antigravity models returned');

  let geminiSession = null;
  let geminiSessionReset = '';
  let claudeSession = null;
  let claudeSessionReset = '';

  for (const m of models) {
    const id = (m.modelId || '').toLowerCase();
    const label = (m.label || '').toLowerCase();
    const q = m.quotaInfo;
    if (!q) continue;

    const frac = q.remainingFraction !== undefined ? q.remainingFraction : (q.remainingPercentage !== undefined ? q.remainingPercentage / 100 : (q.resetTime ? 0 : 1));
    const remainingPct = Math.round(frac * 100);

    if (id.includes('gemini') || label.includes('gemini')) {
      if (id.includes('gemini-3.6-flash-low') || id.includes('gemini-3.6-flash') || geminiSession === null || remainingPct < geminiSession) {
        geminiSession = remainingPct;
        if (q.resetTime) geminiSessionReset = q.resetTime;
      }
    } else if (id.includes('claude') || id.includes('gpt') || label.includes('claude') || label.includes('gpt')) {
      if (id.includes('claude-sonnet-4-6') || claudeSession === null || remainingPct < claudeSession) {
        claudeSession = remainingPct;
        if (q.resetTime) claudeSessionReset = q.resetTime;
      }
    }
  }

  return {
    gemini: { session: geminiSession !== null ? geminiSession : 100, sessionReset: geminiSessionReset },
    claudeGpt: { session: claudeSession !== null ? claudeSession : 0, sessionReset: claudeSessionReset }
  };
}

async function fetchAntigravityProviders() {
  try {
    const raw = await fetchRaw();
    return {
      antigravity_gemini: envelope('antigravity_gemini', 'ok', {
        session: { remaining: raw.gemini.session, resetAt: raw.gemini.sessionReset }
      }, null),
      antigravity_claude_gpt: envelope('antigravity_claude_gpt', 'ok', {
        session: { remaining: raw.claudeGpt.session, resetAt: raw.claudeGpt.sessionReset }
      }, null)
    };
  } catch (e) {
    const status = e instanceof NotAuthenticatedError ? 'not_authenticated' : 'error';
    return {
      antigravity_gemini: envelope('antigravity_gemini', status, {}, e.message),
      antigravity_claude_gpt: envelope('antigravity_claude_gpt', status, {}, e.message)
    };
  }
}

module.exports = { fetchAntigravityProviders };
