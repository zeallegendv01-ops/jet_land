const express = require('express');
const router = express.Router();
const storage = require('../lib/storage');
const { sendEmail } = require('../lib/emailService');

router.get('/subscribers', (req, res) => {
  res.json(storage.readData('subscribers'));
});

router.post('/subscribers', (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const saved = storage.saveRecord('subscribers', { email, name: name || '' });
  res.status(201).json(saved);
});

router.delete('/subscribers/:id', (req, res) => {
  const ok = storage.deleteRecord('subscribers', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.post('/newsletters', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const saved = storage.saveRecord('newsletters', { title, body });
  res.status(201).json(saved);
});

router.post('/send/:id', async (req, res) => {
  const newsletter = storage.readData('newsletters').find((n) => n.id === req.params.id);
  if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
  const subscribers = storage.readData('subscribers');
  if (!subscribers.length) return res.status(400).json({ error: 'No subscribers' });
  const results = [];
  for (const s of subscribers) {
    // sendEmail returns { success, message }
    const r = await sendEmail({ to: s.email, subject: newsletter.title, text: newsletter.body, html: `<h1>${newsletter.title}</h1><p>${newsletter.body}</p>` });
    results.push({ email: s.email, ...r });
  }
  res.json({ success: true, results });
});

router.post('/sendemail', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject and body required' });
  const r = await sendEmail({ to, subject, text: body, html: `<p>${body}</p>` });
  res.json(r);
});

module.exports = router;
