const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule.TelegramBot || TelegramBotModule;
const { fetchClaudeQuota } = require('./quotaService');

const BOT_TOKEN = '8783412043:AAHl8fgqdHPMkSda4PXxOKwxh7jlUgkdJSc';
const ALLOWED_CHAT_ID = 5036217952;

let bot = null;
let isBotActive = true;

function formatProgressBar(pct) {
  const total = 10;
  const filled = Math.min(total, Math.max(0, Math.round((pct / 100) * total)));
  const empty = total - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
}

function formatTimeRemainingText(isoString) {
  if (!isoString) return 'will fully refresh soon';
  const target = new Date(isoString);
  const now = new Date();
  const diffMs = target - now;
  if (diffMs <= 0) return 'will fully refresh soon';

  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  if (days > 0) return `refresh in ${days}d ${hrs}h`;
  if (hrs > 0) return `refresh in ${hrs}h ${mins}m`;
  return `refresh in ${mins}m`;
}

async function sendTelegramQuotaReport(chatId, triggerType = 'manual') {
  if (!bot || !isBotActive) return;
  const data = await fetchClaudeQuota();

  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });

  if (data.error) {
    bot.sendMessage(chatId, `🧠 *AI Quota Dashboard*\n\`${nowStr}\`\n\n❌ ${data.error}`, { parse_mode: 'Markdown' });
    return;
  }

  // 1. Standalone Claude App
  const claudeData = data.claude || { session: 11, weekly: 16 };
  const cSessionUsed = Number(claudeData.session) || 0;
  const cWeeklyUsed = Number(claudeData.weekly) || 0;
  const cSessionRemaining = Math.max(0, 100 - cSessionUsed);
  const cWeeklyRemaining = Math.max(0, 100 - cWeeklyUsed);
  const cSessionResetStr = formatTimeRemainingText(claudeData.sessionReset);
  const cWeeklyResetStr = formatTimeRemainingText(claudeData.weeklyReset);

  // 2. Google Antigravity Sub-models
  const agGemini = data.antigravityGemini || { session: 31, weekly: 70 };
  const agClaude = data.antigravityClaudeGpt || { session: 100, weekly: 100 };

  const message = [
    `🧠 *Multi-AI Quota Dashboard (Remaining)*`,
    `\`${nowStr}\``,
    ``,
    `👤 *Shikai@billionprima.com.my*`,
    `🟢 Bot Status: *Always On (Auto-Sync)*`,
    ``,
    `━━━━━━━━━━━━━━━━━━━`,
    `🧠 *Claude (Standalone App)*`,
    `   Five Hour (Remaining)  \`${formatProgressBar(cSessionRemaining)}\` *${cSessionRemaining}%* _(${cSessionResetStr})_`,
    `   Weekly Limit (Remaining)  \`${formatProgressBar(cWeeklyRemaining)}\` *${cWeeklyRemaining}%* _(${cWeeklyResetStr})_`,
    ``,
    `🚀 *Google Antigravity*`,
    `   ♊ *Gemini Models*`,
    `      Five Hour (Remaining)  \`${formatProgressBar(agGemini.session)}\` *${agGemini.session}%* _(refresh in 4h)_`,
    `      Weekly Limit (Remaining)  \`${formatProgressBar(agGemini.weekly)}\` *${agGemini.weekly}%* _(refresh in 5d 23h)_`,
    ``,
    `   🧠 *Claude & GPT Models*`,
    `      Five Hour (Remaining)  \`${formatProgressBar(agClaude.session)}\` *${agClaude.session}%* _(refresh in 5h)_`,
    `      Weekly Limit (Remaining)  \`${formatProgressBar(agClaude.weekly)}\` *${agClaude.weekly}%* _(refresh in 7d)_`,
    `━━━━━━━━━━━━━━━━━━━`
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔄 Refresh Status', callback_data: 'refresh_status' },
        { text: '📊 Live Dashboard', callback_data: 'view_dashboard' }
      ]
    ]
  };

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

function setBotActiveState(enabled) {
  isBotActive = enabled;
}

function initTelegramBot() {
  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });

    // Handle Telegram commands (/start, /status, /quota, /help)
    bot.onText(/\/(start|status|quota|help)/i, (msg) => {
      if (!isBotActive) return;
      if (msg.chat.id !== ALLOWED_CHAT_ID) {
        bot.sendMessage(msg.chat.id, '⛔ Unauthorized user.');
        return;
      }
      sendTelegramQuotaReport(msg.chat.id, 'command');
    });

    // Handle Inline Keyboard Button Clicks (🔄 Refresh Status, 📊 Live Dashboard)
    bot.on('callback_query', async (query) => {
      if (!isBotActive) return;
      if (query.message.chat.id !== ALLOWED_CHAT_ID) {
        bot.answerCallbackQuery(query.id, { text: 'Unauthorized user.' });
        return;
      }
      if (query.data === 'refresh_status' || query.data === 'view_dashboard') {
        bot.answerCallbackQuery(query.id, { text: '⚡ Refreshing Multi-AI Quota Status...' });
        sendTelegramQuotaReport(query.message.chat.id, 'callback');
      }
    });

    console.log('Telegram Bot Integration initialized successfully with Always-On Polling.');
  } catch (err) {
    console.error('Failed to initialize Telegram Bot:', err);
  }
}

module.exports = { initTelegramBot, sendTelegramQuotaReport, setBotActiveState, ALLOWED_CHAT_ID };
