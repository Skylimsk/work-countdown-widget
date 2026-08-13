const fs = require('fs');
const path = require('path');
const os = require('os');

const SOURCE = 'codex_local_session';

// OpenAI's Codex CLI is not installed on the dev machine this was written on,
// so this credential path is a best-effort guess based on the CLI's known
// config directory convention (~/.codex/) — NOT verified against a real
// install. Treat this as a skeleton: it correctly reports "not authenticated"
// today, and needs its file schema double-checked once Codex CLI is actually
// installed. There is also no known public usage/quota endpoint for Codex
// yet, so even with a credential present this does not fetch real numbers.
const CODEX_AUTH_PATH = path.join(os.homedir(), '.codex', 'auth.json');

function envelope(status, metrics, error) {
  return {
    provider: 'codex',
    type: 'code',
    status,
    metrics: metrics || {},
    updatedAt: new Date().toISOString(),
    source: SOURCE,
    error: error || null
  };
}

async function fetchCodexProvider() {
  if (!fs.existsSync(CODEX_AUTH_PATH)) {
    return envelope('not_authenticated', {}, 'Codex CLI not installed or not logged in (no ~/.codex/auth.json)');
  }

  return envelope('error', {}, 'Codex credential detected, but usage fetching is not implemented yet (no known public quota endpoint)');
}

module.exports = { fetchCodexProvider };
