const express = require('express');
const state = require('./state');
const { initBot, sendAlert } = require('./bot');
const { checkLowQuotaAlerts } = require('./alerts');

const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = process.env.PORT || 3000;
const PUSH_SECRET = process.env.PUSH_SECRET;

if (!PUSH_SECRET) {
  console.error('PUSH_SECRET is not set — refusing to start, the push endpoint would be wide open.');
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, lastSyncAt: state.getLastSyncAt() });
});

app.post('/api/quota/push', (req, res) => {
  const { secret, snapshot } = req.body || {};

  if (secret !== PUSH_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!snapshot || typeof snapshot !== 'object') {
    return res.status(400).json({ error: 'missing snapshot' });
  }

  state.setSnapshot(snapshot);
  try {
    checkLowQuotaAlerts(snapshot, sendAlert);
  } catch (e) {
    console.error('Low-quota alert check failed:', e.message);
  }

  res.json({ ok: true });
});

initBot();

app.listen(PORT, () => {
  console.log(`Cloud bot listening on :${PORT}`);
});
