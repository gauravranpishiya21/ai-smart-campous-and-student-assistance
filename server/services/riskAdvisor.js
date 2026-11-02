// Smart Campus Early-Warning Risk Advisory Engine
// Combines quantitative predictive analytics with Gemini-generated diagnostic explanations.

const { db, rec } = require('../db');
const prompts = require('../prompts');
const gemini = require('./gemini');

// Quantitative risk calculation model
function calculateQuantitativeRisk(user) {
  const userId = user.id;
  const subs = db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY id').all(user.semester || 4);

  const subjectData = subs.map((s) => {
    const a = db.prepare('SELECT attended, total FROM attendance WHERE user_id=? AND subject_id=?').get(userId, s.id) || { attended: 0, total: 0 };
    const m = db.prepare('SELECT internal, endsem, assign_done, assign_total FROM marks WHERE user_id=? AND subject_id=?').get(userId, s.id) || {};
    const pct = a.total ? Math.round((a.attended / a.total) * 1000) / 10 : 100;
    return {
      name: s.name,
      code: s.code,
      attendance_pct: pct,
      internal_marks: m.internal ?? null,
      assign_done: m.assign_done ?? 0,
      assign_total: m.assign_total ?? 0
    };
  });

  const totalAttended = subjectData.reduce((acc, s) => acc + (s.attendance_pct ? (s.attendance_pct / 100) * 10 : 0), 0);
  const totalClasses = subjectData.length * 10;
  const overallAttendance = subjectData.length
    ? Math.round((subjectData.reduce((acc, s) => acc + s.attendance_pct, 0) / subjectData.length) * 10) / 10
    : 85;

  const withMarks = subjectData.filter((s) => s.internal_marks != null);
  const avgInternalPct = withMarks.length
    ? Math.round((withMarks.reduce((acc, s) => acc + s.internal_marks, 0) / withMarks.length / 25) * 100)
    : 72;

  const totalAssign = subjectData.reduce((acc, s) => acc + s.assign_total, 0);
  const doneAssign = subjectData.reduce((acc, s) => acc + s.assign_done, 0);
  const assignCompletionPct = totalAssign ? Math.round((doneAssign / totalAssign) * 100) : 100;

  const lowAttSubjects = subjectData.filter((s) => s.attendance_pct < 75);

  // Transparent risk formula
  const attGap = Math.max(0, 75 - overallAttendance) / 75;
  const marksGap = Math.max(0, 55 - avgInternalPct) / 55;
  const assignGap = Math.max(0, 70 - assignCompletionPct) / 70;
  const lowSubRatio = lowAttSubjects.length / Math.max(1, subjectData.length);

  const rawProbability = Math.min(0.96, 0.05 + 0.35 * attGap + 0.3 * marksGap + 0.15 * assignGap + 0.2 * lowSubRatio);
  const probability = Math.round(rawProbability * 100);
  const level = probability >= 55 ? 'High Risk' : probability >= 25 ? 'Medium Risk' : 'Low Risk';

  const drivers = [];
  if (attGap > 0) drivers.push(`Overall attendance (${overallAttendance}%) below 75% gate`);
  if (lowAttSubjects.length > 0) drivers.push(`${lowAttSubjects.length} subject(s) below mandatory attendance`);
  if (marksGap > 0) drivers.push(`Internal assessment average (${avgInternalPct}%) below target threshold`);
  if (assignGap > 0) drivers.push(`${totalAssign - doneAssign} pending assignment(s) unsubmitted`);

  return {
    student_id: user.id,
    student_name: user.name,
    probability,
    level,
    overall_attendance: overallAttendance,
    avg_internal_pct: avgInternalPct,
    pending_assignments: totalAssign - doneAssign,
    low_attendance_subjects: lowAttSubjects.map((s) => ({ name: s.name, percentage: s.attendance_pct })),
    drivers: drivers.length ? drivers : ['Consistent attendance and academic trajectory']
  };
}

/**
 * Generate Early-Warning Risk Analysis with Gemini Narrative Explanation
 */
async function generateRiskAnalysis(user) {
  const quantitative = calculateQuantitativeRisk(user);

  // Offline fallback explanation generator
  const offlineFallback = () => {
    let diagnosis = '';
    let primaryDriver = quantitative.drivers[0] || 'Academic progression is stable';
    let recoverySteps = [];

    if (quantitative.level === 'High Risk') {
      diagnosis = `Student ${user.name} is currently flagged at High Risk (${quantitative.probability}%) due to compounding factors in attendance compliance and assessment scores. Immediate corrective intervention is required to avoid examination debarment and semester backlog.`;
      recoverySteps = [
        { step: 1, action: `Attend every upcoming lecture in ${quantitative.low_attendance_subjects.map((s) => s.name).join(', ') || 'short subjects'} to cross the 75% cutoff`, timeframe: 'Immediate (Next 7-10 Days)' },
        { step: 2, action: 'Submit all outstanding assignments to recover 20% continuous internal evaluation marks', timeframe: 'Within 5 Working Days' },
        { step: 3, action: 'Schedule mandatory 1-on-1 counseling with Academic Faculty Mentor', timeframe: 'This Week' }
      ];
    } else if (quantitative.level === 'Medium Risk') {
      diagnosis = `Student ${user.name} is operating in the Medium Risk band (${quantitative.probability}%). While baseline performance is satisfactory, attendance margins are narrow and vulnerable to sudden drops.`;
      recoverySteps = [
        { step: 1, action: 'Maintain a 100% presence sprint across the next 15 instructional days to build a 5-class safety buffer', timeframe: 'Next 2 Weeks' },
        { step: 2, action: 'Focus revision on weakest internal course modules before CIE-2 model examinations', timeframe: 'Daily 45-min sprint' },
        { step: 3, action: 'Clear all pending weekly problem sets in the Study Planner', timeframe: 'By Friday' }
      ];
    } else {
      diagnosis = `Student ${user.name} is in Good Academic Standing (${quantitative.probability}% Low Risk). Attendance is healthy at ${quantitative.overall_attendance}% and internal evaluations reflect steady progress toward target CGPA.`;
      recoverySteps = [
        { step: 1, action: 'Sustain regular attendance to maintain honors eligibility and exam clearance', timeframe: 'Ongoing' },
        { step: 2, action: 'Engage in peer mentoring and advanced practice sets on difficult concepts', timeframe: 'Weekly' },
        { step: 3, action: 'Prepare early for CIE-2 / Model Pre-SEE written assessments', timeframe: 'Next 3 Weeks' }
      ];
    }

    return {
      ...quantitative,
      explanation: {
        diagnosis,
        primary_driver: primaryDriver,
        recovery_steps: recoverySteps,
        projected_outcome: quantitative.level === 'Low Risk' ? 'On track for Distinction (>= 8.5 CGPA)' : 'Can recover to Low Risk (< 20%) within 14 instructional days'
      },
      engine: 'offline'
    };
  };

  const systemInstruction = prompts.earlyWarningRisk;
  const userPrompt = `QUANTITATIVE STUDENT RISK AUDIT:\n${JSON.stringify(quantitative, null, 2)}\n\nPlease generate a diagnostic explanation and recovery roadmap adhering strictly to the JSON schema.`;

  const geminiResult = await gemini.generateContent({
    system: systemInstruction,
    prompt: userPrompt,
    responseMimeType: 'application/json',
    maxTokens: 600,
    temperature: 0.3,
    userId: user.id,
    feature: 'early_warning_risk',
    offlineFallback
  });

  if (geminiResult && typeof geminiResult === 'object' && geminiResult.diagnosis) {
    return {
      ...quantitative,
      explanation: geminiResult,
      engine: 'gemini'
    };
  }

  return offlineFallback();
}

// Ensure intervention_notes table exists
db.exec(`
CREATE TABLE IF NOT EXISTS intervention_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  faculty_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  action_plan TEXT,
  follow_up_date TEXT,
  status TEXT DEFAULT 'OPEN',
  risk_level TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_intervention_student ON intervention_notes(student_id, created_at);
`);

function recordInterventionNote({ studentId, facultyId, note, actionPlan = '', followUpDate = '', riskLevel = 'Medium Risk' }) {
  const stmt = db.prepare(`
    INSERT INTO intervention_notes (student_id, faculty_id, note, action_plan, follow_up_date, risk_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(studentId, facultyId, note, actionPlan, followUpDate, riskLevel);
  return {
    id: Number(result.lastInsertRowid),
    studentId,
    facultyId,
    note,
    actionPlan,
    followUpDate,
    riskLevel,
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };
}

function getInterventions(studentId) {
  return db.prepare(`
    SELECT inotes.*, u.name as faculty_name
    FROM intervention_notes inotes
    JOIN users u ON inotes.faculty_id = u.id
    WHERE inotes.student_id = ?
    ORDER BY inotes.created_at DESC
  `).all(studentId);
}

function getRiskTrend(studentId) {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(studentId);
  if (!user) return null;
  const current = calculateQuantitativeRisk(user);
  const notes = getInterventions(studentId);

  // Compute trend indicator
  let trend = 'STABLE';
  if (notes.length > 1) {
    const prevRisk = notes[1].risk_level;
    if (current.level === 'Low Risk' && prevRisk !== 'Low Risk') trend = 'IMPROVING';
    else if (current.level === 'High Risk' && prevRisk !== 'High Risk') trend = 'DETERIORATING';
  }

  return {
    studentId,
    currentRisk: current.level,
    probability: current.probability,
    trend,
    activeInterventionsCount: notes.filter(n => n.status === 'OPEN').length,
    history: notes
  };
}

module.exports = {
  calculateQuantitativeRisk,
  generateRiskAnalysis,
  recordInterventionNote,
  getInterventions,
  getRiskTrend
};

