// server/sessions.js — Faculty-managed class sessions and server-side QR tokens
// Step 3: Real attendance — a student can only mark present against a faculty-opened session.
'use strict';
const express = require('express');
const crypto = require('crypto');
const { db, rec, notify, auditLog, withTransaction } = require('./db');
const { validate } = require('./middleware/validate');
const { paginate } = require('./middleware/pagination');
const { z } = require('zod');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, status = 400) =>
  res.status(status).json({ error: { code: 'BAD_REQUEST', message: msg }, message: msg });
const today = () => new Date().toISOString().slice(0, 10);
const QR_TTL_MS = 20_000; // 20-second rolling token window

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const openSessionSchema = z.object({
  subject_id: z.number().int().positive(),
  room:       z.string().min(1).max(50).default('TBD'),
  slot:       z.string().max(30).optional(),
});

const markByQrSchema = z.object({
  token: z.string().min(32).max(128),
});

const markManualSchema = z.object({
  session_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  status:     z.enum(['present', 'absent', 'late']).default('present'),
});

// ─── Faculty: open a class session ───────────────────────────────────────────
/**
 * POST /api/sessions/open
 * Faculty only. Creates a class_sessions record.
 */
router.post('/open', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const parsed = openSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message } });
  }

  const { subject_id, room, slot } = parsed.data;

  // Verify subject exists
  const subject = db.prepare('SELECT * FROM subjects WHERE id=?').get(subject_id);
  if (!subject) return bad(res, 'Subject not found.');

  // Check for an already-open session for this faculty+subject today
  const existing = db.prepare(
    "SELECT id FROM class_sessions WHERE faculty_id=? AND subject_id=? AND date=? AND status='open'"
  ).get(req.user.id, subject_id, today());
  if (existing) return bad(res, 'You already have an open session for this subject today.');

  const result = db.prepare(
    "INSERT INTO class_sessions(faculty_id, subject_id, room, date, slot, status) VALUES(?,?,?,?,?,'open')"
  ).run(req.user.id, subject_id, room, today(), slot || null);

  const session = db.prepare('SELECT * FROM class_sessions WHERE id=?').get(Number(result.lastInsertRowid));

  return res.status(201).json({
    message: 'Session opened.',
    session,
    instructions: 'Call GET /api/sessions/:id/qr to issue a rolling QR token for students to scan.'
  });
}));

// ─── Faculty: get a fresh rolling QR token ───────────────────────────────────
/**
 * GET /api/sessions/:id/qr
 * Faculty only. Issues a new single-use 20-second QR token for the session.
 */
router.get('/:id/qr', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const sessionId = Number(req.params.id);
  const session = db.prepare('SELECT * FROM class_sessions WHERE id=?').get(sessionId);
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
  if (session.faculty_id !== req.user.id && req.user.role === 'faculty') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session.' } });
  }
  if (session.status !== 'open') return bad(res, 'Session is not open.');

  // Invalidate any still-unused tokens older than 1 minute for this session (cleanup)
  db.prepare(
    'DELETE FROM session_qr_tokens WHERE session_id=? AND used_by IS NULL AND expires_at < ?'
  ).run(sessionId, Date.now());

  // Generate a new cryptographically random single-use token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + QR_TTL_MS;

  db.prepare(
    'INSERT INTO session_qr_tokens(session_id, token, expires_at) VALUES(?,?,?)'
  ).run(sessionId, token, expiresAt);

  return res.json({
    token,
    session_id: sessionId,
    subject: session.subject_id,
    room: session.room,
    slot: session.slot,
    expires_in_ms: QR_TTL_MS,
    expires_at: new Date(expiresAt).toISOString(),
    note: 'This token is single-use and expires in 20 seconds. Call this endpoint again to issue a new one.'
  });
}));

// ─── Student: mark attendance by scanning a QR token ─────────────────────────
/**
 * POST /api/sessions/attend
 * Student only. Consumes a valid, unexpired, unused QR token.
 */
router.post('/attend', h(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Student access only.' } });
  }

  const parsed = markByQrSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid token.' } });
  }

  const { token } = parsed.data;
  const now = Date.now();

  // Fetch the token row — must be unused and not expired
  const qrRow = db.prepare(
    'SELECT * FROM session_qr_tokens WHERE token=? AND used_by IS NULL AND expires_at > ?'
  ).get(token, now);

  if (!qrRow) {
    return res.status(400).json({
      error: { code: 'TOKEN_INVALID', message: 'QR code is invalid, expired, or already used. Ask faculty for a new code.' }
    });
  }

  // Fetch the linked session
  const session = db.prepare('SELECT * FROM class_sessions WHERE id=? AND status=?').get(qrRow.session_id, 'open');
  if (!session) {
    return res.status(400).json({ error: { code: 'SESSION_CLOSED', message: 'The class session is no longer open.' } });
  }

  // Check student hasn't already attended this session
  const alreadyMarked = db.prepare(
    "SELECT 1 FROM session_qr_tokens WHERE session_id=? AND used_by=?"
  ).get(session.id, req.user.id);
  if (alreadyMarked) {
    return bad(res, 'You have already marked attendance for this session.');
  }

  withTransaction(() => {
    // Mark the token as used
    db.prepare(
      "UPDATE session_qr_tokens SET used_by=?, used_at=datetime('now') WHERE id=?"
    ).run(req.user.id, qrRow.id);

    // Record in attendance_log (unique per student per day)
    try {
      db.prepare(
        "INSERT INTO attendance_log(user_id, date, status, method) VALUES(?,?,?,?)"
      ).run(req.user.id, today(), 'present', 'QR');
    } catch { /* already has a log for today — that's fine */ }

    // Increment the aggregate attendance counter for this subject
    db.prepare(
      'INSERT INTO attendance(user_id, subject_id, attended, total) VALUES(?,?,1,1) ' +
      'ON CONFLICT(user_id, subject_id) DO UPDATE SET attended=attended+1, total=total+1'
    ).run(req.user.id, session.subject_id);
  });

  auditLog({
    userId: req.user.id,
    action: 'QR_ATTEND',
    table: 'attendance',
    recordId: `session:${session.id}`,
    newValue: { subject_id: session.subject_id, room: session.room },
    ip: req.ip
  });

  return res.json({
    message: `Attendance marked ✅  for session in ${session.room}. +10 XP`,
    session_id: session.id,
    subject_id: session.subject_id,
  });
}));

// ─── Faculty: manually mark/correct a student's attendance ───────────────────
/**
 * POST /api/sessions/:id/mark-manual
 * Faculty only. Directly sets a student's attendance for this session.
 */
router.post('/:id/mark-manual', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const sessionId = Number(req.params.id);
  const parsed = markManualSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message } });
  }

  const { student_id, status } = parsed.data;
  const session = db.prepare('SELECT * FROM class_sessions WHERE id=?').get(sessionId);
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
  if (session.faculty_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session.' } });
  }

  const student = db.prepare("SELECT id, name FROM users WHERE id=? AND role='student'").get(student_id);
  if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });

  const isPresent = status === 'present' || status === 'late';

  withTransaction(() => {
    if (isPresent) {
      try {
        db.prepare(
          "INSERT INTO attendance_log(user_id, date, status, method) VALUES(?,?,?,?)"
        ).run(student_id, session.date, status, 'Manual');
      } catch { /* already has a log — update it */
        db.prepare(
          "UPDATE attendance_log SET status=?, method='Manual' WHERE user_id=? AND date=?"
        ).run(status, student_id, session.date);
      }
      db.prepare(
        'INSERT INTO attendance(user_id, subject_id, attended, total) VALUES(?,?,1,1) ' +
        'ON CONFLICT(user_id, subject_id) DO UPDATE SET attended=attended+1, total=total+1'
      ).run(student_id, session.subject_id);
    } else {
      // Absent — still increment total to count the session
      db.prepare(
        'INSERT INTO attendance(user_id, subject_id, attended, total) VALUES(?,?,0,1) ' +
        'ON CONFLICT(user_id, subject_id) DO UPDATE SET total=total+1'
      ).run(student_id, session.subject_id);
    }
  });

  auditLog({
    userId: req.user.id,
    action: 'MANUAL_ATTEND',
    table: 'attendance',
    recordId: `session:${sessionId}:student:${student_id}`,
    newValue: { status, subject_id: session.subject_id },
    ip: req.ip
  });

  notify(student_id, `Attendance recorded by faculty for ${session.date}: ${status}.`, 'info',
    `manual_att_${sessionId}_${student_id}`);

  return res.json({ message: `Attendance marked as "${status}" for ${student.name}.` });
}));

// ─── Faculty: close a session ─────────────────────────────────────────────────
/**
 * POST /api/sessions/:id/close
 * Faculty only. Closes the session — no further QR tokens can be issued.
 */
router.post('/:id/close', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const sessionId = Number(req.params.id);
  const session = db.prepare('SELECT * FROM class_sessions WHERE id=?').get(sessionId);
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
  if (session.faculty_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session.' } });
  }
  if (session.status !== 'open') return bad(res, 'Session is already closed.');

  db.prepare("UPDATE class_sessions SET status='closed' WHERE id=?").run(sessionId);

  // Expire all unused tokens for this session
  db.prepare('UPDATE session_qr_tokens SET expires_at=0 WHERE session_id=? AND used_by IS NULL').run(sessionId);

  // Count how many students attended
  const attendedCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM session_qr_tokens WHERE session_id=? AND used_by IS NOT NULL'
  ).get(sessionId)?.cnt || 0;

  return res.json({
    message: `Session closed. ${attendedCount} student(s) attended via QR.`,
    session_id: sessionId,
    attended_count: attendedCount,
  });
}));

// ─── List sessions (faculty sees their own; admin sees all) ──────────────────
router.get('/', h(async (req, res) => {
  let rows;
  if (['admin', 'super_admin'].includes(req.user.role)) {
    rows = db.prepare(`
      SELECT cs.*, u.name as faculty_name, s.name as subject_name, s.code as subject_code
      FROM class_sessions cs
      JOIN users u ON cs.faculty_id = u.id
      JOIN subjects s ON cs.subject_id = s.id
      ORDER BY cs.created_at DESC LIMIT 200
    `).all();
  } else if (req.user.role === 'faculty') {
    rows = db.prepare(`
      SELECT cs.*, s.name as subject_name, s.code as subject_code
      FROM class_sessions cs
      JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.faculty_id=?
      ORDER BY cs.created_at DESC LIMIT 100
    `).all(req.user.id);
  } else {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty or Admin access required.' } });
  }
  return res.json({ sessions: paginate(rows, req, res) });
}));

// ─── Faculty: view at-risk students for their taught subjects ─────────────────
router.get('/at-risk', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const students = db.prepare(`
    SELECT u.id, u.name, u.roll_no,
           COALESCE(SUM(a.attended), 0) as attended,
           COALESCE(SUM(a.total), 0) as total,
           CASE WHEN SUM(a.total) > 0 THEN ROUND(100.0*SUM(a.attended)/SUM(a.total),1) ELSE 0 END as pct
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id
    WHERE u.role='student'
    GROUP BY u.id
    HAVING pct < 75 OR total = 0
    ORDER BY pct ASC
    LIMIT 100
  `).all();

  return res.json({ at_risk: students, count: students.length });
}));

// ─── Step 4: Intervention Loop & Follow-Up Notes ─────────────────────────────
const riskAdvisor = require('./services/riskAdvisor');
const emailNotifier = require('./services/emailNotifier');

const interventionSchema = z.object({
  student_id: z.number().int().positive(),
  note: z.string().min(5).max(1000),
  action_plan: z.string().max(1000).optional(),
  follow_up_date: z.string().max(30).optional(),
  risk_level: z.string().max(50).optional()
});

router.post('/interventions', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const parsed = interventionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message } });
  }

  const { student_id, note, action_plan, follow_up_date, risk_level } = parsed.data;
  const result = riskAdvisor.recordInterventionNote({
    studentId: student_id,
    facultyId: req.user.id,
    note,
    actionPlan: action_plan,
    followUpDate: follow_up_date,
    riskLevel: risk_level
  });

  notify(student_id, `Faculty Mentor note added: "${note.slice(0, 60)}..."`, 'info', `mentor_note_${result.id}`);

  auditLog({
    userId: req.user.id,
    action: 'INTERVENTION_NOTE',
    table: 'intervention_notes',
    recordId: result.id,
    newValue: { student_id, note, action_plan },
    ip: req.ip
  });

  return res.status(201).json({ message: 'Intervention note logged successfully.', intervention: result });
}));

router.get('/interventions/:studentId', h(async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access other students\' records.' } });
  }

  const trend = riskAdvisor.getRiskTrend(studentId);
  if (!trend) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });

  return res.json(trend);
}));

router.post('/alert-email', h(async (req, res) => {
  if (!['faculty', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty access required.' } });
  }

  const { student_id, to, subject, message } = req.body || {};
  if (!to || !subject) return bad(res, 'Target email address and subject are required.');

  const result = await emailNotifier.sendAlertEmail({
    to,
    subject,
    text: message || 'Notice: Attendance or academic threshold alert.',
    userId: student_id ? Number(student_id) : null
  });

  return res.json({ message: 'Email alert dispatched.', result });
}));

module.exports = router;

