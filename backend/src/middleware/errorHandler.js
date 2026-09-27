'use strict';

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const env = require('../config/env');

/**
 * Central error handler.
 * Must be registered as the last app.use() in Express.
 * Converts all errors (AppError, multer errors, generic errors) to consistent JSON.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const requestId = res.locals.requestId;

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File too large (max 50MB)' },
        requestId
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
      requestId
    });
  }

  // Typed AppError subclasses
  if (err instanceof AppError) {
    logger.warn({
      requestId,
      code: err.code,
      statusCode: err.statusCode,
      userId: req.user?.id,
      path: req.path
    }, err.message);

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      },
      requestId
    });
  }

  // Errors with status property
  if (err.status) {
    logger.warn({ requestId, status: err.status, path: req.path }, err.message);
    return res.status(err.status).json({
      error: err.message,
      code: err.code || 'ERROR',
      requestId
    });
  }

  // Unexpected errors — log full details server-side, return generic message to client
  logger.error({
    requestId,
    err: err.message,
    stack: env.isProd ? undefined : err.stack,
    userId: req.user?.id,
    path: req.path,
    method: req.method
  }, 'Unhandled request error');

  const message = env.isProd ? 'Internal server error' : err.message;
  return res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
    requestId
  });
}

module.exports = errorHandler;
