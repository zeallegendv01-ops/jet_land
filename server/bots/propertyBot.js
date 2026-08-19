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
  const pendingPropertyCreation = new Map();

  function startPropertyWizard(chatId) {
    pendingPropertyCreation.set(chatId, { step: 'title', propertyId: null, data: {} });
    bot.sendMessage(chatId, 'Let’s add a new property. Reply with the property title. Type cancel anytime to stop.');
  }

  bot.onText(/\/(newproperty|addproperty)(?:\s+(.+))?/i, async (msg, match) => {
    const input = (match && match[2]) || '';
    const [title, price, location] = parseArgs(input);
    if (title) {
      const property = saveRecord('properties', {
        title,
        price: price || '',
        location: location || '',
        description: '',
        features: '',
        soldOut: false,
        images: [],
      });
      pendingPropertyCreation.set(msg.chat.id, { step: 'photo', propertyId: property.id, data: property });
      return bot.sendMessage(msg.chat.id, `Property created:\n${formatProperty(property)}\n\nNow send the main photo. You can add a short caption after the photo if needed, such as “Main exterior” or “Luxury villa in Lekki”.`);
    }

    startPropertyWizard(msg.chat.id);
  });

  bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
      const flow = pendingPropertyCreation.get(msg.chat.id);
      if (!flow) return;

      const reply = String(msg.text).trim();
      if (!reply) return;

      if (/^cancel$/i.test(reply)) {
        pendingPropertyCreation.delete(msg.chat.id);
        return bot.sendMessage(msg.chat.id, 'Property flow cancelled. Send /newproperty anytime to start again.');
      }

      if (flow.step === 'title') {
        flow.data.title = reply;
        flow.step = 'price';
        return bot.sendMessage(msg.chat.id, 'Good. Reply with the price. Example: ₦95,000,000');
      }

      if (flow.step === 'price') {
        flow.data.price = reply;
        flow.step = 'location';
        return bot.sendMessage(msg.chat.id, 'Perfect. Reply with the location. Example: Lekki, Lagos');
      }

      if (flow.step === 'location') {
        flow.data.location = reply;
        flow.step = 'description';
        return bot.sendMessage(msg.chat.id, 'Now reply with the property description.');
      }

      if (flow.step === 'description') {
        flow.data.description = reply;
        flow.step = 'features';
        return bot.sendMessage(msg.chat.id, 'Now reply with the features. Example: 4 bedrooms, pool, parking, security');
      }

      if (flow.step === 'features') {
        flow.data.features = reply;
        const property = saveRecord('properties', {
          title: flow.data.title,
          price: flow.data.price || '',
          location: flow.data.location || '',
          description: flow.data.description || '',
          features: flow.data.features || '',
          soldOut: false,
          images: [],
        });
        pendingPropertyCreation.set(msg.chat.id, { step: 'photo', propertyId: property.id, data: property });
        return bot.sendMessage(msg.chat.id, `Property created successfully:\n${formatProperty(property)}\n\nNow send the main photo. You can add a simple caption after the photo if you want.`);
      }

      if (flow.step === 'photo') {
        return bot.sendMessage(msg.chat.id, 'Please send the photo for this property. Type cancel if you want to stop.');
      }
    }

    if (!msg.photo) return;
    const flow = pendingPropertyCreation.get(msg.chat.id);
    if (!flow || !flow.propertyId) return;

    try {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const caption = (msg.caption || '').trim();

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

      const property = findRecord(readData('properties'), flow.propertyId);
      if (!property) {
        pendingPropertyCreation.delete(msg.chat.id);
        return bot.sendMessage(msg.chat.id, 'This property no longer exists.');
      }

      const images = Array.isArray(property.images) ? property.images.concat(filename) : [filename];
      updateRecord('properties', flow.propertyId, { images });

      const imageText = caption || 'Property photo';
      saveRecord('images', { filename, title: imageText, subhead: '', content: imageText, uploadedBy: msg.from && msg.from.id });

      pendingPropertyCreation.delete(msg.chat.id);
      bot.sendMessage(msg.chat.id, `Photo attached to property ${flow.propertyId}.`);
    } catch (err) {
      console.error('Photo handling error:', err);
      bot.sendMessage(msg.chat.id, `Failed to process photo: ${err.message || err}`);
    }
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

  bot.onText(/\/(propertyguide|propertyflow|propertyhelp|help)/i, async (msg) => {
    const helpText = [
      'Easy flow for a new property:',
      '1) Send /newproperty',
      '2) Reply with the title',
      '3) Reply with the price',
      '4) Reply with the location',
      '5) Reply with the description',
      '6) Reply with the features',
      '7) The bot saves the property and asks for the main photo',
      '8) Send the photo normally; no pipe format is needed',
      '',
      'Quick commands:',
      '/newproperty',
      '/propertydescription id | description',
      '/propertyfeatures id | features',
      '/listproperties',
      '/editproperty id | field | value',
      '/soldproperty id',
    ].join('\n');
    bot.sendMessage(msg.chat.id, helpText);
  });
}

module.exports = registerPropertyBot;
