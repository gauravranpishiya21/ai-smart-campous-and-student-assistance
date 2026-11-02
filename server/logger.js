// Structured Logging with Pino and Request ID Tracking
const pino = require('pino');
const crypto = require('crypto');
const config = require('./config');

const logger = pino({
  level: config.logLevel || 'info',
  base: {
    pid: process.pid,
    env: config.nodeEnv
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

/**
 * Express middleware to attach unique request ID and child logger.
 */
function requestLogger(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);

  req.log = logger.child({ reqId });

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket?.remoteAddress
    };

    if (res.statusCode >= 500) {
      req.log.error(logData, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} in ${durationMs}ms`);
    } else if (res.statusCode >= 400) {
      req.log.warn(logData, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} in ${durationMs}ms`);
    } else {
      req.log.info(logData, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} in ${durationMs}ms`);
    }
  });

  next();
}

module.exports = {
  logger,
  requestLogger
};

