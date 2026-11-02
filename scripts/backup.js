#!/usr/bin/env node
/**
 * scripts/backup.js — Safe online backup using SQLite VACUUM INTO.
 *
 * Usage:
 *   node scripts/backup.js
 *   node scripts/backup.js --dest /path/to/backup.db
 *
 * The source database path is read from DB_FILE env variable (default: data/campus.db).
 * Output is timestamped: data/backups/campus_YYYY-MM-DDTHH-MM-SS.db
 */

require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const src = process.env.DB_FILE || path.join(root, 'data', 'campus.db');
const backupDir = path.join(root, 'data', 'backups');

// Parse optional --dest flag
const destIdx = process.argv.indexOf('--dest');
const dest = destIdx !== -1
  ? process.argv[destIdx + 1]
  : path.join(backupDir, `campus_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`);

if (!fs.existsSync(src)) {
  console.error(`❌  Source database not found: ${src}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });

console.log(`📦  Backing up: ${src}`);
console.log(`📁  Destination: ${dest}`);

try {
  const db = new DatabaseSync(src);
  // PRAGMA wal_checkpoint to flush WAL first
  db.exec('PRAGMA wal_checkpoint(FULL);');
  // VACUUM INTO writes a fully-vacuumed, consistent copy without locking the main db
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  const stat = fs.statSync(dest);
  console.log(`✅  Backup complete (${(stat.size / 1024).toFixed(1)} KB): ${dest}`);
} catch (err) {
  console.error('❌  Backup failed:', err.message);
  process.exit(1);
}

