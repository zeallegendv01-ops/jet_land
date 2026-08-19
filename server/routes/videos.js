const express = require('express');
const router = express.Router();
const storage = require('../lib/storage');

router.get('/', (req, res) => {
  res.json(storage.readData('videos'));
});

router.get('/:id', (req, res) => {
  const item = storage.findRecord(storage.readData('videos'), req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { url, title, description } = req.body;
  if (!url || !title) return res.status(400).json({ error: 'url and title required' });
  const saved = storage.saveRecord('videos', { url, title, description: description || '' });
  res.status(201).json(saved);
});

router.put('/:id', (req, res) => {
  const updated = storage.updateRecord('videos', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = storage.deleteRecord('videos', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Content sections
router.get('/sections/all', (req, res) => {
  res.json(storage.readData('contentSections'));
});

router.post('/sections', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const saved = storage.saveRecord('contentSections', { title, content });
  res.status(201).json(saved);
});

router.put('/sections/:id', (req, res) => {
  const updated = storage.updateRecord('contentSections', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

module.exports = router;
