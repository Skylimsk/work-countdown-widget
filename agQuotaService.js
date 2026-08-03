const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchAntigravityRealQuota() {
  try {
    const portFile = path.join(process.env.APPDATA, 'Antigravity', 'DevToolsActivePort');
    if (!fs.existsSync(portFile)) {
      return null;
    }
    const lines = fs.readFileSync(portFile, 'utf8').split('\n');
    const port = lines[0].trim();

    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!res.ok) return null;
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) return null;

    // Connect to WebSocket to extract CSRF Token & HTTPS origin port
    const csrfToken = await new Promise((resolve) => {
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      const timer = setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 3000);

      ws.onopen = () => {
        const expr = `({ csrf: window.__APP_CONFIG__ && window.__APP_CONFIG__.csrfToken, href: window.location.href })`;
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      };

      ws.onmessage = (evt) => {
        clearTimeout(timer);
        try {
          const msg = JSON.parse(evt.data);
          const val = msg.result && msg.result.result && msg.result.result.value;
          resolve(val);
        } catch (e) {
          resolve(null);
        }
        try { ws.close(); } catch(e){}
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
    });

    if (!csrfToken || !csrfToken.csrf) {
      return null;
    }

    // Determine target API port from href (e.g. https://127.0.0.1:64518/...)
    let apiPort = '64518';
    try {
      const u = new URL(csrfToken.href);
      if (u.port) apiPort = u.port;
    } catch(e) {}

    // Call GetUserStatus API directly with the captured CSRF token
    const apiRes = await fetch(`https://127.0.0.1:${apiPort}/exa.language_server_pb.LanguageServerService/GetUserStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'connect-protocol-version': '1',
        'x-codeium-csrf-token': csrfToken.csrf
      },
      body: JSON.stringify({})
    });

    if (!apiRes.ok) return null;
    const statusData = await apiRes.json();
    const models = (statusData.userStatus && statusData.userStatus.cascadeModelConfigData && statusData.userStatus.cascadeModelConfigData.clientModelConfigs) || [];

    let geminiSession = 100;
    let geminiWeekly = 100;
    let geminiSessionReset = '';
    let geminiWeeklyReset = '';

    let claudeSession = 100;
    let claudeWeekly = 100;
    let claudeSessionReset = '';
    let claudeWeeklyReset = '';

    for (const m of models) {
      const id = (m.modelId || '').toLowerCase();
      const label = (m.label || '').toLowerCase();
      const q = m.quotaInfo;

      if (!q) continue;

      const frac = q.remainingFraction !== undefined ? q.remainingFraction : (q.remainingPercentage !== undefined ? q.remainingPercentage / 100 : 0);
      const remainingPct = Math.round(frac * 100);

      // Distinguish Gemini vs Claude/GPT models
      if (id.includes('gemini') || label.includes('gemini')) {
        geminiSession = remainingPct;
        if (q.resetTime) geminiSessionReset = q.resetTime;
      } else if (id.includes('claude') || id.includes('gpt') || label.includes('claude') || label.includes('gpt')) {
        claudeSession = remainingPct;
        if (q.resetTime) claudeSessionReset = q.resetTime;
      }
    }

    return {
      gemini: {
        session: geminiSession,
        weekly: geminiWeekly,
        sessionReset: geminiSessionReset,
        weeklyReset: geminiWeeklyReset
      },
      claudeGpt: {
        session: claudeSession,
        weekly: claudeWeekly,
        sessionReset: claudeSessionReset,
        weeklyReset: claudeWeeklyReset
      }
    };
  } catch (e) {
    return null;
  }
}

module.exports = { fetchAntigravityRealQuota };
