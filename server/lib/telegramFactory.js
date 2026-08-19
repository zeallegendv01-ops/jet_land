let TelegramBot;
try {
  const pkg = require('node-telegram-bot-api');
  TelegramBot = pkg && (pkg.Bot || (pkg.default && pkg.default.Bot) || pkg.default || pkg);
} catch (error) {
  console.warn('Telegram bots are disabled: install node-telegram-bot-api to enable them.');
}

function createTelegramWebhookBot({ token, route, app }) {
  if (!token) {
    console.log(`Telegram bot disabled for route ${route}: no token provided.`);
    return null;
  }

  if (!TelegramBot) {
    console.warn(`Telegram bot disabled for route ${route}: package is unavailable.`);
    return null;
  }

  const usePolling = String(process.env.TELEGRAM_POLLING ?? 'true').toLowerCase() === 'true' || String(process.env.TELEGRAM_POLLING).toLowerCase() === 'force';
  const bot = new TelegramBot(token, { polling: usePolling });

  if (!usePolling) {
    app.post(route, async (req, res) => {
      try {
        if (typeof bot.handleUpdate === 'function') {
          await bot.handleUpdate(req.body);
        } else if (typeof bot.processUpdate === 'function') {
          await bot.processUpdate(req.body);
        } else {
          throw new Error('Bot update handler is unavailable');
        }
        res.sendStatus(200);
      } catch (err) {
        console.error(`Telegram webhook error on ${route}:`, err);
        res.sendStatus(500);
      }
    });

    const baseUrl = (process.env.SERVER_URL || '').replace(/\/+$/, '');
    const webhookUrl = baseUrl ? `${baseUrl}${route}` : null;

    if (webhookUrl) {
      bot.api.setWebhook({ url: webhookUrl })
        .then(() => console.log(`Telegram webhook registered: ${webhookUrl}`))
        .catch((err) => {
          console.warn(`Failed to set webhook for ${route} (${webhookUrl}):`, err.message || err);
          console.warn('Webhook registration failed; falling back to polling mode.');
          if (typeof bot.startPolling === 'function') {
            bot.startPolling().catch((pollErr) => console.warn('Polling fallback error:', pollErr.message || pollErr));
          }
        });
    } else {
      console.warn(`SERVER_URL is missing; falling back to polling mode for ${route}.`);
      if (typeof bot.startPolling === 'function') {
        bot.startPolling().catch((err) => console.warn('Polling fallback error:', err.message || err));
      }
    }
  } else {
    console.log('Telegram bot running in polling mode (TELEGRAM_POLLING=true)');
  }

  const adapter = {
    onText: (re, handler) => {
      bot.hears(re, async (ctx) => {
        const msg = ctx.update.message || ctx.update.channel_post || {};
        const text = (msg.text || msg.caption || '') + '';
        const match = text.match(re) || [];
        try { await handler(msg, match); } catch (err) { console.error('onText handler error:', err); }
      });
    },
    on: (event, handler) => {
      if (event === 'message') {
        bot.on('message', async (ctx) => {
          try { await handler(ctx.update.message); } catch (err) { console.error('on message handler error:', err); }
        });
      } else {
        bot.on(event, async (ctx) => {
          try { await handler(ctx.update); } catch (err) { console.error('handler error:', err); }
        });
      }
    },
    sendMessage: async (chatId, text, options = {}) => {
      const payload = Object.assign({ chat_id: chatId, text }, options);
      return bot.sendMessage(chatId, text, options);
    },
    getFile: async (fileId) => bot.getFile(fileId),
    api: bot.api,
    startPolling: async () => { if (typeof bot.startPolling === 'function') return bot.startPolling(); },
    stopPolling: async () => {
      if (typeof bot.stop === 'function') return bot.stop();
      if (typeof bot.stopPolling === 'function') return bot.stopPolling();
    },
    processUpdate: async (update) => {
      if (typeof bot.handleUpdate === 'function') return bot.handleUpdate(update);
      if (typeof bot.processUpdate === 'function') return bot.processUpdate(update);
      throw new Error('Underlying bot does not support processing updates');
    }
  };

  if (usePolling && typeof bot.startPolling === 'function') {
    bot.startPolling().catch((err) => console.warn('Polling error:', err.message || err));
  }

  return adapter;
}

function formatHelp(commandList) {
  return commandList.map((item) => `/${item.command} - ${item.description}`).join('\n');
}

module.exports = {
  createTelegramWebhookBot,
  formatHelp,
};
