const fs = require('fs');
const path = require('path');
const os = require('os');

const SOURCE = 'gemini_cli_local_session';

// Google's Gemini CLI stores its OAuth credential at ~/.gemini/oauth_creds.json
// (distinct from Antigravity's own ~/.gemini/antigravity data on this
// machine — Gemini CLI itself is not installed here, so this is unverified).
// Gemini CLI's usage info (`/stats model`) is an interactive command with no
// public HTTP endpoint, so even with a credential present this cannot fetch
// real numbers yet — that needs a real install to figure out (scriptable
// stats output, or local usage log parsing).
const GEMINI_CLI_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');

function envelope(status, metrics, error) {
  return {
    provider: 'gemini_cli',
    type: 'code',
    status,
    metrics: metrics || {},
    updatedAt: new Date().toISOString(),
    source: SOURCE,
    error: error || null
  };
}

async function fetchGeminiCliProvider() {
  if (!fs.existsSync(GEMINI_CLI_CREDS_PATH)) {
    return envelope('not_authenticated', {}, 'Gemini CLI not installed or not logged in (no ~/.gemini/oauth_creds.json)');
  }

  return envelope('error', {}, 'Gemini CLI credential detected, but usage fetching is not implemented yet (no public quota endpoint)');
}

module.exports = { fetchGeminiCliProvider };
