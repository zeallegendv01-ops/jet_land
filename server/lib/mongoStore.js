let mongoose;
try {
  mongoose = require('mongoose');
} catch (error) {
  console.warn('MongoDB storage is unavailable: install mongoose to enable it.');
}

let Record;
let connected = false;
const cache = new Map();
const writes = new Map();

function recordsModel() {
  if (!mongoose) return null;
  if (Record) return Record;
  const schema = new mongoose.Schema({
    bucket: { type: String, required: true, index: true },
    recordId: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  }, { timestamps: true, versionKey: false });
  schema.index({ bucket: 1, recordId: 1 }, { unique: true });
  Record = mongoose.models.JetlandRecord || mongoose.model('JetlandRecord', schema);
  return Record;
}

function clone(records) {
  return JSON.parse(JSON.stringify(records || []));
}

async function replaceBucket(bucket, records) {
  const Model = recordsModel();
  if (!Model) return;
  await Model.deleteMany({ bucket });
  if (records.length) {
    await Model.insertMany(records.map(record => ({ bucket, recordId: String(record.id), payload: record })));
  }
}

function queueWrite(bucket, records) {
  if (!connected) return;
  cache.set(bucket, clone(records));
  const previous = writes.get(bucket) || Promise.resolve();
  const next = previous.then(() => replaceBucket(bucket, clone(records))).catch(error => {
    console.error(`MongoDB write failed for ${bucket}:`, error.message || error);
  });
  writes.set(bucket, next);
}

async function initializeMongo(seedData) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MongoDB disabled: MONGODB_URI is not set. Using local JSON storage.');
    return false;
  }
  if (!mongoose) {
    console.warn('MongoDB disabled: mongoose is not installed. Using local JSON storage.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const Model = recordsModel();
    for (const [bucket, records] of Object.entries(seedData)) {
      const stored = await Model.find({ bucket }).lean();
      if (stored.length) {
        cache.set(bucket, stored.map(item => item.payload));
      } else {
        const initial = clone(records);
        cache.set(bucket, initial);
        await replaceBucket(bucket, initial);
      }
    }
    connected = true;
    console.log('MongoDB storage connected.');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed; using local JSON storage:', error.message || error);
    return false;
  }
}

function isMongoEnabled() {
  return connected;
}

function readBucket(bucket) {
  return clone(cache.get(bucket) || []);
}

module.exports = { initializeMongo, isMongoEnabled, readBucket, queueWrite };
