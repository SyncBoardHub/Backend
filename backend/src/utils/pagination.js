'use strict';

/**
 * Cursor-based and offset-based pagination helpers.
 * Prefer cursor-based pagination for high-volume feeds (activity, notifications).
 * Use offset for simpler collections (tasks, notes per team).
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parsePaginationParams(query) {
  const rawLimit = parseInt(query.limit, 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const cursor = query.cursor || null;

  return { limit, page, offset, cursor };
}

function buildPaginationMeta({ total, page, limit, cursor }) {
  return {
    total: total || null,
    page,
    limit,
    cursor: cursor || null,
    hasMore: total ? (page - 1) * limit + limit < total : null
  };
}

module.exports = { parsePaginationParams, buildPaginationMeta, DEFAULT_LIMIT, MAX_LIMIT };
