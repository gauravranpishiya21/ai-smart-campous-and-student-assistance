// SQLite layer (built-in node:sqlite, no native build needed).
// Core entities have typed tables; long-tail features share a flexible `records` table.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dataDir, 'campus.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA wal_autocheckpoint = 100;');

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

module.exports = { db, rec, notify, logAuto, addXp, checkpoint };
