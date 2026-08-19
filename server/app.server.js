const exp  = require('express');
const { join } = require('path');
require('dotenv').config({ path: join(__dirname, '.env') });
const initBots = require('./bots');
const propertiesRouter = require('./routes/properties');
const videosRouter = require('./routes/videos');
const usersRouter = require('./routes/users');
const newslettersRouter = require('./routes/newsletters');
const registerPublicApi = require('./routes/publicApi');
const { initStorage } = require('./lib/storage');
const port = process.env.PORT || 3400;

const app = exp();

app.use(exp.json());
app.use(exp.urlencoded({ extended: true }));

// serve uploaded images
const { join: joinPath } = require('path');
app.use('/uploads', exp.static(joinPath(__dirname, 'public', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

registerPublicApi(app);

// REST API routes for frontend
app.use('/api/properties', propertiesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/users', usersRouter);
app.use('/api/newsletters', newslettersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function startServer() {
  await initStorage();
  initBots(app);
  app.listen(port, () => {
    console.log('Jetlands is on port:', port);
  });
}

startServer();
