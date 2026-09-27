'use strict';

/**
 * Standardized HTTP response helpers.
 * All responses carry { success, data|error, requestId }.
 */

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    requestId: res.locals.requestId
  });
}

function error(res, code, message, statusCode = 500, details = null) {
  const body = {
    success: false,
    error: { code, message },
    requestId: res.locals.requestId
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

function paginated(res, { data, total, page, limit, cursor }) {
  return res.json({
    success: true,
    data,
    pagination: {
      total: total || null,
      page: page || null,
      limit,
      cursor: cursor || null
    },
    requestId: res.locals.requestId
  });
}

module.exports = { success, error, paginated };
