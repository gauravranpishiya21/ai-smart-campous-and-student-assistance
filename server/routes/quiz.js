// /api/quiz/* — every query is scoped to req.user.id; answers stay server-side until submission.
const { db, addXp } = require('../db');
const { AppError } = require('../middleware/error');
const Q = require('../services/quizEngine');

module.exports = (api, { h }) => {
  const own = (req) => {
    const r = db.prepare('SELECT * FROM quiz_attempts WHERE id=? AND user_id=?').get(Number(req.params.id), req.user.id);
    if (!r) throw new AppError('Quiz not found', 404, 'NOT_FOUND');
    return r;
  };
  const meta = (r) => ({ id: r.id, subject: r.subject, topic: r.topic, difficulty: r.difficulty, mode: r.mode, duration: r.duration, status: r.status, total: r.total, correct: r.correct, incorrect: r.incorrect, unanswered: r.unanswered, accuracy: r.accuracy, time_taken: r.time_taken, created_at: r.created_at });
  const full = (r) => ({ ...meta(r), questions: JSON.parse(r.questions), answers: JSON.parse(r.answers || '[]'), analysis: r.analysis ? JSON.parse(r.analysis) : null });
  const hide = (r) => ({ ...meta(r), questions: JSON.parse(r.questions).map(({ question, options, topic, difficulty }) => ({ question, options, topic, difficulty })) });

  async function create(req, { subject, topic, difficulty, count, mode, minutes, instructions }) {
    const qs = await Q.generate({ userId: req.user.id, subject, topic, difficulty, count, instructions });
    const dur = mode === 'exam' ? minutes * 60 : 0;
    const id = Number(db.prepare('INSERT INTO quiz_attempts(user_id,subject,topic,difficulty,mode,duration,questions,total) VALUES(?,?,?,?,?,?,?,?)')
      .run(req.user.id, subject, topic, difficulty, mode, dur, JSON.stringify(qs), qs.length).lastInsertRowid);
    return hide(db.prepare('SELECT * FROM quiz_attempts WHERE id=?').get(id));
  }

  api.post('/quiz/generate', h(async (req, res) => {
    const b = req.body || {}, subject = String(b.subject || '').trim().slice(0, 80);
    if (subject.length < 2) throw new AppError('Enter a subject (e.g. DBMS).', 400, 'BAD_REQUEST');
    const count = [10, 20, 30, 50].includes(Number(b.count)) ? Number(b.count) : 10;
    const difficulty = ['Easy', 'Medium', 'Hard', 'Mixed'].includes(b.difficulty) ? b.difficulty : 'Mixed';
    const mode = b.mode === 'exam' ? 'exam' : 'practice';
    const minutes = Math.min(180, Math.max(5, Number(b.minutes) || Math.round(count * 1.2)));
    res.json(await create(req, { subject, topic: String(b.topic || '').trim().slice(0, 120), difficulty, count, mode, minutes, instructions: String(b.instructions || '').trim().slice(0, 300) }));
  }));

  api.post('/quiz/weak-practice', h(async (req, res) => {
    const weak = Q.topicStats(req.user.id).topics.filter((t) => t.weak).slice(0, 3);
    if (!weak.length) throw new AppError('No weak topics yet. Complete a few quizzes first.', 400, 'BAD_REQUEST');
    const count = [10, 20].includes(Number(req.body?.count)) ? Number(req.body.count) : 10;
    res.json(await create(req, { subject: weak[0].subject, topic: weak.map((t) => t.topic).join('; '), difficulty: 'Mixed', count, mode: req.body?.mode === 'exam' ? 'exam' : 'practice', minutes: Math.round(count * 1.2), instructions: 'Focus only on these weak topics and test the concepts students most often confuse.' }));
  }));

  // Practice mode only: instant feedback for a single question.
  api.post('/quiz/attempts/:id/check', h((req, res) => {
    const r = own(req);
    if (r.mode !== 'practice' || r.status !== 'pending') throw new AppError('Answers are hidden in exam mode.', 403, 'FORBIDDEN');
    const q = JSON.parse(r.questions)[Number(req.body?.index)];
    const c = Number(req.body?.choice);
    if (!q || !(c >= 0 && c < 4)) throw new AppError('Invalid question or option.', 400, 'BAD_REQUEST');
    res.json({ correct: c === q.correct, correct_index: q.correct, explanation: q.explanation });
  }));

  api.post('/quiz/attempts/:id/submit', h(async (req, res) => {
    const r = own(req);
    if (r.status !== 'pending') throw new AppError('This quiz was already submitted.', 409, 'CONFLICT');
    const qs = JSON.parse(r.questions), raw = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const ans = qs.map((_, i) => (Number.isInteger(raw[i]) && raw[i] >= 0 && raw[i] < 4 ? raw[i] : null));
    let taken = Math.max(0, Math.round(Number(req.body?.time_taken) || 0));
    if (r.duration) taken = Math.min(taken, r.duration + 30);
    const g = Q.grade(qs, ans), analysis = await Q.analyze(req.user.id, r, qs, ans, g);
    db.prepare("UPDATE quiz_attempts SET answers=?,status='done',correct=?,incorrect=?,unanswered=?,accuracy=?,time_taken=?,analysis=?,finished_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(JSON.stringify(ans), g.correct, g.incorrect, g.unanswered, g.accuracy, taken, JSON.stringify({ ...analysis, topics: g.topics }), r.id);
    try { addXp(req.user.id, g.correct * 2); } catch { /* xp is optional */ }
    res.json(full(own(req)));
  }));

  api.get('/quiz/attempts/:id', h((req, res) => { const r = own(req); res.json(r.status === 'done' ? full(r) : hide(r)); }));
  api.get('/quiz/history', h((req, res) => res.json(db.prepare("SELECT * FROM quiz_attempts WHERE user_id=? AND status='done' ORDER BY id DESC LIMIT 50").all(req.user.id).map(meta))));
  api.get('/quiz/weak-topics', h((req, res) => res.json(Q.topicStats(req.user.id))));
};
