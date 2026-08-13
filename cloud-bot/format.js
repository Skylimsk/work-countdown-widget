function formatProgressBar(pct) {
  const total = 10;
  const filled = Math.min(total, Math.max(0, Math.round((pct / 100) * total)));
  return '■'.repeat(filled) + '□'.repeat(total - filled);
}

function formatTimeRemainingText(isoString) {
  if (!isoString) return '';
  const diffMs = new Date(isoString).getTime() - Date.now();
  if (diffMs <= 0) return 'resetting soon';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `refresh in ${days}d ${hrs}h`;
  if (hrs > 0) return `refresh in ${hrs}h ${mins}m`;
  return `refresh in ${mins}m`;
}

function formatAgoText(isoString) {
  if (!isoString) return 'never';
  const mins = Math.max(0, Math.round((Date.now() - new Date(isoString).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// Generic per-provider block — works across every provider's metrics shape
// (session/weekly for Claude, session-only for Antigravity/Cursor, empty for
// not-yet-wired providers) instead of hardcoding which metric keys exist.
function formatProviderBlock(label, p) {
  if (!p) return `   ${label}  ⚠ _no data_`;
  if (p.status === 'not_configured') return `   ${label}  _not configured_`;
  if (p.status === 'not_authenticated') return `   ${label}  _not authenticated_`;

  const metricEntries = Object.entries(p.metrics || {}).filter(([, m]) => m && m.remaining !== undefined);
  if (metricEntries.length === 0) {
    return `   ${label}  ⚠ _${p.error || 'unavailable'}_`;
  }

  return metricEntries.map(([key, m]) => {
    let suffix = m.resetAt ? formatTimeRemainingText(m.resetAt) : '';
    if (p.status === 'unavailable' && p.lastKnownGoodAt) suffix = `cached ${formatAgoText(p.lastKnownGoodAt)}`;
    const keySuffix = metricEntries.length > 1 ? ` (${key})` : '';
    return `   ${label}${keySuffix}  \`${formatProgressBar(m.remaining)}\` *${m.remaining}%*${suffix ? ` _(${suffix})_` : ''}`;
  }).join('\n');
}

const CODE_PROVIDERS = [
  ['claude', '🧠 Claude'],
  ['antigravity_gemini', '🚀 Antigravity Gemini'],
  ['antigravity_claude_gpt', '🚀 Antigravity Claude/GPT'],
  ['cursor', '💻 Cursor'],
  ['codex', '🔧 Codex'],
  ['gemini_cli', '⌨️ Gemini CLI']
];

const NORMAL_PROVIDERS = [
  ['chatgpt_web', '🤖 ChatGPT'],
  ['gemini_web', '♊ Gemini Web'],
  ['claude_web', '🧠 Claude Web'],
  ['perplexity', '🔍 Perplexity']
];

function formatQuotaReport(snapshot, lastSyncAt, scope) {
  const providers = (snapshot && snapshot.providers) || {};
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
  const syncAgo = formatAgoText(lastSyncAt);

  const lines = [
    `🧠 *AI Quota Dashboard*`,
    `\`${nowStr}\``,
    ``,
    `☁️ Cloud Bot — last synced from PC ${syncAgo}`
  ];

  if (scope === 'all' || scope === 'code') {
    lines.push(``, `━━━━━━━━━━━━━━━━━━━`, `🤖 *CODE AI*`, ``);
    for (const [id, label] of CODE_PROVIDERS) lines.push(formatProviderBlock(label, providers[id]));
  }

  if (scope === 'all' || scope === 'normal') {
    lines.push(``, `━━━━━━━━━━━━━━━━━━━`, `💬 *NORMAL AI*`, ``);
    for (const [id, label] of NORMAL_PROVIDERS) lines.push(formatProviderBlock(label, providers[id]));
  }

  return lines.join('\n');
}

module.exports = { formatQuotaReport, formatProgressBar, formatTimeRemainingText, formatAgoText, CODE_PROVIDERS, NORMAL_PROVIDERS };
