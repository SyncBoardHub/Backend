'use strict';

/**
 * Typed application errors.
 * All application errors extend AppError, which carries:
 *   - statusCode (HTTP status)
 *   - code       (machine-readable string)
 *   - message    (human-readable, safe to send to clients)
 */
class AppError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
class AuthRequiredError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 'AUTH_REQUIRED', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

// ─── Resources ────────────────────────────────────────────────────────────────
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, `${resource.toUpperCase().replace(/ /g, '_')}_NOT_FOUND`, 404);
  }
}

class TeamNotFoundError extends AppError {
  constructor() {
    super('Team not found.', 'TEAM_NOT_FOUND', 404);
  }
}

class TaskNotFoundError extends AppError {
  constructor() {
    super('Task not found.', 'TASK_NOT_FOUND', 404);
  }
}

class FileNotFoundError extends AppError {
  constructor() {
    super('File not found.', 'FILE_NOT_FOUND', 404);
  }
}

// ─── Business ─────────────────────────────────────────────────────────────────
class TeamAccessError extends AppError {
  constructor(message = 'You are not a member of this team.') {
    super(message, 'FORBIDDEN_TEAM_ACCESS', 403);
  }
}

class TeamOwnerRequiredError extends AppError {
  constructor() {
    super('Only the team leader can perform this action.', 'TEAM_OWNER_REQUIRED', 403);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter) {
    super('Too many requests. Please try again later.', 'RATE_LIMITED', 429);
    this.retryAfter = retryAfter;
  }
}

class GithubError extends AppError {
  constructor(message = 'GitHub API error.', statusCode = 502) {
    super(message, 'GITHUB_ERROR', statusCode);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is currently unavailable.`, 'SERVICE_UNAVAILABLE', 503);
  }
}

module.exports = {
  AppError,
  AuthRequiredError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  TeamNotFoundError,
  TaskNotFoundError,
  FileNotFoundError,
  TeamAccessError,
  TeamOwnerRequiredError,
  RateLimitError,
  GithubError,
  ServiceUnavailableError
};
