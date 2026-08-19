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
    if (!msg.video) return;
    const caption = msg.caption || '';
    const [title, description] = caption.split('|').map((part) => part.trim());
    const video = saveRecord('videos', {
      title: title || `Telegram video ${new Date().toISOString()}`,
      description: description || '',
      fileId: msg.video.file_id,
      duration: msg.video.duration,
      mimeType: msg.video.mime_type,
    });
    bot.sendMessage(msg.chat.id, `Video uploaded to backend storage:\n${formatVideo(video)}`);
  });

  bot.onText(/\/(videohelp|help)/i, async (msg) => {
    const helpText = [
      '/addvideo url | title | description',
      '/editvideo id | field | value',
      '/deletevideo id',
      '/listvideos',
      '/addsection title | content',
      '/editsection id | title|content | value',
      '/listsections',
      'Send a video file with an optional caption title | description',
    ].join('\n');
    bot.sendMessage(msg.chat.id, `Video bot commands:\n${helpText}`);
  });
}

module.exports = registerVideoBot;
