const { saveRecord, updateRecord, deleteRecord, readData } = require('../lib/storage');

function parseArgs(text) {
  return (text || '').split('|').map((part) => part.trim()).filter(Boolean);
}

function formatVideo(video) {
  return `ID: ${video.id}\nTitle: ${video.title}\nURL/File: ${video.url || video.fileId}\nDescription: ${video.description || 'N/A'}\nUploaded: ${video.createdAt}`;
}

function formatSection(section) {
  return `ID: ${section.id}\nTitle: ${section.title}\nContent: ${section.content}`;
}

function registerVideoBot(bot) {
  const pendingHeroImage = new Map();

  function startHeroWizard(chatId) {
    pendingHeroImage.set(chatId, { step: 'text', data: {} });
    bot.sendMessage(chatId, 'Let’s set the hero image. Reply with the hero headline or short text for this section. Type cancel anytime to stop.');
  }

  bot.onText(/\/(newhero|addhero|heroimage)(?:\s+(.+))?/i, async (msg) => {
    startHeroWizard(msg.chat.id);
  });

  bot.onText(/\/addvideo(?:\s+(.+))?/i, async (msg, match) => {
    const [url, title, description] = parseArgs(match[1]);
    if (!url || !title) {
      return bot.sendMessage(msg.chat.id, 'Usage: /addvideo url | title | description');
    }
    const video = saveRecord('videos', { url, title, description: description || '' });
    bot.sendMessage(msg.chat.id, `Video saved:\n${formatVideo(video)}`);
  });

  bot.onText(/\/editvideo(?:\s+(.+))?/i, async (msg, match) => {
    const [id, field, ...rest] = parseArgs(match[1]);
    if (!id || !field || rest.length === 0) {
      return bot.sendMessage(msg.chat.id, 'Usage: /editvideo id | field | value');
    }
    const allowed = ['title', 'description', 'url'];
    if (!allowed.includes(field.toLowerCase())) {
      return bot.sendMessage(msg.chat.id, `Editable fields: ${allowed.join(', ')}`);
    }
    const value = rest.join(' | ');
    const updated = updateRecord('videos', id, { [field]: value });
    bot.sendMessage(msg.chat.id, updated ? `Video updated:\n${formatVideo(updated)}` : `Video ${id} not found.`);
  });

  bot.onText(/\/deletevideo(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /deletevideo id');
    const deleted = deleteRecord('videos', id);
    bot.sendMessage(msg.chat.id, deleted ? `Video ${id} deleted.` : `Video ${id} not found.`);
  });

  bot.onText(/\/(listvideos|videos)/i, async (msg) => {
    const list = readData('videos');
    if (!list.length) return bot.sendMessage(msg.chat.id, 'No videos found.');
    bot.sendMessage(msg.chat.id, list.map(formatVideo).join('\n\n'));
  });

  bot.onText(/\/addsection(?:\s+(.+))?/i, async (msg, match) => {
    const [title, content] = parseArgs(match[1]);
    if (!title || !content) {
      return bot.sendMessage(msg.chat.id, 'Usage: /addsection title | content');
    }
    const section = saveRecord('contentSections', { title, content });
    bot.sendMessage(msg.chat.id, `Content section added:\n${formatSection(section)}`);
  });

  bot.onText(/\/editsection(?:\s+(.+))?/i, async (msg, match) => {
    const [id, field, ...rest] = parseArgs(match[1]);
    if (!id || !field || rest.length === 0) {
      return bot.sendMessage(msg.chat.id, 'Usage: /editsection id | title|content | value');
    }
    const allowed = ['title', 'content'];
    if (!allowed.includes(field.toLowerCase())) {
      return bot.sendMessage(msg.chat.id, `Editable fields: ${allowed.join(', ')}`);
    }
    const value = rest.join(' | ');
    const updated = updateRecord('contentSections', id, { [field]: value });
    bot.sendMessage(msg.chat.id, updated ? `Section updated:\n${formatSection(updated)}` : `Section ${id} not found.`);
  });

  bot.onText(/\/(listsections|sections)/i, async (msg) => {
    const list = readData('contentSections');
    if (!list.length) return bot.sendMessage(msg.chat.id, 'No content sections found.');
    bot.sendMessage(msg.chat.id, list.map(formatSection).join('\n\n'));
  });

  bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
      const flow = pendingHeroImage.get(msg.chat.id);
      if (!flow) return;

      const reply = String(msg.text).trim();
      if (!reply) return;

      if (/^cancel$/i.test(reply)) {
        pendingHeroImage.delete(msg.chat.id);
        return bot.sendMessage(msg.chat.id, 'Hero image flow cancelled. Send /newhero anytime to start again.');
      }

      if (flow.step === 'text') {
        flow.data.content = reply;
        flow.step = 'image';
        return bot.sendMessage(msg.chat.id, 'Thanks. Now send the hero image file. Type cancel if you want to stop.');
      }

      if (flow.step === 'image') {
        return bot.sendMessage(msg.chat.id, 'Please send the hero image file now. Type cancel if you want to stop.');
      }
    }

    if (!msg.photo) return;
    const flow = pendingHeroImage.get(msg.chat.id);
    if (!flow) return;

    try {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileInfo = await bot.getFile(fileId);
      const filePath = fileInfo && (fileInfo.file_path || fileInfo.filePath || fileInfo.file_path);
      if (!filePath) return bot.sendMessage(msg.chat.id, 'Unable to determine file path from Telegram.');
      const token = process.env.TELEGRAM_TOKEN;
      if (!token) throw new Error('TELEGRAM_TOKEN is required to upload the hero image.');

      const uploadsDir = require('path').join(__dirname, '..', 'public', 'uploads', 'hero');
      if (!require('fs').existsSync(uploadsDir)) require('fs').mkdirSync(uploadsDir, { recursive: true });
      const filename = `${Date.now()}-${fileId}-${require('path').basename(filePath)}`;
      const destination = require('path').join(uploadsDir, filename);
      const response = await require('axios').get(`https://api.telegram.org/file/bot${token}/${filePath}`, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        const stream = response.data.pipe(require('fs').createWriteStream(destination));
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const section = saveRecord('contentSections', {
        title: 'hero',
        content: flow.data.content || 'Hero image',
        imageFile: filename,
        imagePath: `/uploads/hero/${filename}`,
        type: 'hero-image'
      });
      pendingHeroImage.delete(msg.chat.id);
      bot.sendMessage(msg.chat.id, `Hero image saved to the content library.\nID: ${section.id}`);
    } catch (err) {
      console.error('Hero image error:', err);
      bot.sendMessage(msg.chat.id, `Failed to save hero image: ${err.message || err}`);
    }
  });

  bot.onText(/\/(videohelp|help)/i, async (msg) => {
    const helpText = [
      'Hero image flow:',
      '/newhero',
      '1) reply with headline text',
      '2) send the hero image',
      '',
      'Other options:',
      '/addvideo url | title | description',
      '/editvideo id | field | value',
      '/deletevideo id',
      '/listvideos',
      '/addsection title | content',
      '/editsection id | title|content | value',
      '/listsections',
    ].join('\n');
    bot.sendMessage(msg.chat.id, `Content / media bot commands:\n${helpText}`);
  });
}

module.exports = registerVideoBot;
