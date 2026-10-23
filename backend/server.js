const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

const { createApp, allowedOrigins } = require('./app');
const realtime = require('./utils/realtime');
const { startJobs } = require('./utils/jobs');
const logger = require('./utils/logger');

async function startServer() {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing. Add it to backend/.env.');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Add it to backend/.env.');

    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connected successfully.');

    const server = http.createServer(createApp());
    realtime.init(server, allowedOrigins());
    startJobs();

    const port = Number(process.env.PORT || 5000);
    server.listen(port, () => logger.info(`EventSphere API (with real-time updates) is running on port ${port}.`));

    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down.`);
      realtime.close();
      server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { reason: String(reason) }));
startServer();
