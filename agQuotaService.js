const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchAntigravityRealQuota() {
  try {
    const portFile = path.join(process.env.APPDATA, 'Antigravity', 'DevToolsActivePort');
    if (!fs.existsSync(portFile)) {
      return { error: 'ERR: DevToolsPort file missing' };
    }
    const lines = fs.readFileSync(portFile, 'utf8').split('\n');
    const port = lines[0].trim();

    let res;
    try {
      res = await fetch(`http://127.0.0.1:${port}/json/list`);
    } catch(e) {
      return { error: `ERR: DevTools HTTP connect failed (${e.message})` };
    }
    if (!res.ok) return { error: `ERR: DevTools HTTP ${res.status}` };

    const targets = await res.json();
    if (!targets || targets.length === 0) return { error: 'ERR: No DevTools target found' };
    const page = targets[0];

    // Connect to WebSocket to extract CSRF Token & HTTPS origin port
    const csrfToken = await new Promise((resolve) => {
      let ws;
      try {
        ws = new WebSocket(page.webSocketDebuggerUrl);
      } catch(e) {
        return resolve({ error: `ERR: WS init failed (${e.message})` });
      }

      const timer = setTimeout(() => { try { ws.close(); } catch(e){} resolve({ error: 'ERR: WS timeout 3s' }); }, 3000);

      ws.on('open', () => {
        const expr = `({ csrf: window.__APP_CONFIG__ && window.__APP_CONFIG__.csrfToken, href: window.location.href })`;
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      });

      ws.on('message', (evt) => {
        clearTimeout(timer);
        try {
          const msg = JSON.parse(evt.toString());
          const val = msg.result && msg.result.result && msg.result.result.value;
          resolve(val || { error: 'ERR: CSRF Token undefined in AG' });
        } catch (e) {
          resolve({ error: `ERR: WS parse error (${e.message})` });
        }
        try { ws.close(); } catch(e){}
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        resolve({ error: `ERR: WS error (${err.message})` });
      });
    });

    if (!csrfToken || csrfToken.error || !csrfToken.csrf) {
      return { error: csrfToken && csrfToken.error ? csrfToken.error : 'ERR: No CSRF Token' };
    }

    // Determine target API port from href (e.g. https://127.0.0.1:64518/...)
    let apiPort = '64518';
    try {
      const u = new URL(csrfToken.href);
      if (u.port) apiPort = u.port;
    } catch(e) {}

    // Call GetUserStatus API directly with the captured CSRF token
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
    } catch(e) {
      return { error: `ERR: API fetch failed (${e.message})` };
    }

    if (!apiRes.ok) return { error: `ERR: API ${apiRes.status}` };
    const statusData = await apiRes.json();
    const models = (statusData.userStatus && statusData.userStatus.cascadeModelConfigData && statusData.userStatus.cascadeModelConfigData.clientModelConfigs) || [];

    if (models.length === 0) return { error: 'ERR: No AG models returned' };

    let geminiSession = null;
    let geminiWeekly = null;
    let geminiSessionReset = '';
    let geminiWeeklyReset = '';

    let claudeSession = null;
    let claudeWeekly = null;
    let claudeSessionReset = '';
    let claudeWeeklyReset = '';

    for (const m of models) {
      const id = (m.modelId || '').toLowerCase();
      const label = (m.label || '').toLowerCase();
      const q = m.quotaInfo;

      if (!q) continue;

      const frac = q.remainingFraction !== undefined ? q.remainingFraction : (q.remainingPercentage !== undefined ? q.remainingPercentage / 100 : (q.resetTime ? 0 : 1));
      const remainingPct = Math.round(frac * 100);

      // Extract Gemini models quota
      if (id.includes('gemini') || label.includes('gemini')) {
        if (id.includes('gemini-3.6-flash-low') || id.includes('gemini-3.6-flash') || geminiSession === null) {
          geminiSession = remainingPct;
          if (q.resetTime) geminiSessionReset = q.resetTime;
        } else if (remainingPct < geminiSession) {
          geminiSession = remainingPct;
          if (q.resetTime) geminiSessionReset = q.resetTime;
        }
      } 
      // Extract Claude & GPT models quota
      else if (id.includes('claude') || id.includes('gpt') || label.includes('claude') || label.includes('gpt')) {
        if (id.includes('claude-sonnet-4-6') || claudeSession === null) {
          claudeSession = remainingPct;
          if (q.resetTime) claudeSessionReset = q.resetTime;
        } else if (remainingPct < claudeSession) {
          claudeSession = remainingPct;
          if (q.resetTime) claudeSessionReset = q.resetTime;
        }
      }
    }

    return {
      gemini: {
        session: geminiSession !== null ? geminiSession : 100,
        weekly: geminiWeekly !== null ? geminiWeekly : 100,
        sessionReset: geminiSessionReset,
        weeklyReset: geminiWeeklyReset
      },
      claudeGpt: {
        session: claudeSession !== null ? claudeSession : 0,
        weekly: claudeWeekly !== null ? claudeWeekly : 100,
        sessionReset: claudeSessionReset,
        weeklyReset: claudeWeeklyReset
      }
    };
  } catch (e) {
    return { error: `ERR: ${e.message}` };
  }
}

async function fetchCursorRealQuota(token) {
  if (!token) return null;
  try {
    const formattedToken = token.startsWith('WorkosCursorSessionToken%3A') 
      ? token 
      : `WorkosCursorSessionToken%3A${token.replace('WorkosCursorSessionToken:', '').replace('WorkosCursorSessionToken%3A', '')}`;

    const res = await fetch('https://www.cursor.com/api/usage', {
      headers: {
        'Cookie': `WorkosCursorSessionToken=${formattedToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    
    const gpt4 = data['gpt-4'] || {};
    const maxReqs = gpt4.maxRequestUsage || 500;
    const numReqs = gpt4.numRequests || 0;
    const remainingPct = Math.max(0, Math.min(100, Math.round(((maxReqs - numReqs) / maxReqs) * 100)));

    return {
      remainingPct,
      numRequests: numReqs,
      maxRequests: maxReqs
    };
  } catch (e) {
    return null;
  }
}

module.exports = { fetchAntigravityRealQuota, fetchCursorRealQuota };
