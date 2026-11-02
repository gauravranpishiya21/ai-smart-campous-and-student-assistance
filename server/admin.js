// Admin Management API for Smart Campus AI
const express = require('express');
const bcrypt = require('bcryptjs');
const { db, rec, notify, auditLog, withTransaction } = require('./db');
const ai = require('./ai');
const automation = require('./automation');
const { paginate } = require('./middleware/pagination');
const {
  validate,
  genericPostSchema,
  adminStudentSchema,
  adminAttendanceOverrideSchema,
  adminMarksUpdateSchema,
  adminNoticeSchema,
  adminMaterialsSchema
} = require('./middleware/validate');

const router = express.Router();
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next || ((e) => {
  console.error('[AdminAPI Error]', e);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: e.message || 'Server error' }, message: e.message || 'Server error' });
}));
const bad = (res, msg, code = 400, errCode = null) => {
  const c = errCode || (code === 403 ? 'FORBIDDEN' : code === 401 ? 'UNAUTHORIZED' : code === 404 ? 'NOT_FOUND' : 'BAD_REQUEST');
  return res.status(code).json({
    error: { code: c, message: msg },
    message: msg
  });
};
const today = () => new Date().toISOString().slice(0, 10);

// Admin authorization guard
function adminOnly(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    return next();
  }
  return bad(res, 'Administrator access required.', 403, 'FORBIDDEN');
}

router.use(adminOnly);

// ---------- 1. Overview / Dashboard KPI Stats ----------
router.get('/overview', h(async (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='student'").get().c;
  const totalFaculty = rec.list('faculty', null).length || 6;
  const totalSubjects = db.prepare("SELECT COUNT(*) as c FROM subjects").get().c;

  // Calculate overall campus attendance & at-risk count
  const students = db.prepare("SELECT id FROM users WHERE role='student'").all();
  let totalAttended = 0;
  let totalClasses = 0;
  let atRiskCount = 0;
  const deptCounts = {};

  students.forEach((s) => {
    const snap = ai.snapshot(s.id);
    if (snap.classes > 0) {
      totalAttended += snap.attended;
      totalClasses += snap.classes;
      if (snap.attendancePct < 75) atRiskCount++;
    }
  });

  const avgAttendance = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : 80.0;

  // Department distribution
  const depts = db.prepare("SELECT dept, COUNT(*) as count FROM users WHERE role='student' GROUP BY dept").all();
  depts.forEach(d => { deptCounts[d.dept || 'General'] = d.count; });

  // Financial statistics
  const feeRecords = rec.list('fee', undefined);
  let totalAssessed = 0;
  let totalPaid = 0;
  feeRecords.forEach(f => {
    totalAssessed += Number(f.assessed || 0);
    totalPaid += Number(f.paid || 0);
  });
  const totalDues = Math.max(0, totalAssessed - totalPaid);

  // Tickets & Leaves
  const tickets = rec.list('ticket', undefined);
  const openTickets = tickets.filter(t => (t.status || 'Open') === 'Open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;

  const leaves = rec.list('leave', undefined);
  const pendingLeaves = leaves.filter(l => (l.status || 'Pending') === 'Pending').length;

  // Automation health
  const recentLogs = db.prepare("SELECT * FROM automation_log ORDER BY id DESC LIMIT 5").all();

  res.json({
    kpis: {
      totalStudents,
      totalFaculty,
      totalSubjects,
      avgAttendance,
      atRiskCount,
      totalAssessed,
      totalPaid,
      totalDues,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      pendingLeaves,
      aiModel: ai.llmAvailable() ? require('./config').geminiModel : 'Offline AI Engine',
    },
    depts: deptCounts,
    recentAutomation: recentLogs
  });
}));

// ---------- 2. Student & User Management ----------
router.get('/students', h(async (req, res) => {
  const users = db.prepare("SELECT id, roll_no, name, email, dept, year, semester, xp, role, created_at FROM users ORDER BY role='admin' DESC, id ASC").all();

  const enriched = users.map(u => {
    let att = 0;
    let avg = 0;
    let risk = 'Safe';
    if (u.role === 'student') {
      const snap = ai.snapshot(u.id);
      att = ai.r1(snap.attendancePct);
      const withM = snap.subjects.filter(s => s.internal != null);
      avg = withM.length ? ai.r1((withM.reduce((x, s) => x + s.internal, 0) / withM.length / 25) * 100) : 0;
      const r = ai.risk(snap);
      risk = r.level;
    }
    return {
      ...u,
      attendance: att,
      avgMarks: avg,
      riskLevel: risk,
      level: Math.floor((u.xp || 0) / 300) + 1
    };
  });

  res.json(paginate(enriched, req, res));
}));

router.post('/students', validate(adminStudentSchema), h(async (req, res) => {
  const { name, roll_no, email, password, dept, year, semester, role } = req.body || {};
  if (!name || !roll_no || !email) {
    return bad(res, 'Name, roll number, and email are required.');
  }

  const pass = password && password.length >= 6 ? password : 'student123';
  const userRole = role || 'student';
  const userDept = dept || 'Computer Science & Engineering';
  const userYear = Number(year) || 2;
  const userSem = Number(semester) || 4;

  try {
    const r = db.prepare(`
      INSERT INTO users(roll_no, name, email, password_hash, dept, year, semester, role, xp)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, 100)
    `).run(
      roll_no.trim(),
      name.trim(),
      email.trim().toLowerCase(),
      bcrypt.hashSync(pass, 8),
      userDept,
      userYear,
      userSem,
      userRole
    );

    const newId = Number(r.lastInsertRowid);

    // If new user is a student, seed default subjects attendance for current semester
    if (userRole === 'student') {
      const semSubjects = db.prepare('SELECT id FROM subjects WHERE sem=?').all(userSem);
      semSubjects.forEach(s => {
        db.prepare('INSERT OR IGNORE INTO attendance VALUES(?,?,?,?)').run(newId, s.id, 32, 40);
        db.prepare('INSERT OR IGNORE INTO marks VALUES(?,?,?,?,?,?)').run(newId, s.id, 18, 55, 4, 5);
      });
      // Initial fee record
      rec.add('fee', newId, { semester: userSem, assessed: 85000, paid: 85000 });
      notify(newId, 'Welcome to Smart Campus! Your student account is active.', 'info', 'welcome_new');
    }

    res.json({ message: `User ${name} (${roll_no}) created successfully!`, id: newId });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return bad(res, 'Roll number or email already exists.');
    }
    throw err;
  }
}));

router.put('/students/:id', validate(genericPostSchema), h(async (req, res) => {
  const userId = Number(req.params.id);
  const { name, email, dept, year, semester, role, xp, password } = req.body || {};

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) return bad(res, 'User not found.', 404);

  const updates = [];
  const params = [];

  if (name) { updates.push('name=?'); params.push(name.trim()); }
  if (email) { updates.push('email=?'); params.push(email.trim().toLowerCase()); }
  if (dept) { updates.push('dept=?'); params.push(dept.trim()); }
  if (year != null) { updates.push('year=?'); params.push(Number(year)); }
  if (semester != null) { updates.push('semester=?'); params.push(Number(semester)); }
  if (role) { updates.push('role=?'); params.push(role); }
  if (xp != null) { updates.push('xp=?'); params.push(Number(xp)); }
  if (password && password.length >= 6) {
    updates.push('password_hash=?');
    params.push(bcrypt.hashSync(password, 8));
  }

  if (updates.length > 0) {
    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id=?`).run(...params);
  }

  res.json({ message: 'User profile updated successfully.' });
}));

router.delete('/students/:id', h(async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) {
    return bad(res, 'You cannot delete your own administrative account.');
  }

  db.prepare('DELETE FROM users WHERE id=?').run(userId);
  db.prepare('DELETE FROM attendance WHERE user_id=?').run(userId);
  db.prepare('DELETE FROM attendance_log WHERE user_id=?').run(userId);
  db.prepare('DELETE FROM marks WHERE user_id=?').run(userId);
  db.prepare('DELETE FROM notifications WHERE user_id=?').run(userId);
  db.prepare('DELETE FROM records WHERE user_id=?').run(userId);

  res.json({ message: 'Student and related campus records removed.' });
}));

// ---------- 3. Attendance Management & Shortage Scanner ----------
router.get('/attendance', h(async (req, res) => {
  const students = db.prepare("SELECT id, roll_no, name, dept, semester FROM users WHERE role='student' ORDER BY name ASC").all();

  const report = students.map(s => {
    const snap = ai.snapshot(s.id);
    const deficitSubjects = snap.subjects.filter(sub => sub.pct < 75).map(sub => ({
      code: sub.code,
      name: sub.name,
      pct: ai.r1(sub.pct),
      attended: sub.attended,
      total: sub.classes,
      needed: ai.bunkPlan(sub.attended, sub.classes).mustAttend
    }));

    return {
      studentId: s.id,
      roll_no: s.roll_no,
      name: s.name,
      dept: s.dept,
      semester: s.semester,
      overallPct: ai.r1(snap.attendancePct),
      attended: snap.attended,
      classes: snap.classes,
      isShortage: snap.attendancePct < 75,
      shortageSubjects: deficitSubjects,
      subjects: snap.subjects.map(sub => ({
        id: sub.id,
        code: sub.code,
        name: sub.name,
        attended: sub.attended,
        total: sub.classes,
        pct: ai.r1(sub.pct)
      }))
    };
  });

  res.json(report);
}));

router.post('/attendance/override', validate(adminAttendanceOverrideSchema), h(async (req, res) => {
  const { studentId, subjectId, addAttended, setAttended, setTotal, reason } = req.body || {};
  const sid = Number(studentId);

  if (!sid) return bad(res, 'Valid Student ID is required.');

  if (subjectId) {
    const subId = Number(subjectId);
    const row = db.prepare('SELECT attended, total FROM attendance WHERE user_id=? AND subject_id=?').get(sid, subId);
    let newAtt = row ? row.attended : 0;
    let newTot = row ? row.total : 0;

    if (setAttended != null) newAtt = Math.max(0, Number(setAttended));
    else if (addAttended != null) newAtt += Number(addAttended);

    if (setTotal != null) newTot = Math.max(newAtt, Number(setTotal));
    else if (addAttended != null && newAtt > newTot) newTot = newAtt;

    db.prepare(`
      INSERT INTO attendance(user_id, subject_id, attended, total)
      VALUES(?, ?, ?, ?)
      ON CONFLICT(user_id, subject_id) DO UPDATE SET attended=?, total=?
    `).run(sid, subId, newAtt, newTot, newAtt, newTot);
  } else if (addAttended != null) {
    // Blanket addition across all current semester subjects (e.g. approved Duty Leave)
    db.prepare('UPDATE attendance SET attended = attended + ?, total = total + ? WHERE user_id=?')
      .run(Number(addAttended), Number(addAttended), sid);
  }

  // Record duty leave log
  rec.add('attendance_override', sid, {
    reason: reason || 'Administrative duty exemption / medical override',
    added: addAttended || 0,
    date: today(),
    officer: req.user.name
  });

  notify(sid, `Attendance adjustment applied by Administration: ${reason || 'Duty Leave granted'}.`, 'success', `att_override_${Date.now()}`);

  auditLog({
    userId: req.user.id,
    action: 'OVERRIDE',
    table: 'attendance',
    recordId: sid,
    oldValue: null,
    newValue: { studentId: sid, subjectId: subjectId || 'all', addAttended, setAttended, setTotal, reason },
    ip: req.ip
  });

  res.json({ message: 'Attendance records updated successfully.' });
}));

// ---------- 4. Academics & Grading Management ----------
router.get('/academics', h(async (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY sem ASC, code ASC').all();
  const students = db.prepare("SELECT id, roll_no, name FROM users WHERE role='student' ORDER BY roll_no ASC").all();

  const marksList = db.prepare(`
    SELECT m.*, u.name as student_name, u.roll_no, s.code as subject_code, s.name as subject_name, s.credits
    FROM marks m
    JOIN users u ON m.user_id = u.id
    JOIN subjects s ON m.subject_id = s.id
    ORDER BY s.code, u.roll_no
  `).all();

  res.json({
    subjects,
    students,
    marks: marksList
  });
}));

router.post('/marks/update', validate(adminMarksUpdateSchema), h(async (req, res) => {
  const { studentId, subjectId, internal, endsem, assignDone, assignTotal } = req.body || {};
  const sid = Number(studentId);
  const subId = Number(subjectId);

  if (!sid || !subId) return bad(res, 'Student ID and Subject ID are required.');

  const cur = db.prepare('SELECT * FROM marks WHERE user_id=? AND subject_id=?').get(sid, subId);
  const intVal = internal != null ? Number(internal) : (cur?.internal ?? 20);
  const endVal = endsem != null ? (endsem === '' ? null : Number(endsem)) : (cur?.endsem ?? null);
  const doneVal = assignDone != null ? Number(assignDone) : (cur?.assign_done ?? 5);
  const totVal = assignTotal != null ? Number(assignTotal) : (cur?.assign_total ?? 5);

  db.prepare(`
    INSERT INTO marks(user_id, subject_id, internal, endsem, assign_done, assign_total)
    VALUES(?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, subject_id) DO UPDATE SET
      internal=?, endsem=?, assign_done=?, assign_total=?
  `).run(sid, subId, intVal, endVal, doneVal, totVal, intVal, endVal, doneVal, totVal);

  notify(sid, 'Your academic marks or assignment records have been updated.', 'info', `marks_update_${subId}`);

  auditLog({
    userId: req.user.id,
    action: 'UPDATE',
    table: 'marks',
    recordId: `${sid}:${subId}`,
    oldValue: cur || null,
    newValue: { internal: intVal, endsem: endVal, assign_done: doneVal, assign_total: totVal },
    ip: req.ip
  });

  res.json({ message: 'Academic marks updated successfully.' });
}));

// ---------- 5. Finance & Fee Ledgers ----------
router.get('/fees', h(async (req, res) => {
  const students = db.prepare("SELECT id, roll_no, name, dept, semester FROM users WHERE role='student' ORDER BY name ASC").all();
  const allFeeDocs = rec.list('fee', undefined);
  const allReceipts = rec.list('receipt', undefined);

  const studentLedgers = students.map(s => {
    const sFees = allFeeDocs.filter(f => f.user_id === s.id);
    const sReceipts = allReceipts.filter(r => r.user_id === s.id);
    const assessed = sFees.reduce((n, f) => n + Number(f.assessed || 0), 0);
    const paid = sFees.reduce((n, f) => n + Number(f.paid || 0), 0);
    const due = Math.max(0, assessed - paid);

    return {
      studentId: s.id,
      roll_no: s.roll_no,
      name: s.name,
      dept: s.dept,
      semester: s.semester,
      assessed,
      paid,
      due,
      status: due === 0 ? 'Clear' : 'Pending Dues',
      receipts: sReceipts,
      semesters: sFees
    };
  });

  res.json({
    ledgers: studentLedgers,
    totals: {
      assessed: studentLedgers.reduce((x, l) => x + l.assessed, 0),
      paid: studentLedgers.reduce((x, l) => x + l.paid, 0),
      due: studentLedgers.reduce((x, l) => x + l.due, 0)
    }
  });
}));

router.post('/fees/record', validate(genericPostSchema), h(async (req, res) => {
  const { studentId, semester, amount, paymentMode, remarks } = req.body || {};
  const sid = Number(studentId);
  const amt = Number(amount);
  const sem = Number(semester || 4);

  if (!sid || amt <= 0) return bad(res, 'Valid student and positive payment amount required.');

  const s = db.prepare('SELECT name, roll_no FROM users WHERE id=?').get(sid);
  if (!s) return bad(res, 'Student not found.', 404);

  // Find or create fee record for this semester
  const feeDocs = rec.list('fee', sid);
  let semFee = feeDocs.find(f => f.semester === sem);
  if (semFee) {
    rec.update(semFee.id, { paid: Number(semFee.paid || 0) + amt });
  } else {
    rec.add('fee', sid, { semester: sem, assessed: amt, paid: amt });
  }

  // Generate Receipt
  const receiptNo = `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const txnId = `ADMIN-${paymentMode || 'OFFLINE'}-${Date.now().toString().slice(-6)}`;

  const receipt = rec.add('receipt', sid, {
    no: receiptNo,
    amount: amt,
    date: today(),
    txn: txnId,
    mode: paymentMode || 'Cash/Demand Draft',
    status: 'Paid',
    remarks: remarks || 'Recorded by Accounts Administration'
  });

  notify(sid, `Fee payment of ₹${amt.toLocaleString('en-IN')} recorded successfully. Receipt No: ${receiptNo}.`, 'success', `fee_${receiptNo}`);

  res.json({ message: 'Payment recorded and official receipt generated.', receipt });
}));

// ---------- 6. Notices & Campus Bulletins ----------
router.get('/notices', h(async (req, res) => {
  const notices = db.prepare('SELECT * FROM notices ORDER BY id DESC').all();
  res.json(paginate(notices, req, res));
}));

router.post('/notices', validate(adminNoticeSchema), h(async (req, res) => {
  const { title, body, category, priority } = req.body || {};
  if (!title || !body) return bad(res, 'Notice title and body content are required.');

  const cat = category || 'General';
  const pr = priority || 'Medium';
  const summary = ai.summarizeNotice(body);

  const r = db.prepare(`
    INSERT INTO notices(title, body, summary, category, priority, created_at)
    VALUES(?, ?, ?, ?, ?, datetime('now'))
  `).run(title.trim(), body.trim(), summary, cat, pr);

  // Broadcast notification to all students
  const students = db.prepare("SELECT id FROM users WHERE role='student'").all();
  students.forEach(s => {
    notify(s.id, `Campus Notice: ${title}`, pr === 'High' ? 'warn' : 'info', `notice_${r.lastInsertRowid}`);
  });

  res.json({ message: 'Notice published campus-wide.', id: Number(r.lastInsertRowid), summary });
}));

router.delete('/notices/:id', h(async (req, res) => {
  const nid = Number(req.params.id);
  db.prepare('DELETE FROM notices WHERE id=?').run(nid);
  res.json({ message: 'Notice deleted.' });
}));

// ---------- 7. Grievance & Helpdesk Triage ----------
router.get('/tickets', h(async (req, res) => {
  const tickets = rec.list('ticket', undefined);
  const students = db.prepare("SELECT id, name, roll_no, dept FROM users").all();
  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s; });

  const enriched = tickets.map(t => ({
    ...t,
    student: studentMap[t.user_id] || { name: 'Student', roll_no: 'N/A', dept: 'General' }
  }));

  res.json(paginate(enriched, req, res));
}));

router.post('/tickets/:id/status', validate(genericPostSchema), h(async (req, res) => {
  const tid = Number(req.params.id);
  const { status, resolution, assignedTo } = req.body || {};

  const ticket = rec.get(tid);
  if (!ticket) return bad(res, 'Ticket not found.', 404);

  const patch = {};
  if (status) patch.status = status;
  if (resolution) patch.resolution = resolution;
  if (assignedTo) patch.assignedTo = assignedTo;
  patch.updated_at = new Date().toISOString();

  rec.update(tid, patch);

  if (ticket.user_id) {
    notify(ticket.user_id, `Helpdesk Ticket #${tid} (${ticket.title}) marked as ${status || 'Updated'}.`, status === 'Resolved' ? 'success' : 'info', `ticket_update_${tid}`);
  }

  res.json({ message: `Ticket #${tid} updated to ${status}.` });
}));

// ---------- 8. Student Leave Approval ----------
router.get('/leaves', h(async (req, res) => {
  const leaves = rec.list('leave', undefined);
  const students = db.prepare("SELECT id, name, roll_no, dept FROM users").all();
  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s; });

  const enriched = leaves.map(l => ({
    ...l,
    student: studentMap[l.user_id] || { name: 'Student', roll_no: 'N/A', dept: 'General' }
  }));

  res.json(paginate(enriched, req, res));
}));

router.post('/leaves/:id/review', validate(genericPostSchema), h(async (req, res) => {
  const lid = Number(req.params.id);
  const { status, remarks } = req.body || {};

  if (!['Approved', 'Rejected'].includes(status)) {
    return bad(res, 'Status must be Approved or Rejected.');
  }

  const leave = rec.get(lid);
  if (!leave) return bad(res, 'Leave application not found.', 404);

  rec.update(lid, {
    status,
    remarks: remarks || `Reviewed by ${req.user.name}`,
    reviewedAt: today()
  });

  if (leave.user_id) {
    notify(leave.user_id, `Your leave request from ${leave.from} to ${leave.to} has been ${status}. Remarks: ${remarks || 'None'}.`, status === 'Approved' ? 'success' : 'warn', `leave_rev_${lid}`);
  }

  res.json({ message: `Leave application marked as ${status}.` });
}));

// ---------- 9. AI & Automation Job Control ----------
router.get('/automation', h(async (req, res) => {
  const jobs = Object.keys(automation.jobs);
  const logs = db.prepare('SELECT * FROM automation_log ORDER BY id DESC LIMIT 50').all();
  res.json({
    jobs,
    logs: paginate(logs, req, res),
    llm: ai.llmAvailable(),
    model: ai.llmAvailable() ? require('./config').geminiModel : 'Offline AI Engine'
  });
}));

router.post('/automation/run', validate(genericPostSchema), h(async (req, res) => {
  const { job } = req.body || {};
  let results;
  if (job && automation.jobs[job]) {
    results = [automation.runJob(job)];
  } else {
    results = automation.runAll();
  }
  res.json({ message: 'Automation task executed successfully.', results });
}));

// ---------- 10. Security Audit Log ----------
router.get('/audit-log', h(async (req, res) => {
  const logins = rec.list('login', undefined, { limit: 100 });
  const users = db.prepare("SELECT id, name, roll_no, role FROM users").all();
  const uMap = {};
  users.forEach(u => { uMap[u.id] = u; });

  const audit = logins.map(l => ({
    ...l,
    user: uMap[l.user_id] || { name: 'Unknown / Guest', roll_no: '-', role: '-' }
  }));

  res.json(paginate(audit, req, res));
}));


// ---------- 11. Study Materials & Academic Resources Management ----------
router.get('/materials', h(async (req, res) => {
  const { dept, year, semester } = req.query;
  let query = 'SELECT sm.*, s.name as subject_name, s.code as subject_code FROM study_materials sm LEFT JOIN subjects s ON sm.subject_id = s.id';
  const params = [];
  const conditions = [];

  if (dept) { conditions.push('sm.dept = ?'); params.push(dept); }
  if (year) { conditions.push('sm.year = ?'); params.push(parseInt(year, 10)); }
  if (semester) { conditions.push('sm.semester = ?'); params.push(parseInt(semester, 10)); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY sm.id DESC';

  const items = db.prepare(query).all(...params);
  res.json({ items: paginate(items, req, res) });
}));

router.post('/materials', validate(adminMaterialsSchema), h(async (req, res) => {
  const { title, description, dept, year, semester, subject_id, material_type, file_name } = req.body || {};
  if (!title || !dept || !year || !semester) {
    return bad(res, 'Title, department, academic year, and semester are required.');
  }

  const sYear = parseInt(year, 10);
  const sSem = parseInt(semester, 10);
  const sSubId = subject_id ? parseInt(subject_id, 10) : null;
  const fileName = (file_name || title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf');

  const result = db.prepare(`
    INSERT INTO study_materials(title, description, dept, year, semester, subject_id, material_type, file_name, uploaded_by, status)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'Published')
  `).run(title, description || '', dept, sYear, sSem, sSubId, material_type || 'Notes', fileName, req.user.id);

  res.json({
    message: 'Study material uploaded and published successfully.',
    id: Number(result.lastInsertRowid)
  });
}));

router.delete('/materials/:id', h(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM study_materials WHERE id=?').run(id);
  res.json({ message: 'Study material deleted successfully.' });
}));

module.exports = router;

