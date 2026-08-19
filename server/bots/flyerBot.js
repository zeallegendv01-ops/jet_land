const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { saveRecord, readData, deleteRecord } = require('../lib/storage');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'flyers');

function parseArgs(value) {
  return (value || '').split('|').map(part => part.trim());
}

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

function registerFlyerBot(bot) {
  // Alias command: /flyer
  bot.onText(/\/flyer(?:\s+(.+))?/i, async (msg, match) => {
    if (!match || !match[1]) {
      return bot.sendMessage(msg.chat.id, 'Use /flyer title | https://download-url | description, or send a document with caption "title | optional description" to upload a flyer.');
    }
    const [title, url, description = ''] = parseArgs(match[1]);
    if (!title || !/^https?:\/\//i.test(url || '')) {
      return bot.sendMessage(msg.chat.id, 'Usage: /flyer title | https://download-url | optional description');
    }
    const flyer = saveRecord('flyers', { title, url, description, source: 'link' });
    return bot.sendMessage(msg.chat.id, `Campaign flyer saved: ${flyer.title} (${flyer.id})`);
  });

  bot.onText(/\/addflyer(?:\s+(.+))?/i, async (msg, match) => {
    const [title, url, description = ''] = parseArgs(match[1]);
    if (!title || !/^https?:\/\//i.test(url || '')) {
      return bot.sendMessage(msg.chat.id, 'Usage: /addflyer title | https://download-url | optional description');
    }
    const flyer = saveRecord('flyers', { title, url, description, source: 'link' });
    return bot.sendMessage(msg.chat.id, `Campaign flyer saved: ${flyer.title} (${flyer.id})`);
  });

  bot.onText(/\/deleteflyer(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /deleteflyer flyer-id');
    return bot.sendMessage(msg.chat.id, deleteRecord('flyers', id) ? 'Campaign flyer deleted.' : 'Campaign flyer not found.');
  });

  bot.onText(/\/(listflyers|flyers)/i, async msg => {
    const flyers = readData('flyers');
    if (!flyers.length) return bot.sendMessage(msg.chat.id, 'No campaign flyers have been uploaded yet.');
    return bot.sendMessage(msg.chat.id, flyers.map(flyer => `${flyer.id}\n${flyer.title}\n${flyer.description || 'No description'}`).join('\n\n'));
  });

  bot.on('message', async msg => {
    if (!msg.document) return;
    try {
      const [title, description = ''] = parseArgs(msg.caption);
      const document = msg.document;
      const info = await bot.getFile(document.file_id);
      const filePath = info && (info.file_path || info.filePath);
      if (!filePath) throw new Error('Telegram did not return a downloadable file path.');
      const token = process.env.TELEGRAM_TOKEN;
      if (!token) throw new Error('TELEGRAM_TOKEN is required to download uploaded flyers.');

      ensureUploadsDir();
      const originalName = path.basename(document.file_name || filePath || 'campaign-flyer');
      const filename = `${Date.now()}-${document.file_id}-${originalName}`.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destination = path.join(uploadsDir, filename);
      const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const response = await axios.get(url, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        const stream = response.data.pipe(fs.createWriteStream(destination));
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const flyer = saveRecord('flyers', {
        title: title || path.parse(originalName).name,
        description,
        filename,
        originalName,
        mimeType: document.mime_type || 'application/octet-stream',
        size: document.file_size || 0,
        source: 'telegram'
      });
      return bot.sendMessage(msg.chat.id, `Campaign flyer uploaded: ${flyer.title}\nID: ${flyer.id}`);
    } catch (error) {
      console.error('Flyer upload error:', error);
      return bot.sendMessage(msg.chat.id, `Could not upload flyer: ${error.message || error}`);
    }
  });
}

module.exports = registerFlyerBot;
