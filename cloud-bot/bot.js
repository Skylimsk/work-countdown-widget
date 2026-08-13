const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule.TelegramBot || TelegramBotModule;
const state = require('./state');
const { formatQuotaReport } = require('./format');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = Number(process.env.TELEGRAM_CHAT_ID);

let bot = null;

function initBot() {
  if (!BOT_TOKEN || !ALLOWED_CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — bot disabled, push endpoint still works');
    return null;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/^\/(start|status|quota|help)\b/i, (msg) => handleReport(msg.chat.id, 'all'));
  bot.onText(/^\/code\b/i, (msg) => handleReport(msg.chat.id, 'code'));
  bot.onText(/^\/normal\b/i, (msg) => handleReport(msg.chat.id, 'normal'));

  bot.on('callback_query', (query) => {
    if (query.message.chat.id !== ALLOWED_CHAT_ID) {
      bot.answerCallbackQuery(query.id, { text: 'Unauthorized user.' });
      return;
    }
    if (query.data === 'refresh_all' || query.data === 'refresh_code' || query.data === 'refresh_normal') {
      const scope = query.data.replace('refresh_', '');
      bot.answerCallbackQuery(query.id, { text: '⚡ Refreshing...' });
      handleReport(query.message.chat.id, scope);
    }
  });

  console.log('Cloud Telegram bot polling started.');
  return bot;
}

function handleReport(chatId, scope) {
  if (chatId !== ALLOWED_CHAT_ID) {
    bot.sendMessage(chatId, '⛔ Unauthorized user.');
    return;
  }

  const snapshot = state.getSnapshot();
  const lastSyncAt = state.getLastSyncAt();

  if (!snapshot) {
    bot.sendMessage(
      chatId,
      '🧠 *AI Quota Dashboard*\n\n⚠️ No data received from your PC yet.\nMake sure the widget is running with Cloud Bot mode enabled in Settings.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const message = formatQuotaReport(snapshot, lastSyncAt, scope);
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🔄 Refresh', callback_data: `refresh_${scope}` }
      ]]
    }
  });
}

function sendAlert(text) {
  if (!bot || !ALLOWED_CHAT_ID) return;
  bot.sendMessage(ALLOWED_CHAT_ID, text, { parse_mode: 'Markdown' });
}

module.exports = { initBot, sendAlert, handleReport };
