const { createTelegramWebhookBot } = require('../lib/telegramFactory');
const { readData } = require('../lib/storage');

// Telegram only displays commands that have been explicitly registered through
// the Bot API. Keep this list in one place so the menu and /help stay aligned
// with the handlers registered by the feature modules below.
const BOT_COMMANDS = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show all available commands' },
  { command: 'commands', description: 'Show all available commands' },
  { command: 'botstatus', description: 'Show loaded bot modules' },
  { command: 'manage', description: 'Open the guided admin menu' },
  { command: 'newproperty', description: 'Create a property' },
  { command: 'editproperty', description: 'Edit a property' },
  { command: 'deleteproperty', description: 'Delete a property' },
  { command: 'soldproperty', description: 'Mark a property as sold' },
  { command: 'propertydescription', description: 'Update a property description' },
  { command: 'propertyfeatures', description: 'Update property features' },
  { command: 'listproperties', description: 'List properties' },
  { command: 'propertyhelp', description: 'Show property command help' },
  { command: 'newuser', description: 'Create a user in guided flow' },
  { command: 'adduser', description: 'Create a user record' },
  { command: 'edituser', description: 'Edit a user record' },
  { command: 'deleteuser', description: 'Delete a user record' },
  { command: 'listusers', description: 'List user records' },
  { command: 'getuser', description: 'Get a user record by ID' },
  { command: 'userhelp', description: 'Show user command help' },
  { command: 'newflyer', description: 'Create a flyer in guided flow' },
  { command: 'addflyer', description: 'Add a campaign flyer link' },
  { command: 'flyer', description: 'Add a campaign flyer link' },
  { command: 'listflyers', description: 'List campaign flyers' },
  { command: 'deleteflyer', description: 'Delete a campaign flyer' },
  { command: 'newhero', description: 'Set the homepage hero image' },
  { command: 'heroimage', description: 'Set the homepage hero image' },
  { command: 'addvideo', description: 'Add a video link' },
  { command: 'editvideo', description: 'Edit a video' },
  { command: 'deletevideo', description: 'Delete a video' },
  { command: 'listvideos', description: 'List videos' },
  { command: 'addsection', description: 'Add a content section' },
  { command: 'editsection', description: 'Edit a content section' },
  { command: 'listsections', description: 'List content sections' },
  { command: 'videohelp', description: 'Show media command help' },
  { command: 'addsubscriber', description: 'Add a newsletter subscriber' },
  { command: 'removesubscriber', description: 'Remove a newsletter subscriber' },
  { command: 'listsubscribers', description: 'List newsletter subscribers' },
  { command: 'addnewsletter', description: 'Create a newsletter' },
  { command: 'sendnewsletter', description: 'Send a newsletter by ID' },
  { command: 'sendemail', description: 'Send an email' },
  { command: 'newsletterhelp', description: 'Show newsletter command help' },
];

const commandHelpText = BOT_COMMANDS
  .map(({ command, description }) => `/${command} - ${description}`)
  .join('\n');

// Initialize a single Telegram bot (use ENV TELEGRAM_TOKEN)
function initBots(app) {
  const token = process.env.TELEGRAM_TOKEN;
  const route = '/bot';
  const bot = createTelegramWebhookBot({ token, route, app });
  if (!bot) return;

  // expose the bot adapter on the express app so routes can notify admins
  try { app.locals.bot = bot; } catch (err) { console.warn('Could not attach bot to app.locals', err); }

  // Register feature modules on the single bot instance and track which loaded
  const _loadedModules = [];
  try { require('./propertyBot')(bot); _loadedModules.push('propertyBot'); } catch (err) { console.warn('Failed to register propertyBot', err); }
  try { require('./userBot')(bot); _loadedModules.push('userBot'); } catch (err) { console.warn('Failed to register userBot', err); }
  // optional: keep other modules available on same bot
  try { require('./videoBot')(bot); _loadedModules.push('videoBot'); } catch (err) { /* ignore */ }
  try { require('./flyerBot')(bot); _loadedModules.push('flyerBot'); } catch (err) { console.warn('Failed to register flyerBot', err); }
  try { require('./newsletterBot')(bot); _loadedModules.push('newsletterBot'); } catch (err) { /* ignore */ }

  // expose the loaded module list for diagnostics
  try { app.locals.botModules = _loadedModules; } catch (err) { /* ignore */ }

  // Register the command picker with Telegram. Handlers alone allow commands
  // to work when typed manually, but do not make them visible in the client UI.
  if (bot.api && typeof bot.api.setMyCommands === 'function') {
    bot.api.setMyCommands({ commands: BOT_COMMANDS })
      .then(() => console.log(`Registered ${BOT_COMMANDS.length} Telegram bot commands.`))
      .catch((err) => console.warn('Failed to register Telegram bot commands:', err.message || err));
  }

  // Basic /start handler for onboarding
  try {
    bot.onText(/\/start/i, (msg) => {
      const text = 'Welcome to Jetland bot! Send /help to see available commands.';
      bot.sendMessage(msg.chat.id, text);
    });
  } catch (err) { /* ignore */ }

  // Aggregated /help handler listing common commands
  try {
    bot.onText(/\/help/i, (msg) => {
      bot.sendMessage(msg.chat.id, `Available commands:\n${commandHelpText}`);
    });
    // explicit /commands alias to ensure visibility in chats
    bot.onText(/\/commands/i, (msg) => {
      bot.sendMessage(msg.chat.id, `Available commands:\n${commandHelpText}`);
    });
    bot.onText(/\/(manage|helpall|admin)/i, (msg) => {
      const text = [
        'Jetland admin guide:',
        '/newproperty - create a property step by step',
        '/newflyer - create a flyer step by step',
        '/newuser - create a user step by step',
        '/newhero - set the homepage hero image',
        '',
        'Quick actions:',
        '/listproperties',
        '/listflyers',
        '/listusers',
        '/listvideos',
        '/latest - see the newest saved item',
        '/help',
      ].join('\n');
      bot.sendMessage(msg.chat.id, text);
    });

    bot.onText(/\/latest(?:\s+(.+))?/i, (msg, match) => {
      const type = (match && match[1] && match[1].toLowerCase().trim()) || 'all';
      const collections = {
        all: ['properties', 'flyers', 'users', 'videos', 'contentSections'],
        property: ['properties'],
        properties: ['properties'],
        flyer: ['flyers'],
        flyers: ['flyers'],
        user: ['users'],
        users: ['users'],
        video: ['videos'],
        videos: ['videos'],
        hero: ['contentSections'],
        section: ['contentSections'],
        sections: ['contentSections'],
      };
      const targets = collections[type] || collections.all;
      const latest = [];

      for (const collectionName of targets) {
        const items = readData(collectionName)
          .filter((item) => item && (item.id || item.title || item.email || item.filename || item.content));
        if (items.length) {
          const last = items[items.length - 1];
          let summary = `Type: ${collectionName}`;
          if (collectionName === 'properties') summary += `\nTitle: ${last.title || 'Untitled'}\nID: ${last.id}\nLocation: ${last.location || 'N/A'}`;
          if (collectionName === 'flyers') summary += `\nTitle: ${last.title || 'Untitled'}\nID: ${last.id}\nURL: ${last.url || last.filename || 'N/A'}`;
          if (collectionName === 'users') summary += `\nName: ${last.name || 'Untitled'}\nID: ${last.id}\nEmail: ${last.email || 'N/A'}`;
          if (collectionName === 'videos') summary += `\nTitle: ${last.title || 'Untitled'}\nID: ${last.id}\nURL/File: ${last.url || last.fileId || 'N/A'}`;
          if (collectionName === 'contentSections') summary += `\nTitle: ${last.title || 'Untitled'}\nID: ${last.id}\nContent: ${last.content || last.imagePath || 'N/A'}`;
          latest.push(summary);
        }
      }

      if (!latest.length) return bot.sendMessage(msg.chat.id, 'No saved records found yet.');
      return bot.sendMessage(msg.chat.id, latest.join('\n\n'));
    });
    // runtime modules list for diagnostics
    bot.onText(/\/modules|\/botstatus/i, (msg) => {
      const modules = (app && app.locals && app.locals.botModules) || _loadedModules || [];
      if (!modules.length) return bot.sendMessage(msg.chat.id, 'No bot modules are currently registered.');
      return bot.sendMessage(msg.chat.id, `Loaded bot modules:\n- ${modules.join('\n- ')}`);
    });
  } catch (err) { /* ignore */ }
}

module.exports = initBots;
