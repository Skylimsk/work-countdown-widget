const state = require('./state');
const { CODE_PROVIDERS } = require('./format');

const LOW_QUOTA_THRESHOLD = Number(process.env.LOW_QUOTA_THRESHOLD || 20);
const LABELS = Object.fromEntries(CODE_PROVIDERS);

// Fires once when a code-AI provider's remaining% drops below the threshold,
// and resets the flag once it recovers back above it — so you get exactly
// one alert per low-quota episode, not one every push cycle.
function checkLowQuotaAlerts(snapshot, sendAlert) {
  const providers = (snapshot && snapshot.providers) || {};
  for (const [id, p] of Object.entries(providers)) {
    if (p.type !== 'code' || p.status !== 'ok') continue;

    for (const [key, m] of Object.entries(p.metrics || {})) {
      if (m.remaining === undefined) continue;
      const alertKey = `${id}:${key}`;
      const isLow = m.remaining < LOW_QUOTA_THRESHOLD;
      const wasAlerted = state.getAlerted(alertKey);

      if (isLow && !wasAlerted) {
        const label = LABELS[id] || id;
        sendAlert(
          `🚨 *Low Quota*\n\n${label} (${key})\nRemaining: *${m.remaining}%*` +
          (m.resetAt ? `\nReset: ${new Date(m.resetAt).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}` : '')
        );
        state.setAlerted(alertKey, true);
      } else if (!isLow && wasAlerted) {
        state.setAlerted(alertKey, false);
      }
    }
  }
}

module.exports = { checkLowQuotaAlerts };
