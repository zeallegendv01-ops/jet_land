const { saveRecord, updateRecord, deleteRecord, readData, findRecord } = require('../lib/storage');

function parseArgs(text) {
  return (text || '').split('|').map((part) => part.trim()).filter(Boolean);
}

function formatUser(user) {
  return `ID: ${user.id}\nName: ${user.name}\nEmail: ${user.email || 'N/A'}\nPhone: ${user.phone || 'N/A'}\nCreated: ${user.createdAt}`;
}

function registerUserBot(bot) {
  const pendingUserCreation = new Map();

  function startUserWizard(chatId) {
    pendingUserCreation.set(chatId, { step: 'name', data: {} });
    bot.sendMessage(chatId, 'Let’s add a user. Reply with the full name. Type cancel anytime to stop.');
  }

  bot.onText(/\/(newuser|adduser)(?:\s+(.+))?/i, async (msg, match) => {
    const input = (match && match[2]) || '';
    const [name, email, phone] = parseArgs(input);
    if (name) {
      const user = saveRecord('users', { name, email: email || '', phone: phone || '' });
      return bot.sendMessage(msg.chat.id, `User created:\n${formatUser(user)}`);
    }
    startUserWizard(msg.chat.id);
  });

  bot.onText(/\/edituser(?:\s+(.+))?/i, async (msg, match) => {
    const [id, field, ...rest] = parseArgs(match[1]);
    if (!id || !field || rest.length === 0) {
      return bot.sendMessage(msg.chat.id, 'Usage: /edituser id | field | value');
    }
    const allowed = ['name', 'email', 'phone'];
    if (!allowed.includes(field.toLowerCase())) {
      return bot.sendMessage(msg.chat.id, `Editable fields: ${allowed.join(', ')}`);
    }
    const value = rest.join(' | ');
    const updated = updateRecord('users', id, { [field]: value });
    bot.sendMessage(msg.chat.id, updated ? `User updated:\n${formatUser(updated)}` : `User ${id} not found.`);
  });

  bot.onText(/\/deleteuser(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /deleteuser id');
    const deleted = deleteRecord('users', id);
    bot.sendMessage(msg.chat.id, deleted ? `User ${id} deleted.` : `User ${id} not found.`);
  });

  bot.onText(/\/(listusers|users)/i, async (msg) => {
    const list = readData('users');
    if (!list.length) return bot.sendMessage(msg.chat.id, 'No users found.');
    bot.sendMessage(msg.chat.id, list.map(formatUser).join('\n\n'));
  });

  bot.onText(/\/getuser(?:\s+(.+))?/i, async (msg, match) => {
    const id = (match[1] || '').trim();
    if (!id) return bot.sendMessage(msg.chat.id, 'Usage: /getuser id');
    const user = findRecord(readData('users'), id);
    bot.sendMessage(msg.chat.id, user ? formatUser(user) : `User ${id} not found.`);
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const flow = pendingUserCreation.get(msg.chat.id);
    if (!flow) return;

    const reply = String(msg.text).trim();
    if (!reply) return;

    if (/^cancel$/i.test(reply)) {
      pendingUserCreation.delete(msg.chat.id);
      return bot.sendMessage(msg.chat.id, 'User flow cancelled. Send /newuser anytime to start again.');
    }

    if (flow.step === 'name') {
      flow.data.name = reply;
      flow.step = 'email';
      return bot.sendMessage(msg.chat.id, 'Good. Reply with the email address.');
    }

    if (flow.step === 'email') {
      flow.data.email = reply;
      flow.step = 'phone';
      return bot.sendMessage(msg.chat.id, 'Last step: reply with the phone number.');
    }

    if (flow.step === 'phone') {
      flow.data.phone = reply;
      const user = saveRecord('users', {
        name: flow.data.name,
        email: flow.data.email || '',
        phone: flow.data.phone || '',
      });
      pendingUserCreation.delete(msg.chat.id);
      return bot.sendMessage(msg.chat.id, `User created:\n${formatUser(user)}`);
    }
  });

  bot.onText(/\/(userhelp|help)/i, async (msg) => {
    const helpText = [
      'Simple flow:',
      '/newuser',
      '1) reply with full name',
      '2) reply with email',
      '3) reply with phone',
      '',
      'Quick commands:',
      '/edituser id | field | value',
      '/deleteuser id',
      '/listusers',
      '/getuser id',
    ].join('\n');
    bot.sendMessage(msg.chat.id, `User records bot commands:\n${helpText}`);
  });
}

module.exports = registerUserBot;
