const SOURCE = 'cursor_usage_api';

function envelope(status, metrics, error) {
  return {
    provider: 'cursor',
    type: 'code',
    status,
    metrics: metrics || {},
    updatedAt: new Date().toISOString(),
    source: SOURCE,
    error: error || null
  };
}

async function fetchUsage(token) {
  const formattedToken = token.startsWith('WorkosCursorSessionToken%3A')
    ? token
    : `WorkosCursorSessionToken%3A${token.replace('WorkosCursorSessionToken:', '').replace('WorkosCursorSessionToken%3A', '')}`;

  const res = await fetch('https://www.cursor.com/api/usage', {
    headers: {
      'Cookie': `WorkosCursorSessionToken=${formattedToken}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!res.ok) throw new Error(`Cursor API ${res.status}`);
  const data = await res.json();

  const gpt4 = data['gpt-4'] || {};
  const maxReqs = gpt4.maxRequestUsage || 500;
  const numReqs = gpt4.numRequests || 0;
  const remainingPct = Math.max(0, Math.min(100, Math.round(((maxReqs - numReqs) / maxReqs) * 100)));

  return {
    session: {
      used: numReqs,
      remaining: remainingPct,
      limit: maxReqs
    }
  };
}

// Credential presence (cursorToken in the saved config) is what gates the
// fetch — Cursor's own process running or not is irrelevant.
async function fetchCursorProvider(cursorToken) {
  if (!cursorToken) {
    return envelope('not_authenticated', {}, 'No Cursor session token configured');
  }
  try {
    const metrics = await fetchUsage(cursorToken);
    return envelope('ok', metrics, null);
  } catch (e) {
    return envelope('error', {}, e.message);
  }
}

module.exports = { fetchCursorProvider };
