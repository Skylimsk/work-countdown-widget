const { writeLog } = require('./quotaService');

// PC -> Cloud heartbeat push (P4). Sends whatever snapshot the local Quota
// Engine already fetched — this never triggers its own quota fetch, so it
// can't add extra load on top of the local 12s poll cycle. Silently no-ops
// when cloud mode isn't configured, and never throws into the caller: a
// down/unreachable cloud host must never affect the local widget.
async function pushQuotaSnapshot(snapshot) {
  if (!snapshot) return;

  let cfg;
  try {
    const { loadConfig } = require('./store');
    cfg = loadConfig();
  } catch (e) {
    return;
  }

  if (!cfg || !cfg.telegramCloudMode) return;

  const url = cfg.credentials && cfg.credentials.cloudSyncUrl;
  const secret = cfg.credentials && cfg.credentials.cloudSyncSecret;
  if (!url || !secret) {
    writeLog('Cloud sync enabled but URL/secret not configured — skipping push');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/quota/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, snapshot }),
      signal: controller.signal
    });
    if (!res.ok) {
      writeLog(`Cloud sync push failed: HTTP ${res.status}`);
    }
  } catch (e) {
    writeLog(`Cloud sync push failed: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { pushQuotaSnapshot };
