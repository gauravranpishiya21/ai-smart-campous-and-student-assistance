// Autonomous campus automation: jobs run on a schedule (node-cron) and on demand.
// Every action is written to automation_log so staff and students can audit what the AI did.
const cron = require('node-cron');
const { db, rec, notify, logAuto, addXp } = require('./db');
const ai = require('./ai');

const today = () => new Date().toISOString().slice(0, 10);
const students = () => db.prepare("SELECT * FROM users WHERE role='student'").all();

const jobs = {
  // 1. Warn students whose subject attendance is under the 75% rule
  attendanceGuardian() {
    let n = 0;
    for (const u of students()) {
      const snap = ai.snapshot(u.id);
      for (const s of snap.subjects.filter((x) => x.pct < 75)) {
        const plan = ai.bunkPlan(s.attended, s.classes);
        if (notify(u.id, `Attendance alert: ${s.name} is at ${ai.r1(s.pct)}%. Attend the next ${plan.mustAttend} classes to reach 75%.`, 'warning', `att:${s.id}:${today()}`)) n++;
      }
    }
    return `${n} attendance alert(s) sent`;
  },
  // 2. Remind students about pending fees
  feeReminder() {
    let n = 0;
    for (const u of students()) {
      const due = rec.list('fee', u.id).reduce((x, f) => x + (f.assessed - f.paid), 0);
      if (due > 0 && notify(u.id, `Fee reminder: ₹${due.toLocaleString('en-IN')} is pending. Pay online in Academics & Fees.`, 'fee', `fee:${u.id}:${today()}`)) n++;
    }
    return `${n} fee reminder(s) sent`;
  },
  // 3. Exam countdown nudges
  examCountdown() {
    let n = 0;
    const soon = rec.list('exam', null).filter((e) => { const k = (new Date(e.date) - new Date(today())) / 864e5; return k >= 0 && k <= 7; });
    for (const e of soon) for (const u of students()) {
      const k = Math.round((new Date(e.date) - new Date(today())) / 864e5);
      if (notify(u.id, `${e.subject} ${e.type} exam in ${k} day(s) (${e.date}, ${e.time}, ${e.room}).`, 'exam', `exam:${e.id}:${u.id}:${today()}`)) n++;
    }
    return `${n} exam reminder(s) sent`;
  },
  // 4. Nightly risk scan: flag high/medium-risk students and suggest mentoring
  riskScan() {
    let flagged = 0;
    for (const u of students()) {
      const rk = ai.risk(ai.snapshot(u.id));
      if (rk.level !== 'Low Risk' && notify(u.id, `AI risk scan: ${rk.level} (${rk.probability}%). Factors: ${rk.drivers.join(', ') || 'overall trend'}. A mentor session is recommended.`, 'risk', `risk:${u.id}:${today()}`)) flagged++;
    }
    return `${flagged} student(s) flagged for mentoring`;
  },
  // 5. Triage helpdesk tickets that have not been routed yet
  ticketTriage() {
    let n = 0;
    for (const kind of ['ticket', 'complaint', 'maint']) for (const t of rec.list(kind)) {
      if (t.department) continue;
      const c = ai.classifyTicket(`${t.title || t.subject || ''} ${t.description || ''}`);
      rec.update(t.id, { department: c.department, priority: c.priority, sla: c.sla, status: t.status || 'Routed' });
      if (t.user_id) notify(t.user_id, `Your request was routed to ${c.department} (${c.priority} priority, SLA ${c.sla}).`, 'ticket');
      n++;
    }
    return `${n} ticket(s) auto-routed`;
  },
  // 6. Summarise notices that have no summary
  noticeDigest() {
    let n = 0;
    for (const x of db.prepare("SELECT * FROM notices WHERE summary IS NULL OR summary=''").all()) {
      db.prepare('UPDATE notices SET summary=? WHERE id=?').run(ai.summarizeNotice(x.body), x.id); n++;
    }
    return `${n} notice(s) summarised`;
  },
  // 7. Decide pending leave requests with the 75% rule
  leaveAutoReview() {
    let n = 0;
    for (const l of rec.list('leave')) {
      if (l.status !== 'Pending') continue;
      const days = Math.max(1, Math.round((new Date(l.to) - new Date(l.from)) / 864e5) + 1);
      const dec = ai.leaveDecision(ai.snapshot(l.user_id), days, l.reason);
      rec.update(l.id, { status: dec.decision, ai_note: dec.note });
      notify(l.user_id, `Leave ${l.from} → ${l.to}: ${dec.decision}. ${dec.note}`, 'leave'); n++;
    }
    return `${n} leave request(s) reviewed`;
  },
  // 8. Wellness watch: persistent stress or poor sleep triggers a gentle check-in
  wellnessWatch() {
    let n = 0;
    for (const u of students()) {
      const w = rec.list('wellness', u.id, { limit: 3 });
      if (w.length >= 2 && (w.slice(0, 2).every((x) => x.stress >= 8) || w.slice(0, 2).every((x) => x.sleep < 5))) {
        if (notify(u.id, 'We noticed high stress or low sleep recently. Consider booking a confidential counselling session. Tele-MANAS 14416 is available 24x7.', 'wellness', `well:${u.id}:${today()}`)) n++;
      }
    }
    return `${n} wellness check-in(s) sent`;
  },
  // 9. Project milestone deadline nudges
  deadlineNudge() {
    let n = 0;
    for (const m of rec.list('milestone')) {
      const k = (new Date(m.due) - new Date(today())) / 864e5;
      if (!m.done && k >= 0 && k <= 2 && notify(m.user_id, `Milestone "${m.title}" is due ${m.due}.`, 'deadline', `ms:${m.id}:${today()}`)) n++;
    }
    return `${n} deadline nudge(s) sent`;
  },
  // 10. Reward consistent attendance with XP (gamification)
  xpRewards() {
    let n = 0;
    for (const u of students()) {
      const f = ai.forecast(ai.snapshot(u.id));
      if (f.current >= 85 && notify(u.id, 'Great attendance streak! +25 XP awarded.', 'reward', `xp:${u.id}:${today()}`)) { addXp(u.id, 25); n++; }
    }
    return `${n} XP reward(s) granted`;
  },
};

function runJob(name) {
  try { const out = jobs[name](); logAuto(name, out); return { job: name, result: out }; }
  catch (e) { logAuto(name, 'ERROR: ' + e.message); return { job: name, result: 'error: ' + e.message }; }
}
function runAll() { return Object.keys(jobs).map(runJob); }

function start() {
  if (process.env.AUTOMATION === 'off') return;
  cron.schedule('*/5 * * * *', () => { runJob('ticketTriage'); runJob('leaveAutoReview'); runJob('noticeDigest'); });
  cron.schedule('0 8 * * *', () => { ['attendanceGuardian', 'feeReminder', 'examCountdown', 'deadlineNudge', 'xpRewards'].forEach(runJob); });
  cron.schedule('0 22 * * *', () => { runJob('riskScan'); runJob('wellnessWatch'); });
  setTimeout(runAll, 1500); // first pass shortly after boot
  console.log('[automation] scheduler started');
}
module.exports = { jobs, runJob, runAll, start };
