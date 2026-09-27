'use strict';

const env = require('../config/env');

let pinoLogger = null;

try {
  const pino = require('pino');
  pinoLogger = pino({
    level: env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'password',
        'token',
        'access_token',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'RESEND_API_KEY',
        'req.headers.authorization',
        'body.password'
      ],
      censor: '[REDACTED]'
    }
  });
} catch {
  // Graceful fallback if pino is not installed
  const formatLog = (level, ...args) => {
    const timestamp = new Date().toISOString();
    if (args.length === 1 && typeof args[0] === 'string') {
      console.log(`[${timestamp}] [${level.toUpperCase()}]: ${args[0]}`);
    } else if (args.length >= 2 && typeof args[0] === 'object') {
      console.log(`[${timestamp}] [${level.toUpperCase()}]: ${args[1]}`, JSON.stringify(args[0]));
    } else {
      console.log(`[${timestamp}] [${level.toUpperCase()}]:`, ...args);
    }
  };

  pinoLogger = {
    info: (...args) => formatLog('info', ...args),
    warn: (...args) => formatLog('warn', ...args),
    error: (...args) => formatLog('error', ...args),
    debug: (...args) => {
      if (env.LOG_LEVEL === 'debug' || env.isDev) formatLog('debug', ...args);
    }
  };
}

module.exports = pinoLogger;
