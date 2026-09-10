// "Normal AI" providers — consumer chat products (ChatGPT, Gemini Web, Claude
// Web, Perplexity) with no official subscription usage/quota API. There is no
// legitimate credential flow for these yet (the only way to get a number
// would be scraping each product's internal web session via a manually
// pasted cookie, decided against for now — see project notes). These are
// architectural placeholders so the engine's provider list is complete and
// the Telegram bot's /normal command has something structured to show,
// without ever fabricating a percentage.
const NORMAL_PROVIDERS = [
  { id: 'chatgpt_web', label: 'ChatGPT' },
  { id: 'gemini_web', label: 'Gemini Web' },
  { id: 'claude_web', label: 'Claude Web' },
  { id: 'perplexity', label: 'Perplexity' }
];

function placeholderEnvelope(id) {
  return {
    provider: id,
    type: 'normal',
    status: 'not_configured',
    metrics: {},
    updatedAt: new Date().toISOString(),
    source: null,
    error: 'No data source configured for this provider yet'
  };
}

async function fetchNormalProviders() {
  const result = {};
  for (const p of NORMAL_PROVIDERS) {
    result[p.id] = placeholderEnvelope(p.id);
  }
  return result;
}

module.exports = { fetchNormalProviders, NORMAL_PROVIDERS };
