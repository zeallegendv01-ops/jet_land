const express = require('express');
const router = express.Router();
const storage = require('../lib/storage');

router.get('/', (req, res) => {
  res.json(storage.readData('users'));
});

router.get('/:id', (req, res) => {
  const item = storage.findRecord(storage.readData('users'), req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const saved = storage.saveRecord('users', { name, email: email || '', phone: phone || '' });
  res.status(201).json(saved);
});

router.put('/:id', (req, res) => {
  const updated = storage.updateRecord('users', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = storage.deleteRecord('users', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
