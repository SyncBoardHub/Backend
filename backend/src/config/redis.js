'use strict';

const env = require('./env');
const logger = require('../utils/logger');

let createClient = null;
try {
  ({ createClient } = require('redis'));
} catch {
  logger.info('Optional redis package not installed — in-memory fallback active');
}

let redisClient = null;
let publisherClient = null;
let isConnected = false;
let isConnecting = false;

async function getRedisClient() {
  if (!createClient) return null;
  if (redisClient && isConnected) return redisClient;
  if (isConnecting) {
    await new Promise(r => setTimeout(r, 200));
    return redisClient;
  }
  return connect();
}

async function connect() {
  if (!createClient) return null;
  if (isConnecting) return redisClient;
  isConnecting = true;

  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (env.isTest || retries > 2) return false;
          return Math.min(retries * 500, 3000);
        }
      }
    });

    redisClient.on('error', err => {
      logger.warn({ err: err.message }, 'Redis client error');
      isConnected = false;
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis client connected and ready');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      isConnected = false;
    });

    await redisClient.connect();
    isConnected = true;
    isConnecting = false;
    return redisClient;
  } catch (err) {
    isConnecting = false;
    isConnected = false;
    logger.warn({ err: err.message }, 'Redis connection failed — continuing without Redis');
    return null;
  }
}

async function getPublisherClient() {
  if (!createClient) return null;
  if (publisherClient && publisherClient.isReady) return publisherClient;

  try {
    publisherClient = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (env.isTest || retries > 2) return false;
          return Math.min(retries * 500, 3000);
        }
      }
    });
    publisherClient.on('error', err => logger.warn({ err: err.message }, 'Redis publisher error'));
    await publisherClient.connect();
    return publisherClient;
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis publisher connection failed');
    return null;
  }
}

async function disconnectRedis() {
  try {
    if (redisClient) await redisClient.quit();
    if (publisherClient) await publisherClient.quit();
    isConnected = false;
    redisClient = null;
    publisherClient = null;
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis disconnect error');
  }
}

function isRedisAvailable() {
  return Boolean(createClient && redisClient && isConnected);
}

async function safeGet(key) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    return await client.get(key);
  } catch {
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const opts = ttlSeconds ? { EX: ttlSeconds } : {};
    await client.set(key, value, opts);
    return true;
  } catch {
    return false;
  }
}

async function safeDel(key) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getRedisClient,
  getPublisherClient,
  disconnectRedis,
  closeRedis: disconnectRedis,
  isRedisAvailable,
  safeGet,
  safeSet,
  safeDel
};
