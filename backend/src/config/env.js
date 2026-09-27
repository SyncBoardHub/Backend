'use strict';

/**
 * Centralized environment variable loader with validation.
 * Validates all required env vars at startup so misconfigurations are caught immediately.
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();

function requireEnv(name, options = {}) {
  const value = process.env[name];
  if (!value && !options.optional) {
    if (options.devDefault !== undefined && process.env.NODE_ENV !== 'production') {
      return options.devDefault;
    }
    if (process.env.NODE_ENV === 'test' && options.testDefault !== undefined) {
      return options.testDefault;
    }
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  return value || options.default || '';
}

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development' || (!process.env.NODE_ENV);
const isProd = process.env.NODE_ENV === 'production';

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  isTest,
  isDev,
  isProd,

  // Supabase
  SUPABASE_URL: requireEnv('SUPABASE_URL', {
    testDefault: 'https://test-project.supabase.co'
  }),
  SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY', {
    testDefault: 'test-anon-key'
  }),
  SUPABASE_SERVICE_ROLE_KEY: (() => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key && isProd) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production. Keep it server-only.');
    }
    return key || '';
  })(),

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Auth
  ADMIN_USER_IDS: new Set(
    (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
  ),

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '',

  // Legal
  LEGAL_POLICY_VERSION: process.env.LEGAL_POLICY_VERSION || '2026-09-26',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug')
};

module.exports = env;
