'use strict';

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./realtime/socket');
const { closeRedis } = require('./config/redis');
const notificationService = require('./services/notification.service');

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

// Periodic deadline reminders
if (env.NODE_ENV !== 'test') {
  const reminderInterval = 60 * 60 * 1000;
  setInterval(() => {
    if (io) void notificationService.sendDeadlineReminders(io);
  }, reminderInterval).unref();
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received, closing server...');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await closeRedis();
      logger.info('Redis connections closed');
    } catch (e) {
      logger.error({ err: e.message }, 'Error closing Redis');
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  server.listen(env.PORT, () => {
    logger.info(`SyncBoard API running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  });
}

module.exports = { app, server, io };
