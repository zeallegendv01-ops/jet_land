const express = require('express');
const router = express.Router();
const storage = require('../lib/storage');

router.get('/', (req, res) => {
  const items = storage.readData('properties');
  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = storage.findRecord(storage.readData('properties'), req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { title, price, location, description, features } = req.body;
  if (!title || !price || !location) return res.status(400).json({ error: 'title, price and location required' });
  const saved = storage.saveRecord('properties', { title, price, location, description: description || '', features: features || '', soldOut: false });
  res.status(201).json(saved);
});

router.put('/:id', (req, res) => {
  const updated = storage.updateRecord('properties', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = storage.deleteRecord('properties', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.post('/:id/mark-sold', (req, res) => {
  const updated = storage.updateRecord('properties', req.params.id, { soldOut: true });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

module.exports = router;
