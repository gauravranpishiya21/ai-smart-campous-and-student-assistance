// SQLite layer (built-in node:sqlite, no native build needed).
// Core entities have typed tables; long-tail features share a flexible `records` table.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dataDir, 'campus.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA wal_autocheckpoint = 100; PRAGMA busy_timeout = 5000;');

const checkpoint = (mode = 'PASSIVE') => {
  try { db.exec(`PRAGMA wal_checkpoint(${mode});`); } catch {}
};

// Checkpoint and persist WAL cleanly on server exit / shutdown
process.on('exit', () => {
  checkpoint('TRUNCATE');
});
process.on('SIGINT', () => {
  checkpoint('TRUNCATE');
  process.exit(0);
});
process.on('SIGTERM', () => {
  checkpoint('TRUNCATE');
  process.exit(0);
});

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, roll_no TEXT UNIQUE, name TEXT, email TEXT UNIQUE,
  password_hash TEXT, dept TEXT DEFAULT 'Computer Science & Engineering', year INTEGER DEFAULT 2,
  semester INTEGER DEFAULT 4, xp INTEGER DEFAULT 0, role TEXT DEFAULT 'student', phone TEXT DEFAULT '',
  bio TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subjects(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, credits INTEGER, sem INTEGER,
  category TEXT, modules TEXT, faculty TEXT, prereq TEXT DEFAULT 'None');
CREATE TABLE IF NOT EXISTS attendance(
  user_id INTEGER, subject_id INTEGER, attended INTEGER, total INTEGER, PRIMARY KEY(user_id, subject_id));
CREATE TABLE IF NOT EXISTS attendance_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, status TEXT, method TEXT DEFAULT 'Standard', UNIQUE(user_id, date));
CREATE TABLE IF NOT EXISTS marks(
  user_id INTEGER, subject_id INTEGER, internal REAL, endsem REAL, assign_done INTEGER, assign_total INTEGER,
  PRIMARY KEY(user_id, subject_id));
CREATE TABLE IF NOT EXISTS notices(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, summary TEXT, category TEXT, priority TEXT,
  target_year INTEGER DEFAULT NULL, target_dept TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT, type TEXT, dedupe TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, dedupe));
CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, user_id INTEGER, data TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_rec ON records(kind, user_id);
CREATE TABLE IF NOT EXISTS automation_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS ai_usage(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  feature TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  latency INTEGER DEFAULT 0,
  error TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id, feature);

CREATE TABLE IF NOT EXISTS document_chunks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  chunk TEXT NOT NULL,
  embedding TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_source ON document_chunks(source);

CREATE TABLE IF NOT EXISTS study_materials(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  dept TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  subject_id INTEGER,
  material_type TEXT NOT NULL DEFAULT 'Notes',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER DEFAULT 1048576,
  uploaded_by INTEGER,
  status TEXT DEFAULT 'Published',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_materials ON study_materials(dept, year, semester);

CREATE TABLE IF NOT EXISTS planner_tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  date TEXT,
  time TEXT,
  priority TEXT DEFAULT 'Medium',
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_planner_tasks ON planner_tasks(user_id, date);

CREATE TABLE IF NOT EXISTS vehicles(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  vehicle_type TEXT DEFAULT 'Two-Wheeler',
  reg_number TEXT NOT NULL,
  model TEXT,
  slot_assigned TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Safe non-destructive schema migrations for existing database instances
try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE notices ADD COLUMN target_year INTEGER DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE notices ADD COLUMN target_dept TEXT DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE attendance_log ADD COLUMN method TEXT DEFAULT 'Standard'"); } catch {}

// ─── Extended Schema: Audit Log, Migrations Tracker, Class Sessions ──────────
db.exec(`
-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  applied_at TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Immutable audit trail for sensitive write operations
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  action     TEXT    NOT NULL,
  table_name TEXT    NOT NULL,
  record_id  TEXT,
  old_value  TEXT,
  new_value  TEXT,
  ip_address TEXT,
  created_at TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table  ON audit_log(table_name, record_id);

-- Performance indexes (idempotent IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_date ON attendance_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_marks_user_subject       ON marks(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_notices_created          ON notices(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time  ON notifications(user_id, created_at);

-- Real faculty-managed class sessions (Step 3)
CREATE TABLE IF NOT EXISTS class_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id  INTEGER NOT NULL,
  subject_id  INTEGER NOT NULL,
  room        TEXT    NOT NULL DEFAULT 'TBD',
  date        TEXT    NOT NULL,
  slot        TEXT,
  status      TEXT    NOT NULL DEFAULT 'open',
  created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON class_sessions(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_faculty ON class_sessions(faculty_id, date);

-- Single-use QR tokens bound to a session (Step 3)
CREATE TABLE IF NOT EXISTS session_qr_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES class_sessions(id),
  token       TEXT    NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used_by     INTEGER,
  used_at     TEXT,
  created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qr_token ON session_qr_tokens(token, expires_at);
`);

// ─── Migration runner: apply numbered SQL files from server/db/migrations/ ───
(function runMigrations() {
  const migrDir = path.join(__dirname, 'db', 'migrations');
  if (!fs.existsSync(migrDir)) return;
  const files = fs.readdirSync(migrDir)
    .filter(f => /^\d+.*\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const version = parseInt(file, 10);
    const exists = db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(version);
    if (exists) continue;
    try {
      const sql = fs.readFileSync(path.join(migrDir, file), 'utf8');
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations(version, name) VALUES(?,?)').run(version, file);
    } catch (e) {
      // Non-fatal: skip already-applied DDL statements
    }
  }
})();

const J = (v) => JSON.stringify(v);
const unpack = (r) => (r ? { id: r.id, user_id: r.user_id, created_at: r.created_at, ...JSON.parse(r.data) } : null);

const rec = {
  add(kind, userId, data) {
    const r = db.prepare('INSERT INTO records(kind,user_id,data) VALUES(?,?,?)').run(kind, userId ?? null, J(data));
    return this.get(Number(r.lastInsertRowid));
  },
  get(id) { return unpack(db.prepare('SELECT * FROM records WHERE id=?').get(id)); },
  list(kind, userId, { limit = 200, order = 'DESC' } = {}) {
    const rows = userId === undefined
      ? db.prepare(`SELECT * FROM records WHERE kind=? ORDER BY id ${order} LIMIT ?`).all(kind, limit)
      : db.prepare(`SELECT * FROM records WHERE kind=? AND user_id IS ? ORDER BY id ${order} LIMIT ?`).all(kind, userId, limit);
    return rows.map(unpack);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const { id: _i, user_id, created_at, ...data } = cur;
    db.prepare('UPDATE records SET data=? WHERE id=?').run(J({ ...data, ...patch }), id);
    return this.get(id);
  },
  remove(id) { db.prepare('DELETE FROM records WHERE id=?').run(id); },
  // single-document-per-user helper (planner, settings ...)
  getDoc(kind, userId, dflt = {}) { const r = this.list(kind, userId, { limit: 1 })[0]; return r ? r : { ...dflt }; },
  setDoc(kind, userId, patch) {
    const r = this.list(kind, userId, { limit: 1 })[0];
    return r ? this.update(r.id, patch) : this.add(kind, userId, patch);
  },
};

function notify(userId, message, type = 'info', dedupe = null) {
  const key = dedupe || `${type}:${message}:${Date.now()}`;
  try {
    db.prepare('INSERT INTO notifications(user_id,message,type,dedupe) VALUES(?,?,?,?)').run(userId, message, type, key);
    return true;
  } catch { return false; } // duplicate dedupe key -> already notified
}
function logAuto(job, detail) { db.prepare('INSERT INTO automation_log(job,detail) VALUES(?,?)').run(job, detail); }
function addXp(userId, n) { db.prepare('UPDATE users SET xp = xp + ? WHERE id=?').run(n, userId); }

/**
 * Writes an immutable entry to audit_log for sensitive write operations.
 */
function auditLog({ userId = null, action, table: tableName, recordId = null, oldValue = null, newValue = null, ip = null } = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log(user_id, action, table_name, record_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      action,
      tableName,
      recordId != null ? String(recordId) : null,
      oldValue  != null ? JSON.stringify(oldValue)  : null,
      newValue  != null ? JSON.stringify(newValue)   : null,
      ip
    );
  } catch { /* audit failures must never crash the main path */ }
}

/**
 * Wraps a function in a SQLite BEGIN/COMMIT transaction, rolling back on error.
 */
function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, rec, notify, logAuto, addXp, checkpoint, auditLog, withTransaction };
