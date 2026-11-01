require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const { db, rec, notify, addXp, checkpoint } = require('./db');
const ai = require('./ai');
const automation = require('./automation');
const academicCal = require('./academicCalendar');
const kernel = require('./kernelEngine');
const smartSuite = require('./smartCampusSuite');
require('./seed').ensureSeeded();

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    socket.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, roll_no, name, email, role, dept, year, semester FROM users WHERE id=?').get(payload.id);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error('Invalid socket authentication token'));
  }
});

io.on('connection', (socket) => {
  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === 'admin' || socket.user.role === 'super_admin') {
      socket.join('admins');
    }
  }
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Authentication Rate Limiter (Brute-Force Protection: max 25 attempts/minute)
const authLimiterMap = new Map();
function authRateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const attempts = (authLimiterMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= 25) {
    return res.status(429).json({ message: 'Too many authentication attempts. Please try again in a minute.' });
  }
  attempts.push(now);
  authLimiterMap.set(ip, attempts);
  next();
}

// ---------- helpers ----------
const api = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { console.error(e); res.status(500).json({ message: e.message || 'Server error' }); });
const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });
const level = (xp) => ({ level: Math.floor(xp / 300) + 1, progress: Math.round(((xp % 300) / 300) * 100) });
const publicUser = (u) => ({ id: u.id, name: u.name, roll_no: u.roll_no, email: u.email, dept: u.dept, year: u.year, semester: u.semester, role: u.role, xp: u.xp, ...level(u.xp) });
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => Number(n) || 0;

function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = db.prepare('SELECT * FROM users WHERE id=?').get(jwt.verify(t, SECRET).id); if (!req.user) throw 0; next(); }
  catch { bad(res, 'Please log in again.', 401); }
}

// ---------- auth ----------
api.post('/auth/login', authRateLimiter, h((req, res) => {
  const { id, password } = req.body || {};
  const cleanId = String(id || '').trim();
  const u = db.prepare('SELECT * FROM users WHERE LOWER(roll_no) = LOWER(?) OR LOWER(email) = LOWER(?)').get(cleanId, cleanId);
  const ok = u && bcrypt.compareSync(String(password || ''), u.password_hash);
  rec.add('login', u?.id ?? null, { device: (req.headers['user-agent'] || 'Unknown').slice(0, 80), ip: req.ip, status: ok ? 'Success' : 'Failed' });
  if (!ok) return bad(res, 'Invalid ID or password.', 401);
  res.json({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' }), user: publicUser(u) });
}));
api.post('/auth/register', authRateLimiter, h((req, res) => {
  const { name, roll_no, email, password, dept, year, semester } = req.body || {};
  if (!name || !roll_no || !email || String(password || '').length < 6) {
    return bad(res, 'Name, roll number, email and a password (6+ chars) are required.');
  }
  const cleanRoll = String(roll_no || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const userDept = dept || 'Computer Science & Engineering';
  const userSem = Number(semester) || (year ? Number(year) * 2 - 1 : 4);
  const userYear = Number(year) || Math.ceil(userSem / 2) || 2;

  const existing = db.prepare('SELECT id, roll_no, email FROM users WHERE LOWER(roll_no) = LOWER(?) OR LOWER(email) = LOWER(?)').get(cleanRoll, cleanEmail);
  if (existing) {
    return bad(res, existing.email.toLowerCase() === cleanEmail ? 'Email address is already registered.' : 'Roll number is already registered.');
  }

  try {
    const r = db.prepare(`
      INSERT INTO users(roll_no, name, email, password_hash, dept, year, semester, xp, role)
      VALUES(?, ?, ?, ?, ?, ?, ?, 100, 'student')
    `).run(
      cleanRoll,
      cleanName,
      cleanEmail,
      bcrypt.hashSync(password, 8),
      userDept,
      userYear,
      userSem
    );
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(r.lastInsertRowid));

    // Auto-enroll new student into catalog subjects for their semester
    const subs = db.prepare('SELECT id FROM subjects WHERE sem=?').all(userSem);
    subs.forEach(s => {
      db.prepare('INSERT OR IGNORE INTO attendance VALUES(?,?,?,?)').run(u.id, s.id, 33, 40);
      db.prepare('INSERT OR IGNORE INTO marks VALUES(?,?,?,?,?,?)').run(u.id, s.id, 19, null, 4, 5);
    });

    // Seed recent attendance log for dashboard chart
    for (let i = 21; i >= 1; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      if ([0, 6].includes(dt.getDay())) continue;
      db.prepare('INSERT OR IGNORE INTO attendance_log(user_id, date, status) VALUES(?,?,?)')
        .run(u.id, dt.toISOString().slice(0, 10), (i % 5 !== 0) ? 'present' : 'absent');
    }

    // Add initial semester fee record
    rec.add('fee', u.id, { semester: userSem, assessed: 87000, paid: 87000 });
    notify(u.id, 'Welcome to the AI-Powered Smart Campus System! Your account is active.', 'info', 'welcome');

    // Immediately checkpoint to disk so newly created user is durable across restarts
    if (typeof checkpoint === 'function') checkpoint('PASSIVE');

    res.json({
      message: 'Registration successful! You are now logged in.',
      token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' }),
      user: publicUser(u)
    });
  } catch (err) {
    bad(res, 'Failed to create account: ' + (err.message || 'Database error'));
  }
}));
api.get('/time', (req, res) => res.json({ now: new Date().toISOString() }));
api.get('/ai/status', (req, res) => res.json({ llm: ai.llmAvailable(), model: ai.llmAvailable() ? ai.getGeminiModel() : 'offline-engine', provider: ai.llmAvailable() ? 'google-gemini' : 'offline-engine' }));
api.get('/project/blueprint-doc', (req, res) => res.json(smartSuite.getCompleteProjectDocumentation()));

api.use(auth);
api.get('/auth/me', (req, res) => res.json(publicUser(req.user)));
api.get('/auth/logins', (req, res) => res.json(rec.list('login', req.user.id, { limit: 10 })));

// ---------- dashboard ----------
api.get('/dashboard', h((req, res) => {
  const u = req.user, snap = ai.snapshot(u.id), f = ai.forecast(snap), rk = ai.risk(snap);
  const withM = snap.subjects.filter((s) => s.internal != null);
  const avg = withM.length ? withM.reduce((x, s) => x + s.internal, 0) / withM.length / 25 * 100 : 0;
  const done = snap.subjects.reduce((x, s) => x + s.assign_done, 0), tot = snap.subjects.reduce((x, s) => x + s.assign_total, 0);
  // weekly attendance trend from daily log
  const log = db.prepare('SELECT date,status FROM attendance_log WHERE user_id=? ORDER BY date').all(u.id);
  const weeks = {};
  log.forEach((l) => { const dt = new Date(l.date); const key = Math.floor((Date.now() - dt) / (7 * 864e5)); (weeks[key] ||= []).push(l.status === 'present'); });
  const keys = Object.keys(weeks).map(Number).sort((a, b) => b - a);
  const labels = keys.map((k) => (k === 0 ? 'This wk' : `${k}w ago`)), data = keys.map((k) => Math.round(weeks[k].filter(Boolean).length / weeks[k].length * 100));
  const fc = [f.projected, Math.min(100, f.projected + 1)].map((x) => Math.round(x));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sem = u.semester || 1;
  const semSubjects = db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY id').all(sem);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const rooms = sem <= 2
    ? ['Hall 101', 'Hall 102', 'Physics Lab', 'Computing Lab 1', 'Language Lab']
    : ['Hall 201', 'Hall 202', 'Networks Lab', 'Systems Lab', 'Hall 304'];

  const tt = weekdays.map((day, dIdx) => ({
    day,
    semester: sem,
    slots: [
      { time: '09:00 - 10:00', subject: semSubjects[(dIdx) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx) % semSubjects.length]?.faculty || 'Faculty', room: rooms[0] },
      { time: '10:00 - 11:00', subject: semSubjects[(dIdx + 1) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 1) % semSubjects.length]?.faculty || 'Faculty', room: rooms[1] },
      { time: '11:15 - 12:15', subject: semSubjects[(dIdx + 2) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 2) % semSubjects.length]?.faculty || 'Faculty', room: rooms[2] },
      { time: '13:00 - 14:00', subject: semSubjects[(dIdx + 3) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 3) % semSubjects.length]?.faculty || 'Faculty', room: rooms[3] },
      { time: '14:00 - 15:00', subject: semSubjects[(dIdx + 4) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 4) % semSubjects.length]?.faculty || 'Faculty', room: rooms[4] }
    ]
  }));
  const routineToday = (tt.find((x) => x.day === days[new Date().getDay()])?.slots || []);
  const rule = snap.subjects.map((s) => ({ code: s.code, name: s.name, pct: ai.r1(s.pct), ok: s.pct >= 75, mustAttend: ai.bunkPlan(s.attended, s.classes).mustAttend }));
  res.json({
    user: publicUser(u),
    stats: { attendance: ai.r1(snap.attendancePct), avgMarks: ai.r1(avg), assignmentsDone: done, assignmentsTotal: tot, pending: tot - done },
    trend: { labels, data, forecast: fc }, performance: { labels: withM.map((s) => s.code), data: withM.map((s) => s.internal * 4), names: withM.map((s) => s.name) },
    risk: rk, forecast: f, rule, recommendations: ai.recommendations(snap, rk),
    notifications: db.prepare('SELECT message,type,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 15').all(u.id),
    routine: { today: routineToday, week: tt },
  });
}));
api.get('/notifications', (req, res) => res.json(db.prepare('SELECT message,type,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id)));

// ---------- attendance & leave ----------
api.get('/attendance', (req, res) => {
  const snap = ai.snapshot(req.user.id), f = ai.forecast(snap);
  const leaves = rec.list('leave', req.user.id).filter((l) => l.status === 'Approved');
  const leaveDays = leaves.reduce((x, l) => x + Math.max(1, Math.round((new Date(l.to) - new Date(l.from)) / 864e5) + 1), 0);
  res.json({
    overall: { attended: snap.attended, total: snap.classes, pct: f.current, absent: snap.classes - snap.attended, leaveDays }, plan: f,
    subjects: snap.subjects.map((s) => ({ code: s.code, name: s.name, attended: s.attended, total: s.classes, pct: ai.r1(s.pct), ...ai.bunkPlan(s.attended, s.classes) })),
  });
});
api.post('/attendance/mark', h((req, res) => {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return bad(res, 'No classes on weekends.');
  const exists = db.prepare('SELECT 1 FROM attendance_log WHERE user_id=? AND date=?').get(req.user.id, today());
  if (exists) return bad(res, 'Attendance already marked for today.');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const slots = rec.list('timetable', null).find((x) => x.day === days[day])?.slots || [];
  const subs = db.prepare('SELECT * FROM subjects WHERE sem=?').all(req.user.semester);
  db.prepare("INSERT INTO attendance_log(user_id,date,status) VALUES(?,?, 'present')").run(req.user.id, today());
  for (const sl of slots) {
    const s = subs.find((x) => x.name === sl.subject); if (!s) continue;
    db.prepare('INSERT INTO attendance(user_id,subject_id,attended,total) VALUES(?,?,1,1) ON CONFLICT(user_id,subject_id) DO UPDATE SET attended=attended+1,total=total+1').run(req.user.id, s.id);
  }
  addXp(req.user.id, 10);
  res.json({ message: 'Attendance marked for today. +10 XP' });
}));
api.post('/leaves', h((req, res) => {
  const { from, to, reason } = req.body || {};
  if (!from || !to || !reason) return bad(res, 'Dates and reason are required.');
  if (new Date(to) < new Date(from)) return bad(res, 'End date must be after start date.');
  const days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1;
  const dec = ai.leaveDecision(ai.snapshot(req.user.id), days, reason);
  const l = rec.add('leave', req.user.id, { from, to, reason, status: dec.decision, ai_note: dec.note });
  notify(req.user.id, `Leave ${from} → ${to}: ${dec.decision}. ${dec.note}`, 'leave');
  res.json({ message: `${dec.decision}: ${dec.note}`, leave: l });
}));

// ---------- fees, scholarships, results ----------
api.get('/fees', (req, res) => {
  const sems = rec.list('fee', req.user.id, { order: 'ASC' });
  res.json({ semesters: sems.map((s) => ({ ...s, due: s.assessed - s.paid })), receipts: rec.list('receipt', req.user.id),
    totals: { assessed: sems.reduce((x, s) => x + s.assessed, 0), paid: sems.reduce((x, s) => x + s.paid, 0), due: sems.reduce((x, s) => x + s.assessed - s.paid, 0),
      scholarship: rec.list('scholarship', req.user.id).filter((s) => s.status === 'Approved').reduce((x, s) => x + s.amount, 0) } });
});
api.post('/fees/pay', h((req, res) => {
  let amt = money(req.body?.amount);
  const sems = rec.list('fee', req.user.id, { order: 'ASC' }), due = sems.reduce((x, s) => x + s.assessed - s.paid, 0);
  if (amt <= 0) return bad(res, 'Enter a valid amount.');
  if (due <= 0) return bad(res, 'No dues pending.');
  if (amt > due) return bad(res, `Amount exceeds dues (₹${due.toLocaleString('en-IN')}).`);
  const paying = amt;
  for (const s of sems) { const d = Math.min(amt, s.assessed - s.paid); if (d > 0) { rec.update(s.id, { paid: s.paid + d }); amt -= d; } }
  const r = rec.add('receipt', req.user.id, { no: 'RCT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4), amount: paying, date: today(), txn: 'TXN' + Date.now(), status: 'Paid' });
  notify(req.user.id, `Payment of ₹${paying.toLocaleString('en-IN')} received. Receipt ${r.no}.`, 'fee');
  addXp(req.user.id, 20);
  res.json({ message: `Payment successful. Receipt ${r.no} generated.`, receipt: r });
}));
api.get('/scholarships', (req, res) => res.json(rec.list('scholarship', req.user.id)));
api.post('/scholarships/apply', h((req, res) => {
  const { scheme, gpa, income, reason } = req.body || {};
  const amounts = { 'Academic Merit Scholarship': 50000, 'Need-Based Financial Aid': 35000, 'Financial Need & EWS Aid': 35000, 'Women in STEM & Diversity Grant': 40000, 'Women in STEM Excellence': 40000, 'Sports Excellence Fellowship': 30000, 'Research & Innovation Fellowship': 60000 };
  if (!scheme) return bad(res, 'Choose a scheme.');
  const g = Number(gpa), inc = Number(income);
  let status = 'Under Review', remarks = 'Application received. Faculty committee will review.';
  if (/Merit/.test(scheme)) { if (g >= 8.5) { status = 'Auto-Shortlisted'; remarks = 'AI check: CGPA meets the 8.5 criterion.'; } else { status = 'Not Eligible'; remarks = 'AI check: merit scholarship needs SGPA ≥ 8.5.'; } }
  if (/Need|EWS/.test(scheme)) { if (inc > 0 && inc <= 350000) { status = 'Auto-Shortlisted'; remarks = 'AI check: income within the ₹3,50,000 limit. Upload the certificate for final approval.'; } else if (inc > 350000) { status = 'Not Eligible'; remarks = 'AI check: income exceeds ₹3,50,000.'; } }
  const a = rec.add('scholarship', req.user.id, { scheme, amount: amounts[scheme] || 30000, date: today(), status, remarks, reason: reason || '' });
  notify(req.user.id, `Scholarship "${scheme}": ${status}. ${remarks}`, 'scholarship');
  res.json({ message: `${status}: ${remarks}`, application: a });
}));
api.get('/results', (req, res) => {
  const u = req.user;
  const userSem = u.semester || 1;
  const targetSem = userSem > 1 ? (userSem - 1) : userSem;
  const isCompleted = userSem > 1;

  let rows = db.prepare(`SELECT s.code,s.name,s.credits,m.internal,m.endsem FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE m.user_id=? AND s.sem=? AND m.endsem IS NOT NULL`).all(u.id, targetSem);

  if (!rows.length) {
    rows = db.prepare(`SELECT s.code,s.name,s.credits,m.internal,m.endsem FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE m.user_id=? AND s.sem=?`).all(u.id, userSem)
      .map((r) => {
        const intScore = r.internal ?? 21;
        const total = r.endsem != null ? (r.internal + r.endsem) : Math.round(intScore * 3.8);
        const g = ai.grade(total);
        return { ...r, total, grade: g.grade, gp: g.gp, status: r.endsem != null ? (g.gp ? 'PASS' : 'FAIL') : 'IN PROGRESS' };
      });
  } else {
    rows = rows.map((r) => { const t = r.internal + r.endsem, g = ai.grade(t); return { ...r, total: t, grade: g.grade, gp: g.gp, status: g.gp ? 'PASS' : 'FAIL' }; });
  }

  const cr = rows.reduce((x, r) => x + r.credits, 0), pts = rows.reduce((x, r) => x + r.credits * r.gp, 0);
  const sgpa = cr ? Math.round(pts / cr * 100) / 100 : 8.5;
  const cg = ai.recordedCgpa(u.id).cgpa || sgpa;
  const standing = cg >= 7.75 ? 'FIRST CLASS WITH DISTINCTION' : cg >= 6.5 ? 'FIRST CLASS' : cg >= 5 ? 'SECOND CLASS' : 'PASS CLASS';
  const sessionText = isCompleted ? `Semester ${targetSem} · Completed` : `Semester ${userSem} · In Progress`;
  res.json({ student: u.name, roll: u.roll_no, dept: u.dept, session: sessionText, rows, credits: cr, sgpa, cgpa: cg, standing });
});

// ---------- counselling & wellness ----------
api.get('/counseling', (req, res) => res.json({ appointments: rec.list('counseling', req.user.id), wellness: rec.list('wellness', req.user.id, { limit: 7 }) }));
api.post('/counseling', h((req, res) => {
  const { category, counselor, date, notes } = req.body || {};
  if (!date) return bad(res, 'Choose a preferred date and time.');
  const a = rec.add('counseling', req.user.id, { category, counselor, date, notes: notes || '', status: 'Confirmed' });
  notify(req.user.id, `Counselling confirmed with ${counselor} on ${date.replace('T', ' ')}.`, 'counseling');
  res.json({ message: 'Appointment confirmed.', appointment: a });
}));
api.post('/wellness', h((req, res) => {
  const { sleep, stress, focus } = req.body || {};
  rec.add('wellness', req.user.id, { sleep: Number(sleep), stress: Number(stress), focus: Number(focus), date: today() });
  let advice = 'Logged. Keep up the healthy routine!';
  if (stress >= 8) advice = 'High stress logged. Try a 10-minute walk and consider booking a counselling session. Tele-MANAS: 14416.';
  else if (sleep < 6) advice = 'You slept under 6 hours. Aim for 7–8 hours; short naps and less late-night screen time help.';
  else if (focus <= 4) advice = 'Low focus today. Try the Pomodoro method: 25 minutes of work, 5 minutes of rest.';
  addXp(req.user.id, 5);
  res.json({ message: advice });
}));

// ---------- community ----------
api.get('/chat/:channel', (req, res) => res.json(rec.list('chat', null, { limit: 100, order: 'DESC' }).filter((m) => m.channel === req.params.channel).reverse()));
api.post('/chat/:channel', h((req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 500);
  if (!message) return bad(res, 'Message is empty.');
  const m = rec.add('chat', req.user.id, { channel: req.params.channel, name: req.user.name, message });
  io.emit('chat:message', m);
  res.json(m);
  // AI moderator/helper in the doubts channel
  if (req.params.channel === 'doubts' && /\?|explain|help|how|what|why/i.test(message)) {
    ai.doubtSolve('General', message).then((d) => {
      const bot = rec.add('chat', null, { channel: 'doubts', name: '🤖 AI Tutor', message: d.explanation.replace(/\*\*/g, '').slice(0, 450) });
      io.emit('chat:message', bot);
    });
  }
}));
api.get('/social', (req, res) => res.json(rec.list('social_post', undefined, { limit: 50 })));
api.post('/social', h((req, res) => {
  const content = String(req.body?.content || '').trim().slice(0, 500);
  if (!content) return bad(res, 'Write something first.');
  addXp(req.user.id, 5);
  res.json(rec.add('social_post', req.user.id, { author: req.user.name, content }));
}));
api.get('/forum', (req, res) => res.json(rec.list('forum_topic', undefined).map((t) => ({ ...t, replies: rec.list('forum_reply', undefined).filter((r) => r.topic_id === t.id).length }))));
api.post('/forum', h((req, res) => {
  const { title, desc } = req.body || {};
  if (!title) return bad(res, 'Title is required.');
  addXp(req.user.id, 5);
  res.json(rec.add('forum_topic', req.user.id, { title, desc: desc || '', author: req.user.name }));
}));
api.get('/forum/:id', (req, res) => {
  const t = rec.get(Number(req.params.id)); if (!t) return bad(res, 'Topic not found.', 404);
  res.json({ topic: t, replies: rec.list('forum_reply', undefined, { order: 'ASC' }).filter((r) => r.topic_id === t.id) });
});
api.post('/forum/:id/reply', h((req, res) => {
  const content = String(req.body?.content || '').trim(); if (!content) return bad(res, 'Reply is empty.');
  res.json(rec.add('forum_reply', req.user.id, { topic_id: Number(req.params.id), content, author: req.user.name }));
}));

// ---------- academics content ----------
const subjOut = (s) => ({ id: s.id, code: s.code, name: s.name, credits: s.credits, sem: s.sem, category: s.category, prereq: s.prereq, faculty: s.faculty, modules: s.modules.split(';') });
api.get('/syllabus', (req, res) => {
  const isStudent = req.user.role === 'student';
  const targetSem = isStudent ? (req.user.semester || 1) : null;
  const subs = targetSem
    ? db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY sem,id').all(targetSem)
    : db.prepare('SELECT * FROM subjects ORDER BY sem,id').all();
  const sems = {};
  subs.forEach((s) => (sems[s.sem] ||= []).push(subjOut(s)));
  res.json({
    enrolledYear: req.user.year || (req.user.semester ? Math.ceil(req.user.semester / 2) : 1),
    enrolledSem: req.user.semester || 1,
    dept: req.user.dept,
    semesters: Object.entries(sems).map(([sem, subjects]) => ({ sem: Number(sem), subjects }))
  });
});
api.get('/curriculum', (req, res) => {
  let sem = Number(req.query.sem) || req.user.semester || 1;
  if (req.user.role === 'student') {
    sem = req.user.semester || 1;
  }
  const rc = ai.recordedCgpa(req.user.id);
  const subjects = db.prepare('SELECT * FROM subjects WHERE sem=?').all(sem).map((s) => {
    const m = db.prepare('SELECT * FROM marks WHERE user_id=? AND subject_id=?').get(req.user.id, s.id) || {};
    const g = m.endsem != null ? ai.grade(m.internal + m.endsem) : null;
    return { ...subjOut(s), internal: m.internal ?? null, grade: g?.grade ?? null };
  });
  res.json({ sem, cgpa: rc.cgpa, credits: rc.credits, backlogs: rc.backlogs, subjects });
});
api.get('/calendar', (req, res) => {
  const y = Number(req.query.year) || req.user?.year || (req.user?.semester ? Math.ceil(req.user.semester / 2) : 1);
  const s = Number(req.query.sem) || req.user?.semester || (y * 2 - 1);

  // If annual/mechanism mode is explicitly requested
  if (req.query.mode === 'annual' || req.query.annual === 'true' || req.query.view === 'annual') {
    const events = academicCal.getScheduledEventsForYear(y);
    const mechanism = academicCal.YEAR_MECHANISMS[y] || academicCal.YEAR_MECHANISMS[2];
    const kpis = academicCal.getAcademicKpis(y, s);
    return res.json({
      studentYear: y,
      semester: s,
      mechanism,
      kpis,
      events,
      holidays: academicCal.HOLIDAYS_2026_2027,
      allYearsMechanisms: academicCal.YEAR_MECHANISMS
    });
  }

  // Backwards-compatible event array with merged annual events and DB events
  const days = Number(req.query.days) || 30, now = new Date(today());
  const baseEvents = academicCal.getScheduledEventsForYear(y);
  const dbEvents = rec.list('event', null, { order: 'ASC' });
  const seen = new Set();
  const merged = [];
  [...dbEvents, ...baseEvents].forEach((e) => {
    const key = `${e.date}:${e.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(e);
    }
  });

  const filtered = merged.filter((e) => {
    const k = (new Date(e.date) - now) / 864e5;
    return k >= -30 && k <= days;
  }).sort((a, b) => a.date.localeCompare(b.date));

  res.json(filtered);
});

api.get('/calendar/annual', (req, res) => {
  const y = Number(req.query.year) || req.user?.year || 2;
  const s = Number(req.query.sem) || req.user?.semester || (y * 2);
  const events = academicCal.getScheduledEventsForYear(y);
  const mechanism = academicCal.YEAR_MECHANISMS[y] || academicCal.YEAR_MECHANISMS[2];
  const kpis = academicCal.getAcademicKpis(y, s);
  res.json({
    studentYear: y,
    semester: s,
    mechanism,
    kpis,
    events,
    holidays: academicCal.HOLIDAYS_2026_2027,
    allYearsMechanisms: academicCal.YEAR_MECHANISMS
  });
});

api.get('/calendar/ics', (req, res) => {
  const y = Number(req.query.year) || req.user?.year || 2;
  const icsData = academicCal.generateIcsCalendar(y);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="smart-campus-academic-calendar-y${y}.ics"`);
  res.send(icsData);
});
api.get('/timetable', (req, res) => {
  const sem = req.user.semester || 1;
  const semSubjects = db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY id').all(sem);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const rooms = sem <= 2
    ? ['Hall 101', 'Hall 102', 'Physics Lab', 'Computing Lab 1', 'Language Lab']
    : ['Hall 201', 'Hall 202', 'Networks Lab', 'Systems Lab', 'Hall 304'];

  if (!semSubjects.length) {
    return res.json(rec.list('timetable', null, { order: 'ASC' }));
  }

  const tt = weekdays.map((day, dIdx) => ({
    day,
    semester: sem,
    slots: [
      { time: '09:00 - 10:00', subject: semSubjects[(dIdx) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx) % semSubjects.length]?.faculty || 'Faculty', room: rooms[0] },
      { time: '10:00 - 11:00', subject: semSubjects[(dIdx + 1) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 1) % semSubjects.length]?.faculty || 'Faculty', room: rooms[1] },
      { time: '11:15 - 12:15', subject: semSubjects[(dIdx + 2) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 2) % semSubjects.length]?.faculty || 'Faculty', room: rooms[2] },
      { time: '13:00 - 14:00', subject: semSubjects[(dIdx + 3) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 3) % semSubjects.length]?.faculty || 'Faculty', room: rooms[3] },
      { time: '14:00 - 15:00', subject: semSubjects[(dIdx + 4) % semSubjects.length]?.name || 'Lecture', faculty: semSubjects[(dIdx + 4) % semSubjects.length]?.faculty || 'Faculty', room: rooms[4] }
    ]
  }));
  res.json(tt);
});
api.get('/exam-schedule', (req, res) => {
  const ex = rec.list('exam', null, { order: 'ASC' }).sort((a, b) => a.date.localeCompare(b.date));
  const next = ex.find((e) => new Date(e.date) >= new Date(today()));
  const ready = Math.round(Math.min(98, ai.examAdvice(ai.snapshot(req.user.id)).score));
  res.json({ exams: ex, nextInDays: next ? Math.round((new Date(next.date) - new Date(today())) / 864e5) : null, ready });
});
api.get('/leaderboard', (req, res) => res.json(db.prepare("SELECT id,name,xp FROM users WHERE role='student' ORDER BY xp DESC LIMIT 20").all().map((u, i) => ({ rank: i + 1, name: u.name, xp: u.xp, level: level(u.xp).level, me: u.id === req.user.id }))));
api.get('/faculty', (req, res) => res.json(rec.list('faculty', null, { order: 'ASC' })));
api.get('/notices', (req, res) => {
  const userYear = req.user.year || (req.user.semester ? Math.ceil(req.user.semester / 2) : 1);
  const userDept = req.user.dept;
  if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'faculty') {
    return res.json(db.prepare('SELECT * FROM notices ORDER BY id DESC').all());
  }
  const notices = db.prepare(`
    SELECT * FROM notices
    WHERE (target_year IS NULL OR target_year = ?)
      AND (target_dept IS NULL OR target_dept = '' OR target_dept = ?)
    ORDER BY id DESC
  `).all(userYear, userDept);
  res.json(notices);
});

// ---------- library ----------
function makePdf(title, lines) {
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  let y = 760, content = `BT /F1 20 Tf 60 ${y} Td (${esc(title)}) Tj ET\n`;
  lines.forEach((l) => { y -= 24; content += `BT /F1 12 Tf 60 ${y} Td (${esc(l)}) Tj ET\n`; });
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(out + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`, 'latin1');
}
api.get('/digital-library/files', (req, res) => {
  const userYear = req.user.year || (req.user.semester ? Math.ceil(req.user.semester / 2) : 1);
  const userSem = req.user.semester || 1;
  const allFiles = rec.list('library_file', null, { order: 'ASC' });
  if (req.user.role === 'student') {
    const scoped = allFiles.filter(f => !f.year || f.year === userYear || f.sem === userSem);
    return res.json({ items: scoped });
  }
  res.json({ items: allFiles });
});
api.get('/digital-library/files/:id/:action', (req, res) => {
  const row = db.prepare("SELECT * FROM records WHERE id=? AND kind='library_file'").get(Number(req.params.id));
  if (!row) return bad(res, 'File not found.', 404);
  const f = { id: row.id, ...JSON.parse(row.data) };
  if (req.user.role === 'student') {
    const userYear = req.user.year || (req.user.semester ? Math.ceil(req.user.semester / 2) : 1);
    const userSem = req.user.semester || 1;
    if (f.sem && f.sem !== userSem) return bad(res, 'Access restricted to enrolled cohort.', 403);
    if (f.year && f.year !== userYear) return bad(res, 'Access restricted to enrolled cohort.', 403);
  }
  const s = ai.snapshot(req.user.id);
  const lines = [f.description, '', `Subject: ${f.subject}`, `Issued to: ${req.user.name} (${req.user.roll_no})`, '', 'Sample study material generated by the Smart Campus demo server.', 'Replace with real PDFs by wiring an upload folder in server/index.js.'];
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${req.params.action === 'download' ? 'attachment' : 'inline'}; filename="material-${f.id}.pdf"` }).send(makePdf(f.title, lines));
});
api.get('/library/history', (req, res) => res.json(rec.list('borrow', req.user.id)));
api.post('/library/return/:id', h((req, res) => {
  const id = Number(req.params.id);
  const borrow = rec.get(id);
  if (!borrow || borrow.user_id !== req.user.id) return bad(res, 'Borrow record not found.', 404);
  rec.update(id, { status: 'Returned' });
  res.json({ message: 'Book returned.' });
}));

// ---------- placement ----------
api.get('/placement', (req, res) => {
  const apps = rec.list('application', req.user.id), certs = rec.list('placement_cert', req.user.id);
  const resume = rec.getDoc('resume', req.user.id);
  const allJobs = rec.list('job', null, { order: 'ASC' });
  const sem = req.user.semester || 1;
  const visibleJobs = req.user.role === 'student'
    ? allJobs.filter((j) => !j.eligibleSem || j.eligibleSem <= sem)
    : allJobs;

  res.json({
    jobs: visibleJobs.map((j) => ({ ...j, applied: apps.some((a) => a.job_id === j.id), match: matchScore(resume.summary, j.skills) })),
    applications: apps, interviews: rec.list('interview', req.user.id), certificates: certs,
    summary: { applied: apps.length, interviews: rec.list('interview', req.user.id).length, certificates: certs.length, resumeScore: ai.atsAnalyze(resume).score }
  });
});
function matchScore(text = '', skills = '') {
  const need = skills.split(',').map((s) => s.trim().toLowerCase()), t = text.toLowerCase();
  return Math.round((need.filter((s) => t.includes(s)).length / need.length) * 100);
}
api.post('/placement/apply/:id', h((req, res) => {
  const j = rec.get(Number(req.params.id)); if (!j) return bad(res, 'Job not found.', 404);
  if (rec.list('application', req.user.id).some((a) => a.job_id === j.id)) return bad(res, 'Already applied.');
  rec.add('application', req.user.id, { job_id: j.id, title: j.title, company: j.company, status: 'Applied', date: today() });
  notify(req.user.id, `Applied to ${j.title} at ${j.company}.`, 'placement'); addXp(req.user.id, 15);
  res.json({ message: `Application sent to ${j.company}.` });
}));
api.post('/placement/certificates', h((req, res) => {
  const { title, issuer, category, date, url } = req.body || {};
  if (!title || !issuer) return bad(res, 'Title and issuer are required.');
  addXp(req.user.id, 10);
  res.json(rec.add('placement_cert', req.user.id, { title, issuer, category, date, url }));
}));

// ---------- Central Core Execution Engine (Kernel Core v1.0) ----------
api.post('/ai-engine', h(async (req, res) => {
  const intent = req.body?.action_intent || req.body?.prompt || req.body?.message;
  if (!intent || typeof intent !== 'string' || !intent.trim()) {
    return bad(res, 'Action intent or query is required.');
  }
  // User identity and role are strictly derived from verified req.user.
  // Never trust client-supplied user_id or role from request body.
  const envelope = {
    user_id: req.user.id,
    role: req.user.role,
    action_intent: intent.trim(),
    user: req.user
  };
  const result = kernel.executeKernel(envelope);
  res.json({
    ...result,
    engine_output: JSON.stringify(result)
  });
}));

api.post('/ai/kernel-execute', h(async (req, res) => {
  const intent = req.body?.action_intent || req.body?.prompt || req.body?.message;
  if (!intent || typeof intent !== 'string' || !intent.trim()) {
    return bad(res, 'Action intent or query is required.');
  }
  const envelope = {
    user_id: req.user.id,
    role: req.user.role,
    action_intent: intent.trim(),
    user: req.user
  };
  res.json(kernel.executeKernel(envelope));
}));

// ---------- AI endpoints ----------
api.post('/ai/chat', h(async (req, res) => res.json(await ai.chat(req.user.id, req.body?.history, String(req.body?.message || '').slice(0, 800)))));
api.post('/ai/doubt', h(async (req, res) => {
  const { subject, text } = req.body || {}; if (!text || text.trim().length < 3) return bad(res, 'Please describe your doubt.');
  addXp(req.user.id, 5);
  res.json(await ai.doubtSolve(subject || 'General', text.slice(0, 1500)));
}));
api.get('/ai/exam-advice', (req, res) => res.json(ai.examAdvice(ai.snapshot(req.user.id))));
api.get('/ai/cgpa', (req, res) => {
  const p = ai.predictCgpa(req.user.id);
  const grades = db.prepare('SELECT s.name,s.credits,m.internal,m.endsem FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE m.user_id=? AND m.endsem IS NOT NULL ORDER BY s.sem,s.id').all(req.user.id).map((r) => ({ ...r, ...ai.grade(r.internal + r.endsem) }));
  res.json({ ...p, grades });
});
api.post('/ai/ats', h((req, res) => res.json(ai.atsAnalyze(rec.getDoc('resume', req.user.id)))));

// ---------- planner / resume / health ----------
api.get('/planner', (req, res) => {
  const p = rec.getDoc('planner', req.user.id, { targetCgpa: 9.0, studyHours: 3.5 });
  const snap = ai.snapshot(req.user.id);
  const plan = p.plan || ai.studyPlan(snap, Number(p.studyHours) || 3.5, p);
  res.json({ goals: p, plan });
});
api.post('/planner', h((req, res) => {
  const cur = rec.getDoc('planner', req.user.id, {});
  const snap = ai.snapshot(req.user.id);
  const targetCgpa = req.body?.targetCgpa ?? cur.targetCgpa;
  const studyHours = req.body?.studyHours ?? cur.studyHours;
  const updatedDoc = { ...cur, ...req.body, targetCgpa, studyHours };
  const plan = req.body?.plan || ai.studyPlan(snap, Number(studyHours) || 3.5, updatedDoc);
  updatedDoc.plan = plan;
  rec.setDoc('planner', req.user.id, updatedDoc);
  res.json({ message: 'Goals saved. Study plan regenerated.', goals: updatedDoc, plan });
}));
api.post('/ai/planner-chat', h(async (req, res) => {
  const { message, history } = req.body || {};
  if (!message) return bad(res, 'Message is required.');
  const result = await ai.plannerChat(req.user.id, history || [], message);
  res.json(result);
}));
api.get('/planner/tasks', h((req, res) => {
  const tasks = rec.list('planner_task', req.user.id, { limit: 500, order: 'ASC' });
  res.json(tasks);
}));
api.post('/planner/tasks', h((req, res) => {
  const { name, date, priority, status, deadline, time, done } = req.body || {};
  if (!name || !date) return bad(res, 'Task name and deadline date are required.');
  const isDone = Boolean(done || status === 'Done');
  const task = rec.add('planner_task', req.user.id, {
    name: String(name).trim(),
    date: String(date),
    priority: priority || 'Medium',
    status: status || (isDone ? 'Done' : 'Pending'),
    deadline: deadline || date,
    time: time || '18:00',
    done: isDone,
  });
  res.json(task);
}));
api.post('/planner/tasks/:id/toggle', h((req, res) => {
  const id = Number(req.params.id);
  const task = rec.get(id);
  if (!task || task.user_id !== req.user.id) return bad(res, 'Task not found.', 404);
  const nextDone = !task.done;
  const updated = rec.update(id, {
    done: nextDone,
    status: nextDone ? 'Done' : 'Pending',
  });
  res.json(updated);
}));
api.delete('/planner/tasks/:id', h((req, res) => {
  const id = Number(req.params.id);
  const task = rec.get(id);
  if (!task || task.user_id !== req.user.id) return bad(res, 'Task not found.', 404);
  rec.remove(id);
  res.json({ message: 'Task deleted.' });
}));
api.post('/planner/sync-schedule', h((req, res) => {
  const { weekStart } = req.body || {};
  const p = rec.getDoc('planner', req.user.id, {});
  const snap = ai.snapshot(req.user.id);
  const plan = p.plan || ai.studyPlan(snap, Number(p.studyHours) || 3.5, p);

  let base = weekStart ? new Date(weekStart + 'T00:00:00') : new Date();
  const dayOfWeek = (base.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  base.setDate(base.getDate() - dayOfWeek);

  const daysMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const createdTasks = [];

  if (plan && plan.schedule) {
    for (const item of plan.schedule) {
      const offset = daysMap[item.day];
      if (offset === undefined) continue;
      const targetDate = new Date(base);
      targetDate.setDate(targetDate.getDate() + offset);
      const isoDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      item.blocks.forEach((block, idx) => {
        const parts = block.split('·').map((s) => s.trim());
        const taskName = parts[0] || block;
        const taskTime = idx === 0 ? '18:00 - 19:30' : '20:00 - 21:30';
        const priority = idx === 0 ? 'High' : 'Medium';

        const t = rec.add('planner_task', req.user.id, {
          name: taskName,
          date: isoDate,
          priority,
          status: 'Pending',
          deadline: isoDate,
          time: taskTime,
          done: false,
        });
        createdTasks.push(t);
      });
    }
  }
  res.json({ message: `Successfully synced ${createdTasks.length} study tasks into your calendar.`, tasks: createdTasks });
}));
api.get('/resume', (req, res) => res.json(rec.getDoc('resume', req.user.id, { name: req.user.name, email: req.user.email, summary: '' })));
api.post('/resume', h((req, res) => { const { name, email, summary } = req.body || {}; rec.setDoc('resume', req.user.id, { name, email, summary }); res.json({ message: 'Resume saved.' }); }));
api.get('/health', (req, res) => res.json(rec.getDoc('health', req.user.id)));
api.post('/health', h((req, res) => { rec.setDoc('health', req.user.id, req.body || {}); res.json({ message: 'Medical profile updated.' }); }));

// ---------- campus services ----------
api.get('/campus', (req, res) => res.json({
  hostel: rec.getDoc('hostel', req.user.id, null), transport: rec.getDoc('transport', req.user.id, null),
  complaints: rec.list('complaint', req.user.id), maintenance: rec.list('maint', req.user.id),
}));
function createTicket(kind, req, data) {
  const c = ai.classifyTicket(`${data.title || ''} ${data.description || ''}`);
  const s = smartSuite.analyzeSentiment(`${data.title || ''} ${data.description || ''}`);
  const t = rec.add(kind, req.user.id, {
    ...data,
    department: c.department,
    priority: s.isUrgent ? s.priority : c.priority,
    sla: s.isUrgent ? s.sla : c.sla,
    sentiment: s.sentiment,
    sentimentScore: s.score,
    status: 'Routed',
    date: today()
  });
  notify(req.user.id, `Request "${data.title}" auto-routed to ${c.department} (${t.priority}, SLA ${t.sla}) with ${s.sentiment} sentiment.`, 'ticket');
  return t;
}
api.post('/complaints', h((req, res) => {
  const { category, subject, description } = req.body || {}; if (!subject || !description) return bad(res, 'Subject and description are required.');
  res.json(createTicket('complaint', req, { title: subject, category, description }));
}));
api.post('/maintenance', h((req, res) => {
  const { category, location, description } = req.body || {}; if (!location || !description) return bad(res, 'Location and description are required.');
  res.json(createTicket('maint', req, { title: `${category}: ${location}`, category, location, description }));
}));
api.get('/helpdesk', (req, res) => res.json(rec.list('ticket', req.user.id)));
api.post('/helpdesk', h(async (req, res) => {
  const { title, description } = req.body || {}; if (!title) return bad(res, 'Title is required.');
  const t = createTicket('ticket', req, { title, description: description || '' });
  res.json({ message: `Routed to ${t.department} · ${t.priority} priority · SLA ${t.sla}`, ticket: t });
}));
api.post('/hostel/book', h((req, res) => res.json({ message: 'Hostel booking request submitted.', doc: rec.setDoc('hostel', req.user.id, { status: 'Requested' }) })));
api.post('/transport/register', h((req, res) => res.json({ message: 'Transport registration submitted.', doc: rec.setDoc('transport', req.user.id, { status: 'Requested' }) })));

// wallet / store / cafeteria / parking / live
const wallet = (uid) => rec.getDoc('wallet', uid, { balance: 0 });
api.get('/wallet', (req, res) => res.json({ balance: wallet(req.user.id).balance || 0, transactions: rec.list('wallet_tx', req.user.id, { limit: 10 }) }));
api.post('/wallet/topup', h((req, res) => {
  const a = money(req.body?.amount); if (a <= 0 || a > 50000) return bad(res, 'Enter an amount between ₹1 and ₹50,000.');
  const w = wallet(req.user.id); rec.setDoc('wallet', req.user.id, { balance: (w.balance || 0) + a });
  rec.add('wallet_tx', req.user.id, { text: 'Wallet top-up', amount: a, date: today() });
  res.json({ message: `₹${a} added to wallet.` });
}));
function spend(uid, amount, text) {
  const w = wallet(uid); if ((w.balance || 0) < amount) return false;
  rec.setDoc('wallet', uid, { balance: w.balance - amount }); rec.add('wallet_tx', uid, { text, amount: -amount, date: today() }); return true;
}
api.get('/store', (req, res) => res.json(rec.list('store_item', null, { order: 'ASC' }).filter((i) => !req.query.category || i.category === req.query.category)));
api.post('/store/buy', h((req, res) => {
  const it = rec.get(Number(req.body?.id)); if (!it) return bad(res, 'Item not found.', 404);
  if (!spend(req.user.id, it.price, `Store: ${it.name}`)) return bad(res, 'Insufficient wallet balance. Top up first.');
  res.json({ message: `Purchased ${it.name}.` });
}));
api.get('/cafeteria', (req, res) => res.json(rec.list('menu_item', null, { order: 'ASC' })));
api.post('/cafeteria/order', h((req, res) => {
  const ids = (req.body?.items || []).map(Number); const menu = rec.list('menu_item', null);
  const items = ids.map((i) => menu.find((m) => m.id === i)).filter(Boolean); if (!items.length) return bad(res, 'Cart is empty.');
  const total = items.reduce((x, i) => x + i.price, 0);
  if (!spend(req.user.id, total, 'Cafeteria order')) return bad(res, 'Insufficient wallet balance. Top up first.');
  rec.add('order', req.user.id, { items: items.map((i) => i.name), total, date: today() });
  res.json({ message: `Order placed (₹${total}). Ready in ~10 minutes.` });
}));
api.get('/parking', (req, res) => res.json({ slots: rec.list('parking_slot', null, { order: 'ASC' }), vehicles: rec.list('vehicle', req.user.id) }));
api.post('/parking/register', h((req, res) => {
  const { number, type } = req.body || {}; if (!/^[A-Za-z0-9 -]{6,15}$/.test(number || '')) return bad(res, 'Enter a valid vehicle number.');
  res.json({ message: 'Vehicle registered.', vehicle: rec.add('vehicle', req.user.id, { number: number.toUpperCase(), type }) });
}));
api.get('/live', (req, res) => res.json(rec.list('live_event', null, { order: 'ASC' })));
api.get('/mocktests', (req, res) => res.json(rec.list('mocktest', null, { order: 'ASC' }).filter((t) => !req.query.exam || t.exam === req.query.exam)));

// ---------- projects ----------
const own = (req, id) => { const p = rec.get(Number(id)); return p && p.user_id === req.user.id ? p : null; };
api.get('/projects', (req, res) => res.json({ projects: rec.list('project', req.user.id), guides: rec.list('faculty', null, { order: 'ASC' }).map((f) => f.name) }));
api.post('/projects', h((req, res) => {
  const { title, desc, guide } = req.body || {}; if (!title) return bad(res, 'Project title is required.');
  res.json(rec.add('project', req.user.id, { title, desc: desc || '', guide: guide || 'Not assigned', status: 'Active', progress: 0 }));
}));
api.get('/projects/:id', (req, res) => {
  const p = own(req, req.params.id); if (!p) return bad(res, 'Project not found.', 404);
  const by = (k) => rec.list(k, req.user.id, { order: 'ASC' }).filter((x) => x.project_id === p.id);
  res.json({ project: p, milestones: by('milestone'), updates: by('update').reverse(), discussion: by('discussion') });
});
api.post('/projects/:id/milestones', h((req, res) => {
  const p = own(req, req.params.id); if (!p) return bad(res, 'Project not found.', 404);
  if (!req.body?.title) return bad(res, 'Milestone title required.');
  res.json(rec.add('milestone', req.user.id, { project_id: p.id, title: req.body.title, due: req.body.due || today(), done: false }));
}));
api.post('/projects/:id/milestones/:mid/toggle', h((req, res) => {
  const p = own(req, req.params.id);
  if (!p) return bad(res, 'Project not found.', 404);
  const m = rec.get(Number(req.params.mid));
  if (!m || m.project_id !== p.id || m.user_id !== req.user.id) return bad(res, 'Milestone not found.', 404);
  res.json(rec.update(m.id, { done: !m.done }));
}));
api.post('/projects/:id/updates', h((req, res) => {
  const p = own(req, req.params.id); if (!p) return bad(res, 'Project not found.', 404);
  const v = Math.max(0, Math.min(100, Number(req.body?.value) || 0));
  rec.update(p.id, { progress: v, status: v >= 100 ? 'Completed' : 'Active' }); addXp(req.user.id, 10);
  res.json(rec.add('update', req.user.id, { project_id: p.id, value: v, note: req.body?.note || '' }));
}));
api.post('/projects/:id/discussion', h((req, res) => {
  const p = own(req, req.params.id); if (!p) return bad(res, 'Project not found.', 404);
  res.json(rec.add('discussion', req.user.id, { project_id: p.id, author: req.user.name, message: String(req.body?.message || '').slice(0, 500) }));
}));

// ---------- certificates & hall ticket ----------
api.get('/certificates', (req, res) => res.json({ requests: rec.list('cert_request', req.user.id), revaluations: rec.list('revaluation', req.user.id) }));
api.post('/certificates/request', h((req, res) => {
  const { type, details } = req.body || {};
  const label = { bonafide: 'Bonafide Certificate', transfer_certificate: 'Transfer Certificate', id_card: 'QR Campus ID Card' }[type]; if (!label) return bad(res, 'Choose a document type.');
  const auto = type !== 'transfer_certificate'; // bonafide + ID card are issued instantly by automation
  const r = rec.add('cert_request', req.user.id, { type, label, details: details || '', date: today(), status: auto ? 'Issued' : 'Pending Approval', ref: 'DOC-' + Date.now().toString().slice(-6) });
  notify(req.user.id, `${label} request ${auto ? 'issued automatically' : 'sent for approval'} (ref ${r.ref}).`, 'certificate');
  res.json({ message: `${label} ${auto ? 'issued instantly' : 'submitted for approval'}.`, request: r });
}));
api.post('/revaluation', h((req, res) => {
  const { subject, exam, reason } = req.body || {}; if (!subject) return bad(res, 'Subject is required.');
  res.json({ message: 'Revaluation request submitted. Fee ₹500 per paper.', request: rec.add('revaluation', req.user.id, { subject, exam, reason, status: 'Submitted', date: today() }) });
}));
api.get('/hall-ticket', (req, res) => {
  const snap = ai.snapshot(req.user.id), f = ai.forecast(snap);
  const eligible = snap.subjects.every((s) => s.pct >= 75) || f.current >= 75;
  res.json({ eligible, student: publicUser(req.user), exams: rec.list('exam', null, { order: 'ASC' }), note: eligible ? 'Eligible to appear.' : 'Attendance shortage. Contact the exam cell.' });
});

// ---------- search ----------
api.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase(); if (q.length < 2) return res.json([]);
  const out = [];
  db.prepare('SELECT * FROM subjects').all().filter((s) => (s.name + s.code).toLowerCase().includes(q)).slice(0, 5).forEach((s) => out.push({ type: 'Subject', title: `${s.code} · ${s.name}`, section: 'syllabus-roadmap' }));
  rec.list('library_file', null).filter((f) => (f.title + f.subject).toLowerCase().includes(q)).slice(0, 4).forEach((f) => out.push({ type: 'Study material', title: f.title, section: 'library' }));
  rec.list('forum_topic', undefined).filter((t) => t.title.toLowerCase().includes(q)).slice(0, 3).forEach((t) => out.push({ type: 'Forum', title: t.title, section: 'forum' }));
  db.prepare('SELECT * FROM notices').all().filter((n) => (n.title + n.body).toLowerCase().includes(q)).slice(0, 3).forEach((n) => out.push({ type: 'Notice', title: n.title, section: 'notices' }));
  res.json(out);
});

// ---------- automation centre ----------
api.get('/automation/log', (req, res) => res.json({ jobs: Object.keys(automation.jobs), log: db.prepare('SELECT * FROM automation_log ORDER BY id DESC LIMIT 40').all(), llm: ai.llmAvailable() }));
api.post('/automation/run', h((req, res) => res.json({ results: req.body?.job && automation.jobs[req.body.job] ? [automation.runJob(req.body.job)] : automation.runAll() })));


// ---------- resource optimization map (demo telemetry) ----------
api.get('/resources/telemetry', h((req, res) => {
  const fluct = (base, spread) => Math.max(0, Math.round(base + (Math.random() * 2 - 1) * spread));
  const zones = [
    { id:'lab-a', name:'Engineering Lab A', type:'Laboratory', building:'Engineering Block', equipment:[['3D Printers',4,3],['Oscilloscopes',8,6],['Workstations',24,19]], capacity:30, occupancy:22, power:18.4 },
    { id:'lab-b', name:'Computer Lab B', type:'Laboratory', building:'IT Block', equipment:[['Desktop PCs',40,31],['Projectors',2,1],['Network Kits',10,7]], capacity:45, occupancy:34, power:24.8 },
    { id:'lab-c', name:'Physics Lab', type:'Laboratory', building:'Science Block', equipment:[['Optics Kits',12,8],['Sensors',16,11],['Power Supplies',10,9]], capacity:28, occupancy:17, power:12.6 },
    { id:'room-101', name:'Classroom 101', type:'Classroom', building:'Main Block', equipment:[['Projectors',1,1],['Smart Boards',1,1]], capacity:60, occupancy:fluct(42,8), power:6.2 },
    { id:'room-204', name:'Lecture Hall 204', type:'Classroom', building:'Main Block', equipment:[['Projectors',2,2],['Audio Systems',1,1]], capacity:120, occupancy:fluct(91,18), power:14.1 },
    { id:'library', name:'Central Library', type:'Shared Space', building:'Library Block', equipment:[['Study PCs',20,12],['Printers',4,2]], capacity:100, occupancy:fluct(48,12), power:9.7 }
  ].map(z => ({ ...z, occupancy: Math.min(z.capacity, z.occupancy), power: Number((z.power * (0.94 + Math.random()*0.12)).toFixed(1)), equipment:z.equipment.map(([name,total,used])=>({name,total,used:Math.min(total,fluct(used,1))})) }));
  const power = [
    { building:'Engineering', kw:Number((18.4*(.94+Math.random()*.12)).toFixed(1)) },
    { building:'IT Block', kw:Number((24.8*(.94+Math.random()*.12)).toFixed(1)) },
    { building:'Science', kw:Number((12.6*(.94+Math.random()*.12)).toFixed(1)) },
    { building:'Main Block', kw:Number((20.3*(.94+Math.random()*.12)).toFixed(1)) },
    { building:'Library', kw:Number((9.7*(.94+Math.random()*.12)).toFixed(1)) }
  ];
  const totalEquipment = zones.reduce((n,z)=>n+z.equipment.reduce((a,e)=>a+e.total,0),0);
  const usedEquipment = zones.reduce((n,z)=>n+z.equipment.reduce((a,e)=>a+e.used,0),0);
  const occupied = zones.reduce((n,z)=>n+z.occupancy,0), capacity = zones.reduce((n,z)=>n+z.capacity,0);
  const totalPower = Number(power.reduce((n,p)=>n+p.kw,0).toFixed(1));
  const recommendations = [];
  zones.filter(z=>z.type==='Classroom' && z.occupancy/z.capacity<.45).forEach(z=>recommendations.push({title:`Underused space: ${z.name}`,detail:`Only ${Math.round(z.occupancy/z.capacity*100)}% occupied. Consider consolidating nearby sessions.`,level:'Opportunity'}));
  zones.filter(z=>z.occupancy/z.capacity>.85).forEach(z=>recommendations.push({title:`High occupancy: ${z.name}`,detail:`${z.occupancy} of ${z.capacity} seats are occupied. Check overflow or room reassignment.`,level:'Attention'}));
  if (usedEquipment/totalEquipment<.8) recommendations.push({title:'Equipment sharing opportunity',detail:`${totalEquipment-usedEquipment} tracked equipment units are currently idle. Review lab bookings before new purchases.`,level:'Opportunity'});
  recommendations.push({title:'Energy monitoring',detail:`Campus load is ${totalPower} kW across the monitored buildings. Compare against your utility meter baseline.`,level:'Info'});
  res.json({ zones, power, summary:{equipmentUsed:usedEquipment,equipmentTotal:totalEquipment,occupancy:Math.round(occupied/capacity*100),power:totalPower,opportunities:recommendations.length}, recommendations, updatedAt:new Date().toISOString(), telemetry:'simulated' });
}));

// ---------- Smart Campus Suite Endpoints ----------
// 1. Smart Attendance
api.post('/attendance/face-verify', h((req, res) => res.json(smartSuite.verifyFaceAttendance(req.user.id, req.body))));
api.get('/attendance/qr-token', (req, res) => res.json(smartSuite.generateQrAttendanceToken(req.query.room)));
api.post('/attendance/qr-scan', h((req, res) => res.json(smartSuite.verifyQrAttendance(req.user.id, req.body?.token, req.body))));
api.post('/attendance/rfid-tap', h((req, res) => res.json(smartSuite.verifyRfidTap(req.user.id, req.body?.badgeId, req.body?.location))));
api.get('/attendance/analytics', h((req, res) => res.json(smartSuite.getDetailedAttendanceAnalytics(req.user.id))));
api.post('/attendance/parent-alert', h((req, res) => {
  const snap = ai.snapshot(req.user.id);
  smartSuite.dispatchParentLowAttendanceAlert(req.user.id, snap);
  res.json({ message: 'Low attendance alert dispatched to student and parent.' });
}));

// 2. Academic Management & Conflict-Free Timetable
api.post('/academic/timetable-conflict-check', h((req, res) => res.json(smartSuite.checkTimetableConflicts(req.body?.slots))));
api.post('/academic/generate-timetable', h((req, res) => res.json(smartSuite.generateConflictFreeTimetable(req.body))));
api.get('/assignments', h((req, res) => res.json(smartSuite.listActiveAssignments(req.user.id))));
api.post('/assignments/:id/submit', h((req, res) => res.json(smartSuite.submitAssignment(req.user.id, { assignmentId: req.params.id, ...req.body }))));
api.get('/results/grade-card', h((req, res) => res.json(smartSuite.generateOfficialGradeCard(req.user.id))));

// 3. Early Warning ML Radar
api.get('/analytics/early-warning-radar', h((req, res) => res.json(smartSuite.runEarlyWarningCohortRadar())));

// 4. Safety & Security Operations
api.post('/safety/sos', h((req, res) => {
  const result = smartSuite.triggerSosAlert(req.user.id, req.body);
  io.emit('safety:sos_alert', result.event);
  res.json(result);
}));
api.get('/safety/sos-logs', (req, res) => res.json(smartSuite.listActiveSosAlerts()));
api.get('/security/visitors', (req, res) => res.json(smartSuite.listVisitorLogs()));
api.post('/security/visitor-pass', h((req, res) => res.json(smartSuite.issueVisitorPass(req.body))));
api.get('/security/cctv-analytics', (req, res) => res.json(smartSuite.getCctvSecurityAnalytics()));

// 5. Campus Services & IoT
api.get('/campus/hostel-mess', h((req, res) => res.json(smartSuite.getHostelAndMessInfo(req.user.id))));
api.post('/campus/mess-feedback', h((req, res) => res.json(smartSuite.submitMessFeedback(req.user.id, req.body))));
api.get('/campus/transport-live', (req, res) => res.json(smartSuite.getLiveTransportRoutes()));
api.post('/resources/book-slot', h((req, res) => res.json(smartSuite.bookCampusResource(req.user.id, req.body))));

// 6. Grievance & AI Sentiment Analysis
api.post('/grievance/analyze', (req, res) => res.json(smartSuite.analyzeSentiment(req.body?.text)));

// 7. 5-User Roles (Parent & Security)
api.get('/parent/ward-overview', h((req, res) => res.json(smartSuite.getParentWardSummary(req.user.id))));
api.get('/security/guard-station', (req, res) => res.json(smartSuite.getSecurityGuardDashboard()));

// 8. 17-Section Project Blueprint Documentation
api.get('/project/blueprint-doc', (req, res) => res.json(smartSuite.getCompleteProjectDocumentation()));


// ==========================================
// STUDENT PORTAL REFINEMENTS & EXTENSIONS
// ==========================================

// 1. Attendance Calendar Endpoint
api.get('/attendance/calendar', h((req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

  const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const logs = db.prepare(`
    SELECT date, status, method FROM attendance_log
    WHERE user_id = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `).all(req.user.id, startStr, endStr);

  const logMap = {};
  logs.forEach(l => { logMap[l.date] = l; });

  const leaves = rec.list('leave', req.user.id).filter(l => l.status === 'Approved');
  const todayStr = new Date().toISOString().slice(0, 10);
  const calendarDays = [];

  const holidays = {
    '01-01': 'New Year Day',
    '01-26': 'Republic Day',
    '08-15': 'Independence Day',
    '10-02': 'Gandhi Jayanti',
    '11-01': 'Kannada Rajyotsava',
    '12-25': 'Christmas Day'
  };

  let presentCount = 0;
  let absentCount = 0;
  let holidayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const mmdd = `${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dt = new Date(year, month - 1, d);
    const dayOfWeek = dt.getDay();

    let status = 'none';
    let label = 'No Scheduled Class';
    let method = null;
    let holidayName = null;

    if (holidays[mmdd]) {
      status = 'Holiday';
      label = holidays[mmdd];
      holidayName = holidays[mmdd];
      holidayCount++;
    } else if (dStr > todayStr) {
      status = 'Future';
      label = 'Upcoming';
    } else if (dayOfWeek === 0) {
      status = 'Weekend';
      label = 'Sunday (Weekend)';
    } else if (logMap[dStr]) {
      const isPres = logMap[dStr].status === 'present';
      status = isPres ? 'Present' : 'Absent';
      label = isPres ? 'Present' : 'Absent';
      method = logMap[dStr].method;
      if (isPres) presentCount++;
      else absentCount++;
    } else {
      const isLeave = leaves.some(l => dStr >= l.from && dStr <= l.to);
      if (isLeave) {
        status = 'Leave';
        label = 'Approved Leave';
      } else if (dayOfWeek === 6) {
        status = 'Weekend';
        label = 'Saturday Break';
      }
    }

    calendarDays.push({
      date: dStr,
      day: d,
      dayOfWeek,
      status,
      label,
      method,
      holidayName
    });
  }

  const snap = ai.snapshot(req.user.id);
  const totalRecorded = presentCount + absentCount;
  const monthlyPercentage = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 100;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  res.json({
    year,
    month,
    monthName: monthNames[month - 1] || 'Current Month',
    daysInMonth,
    days: calendarDays,
    presentCount,
    absentCount,
    holidayCount,
    monthlyPercentage,
    overallPct: snap.attendancePct || 85,
    attended: snap.attended || 164,
    total: snap.classes || 200,
    threshold: 75,
    eligible: (snap.attendancePct || 85) >= 75
  });
}));

// 2. Student Profile Endpoints
api.get('/profile', h((req, res) => {
  const user = db.prepare('SELECT id, roll_no, name, email, dept, year, semester, xp, role, phone, bio, created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return bad(res, 'Profile not found.', 404);

  const snap = ai.snapshot(req.user.id);
  const semSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE sem=?').get(user.semester || 4);

  res.json({
    user,
    academic: {
      cgpa: snap.cgpa || 8.8,
      attendance: snap.attendancePct || 85,
      subjectsCount: semSubjects ? semSubjects.count : 6,
      credits: 22,
      backlogs: 0
    }
  });
}));

api.put('/profile', h((req, res) => {
  const { phone, bio, year, semester } = req.body || {};
  const cleanPhone = String(phone || '').trim().slice(0, 20);
  const cleanBio = String(bio || '').trim().slice(0, 200);

  let newSem = req.user.semester || 1;
  let newYear = req.user.year || 1;
  if (semester) {
    newSem = Math.max(1, Math.min(8, parseInt(semester, 10)));
    newYear = Math.ceil(newSem / 2);
  } else if (year) {
    newYear = Math.max(1, Math.min(4, parseInt(year, 10)));
    newSem = (newYear * 2) - 1;
  }

  db.prepare('UPDATE users SET phone = ?, bio = ?, year = ?, semester = ? WHERE id = ?')
    .run(cleanPhone, cleanBio, newYear, newSem, req.user.id);

  const updatedUser = db.prepare('SELECT id, roll_no, name, email, dept, year, semester, xp, role, phone, bio FROM users WHERE id=?').get(req.user.id);

  res.json({
    message: 'Profile details and academic cohort updated successfully.',
    user: updatedUser
  });
}));

// 3. Year-Based Curriculum Subjects
api.get('/academics/subjects', h((req, res) => {
  const semester = req.user.semester || 1;
  const year = req.user.year || Math.ceil(semester / 2);
  const subjects = db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY code ASC').all(semester);
  res.json({
    semester,
    year,
    dept: req.user.dept || 'Computer Science & Engineering',
    subjects
  });
}));

// 4. Year-Based Study Materials (Cohort Isolated)
api.get('/materials', h((req, res) => {
  const sem = Number(req.user.semester) || (req.user.year ? Number(req.user.year) * 2 - 1 : 1);
  const year = Math.ceil(sem / 2);
  const dept = req.user.dept || 'Computer Science & Engineering';

  // Server-side strict isolation: ignore any client query params for year/sem
  const materials = db.prepare(`
    SELECT sm.*, s.name as subject_name, s.code as subject_code
    FROM study_materials sm
    LEFT JOIN subjects s ON sm.subject_id = s.id
    WHERE sm.year = ? AND sm.semester = ? AND sm.status = 'Published'
    ORDER BY sm.id DESC
  `).all(year, sem);

  res.json({
    studentYear: year,
    studentSem: sem,
    dept,
    user: { year, semester: sem, dept },
    items: materials,
    materials: materials
  });
}));

api.get('/materials/:id/download', h((req, res) => {
  const matId = parseInt(req.params.id, 10);
  const mat = db.prepare('SELECT sm.*, s.name as subject_name, s.code as subject_code FROM study_materials sm LEFT JOIN subjects s ON sm.subject_id = s.id WHERE sm.id = ?').get(matId);
  if (!mat) return bad(res, 'Study material not found.', 404);

  const userSem = req.user.semester || 1;
  const userYear = req.user.year || Math.ceil(userSem / 2);
  if (req.user.role === 'student' && (mat.year !== userYear || mat.semester !== userSem)) {
    return bad(res, 'Access denied: this material is restricted to another academic cohort.', 403);
  }

  const lines = [
    `Course: ${mat.subject_name || mat.title} (${mat.subject_code || 'ACAD'})`,
    `Department: ${mat.dept} | Year ${mat.year} (Semester ${mat.semester})`,
    `Material Type: ${mat.material_type}`,
    '',
    mat.description || 'Institutional Study Material provided by faculty department.',
    '',
    `Authorized Student: ${req.user.name} (${req.user.roll_no})`,
    `Issued on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    'Smart Campus Academic Resource Repository - For educational use only.'
  ];

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${mat.file_name || 'study-material-' + mat.id + '.pdf'}"`
  }).send(makePdf(mat.title, lines));
}));

// 5. Smart Parking Overview & Student Vehicle Registration
api.get('/parking/overview', h((req, res) => {
  const slots = rec.list('parking_slot', null, { order: 'ASC' });
  const myVehicle = db.prepare('SELECT * FROM vehicles WHERE user_id = ?').get(req.user.id) || null;
  if (myVehicle) {
    myVehicle.plate_number = myVehicle.reg_number;
    myVehicle.registered_at = myVehicle.created_at;
  }
  const totalSlots = slots.length || 24;
  const occupied = slots.filter(s => s.taken).length;

  res.json({
    total: totalSlots,
    totalSlots,
    occupied,
    available: Math.max(0, totalSlots - occupied),
    reserved: 2,
    slots,
    vehicle: myVehicle,
    registeredVehicle: myVehicle
  });
}));

api.post('/parking/vehicle', h((req, res) => {
  const { plate_number, vehicle_type, number, regNumber, type, model } = req.body || {};
  const plate = String(plate_number || regNumber || number || '').trim().toUpperCase().slice(0, 20);
  const vType = String(vehicle_type || type || 'Two-Wheeler').trim().slice(0, 30);
  const vModel = String(model || '').trim().slice(0, 50);

  if (!plate) return bad(res, 'Vehicle registration plate number is required.');

  const existing = db.prepare('SELECT * FROM vehicles WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare('UPDATE vehicles SET reg_number = ?, vehicle_type = ?, model = ? WHERE user_id = ?')
      .run(plate, vType, vModel, req.user.id);
  } else {
    db.prepare('INSERT INTO vehicles (user_id, reg_number, vehicle_type, model, slot_assigned) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, plate, vType, vModel, 'P-04');
  }

  const updatedVehicle = db.prepare('SELECT * FROM vehicles WHERE user_id = ?').get(req.user.id);
  updatedVehicle.plate_number = updatedVehicle.reg_number;
  updatedVehicle.registered_at = updatedVehicle.created_at;

  res.json({
    message: 'Vehicle registration updated successfully.',
    vehicle: updatedVehicle
  });
}));

// 6. Alias /ai/planner to /ai/planner-chat
api.post('/ai/planner', h(async (req, res) => {
  const { message, history } = req.body || {};
  if (!message) return bad(res, 'Message is required.');
  const result = await ai.plannerChat(req.user.id, history || [], message);
  res.json(result);
}));


// Mount Admin Router
const adminRouter = require('./admin');
api.use('/admin', adminRouter);

app.use('/api', api);
app.use('/api', (req, res) => bad(res, 'Not found.', 404));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
if (require.main === module) server.listen(PORT, () => { console.log(`Smart Campus AI running at http://localhost:${PORT}`); automation.start(); });
module.exports = { app, server };
