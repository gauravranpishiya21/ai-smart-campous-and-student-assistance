#!/usr/bin/env node
/**
 * scripts/list-models.mjs
 * Lists all available Google Gemini models for the configured API key.
 * Usage: npm run check:models
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv in ESM without extra setup)
try {
  const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — use environment variables as-is
}

const apiKey = process.env.GEMINI_API_KEY;
const currentModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!apiKey) {
  console.error('❌  GEMINI_API_KEY is not set. Add it to .env and retry.');
  process.exit(1);
}

console.log(`🔑  API key detected: ${apiKey.slice(0, 8)}...`);
console.log(`🎯  Configured model: ${currentModel}\n`);

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

try {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error(`❌  Google API error ${res.status}: ${body}`);
    process.exit(1);
  }

  const { models = [] } = await res.json();

  // Filter to generative models only
  const generative = models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .sort();

  console.log(`📋  Available generateContent models (${generative.length} total):`);
  for (const name of generative) {
    const marker = name === currentModel ? '  ← CONFIGURED' : '';
    console.log(`  ${name}${marker}`);
  }

  console.log('');

  if (generative.includes(currentModel)) {
    console.log(`✅  "${currentModel}" is available — no changes needed.`);
  } else {
    console.warn(`⚠️  "${currentModel}" was NOT found in the list.`);
    console.warn(`    Update GEMINI_MODEL in .env, .env.example and server/config.js defaults.`);
    process.exit(1);
  }
} catch (err) {
  console.error('❌  Network error fetching model list:', err.message);
  process.exit(1);
}

