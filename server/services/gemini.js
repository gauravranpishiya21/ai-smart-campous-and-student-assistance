// Central Google Gemini Service
// ARCHITECTURAL INVARIANT: This is the ONLY file in the repository that interfaces with @google/genai.
// Enforces: timeout (20s), retry with exponential backoff, per-user rate limiting, structured JSON parsing,
// offline fallback execution, and comprehensive ai_usage database audit logging.

const { GoogleGenAI } = require('@google/genai');
const config = require('../config');
const { db } = require('../db');

let client = null;
let customClient = null; // for test mock injection

// Global rate limiter (backwards compatibility with existing selftest.js assertions)
const globalRateLimiter = {
  windowMs: 60 * 1000,
  maxPerWindow: 20,
  timestamps: [],
  check() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxPerWindow) return false;
    this.timestamps.push(now);
    return true;
  },
  reset() {
    this.timestamps = [];
  }
};

// Per-user rate limiting map: userId -> [timestamp1, timestamp2, ...]
const userRateLimits = new Map();
const USER_WINDOW_MS = 60 * 1000;
const USER_MAX_PER_WINDOW = 20;

function checkUserRateLimit(userId) {
  const uid = String(userId || 'anonymous');
  const now = Date.now();
  let timestamps = userRateLimits.get(uid) || [];
  timestamps = timestamps.filter((t) => now - t < USER_WINDOW_MS);
  if (timestamps.length >= USER_MAX_PER_WINDOW) {
    userRateLimits.set(uid, timestamps);
    return false;
  }
  timestamps.push(now);
  userRateLimits.set(uid, timestamps);
  return true;
}

function resetRateLimiter() {
  globalRateLimiter.reset();
  userRateLimits.clear();
}

// In-memory deduplication cache (30s TTL)
const responseCache = new Map();
const CACHE_TTL_MS = 30 * 1000;

function getCached(key) {
  const item = responseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  if (responseCache.size > 200) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(key, { time: Date.now(), data });
}

function isAvailable() {
  return Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY || customClient);
}

function getGeminiModel() {
  return config.geminiModel;
}

function setTestClient(mockClient) {
  customClient = mockClient;
  client = mockClient;
}

function getTestClient() {
  return customClient;
}

// Audit logger to ai_usage SQLite table
function logUsage({ userId = null, feature = 'general', tokens = 0, latency = 0, error = null }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO ai_usage (user_id, feature, tokens, latency, error)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId ? Number(userId) : null,
      String(feature || 'general'),
      Math.max(0, parseInt(tokens, 10) || 0),
      Math.max(0, parseInt(latency, 10) || 0),
      error ? String(error).slice(0, 500) : null
    );
  } catch (err) {
    console.warn('[ai_usage] Failed to log usage:', err?.message);
  }
}

// Sleep helper for backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determine if an error is transient and retryable with backoff
 */
function isRetryableError(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  // Quota exhaustion, invalid API key, and client validation errors are NOT retryable
  if (/resource_exhausted|429|quota|api_key_invalid|unauthenticated|bad request|400|401|403/i.test(msg)) {
    return false;
  }
  // Network drops, 500, 502, 503, 504 are retryable
  return /timeout|abort|econnreset|econnrefused|etimedout|500|502|503|504|overloaded|unavailable/i.test(msg);
}

/**
 * Central generateContent caller
 */
async function generateContent({
  system = null,
  prompt = null,
  contents = null,
  messages = null,
  maxTokens = 800,
  temperature = 0.7,
  responseMimeType = null,
  userId = null,
  feature = 'general',
  timeoutMs = 20000,
  maxRetries = 2,
  offlineFallback = null
} = {}) {
  const startTime = Date.now();
  let totalInputChars = 0;
  let totalOutputChars = 0;

  // Build standard contents array
  let requestContents = contents;
  if (!requestContents) {
    if (messages && Array.isArray(messages)) {
      requestContents = messages.map((m) => {
        totalInputChars += String(m.content || '').length;
        return {
          role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        };
      });
    } else if (prompt) {
      totalInputChars += String(prompt).length;
      requestContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
    } else {
      requestContents = [];
    }
  }
  if (system) totalInputChars += String(system).length;

  // 1. Check if LLM is available (API key or mock)
  if (!isAvailable()) {
    const latency = Date.now() - startTime;
    let fallbackResult = null;
    if (typeof offlineFallback === 'function') {
      fallbackResult = await offlineFallback();
    }
    const tokenEst = Math.ceil((totalInputChars + (typeof fallbackResult === 'string' ? fallbackResult.length : 120)) / 4);
    logUsage({ userId, feature, tokens: tokenEst, latency, error: null });
    return fallbackResult;
  }

  // 2. Check per-user rate limiter AND global rate limiter
  const userAllowed = checkUserRateLimit(userId);
  const globalAllowed = globalRateLimiter.check();

  if (!userAllowed || !globalAllowed) {
    console.warn(`[ai] Gemini rate limit reached for user ${userId || 'anon'}. Using offline fallback.`);
    const latency = Date.now() - startTime;
    let fallbackResult = null;
    if (typeof offlineFallback === 'function') {
      fallbackResult = await offlineFallback();
    }
    const tokenEst = Math.ceil((totalInputChars + 60) / 4);
    logUsage({ userId, feature, tokens: tokenEst, latency, error: 'RATE_LIMIT_EXCEEDED' });
    return fallbackResult;
  }

  // 3. Cache check
  const cacheKey = JSON.stringify({ system, requestContents, maxTokens, responseMimeType });
  const cached = getCached(cacheKey);
  if (cached) {
    const latency = Date.now() - startTime;
    logUsage({ userId, feature, tokens: Math.ceil((totalInputChars + cached.length) / 4), latency, error: null });
    return cached;
  }

  // 4. Resolve AI client
  let aiClient = customClient;
  if (!aiClient) {
    if (!client) {
      const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
      client = new GoogleGenAI({ apiKey });
    }
    aiClient = client;
  }

  let modelName = getGeminiModel();
  let lastError = null;
  let response = null;

  // 5. Execution loop with timeout and exponential backoff retry
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const callConfig = {
        maxOutputTokens: maxTokens,
        temperature,
        abortSignal: AbortSignal.timeout(timeoutMs)
      };
      if (system) callConfig.systemInstruction = system;
      if (responseMimeType) callConfig.responseMimeType = responseMimeType;

      response = await aiClient.models.generateContent({
        model: modelName,
        contents: requestContents,
        config: callConfig
      });

      // Successful response
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);

      // Model fallback if obsolete or not found
      if (/not found|404/i.test(errMsg) && modelName !== 'gemini-2.5-flash') {
        console.warn(`[ai] Model ${modelName} not found, retrying with gemini-2.5-flash...`);
        modelName = 'gemini-2.5-flash';
        continue;
      }

      // Check if retryable
      if (attempt < maxRetries && isRetryableError(err)) {
        const backoffMs = Math.pow(2, attempt) * 400 + Math.floor(Math.random() * 200);
        console.warn(`[ai] Transient error on attempt ${attempt + 1}/${maxRetries + 1} (${errMsg}). Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable or retries exhausted
      break;
    }
  }

  const latency = Date.now() - startTime;

  // Handle failure -> offline fallback
  if (lastError || !response) {
    const errorMsg = lastError?.message || 'Empty response from Gemini API';
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(errorMsg)) {
      console.warn('[ai] Gemini quota exhausted or rate limited. Using offline engine:', errorMsg);
    } else if (/timeout|aborted/i.test(errorMsg)) {
      console.warn('[ai] Gemini API request timed out (20s limit). Using offline engine.');
    } else if (/API_KEY_INVALID|invalid.*api.*key|unauthenticated/i.test(errorMsg)) {
      console.warn('[ai] Gemini API key invalid. Using offline engine:', errorMsg);
    } else {
      console.warn('[ai] Gemini API error, using offline engine:', errorMsg);
    }

    let fallbackResult = null;
    if (typeof offlineFallback === 'function') {
      try {
        fallbackResult = await offlineFallback();
      } catch (fbErr) {
        console.error('[ai] Offline fallback handler threw:', fbErr);
      }
    }

    const tokenEst = Math.ceil((totalInputChars + 80) / 4);
    logUsage({ userId, feature, tokens: tokenEst, latency, error: errorMsg });
    return fallbackResult;
  }

  // Parse text output
  let rawText = '';
  if (typeof response?.text === 'string') {
    rawText = response.text.trim();
  } else if (typeof response?.text === 'function') {
    rawText = (await response.text()).trim();
  } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    rawText = response.candidates[0].content.parts[0].text.trim();
  }

  totalOutputChars = rawText.length;
  const estimatedTokens = Math.ceil((totalInputChars + totalOutputChars) / 4);

  // If JSON mode requested, parse and validate
  if (responseMimeType === 'application/json') {
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      setCached(cacheKey, rawText);
      logUsage({ userId, feature, tokens: estimatedTokens, latency, error: null });
      return parsed;
    } catch (parseErr) {
      console.warn('[ai] JSON parsing failed on structured Gemini response, attempting regex extraction:', parseErr.message);
      const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          logUsage({ userId, feature, tokens: estimatedTokens, latency, error: null });
          return parsed;
        } catch {}
      }
      // If still invalid, trigger fallback
      if (typeof offlineFallback === 'function') {
        const fb = await offlineFallback();
        logUsage({ userId, feature, tokens: estimatedTokens, latency, error: 'JSON_PARSE_FALLBACK' });
        return fb;
      }
      return null;
    }
  }

  setCached(cacheKey, rawText);
  logUsage({ userId, feature, tokens: estimatedTokens, latency, error: null });
  return rawText;
}

/**
 * Streaming variant. Shares the same client, per-user/global rate limits, retry policy and ai_usage audit log.
 * Yields text chunks. Throws Error with .code: RATE_LIMIT | UNAVAILABLE | QUOTA | AUTH | TIMEOUT | EMPTY | INTERRUPTED | FAILED.
 * Retries only before the first chunk has been sent (a half-delivered answer cannot be replayed safely).
 */
async function* generateStream({ system = null, messages = [], maxTokens = 4096, temperature = 0.3, userId = null, feature = 'general', timeoutMs = 60000, maxRetries = 2 } = {}) {
  const fail = (code, msg) => Object.assign(new Error(msg), { code });
  if (!isAvailable()) throw fail('UNAVAILABLE', 'AI is not configured');
  if (!checkUserRateLimit(userId) || !globalRateLimiter.check()) throw fail('RATE_LIMIT', 'rate limited');
  const contents = messages.map((m) => ({ role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));
  const inChars = contents.reduce((n, c) => n + c.parts[0].text.length, 0) + String(system || '').length;
  let aiClient = customClient || client;
  if (!aiClient) { client = new GoogleGenAI({ apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY }); aiClient = client; }
  let modelName = getGeminiModel(), lastErr = null, sent = 0;
  const t0 = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const cfg = { maxOutputTokens: maxTokens, temperature, abortSignal: AbortSignal.timeout(timeoutMs) };
      if (system) cfg.systemInstruction = system;
      const stream = await aiClient.models.generateContentStream({ model: modelName, contents, config: cfg });
      for await (const part of stream) {
        const t = typeof part?.text === 'string' ? part.text : (part?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        if (t) { sent += t.length; yield t; }
      }
      if (!sent) throw fail('EMPTY', 'empty response');
      logUsage({ userId, feature, tokens: Math.ceil((inChars + sent) / 4), latency: Date.now() - t0 });
      return;
    } catch (err) {
      lastErr = err;
      const msg = err?.message || String(err);
      if (sent) { logUsage({ userId, feature, tokens: Math.ceil((inChars + sent) / 4), latency: Date.now() - t0, error: 'STREAM_INTERRUPTED: ' + msg }); throw fail('INTERRUPTED', msg); }
      if (/not found|404/i.test(msg) && modelName !== 'gemini-2.5-flash') { modelName = 'gemini-2.5-flash'; continue; }
      if (attempt < maxRetries && isRetryableError(err)) { await sleep(Math.pow(2, attempt) * 400 + Math.floor(Math.random() * 200)); continue; }
      break;
    }
  }
  const msg = lastErr?.message || 'failed';
  logUsage({ userId, feature, tokens: Math.ceil(inChars / 4), latency: Date.now() - t0, error: msg });
  const code = lastErr?.code || (/resource_exhausted|429|quota/i.test(msg) ? 'QUOTA' : /api_key|unauthenticated|401|403/i.test(msg) ? 'AUTH' : /timeout|abort/i.test(msg) ? 'TIMEOUT' : 'FAILED');
  throw fail(code, msg);
}

module.exports = {
  isAvailable,
  getGeminiModel,
  setTestClient,
  getTestClient,
  rateLimiter: globalRateLimiter,
  checkUserRateLimit,
  resetRateLimiter,
  logUsage,
  generateContent,
  generateStream
};

