const { createTelegramWebhookBot } = require('../lib/telegramFactory');

// Telegram only displays commands that have been explicitly registered through
// the Bot API. Keep this list in one place so the menu and /help stay aligned
// with the handlers registered by the feature modules below.
const BOT_COMMANDS = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show all available commands' },
  { command: 'commands', description: 'Show all available commands' },
  { command: 'botstatus', description: 'Show loaded bot modules' },
  { command: 'newproperty', description: 'Create a property' },
  { command: 'editproperty', description: 'Edit a property' },
  { command: 'deleteproperty', description: 'Delete a property' },
  { command: 'soldproperty', description: 'Mark a property as sold' },
  { command: 'propertydescription', description: 'Update a property description' },
  { command: 'propertyfeatures', description: 'Update property features' },
  { command: 'listproperties', description: 'List properties' },
  { command: 'propertyhelp', description: 'Show property command help' },
  { command: 'adduser', description: 'Create a user record' },
  { command: 'edituser', description: 'Edit a user record' },
  { command: 'deleteuser', description: 'Delete a user record' },
  { command: 'listusers', description: 'List user records' },
  { command: 'getuser', description: 'Get a user record by ID' },
  { command: 'userhelp', description: 'Show user command help' },
  { command: 'addflyer', description: 'Add a campaign flyer link' },
  { command: 'flyer', description: 'Add a campaign flyer link' },
  { command: 'listflyers', description: 'List campaign flyers' },
  { command: 'deleteflyer', description: 'Delete a campaign flyer' },
  { command: 'addvideo', description: 'Add a video link' },
  { command: 'editvideo', description: 'Edit a video' },
  { command: 'deletevideo', description: 'Delete a video' },
  { command: 'listvideos', description: 'List videos' },
  { command: 'addsection', description: 'Add a content section' },
  { command: 'editsection', description: 'Edit a content section' },
  { command: 'listsections', description: 'List content sections' },
  { command: 'videohelp', description: 'Show video command help' },
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
    // runtime modules list for diagnostics
    bot.onText(/\/modules|\/botstatus/i, (msg) => {
      const modules = (app && app.locals && app.locals.botModules) || _loadedModules || [];
      if (!modules.length) return bot.sendMessage(msg.chat.id, 'No bot modules are currently registered.');
      return bot.sendMessage(msg.chat.id, `Loaded bot modules:\n- ${modules.join('\n- ')}`);
    });
  } catch (err) { /* ignore */ }
}

module.exports = initBots;
