const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');



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
    res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5000) });
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
    // Only this loopback service uses Antigravity's self-signed certificate.
    apiRes = await new Promise((resolve,reject)=>{
      const request=require('https').request({
        hostname:'127.0.0.1',port:apiPort,
        path:'/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary',
        method:'POST',rejectUnauthorized:false,
        headers:{'Content-Type':'application/json','connect-protocol-version':'1','x-codeium-csrf-token':csrfToken.csrf}
      },response=>{
        let body='';response.setEncoding('utf8');
        response.on('data',chunk=>body+=chunk);
        response.on('end',()=>resolve({ok:response.statusCode>=200&&response.statusCode<300,status:response.statusCode,json:async()=>JSON.parse(body)}));
        response.on('error',reject);
      });
      request.setTimeout(8000,()=>request.destroy(new Error('Local quota request timed out')));
      request.on('error',reject);request.end('{}');
    });
  } catch (e) {
    throw new Error(`API fetch failed (${e.message})`);
  }

  if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
  const statusData = await apiRes.json();
  const groups = (statusData.response && statusData.response.groups) || [];
  if (groups.length === 0) throw new Error('No Antigravity quota groups returned');

  let geminiSession = null;
  let geminiSessionReset = '';
  let geminiWeekly = null;
  let geminiWeeklyReset = '';

  let claudeSession = null;
  let claudeSessionReset = '';
  let claudeWeekly = null;
  let claudeWeeklyReset = '';

  for (const g of groups) {
    const isGemini = (g.displayName || '').toLowerCase().includes('gemini');
    const buckets = g.buckets || [];
    for (const b of buckets) {
      if(!Number.isFinite(b.remainingFraction)) continue;
      const pct = Math.max(0,Math.min(100,Math.round(b.remainingFraction * 100)));
      const isWeekly = b.window === 'weekly';

      if (isGemini) {
        if (isWeekly) {
          geminiWeekly = pct;
          geminiWeeklyReset = b.resetTime;
        } else {
          geminiSession = pct;
          geminiSessionReset = b.resetTime;
        }
      } else {
        if (isWeekly) {
          claudeWeekly = pct;
          claudeWeeklyReset = b.resetTime;
        } else {
          claudeSession = pct;
          claudeSessionReset = b.resetTime;
        }
      }
    }
  }

  return {
    gemini: {
      session: geminiSession, sessionReset: geminiSessionReset,
      weekly: geminiWeekly, weeklyReset: geminiWeeklyReset
    },
    claudeGpt: {
      session: claudeSession, sessionReset: claudeSessionReset,
      weekly: claudeWeekly, weeklyReset: claudeWeeklyReset
    }
  };
}

async function fetchAntigravityProviders() {
  try {
    const raw = await fetchRaw();
    return {
      antigravity_gemini: envelope('antigravity_gemini', 'ok', {
        session: { remaining: raw.gemini.session, resetAt: raw.gemini.sessionReset },
        weekly: { remaining: raw.gemini.weekly, resetAt: raw.gemini.weeklyReset }
      }, null),
      antigravity_claude_gpt: envelope('antigravity_claude_gpt', 'ok', {
        session: { remaining: raw.claudeGpt.session, resetAt: raw.claudeGpt.sessionReset },
        weekly: { remaining: raw.claudeGpt.weekly, resetAt: raw.claudeGpt.weeklyReset }
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
