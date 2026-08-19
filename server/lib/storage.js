const fs = require('fs');
const path = require('path');
const { initializeMongo, isMongoEnabled, readBucket, queueWrite } = require('./mongoStore');

const dataDir = path.join(__dirname, '..', 'data');
const defaults = {
  properties: [],
  videos: [],
  contentSections: [],
  users: [],
  contacts: [],
  flyers: [],
  newsletters: [],
  subscribers: []
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function dataFile(name) {
  return path.join(dataDir, `${name}.json`);
}

function readData(name) {
  if (isMongoEnabled()) return readBucket(name);
  ensureDataDir();
  const filePath = dataFile(name);
  if (!fs.existsSync(filePath)) {
    writeData(name, defaults[name] || []);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
  } catch (err) {
    console.warn(`Failed to read ${name}.json, recreating file.`, err);
    writeData(name, defaults[name] || []);
    return defaults[name] || [];
  }
}

function writeData(name, data) {
  if (isMongoEnabled()) {
    queueWrite(name, data);
    return;
  }
  ensureDataDir();
  const filePath = dataFile(name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function initStorage() {
  const seedData = Object.fromEntries(Object.keys(defaults).map(name => [name, readData(name)]));
  return initializeMongo(seedData);
}

function nextId(list) {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function findRecord(list, id) {
  return list.find((item) => item.id === id);
}

function saveRecord(name, record) {
  const items = readData(name);
  const item = { id: nextId(items), createdAt: new Date().toISOString(), ...record };
  items.push(item);
  writeData(name, items);
  return item;
}

function updateRecord(name, id, changes) {
  const items = readData(name);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...changes, updatedAt: new Date().toISOString() };
  writeData(name, items);
  return items[index];
}

function deleteRecord(name, id) {
  const items = readData(name);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  writeData(name, filtered);
  return true;
}

module.exports = {
  readData,
  writeData,
  saveRecord,
  updateRecord,
  deleteRecord,
  findRecord,
  initStorage,
};
