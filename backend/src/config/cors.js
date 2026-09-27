'use strict';

const env = require('./env');

const corsOptions = {
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
};

module.exports = corsOptions;
