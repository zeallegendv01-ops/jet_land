const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { saveRecord, updateRecord, deleteRecord, readData, findRecord } = require('../lib/storage');

function parseArgs(text) {
  return (text || '').split('|').map((part) => part.trim()).filter(Boolean);
}

function formatProperty(property) {
  return `ID: ${property.id}\nTitle: ${property.title}\nPrice: ${property.price || 'N/A'}\nLocation: ${property.location || 'N/A'}\nSold out: ${property.soldOut ? 'Yes' : 'No'}\nDescription: ${property.description || 'N/A'}\nFeatures: ${property.features || 'N/A'}\nImages: ${Array.isArray(property.images) ? property.images.join(', ') : 'None'}`;
}

function registerPropertyBot(bot) {
  bot.onText(/\/newproperty(?:\s+(.+))?/i, async (msg, match) => {
    const [title, price, location] = parseArgs(match[1]);
    if (!title) {
      return bot.sendMessage(msg.chat.id, 'Usage: /newproperty title | price | location');
    }
    const property = saveRecord('properties', {
      title,
      price: price || '',
      location: location || '',
      description: '',
      features: '',
      soldOut: false,
      images: [],
    });
    bot.sendMessage(msg.chat.id, `Property created:\n${formatProperty(property)}`);
  });

  bot.onText(/\/editproperty(?:\s+(.+))?/i, async (msg, match) => {
    const [id, field, ...rest] = parseArgs(match[1]);
    if (!id || !field || rest.length === 0) {
      return bot.sendMessage(msg.chat.id, 'Usage: /editproperty id | field | value');
    }
    const value = rest.join(' | ');
    const allowed = ['title', 'price', 'location', 'description', 'features'];
    if (!allowed.includes(field.toLowerCase())) {
      return bot.sendMessage(msg.chat.id, `Editable fields: ${allowed.join(', ')}`);
    }
    const updated = updateRecord('properties', id, { [field]: value });
    if (!updated) return bot.sendMessage(msg.chat.id, `Property ${id} not found.`);
    bot.sendMessage(msg.chat.id, `Updated property:\n${formatProperty(updated)}`);
  });

  bot.onText(/\/deleteproperty(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /deleteproperty id');
    const deleted = deleteRecord('properties', id);
    bot.sendMessage(msg.chat.id, deleted ? `Property ${id} deleted.` : `Property ${id} not found.`);
  });

  bot.onText(/\/(soldproperty|marksoldup)(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[2] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /soldproperty id');
    const updated = updateRecord('properties', id, { soldOut: true });
    bot.sendMessage(msg.chat.id, updated ? `Property ${id} marked as sold out.` : `Property ${id} not found.`);
  });

  bot.onText(/\/propertydescription(?:\s+(.+))?/i, async (msg, match) => {
    const [id, description] = parseArgs(match[1]);
    if (!id || !description) {
      return bot.sendMessage(msg.chat.id, 'Usage: /propertydescription id | description');
    }
    const updated = updateRecord('properties', id, { description });
    bot.sendMessage(msg.chat.id, updated ? `Updated description for property ${id}.` : `Property ${id} not found.`);
  });

  bot.onText(/\/propertyfeatures(?:\s+(.+))?/i, async (msg, match) => {
    const [id, features] = parseArgs(match[1]);
    if (!id || !features) {
      return bot.sendMessage(msg.chat.id, 'Usage: /propertyfeatures id | features');
    }
    const updated = updateRecord('properties', id, { features });
    bot.sendMessage(msg.chat.id, updated ? `Updated features for property ${id}.` : `Property ${id} not found.`);
  });

  bot.onText(/\/(listproperties|properties)/i, async (msg) => {
    const list = readData('properties');
    if (!list.length) return bot.sendMessage(msg.chat.id, 'No properties found.');
    const text = list.map(formatProperty).join('\n\n');
    bot.sendMessage(msg.chat.id, text);
  });

  // Photo handler: send a photo with optional caption: "propertyId | title | subhead | content"
  bot.on('message', async (msg) => {
    try {
      if (!msg.photo) return;
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const caption = msg.caption || '';
      const [propertyId, title, subhead, content] = parseArgs(caption);

      // download file
      const fileInfo = await bot.getFile(fileId);
      const filePath = fileInfo && (fileInfo.file_path || fileInfo.filePath || fileInfo.file_path);
      if (!filePath) return bot.sendMessage(msg.chat.id, 'Unable to determine file path from Telegram.');
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`;

      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${Date.now()}-${fileId}-${path.basename(filePath)}`;
      const dest = path.join(uploadsDir, filename);
      const response = await axios.get(fileUrl, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        const stream = response.data.pipe(fs.createWriteStream(dest));
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // persist image record and link to property
      const imageRecord = saveRecord('images', { filename, title: title || '', subhead: subhead || '', content: content || '', uploadedBy: msg.from && msg.from.id });

      let property;
      if (propertyId) {
        property = findRecord(readData('properties'), propertyId);
        if (!property) {
          bot.sendMessage(msg.chat.id, `Property ${propertyId} not found. Image saved as ${filename}.`);
        } else {
          const images = Array.isArray(property.images) ? property.images.concat(filename) : [filename];
          updateRecord('properties', propertyId, { images });
          bot.sendMessage(msg.chat.id, `Image saved and attached to property ${propertyId} as ${filename}.`);
        }
      } else {
        // create a lightweight property if no ID provided
        const newProp = saveRecord('properties', { title: title || `Property ${Date.now()}`, price: '', location: '', description: content || '', features: '', soldOut: false, images: [filename] });
        bot.sendMessage(msg.chat.id, `Image uploaded and new property created with ID ${newProp.id}.`);
      }
    } catch (err) {
      console.error('Photo handling error:', err);
      bot.sendMessage(msg.chat.id, `Failed to process photo: ${err.message || err}`);
    }
  });

  bot.onText(/\/(propertyhelp|help)/i, async (msg) => {
    const helpText = [
      '/newproperty title | price | location',
      '/editproperty id | field | value',
      '/deleteproperty id',
      '/soldproperty id',
      '/propertydescription id | description',
      '/propertyfeatures id | features',
      '/listproperties',
      'Send a photo with optional caption "propertyId | title | subhead | content" to upload and attach image',
    ].join('\n');
    bot.sendMessage(msg.chat.id, `Property bot commands:\n${helpText}`);
  });
}

module.exports = registerPropertyBot;
