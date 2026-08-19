let TelegramBot;
try {
  const pkg = require('node-telegram-bot-api');
  // node-telegram-bot-api v2 exports a named `Bot` class; older versions exported
  // the constructor as default. Resolve common shapes robustly.
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

  // Allow opting into polling for local development: set TELEGRAM_POLLING=true.
  // In production, keep it false so the bot registers a public webhook endpoint.
  const usePolling = String(process.env.TELEGRAM_POLLING).toLowerCase() === 'true';
  const bot = new TelegramBot(token, { polling: usePolling });

  if (!usePolling) {
    // webhook mode: receive updates from Telegram
    app.post(route, async (req, res) => {
      try {
        await bot.processUpdate(req.body);
        res.sendStatus(200);
      } catch (err) {
        console.error(`Telegram webhook error on ${route}:`, err);
        res.sendStatus(500);
      }
    });

    const baseUrl = (process.env.SERVER_URL || '').replace(/\/+$/, '');
    const webhookUrl = baseUrl ? `${baseUrl}${route}` : null;
    if (webhookUrl) {
      bot.setWebHook(webhookUrl).catch((err) => {
        console.warn(`Failed to set webhook for ${route}:`, err.message || err);
      });
    } else {
      console.log(`Set SERVER_URL to enable webhook registration for ${route}.`);
    }
  } else {
    console.log('Telegram bot running in polling mode (TELEGRAM_POLLING=true)');
  }

  // Compatibility adapter to expose the older node-telegram-bot-api v1-style
  // methods expected by the existing bot modules (`onText`, `sendMessage`, `getFile`, etc.).
  const adapter = {
    // regex-based text handlers: (regex, handler(msg, match))
    onText: (re, handler) => {
      bot.hears(re, async (ctx) => {
        const msg = ctx.update.message || ctx.update.channel_post || {};
        const text = (msg.text || msg.caption || '') + '';
        const match = text.match(re) || [];
        try { await handler(msg, match); } catch (err) { console.error('onText handler error:', err); }
      });
    },
    // generic event listener: ('message', handler(msg))
    on: (event, handler) => {
      if (event === 'message') {
        bot.on('message', async (ctx, next) => {
          try { await handler(ctx.update.message); } catch (err) { console.error('on message handler error:', err); }
          return next();
        });
      } else {
        // fallback to bot.on for other kinds (wrapped)
        bot.on(event, async (ctx, next) => {
          try { await handler(ctx.update); } catch (err) { console.error('handler error:', err); }
          return next();
        });
      }
    },
    // sendMessage(chatId, text, options)
    sendMessage: (chatId, text, options = {}) => {
      const params = Object.assign({ chat_id: chatId, text }, options);
      return bot.api.sendMessage(params).catch((err) => { console.error('sendMessage error:', err); throw err; });
    },
    // getFile(fileId)
    getFile: (fileId) => bot.api.getFile({ file_id: fileId }).then(res => res).catch(err => { throw err; }),
    // expose underlying api for advanced uses
    api: bot.api,
    // startPolling / stop if available on the underlying bot
    startPolling: async () => { if (typeof bot.startPolling === 'function') return bot.startPolling(); },
    stopPolling: async () => { if (typeof bot.stop === 'function') return bot.stop(); if (typeof bot.stopPolling === 'function') return bot.stopPolling(); },
    // processUpdate for webhook mode
    processUpdate: async (update) => {
      if (typeof bot.handleUpdate === 'function') return bot.handleUpdate(update);
      // older API compatibility: try webhookCallback
      if (typeof bot.webhookCallback === 'function') {
        const cb = bot.webhookCallback();
        // emulate express req/res minimal interface
        return new Promise((resolve, reject) => {
          const req = { body: update };
          const res = { status: () => ({ end: resolve }), end: resolve, sendStatus: (s) => resolve(s) };
          try { cb(req, res); } catch (err) { reject(err); }
        });
      }
      throw new Error('Underlying bot does not support processing updates');
    }
  };

  // If polling is enabled, start the polling loop
  if (usePolling && typeof bot.startPolling === 'function') {
    bot.startPolling().catch((err) => console.warn('Polling error:', err));
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
