const { saveRecord, updateRecord, deleteRecord, readData } = require('../lib/storage');
const { sendEmail } = require('../lib/emailService');

function parseArgs(text) {
  return (text || '').split('|').map((part) => part.trim()).filter(Boolean);
}

function formatSubscriber(subscriber) {
  return `ID: ${subscriber.id}\nName: ${subscriber.name || 'N/A'}\nEmail: ${subscriber.email}`;
}

function formatNewsletter(newsletter) {
  return `ID: ${newsletter.id}\nTitle: ${newsletter.title}\nBody: ${newsletter.body}`;
}

async function deliverNewsletter(newsletter) {
  const subscribers = readData('subscribers');
  if (!subscribers.length) {
    return { success: false, message: 'No subscribers found.' };
  }
  const results = [];
  for (const subscriber of subscribers) {
    const response = await sendEmail({
      to: subscriber.email,
      subject: newsletter.title,
      text: newsletter.body,
      html: `<h1>${newsletter.title}</h1><p>${newsletter.body}</p>`,
    });
    results.push({ email: subscriber.email, ...response });
  }
  return { success: true, results };
}

function registerNewsletterBot(bot) {
  bot.onText(/\/addsubscriber(?:\s+(.+))?/i, async (msg, match) => {
    const [email, name] = parseArgs(match[1]);
    if (!email) return bot.sendMessage(msg.chat.id, 'Usage: /addsubscriber email | name');
    const subscriber = saveRecord('subscribers', { email, name: name || '' });
    bot.sendMessage(msg.chat.id, `Subscriber added:\n${formatSubscriber(subscriber)}`);
  });

  bot.onText(/\/removesubscriber(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /removesubscriber id');
    const deleted = deleteRecord('subscribers', id);
    bot.sendMessage(msg.chat.id, deleted ? `Subscriber ${id} removed.` : `Subscriber ${id} not found.`);
  });

  bot.onText(/\/(listsubscribers|subscribers)/i, async (msg) => {
    const list = readData('subscribers');
    if (!list.length) return bot.sendMessage(msg.chat.id, 'No subscribers found.');
    bot.sendMessage(msg.chat.id, list.map(formatSubscriber).join('\n\n'));
  });

  bot.onText(/\/addnewsletter(?:\s+(.+))?/i, async (msg, match) => {
    const [title, body] = parseArgs(match[1]);
    if (!title || !body) {
      return bot.sendMessage(msg.chat.id, 'Usage: /addnewsletter title | body');
    }
    const newsletter = saveRecord('newsletters', { title, body });
    bot.sendMessage(msg.chat.id, `Newsletter created:\n${formatNewsletter(newsletter)}`);
  });

  bot.onText(/\/sendnewsletter(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /sendnewsletter id');
    const newsletter = readData('newsletters').find((item) => item.id === id);
    if (!newsletter) return bot.sendMessage(msg.chat.id, `Newsletter ${id} not found.`);
    const result = await deliverNewsletter(newsletter);
    if (!result.success) {
      return bot.sendMessage(msg.chat.id, `Failed to send newsletter: ${result.message}`);
    }
    bot.sendMessage(msg.chat.id, `Newsletter sent to ${result.results.length} subscribers.`);
  });

  bot.onText(/\/sendemail(?:\s+(.+))?/i, async (msg, match) => {
    const [to, subject, body] = parseArgs(match[1]);
    if (!to || !subject || !body) {
      return bot.sendMessage(msg.chat.id, 'Usage: /sendemail to | subject | body');
    }
    const result = await sendEmail({ to, subject, text: body, html: `<p>${body}</p>` });
    bot.sendMessage(msg.chat.id, result.success ? `Email sent to ${to}.` : `Email failed: ${result.message}`);
  });

  bot.onText(/\/(newsletterhelp|help)/i, async (msg) => {
    const helpText = [
      '/addsubscriber email | name',
      '/removesubscriber id',
      '/listsubscribers',
      '/addnewsletter title | body',
      '/sendnewsletter id',
      '/sendemail to | subject | body',
    ].join('\n');
    bot.sendMessage(msg.chat.id, `Newsletter bot commands:\n${helpText}`);
  });
}

module.exports = registerNewsletterBot;
