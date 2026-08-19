const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { readData, writeData, saveRecord } = require('../lib/storage');

const scrypt = promisify(crypto.scrypt);
const sessions = new Map();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const starterProperties = [
  ['Transcorp Estate', '₦300,000,000', 'img1.jpeg', 'Luxury'],
  ['5Star Estate', '₦40,000,000', 'img2.jpg', 'Residential'],
  ['Aso Rock Estate', '₦69,000,000', 'img3.png', 'Luxury'],
  ['Apple Estate', '₦78,000,000', 'img4.jpeg', 'Residential'],
  ['Iceland Estate', '₦105,000,000', 'img5.jpeg', 'Luxury'],
  ['Ngozika Estate', '₦45,000,000', 'img6.jpeg', 'Investment'],
  ['Udoka Estate', '₦17,000,000', 'img7.jpeg', 'Investment'],
  ['Pineleaf Estate', '₦200,000,000', 'img8.jpeg', 'Luxury'],
  ['Dubai Estate', '₦3,000,000', 'img9.jpeg', 'Investment']
].map(([title, price, image, category], index) => ({ title, price, image, category, featured: index === 0, soldOut: false }));

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function normalizeProperty(property, index) {
  return {
    id: property.id || `property-${index + 1}`,
    name: property.name || property.title || 'Jetland Property',
    price: property.price || 'Price on request',
    image: property.image || starterProperties[index % starterProperties.length].image,
    category: property.category || 'Residential',
    location: property.location || '',
    description: property.description || '',
    features: property.features || '',
    featured: Boolean(property.featured) || index === 0,
    soldOut: Boolean(property.soldOut)
  };
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function passwordsMatch(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, hash] = storedValue.split(':');
  if (!salt || !hash) return false;
  const candidate = await hashPassword(password, salt);
  const candidateBuffer = Buffer.from(candidate);
  const storedBuffer = Buffer.from(`${salt}:${hash}`);
  return candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function ensureProperties() {
  const current = readData('properties');
  if (current.length) return current;
  const seeded = starterProperties.map((property, index) => ({
    id: `starter-${index + 1}`,
    createdAt: new Date().toISOString(),
    ...property
  }));
  writeData('properties', seeded);
  return seeded;
}

function registerPublicApi(app) {
  app.get('/api/properties', (req, res) => {
    const query = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || 'All');
    const properties = ensureProperties().map(normalizeProperty).filter(property => {
      const matchesCategory = category === 'All' || property.category.toLowerCase() === category.toLowerCase();
      const searchable = `${property.name} ${property.price} ${property.category} ${property.location}`.toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
    res.json({ properties });
  });

  app.get('/api/properties/:id', (req, res) => {
    const property = ensureProperties().map(normalizeProperty).find(item => item.id === req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    return res.json({ property });
  });

  app.get('/api/flyers', (req, res) => {
    const flyers = readData('flyers').map(flyer => ({
      id: flyer.id,
      title: flyer.title || 'Jetland campaign flyer',
      description: flyer.description || '',
      originalName: flyer.originalName || '',
      mimeType: flyer.mimeType || '',
      size: flyer.size || 0,
      createdAt: flyer.createdAt,
      downloadUrl: flyer.url || `/api/flyers/${flyer.id}/download`
    }));
    return res.json({ flyers });
  });

  app.get('/api/flyers/:id/download', (req, res) => {
    const flyer = readData('flyers').find(item => item.id === req.params.id);
    if (!flyer) return res.status(404).json({ message: 'Campaign flyer not found.' });
    if (flyer.url) return res.redirect(flyer.url);
    const filename = path.basename(flyer.filename || '');
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'flyers', filename);
    if (!filename || !fs.existsSync(filePath)) return res.status(404).json({ message: 'Campaign flyer file is unavailable.' });
    return res.download(filePath, flyer.originalName || filename);
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const acceptedTerms = Boolean(req.body.terms);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !acceptedTerms) {
        return res.status(400).json({ message: 'Provide your name, a valid email, a password of at least 8 characters, and accept the terms.' });
      }
      const users = readData('users');
      if (users.some(user => String(user.email || '').toLowerCase() === email)) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      const user = saveRecord('users', { name, email, passwordHash: await hashPassword(password) });
      const token = createSession(user.id);
      return res.status(201).json({ message: 'Your Jetland account is ready.', token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const user = readData('users').find(item => String(item.email || '').toLowerCase() === email);
      if (!user || !(await passwordsMatch(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Email or password is incorrect.' });
      }
      const token = createSession(user.id);
      return res.json({ message: `Welcome back, ${user.name}.`, token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/contact', async (req, res, next) => {
    try {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const message = String(req.body.message || '').trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) {
        return res.status(400).json({ message: 'Please provide your name, a valid email, and a message.' });
      }
      const contact = saveRecord('contacts', { name, email, message });

      // notify Telegram admin if configured
      try {
        const adminChat = process.env.TELEGRAM_ADMIN_CHAT;
        const bot = req.app && req.app.locals && req.app.locals.bot;
        if (adminChat && bot && typeof bot.sendMessage === 'function') {
          const text = `New enquiry from ${name} <${email}>:\n\n${message}`;
          await bot.sendMessage(adminChat, text).catch(err => { throw err; });
        }
      } catch (err) {
        console.warn('Failed to notify Telegram admin of contact:', err && err.message ? err.message : err);
      }

      return res.status(201).json({ message: 'Thank you. A Jetland advisor will be in touch shortly.', contact });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) sessions.delete(token);
      return res.status(401).json({ message: 'Your session has expired.' });
    }
    const user = readData('users').find(item => item.id === session.userId);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    return res.json({ user: publicUser(user) });
  });
}

module.exports = registerPublicApi;
