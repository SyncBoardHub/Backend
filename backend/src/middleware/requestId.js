'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Assigns a unique request ID to every incoming request.
 * The ID is added to:
 *   - res.locals.requestId  (available to controllers)
 *   - X-Request-ID response header (visible to API clients)
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  res.locals.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
