// Centralized Express Error Handling Middleware
// Formats all application errors into a uniform { error: { code, message } } schema.

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function getErrorCode(statusCode) {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'RATE_LIMITED';
    default: return 'INTERNAL_ERROR';
  }
}

function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number(err.statusCode || err.status) || 500;
  const code = err.code && typeof err.code === 'string' ? err.code : getErrorCode(statusCode);
  const message = err.message || 'An unexpected error occurred';

  // Structured logging
  const logPayload = {
    reqId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode,
    errorCode: code,
    message
  };

  if (req.log && typeof req.log.error === 'function') {
    if (statusCode >= 500) {
      req.log.error({ ...logPayload, stack: err.stack }, 'Server error');
    } else {
      req.log.warn(logPayload, 'Client error');
    }
  } else {
    if (statusCode >= 500) {
      console.error('[ERROR]', logPayload, err.stack);
    } else {
      console.warn('[WARN]', logPayload);
    }
  }

  const responseBody = {
    error: {
      code,
      message
    },
    message // backwards compatibility for tests/clients expecting body.message
  };

  if (err.details) {
    responseBody.error.details = err.details;
  }

  return res.status(statusCode).json(responseBody);
}

// Wrapper for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};

