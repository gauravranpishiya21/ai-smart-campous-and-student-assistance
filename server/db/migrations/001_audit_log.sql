-- Migration 001: Add busy_timeout pragma and audit_log table
-- Applied by: server/db.js migration runner
-- Date: 2026-11-02

PRAGMA busy_timeout = 5000;

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

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table   ON audit_log(table_name, record_id);

-- Additional missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_date ON attendance_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_marks_user_subject       ON marks(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_notices_created          ON notices(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time  ON notifications(user_id, created_at);

