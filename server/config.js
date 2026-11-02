// Centralized Environment & System Configuration
// Validates environment variables and enforces cryptographic security constraints.
const path = require('path');
const dotenv = require('dotenv');

// Read .env once at initialization
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || typeof JWT_SECRET !== 'string' || JWT_SECRET.trim().length < 32) {
  console.error('[FATAL CONFIG ERROR] JWT_SECRET environment variable is missing or shorter than 32 characters.');
  console.error('[FATAL CONFIG ERROR] A secure key of at least 32 characters is required to guarantee token integrity.');
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: JWT_SECRET.trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim(),
  dbFile: process.env.DB_FILE || '',
  corsOrigin: process.env.CORS_ORIGIN || '',
  trustProxy: process.env.TRUST_PROXY || '1',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'info'),
  automation: process.env.AUTOMATION !== 'false'
};

module.exports = config;

