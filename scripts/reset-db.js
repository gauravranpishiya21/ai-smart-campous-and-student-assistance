#!/usr/bin/env node
/**
 * scripts/reset-db.js — Deletes the database and re-seeds from scratch.
 *
 * ⚠ DESTRUCTIVE — all data will be lost. Only use in development.
 *
 * Usage:
 *   node scripts/reset-db.js
 *   node scripts/reset-db.js --yes   (skip confirmation prompt)
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const root = path.join(__dirname, '..');
const dbFile = process.env.DB_FILE || path.join(root, 'data', 'campus.db');
const walFile = dbFile + '-wal';
const shmFile = dbFile + '-shm';

async function confirm() {
  if (process.argv.includes('--yes')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`⚠️  This will DELETE ${dbFile} and re-seed. Type "yes" to continue: `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

(async () => {
  if (!(await confirm())) {
    console.log('Aborted.');
    process.exit(0);
  }

  for (const f of [dbFile, walFile, shmFile]) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`🗑️  Deleted: ${f}`);
    }
  }

  console.log('\n🌱  Re-seeding database...');
  execSync(`node ${path.join(root, 'server', 'seed.js')} --reset`, { stdio: 'inherit', cwd: root });
  console.log('\n✅  Database reset and seeded successfully.');
})();

