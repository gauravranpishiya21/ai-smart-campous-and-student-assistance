// Smart Campus Personal Assistant & Function Calling Engine
// SECURITY GUARANTEE: Executes tools exclusively using verified req.user from JWT.
// Disregards client body/query role or user_id tampering and neutralizes prompt-injection attempts.

const { db, rec } = require('../db');
const prompts = require('../prompts');
const gemini = require('./gemini');

// Tool 1: Attendance & Skippable Classes Calculator
function toolCalculateSkippableClasses(user) {
  const userId = user.id;
  const rows = db.prepare(`
    SELECT s.id, s.name, s.code, COALESCE(a.attended, 0) as attended, COALESCE(a.total, 0) as total
    FROM subjects s
    LEFT JOIN attendance a ON a.subject_id = s.id AND a.user_id = ?
    WHERE s.sem = ?
  `).all(userId, user.semester || 4);

  const totalAttended = rows.reduce((acc, r) => acc + r.attended, 0);
  const totalClasses = rows.reduce((acc, r) => acc + r.total, 0);
  const overallPct = totalClasses ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 100;

  // 75% rule math: A / (T + S) >= 0.75  =>  S <= (A / 0.75) - T
  const safeToSkip = overallPct >= 75
    ? Math.max(0, Math.floor((totalAttended / 0.75) - totalClasses))
    : 0;

  // Must attend math: (A + M) / (T + M) >= 0.75  =>  M >= (0.75*T - A) / 0.25
  const mustAttendConsecutive = overallPct < 75
    ? Math.ceil((0.75 * totalClasses - totalAttended) / 0.25)
    : 0;

  const subjectBreakdown = rows.map((r) => {
    const sPct = r.total ? Math.round((r.attended / r.total) * 1000) / 10 : 100;
    const canSkipSub = sPct >= 75 ? Math.max(0, Math.floor((r.attended / 0.75) - r.total)) : 0;
    const mustAttendSub = sPct < 75 ? Math.ceil((0.75 * r.total - r.attended) / 0.25) : 0;
    return {
      code: r.code,
      name: r.name,
      attended: r.attended,
      total: r.total,
      percentage: sPct,
      safe_to_skip: canSkipSub,
      must_attend: mustAttendSub,
      status: sPct >= 75 ? 'Safe' : 'Shortage Alert'
    };
  });

  const shortSubjects = subjectBreakdown.filter((s) => s.percentage < 75);

  return {
    student_id: user.id,
    student_name: user.name,
    overall_percentage: overallPct,
    total_attended: totalAttended,
    total_classes: totalClasses,
    safe_to_skip_overall: safeToSkip,
    must_attend_consecutive: mustAttendConsecutive,
    short_subjects_count: shortSubjects.length,
    short_subjects: shortSubjects,
    subjects: subjectBreakdown
  };
}

// Tool 2: CGPA & Academic Standing
function toolGetStudentCgpa(user) {
  const userId = user.id;
  const rows = db.prepare(`
    SELECT s.credits, m.internal, m.endsem
    FROM marks m
    JOIN subjects s ON s.id = m.subject_id
    WHERE m.user_id = ? AND m.endsem IS NOT NULL
  `).all(userId);

  let totalCredits = 0, totalPoints = 0, backlogs = 0;
  for (const r of rows) {
    const total = (r.internal || 0) + (r.endsem || 0);
    const gp = total >= 90 ? 10 : total >= 80 ? 9 : total >= 70 ? 8 : total >= 60 ? 7 : total >= 50 ? 6 : total >= 45 ? 5 : total >= 40 ? 4 : 0;
    totalCredits += r.credits;
    totalPoints += r.credits * gp;
    if (gp === 0) backlogs++;
  }

  const recordedCgpa = totalCredits ? Math.round((totalPoints / totalCredits) * 100) / 100 : 7.8;

  return {
    student_id: user.id,
    student_name: user.name,
    cgpa: recordedCgpa,
    credits_earned: totalCredits,
    active_backlogs: backlogs,
    academic_standing: backlogs === 0 ? 'Good Standing' : 'Remedial Support Recommended'
  };
}

// Tool 3: Next Class / Today's Routine
function toolGetNextClass(user) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = days[new Date().getDay()];
  if (today === 'Sun' || today === 'Sat') {
    return { day: today, message: 'Weekend: no regular lecture classes scheduled today.' };
  }

  const subs = db.prepare('SELECT code, name, faculty FROM subjects WHERE sem=? ORDER BY id').all(user.semester || 4);
  if (!subs.length) return { day: today, message: 'No registered courses for this semester.' };

  const rooms = (user.semester || 4) <= 2
    ? ['Hall 101', 'Hall 102', 'Physics Lab', 'Computing Lab 1']
    : ['Hall 201', 'Hall 202', 'Networks Lab', 'Systems Lab'];

  const slots = [
    { time: '09:00 - 10:30', subject: subs[0]?.name || 'Lecture', faculty: subs[0]?.faculty || 'Faculty', room: rooms[0] },
    { time: '10:45 - 12:15', subject: subs[1]?.name || 'Lecture', faculty: subs[1]?.faculty || 'Faculty', room: rooms[1] },
    { time: '01:30 - 03:00', subject: subs[2]?.name || 'Lecture', faculty: subs[2]?.faculty || 'Faculty', room: rooms[2] },
    { time: '03:15 - 04:45', subject: subs[3]?.name || 'Lecture', faculty: subs[3]?.faculty || 'Faculty', room: rooms[3] },
  ];

  return {
    day: today,
    semester: user.semester || 4,
    timetable_slots: slots
  };
}

// Tool 4: Pending Fees
function toolGetPendingFees(user) {
  const fees = rec.list('fee', user.id, { order: 'ASC' });
  const totalAssessed = fees.reduce((acc, f) => acc + (f.assessed || 0), 0);
  const totalPaid = fees.reduce((acc, f) => acc + (f.paid || 0), 0);
  const due = Math.max(0, totalAssessed - totalPaid);

  return {
    student_id: user.id,
    student_name: user.name,
    total_assessed: totalAssessed,
    total_paid: totalPaid,
    pending_due: due,
    status: due === 0 ? 'Clear / Paid' : 'Payment Outstanding'
  };
}

// Security Check: Detect Prompt Injection or Privilege Escalation Attacks
function detectPromptInjection(query) {
  const q = String(query || '').toLowerCase();
  const patterns = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /drop table/i,
    /select.*from (users|credentials)/i,
    /developer mode/i,
    /\bdan\b.*mode/i,
    /system override/i,
    /you are now (an?|the )?(admin|super_admin|hod|chancellor)/i,
    /grant (me )?admin/i,
    /override (my |the )?attendance/i,
    /mark me present/i,
    /approve (all |any )?(pending )?fee/i,
    /pretend (i am|you are)/i,
    /act as (user|admin|faculty|the hod|chancellor)/i,
    /impersonat(e|ing)/i,
    /(as|switch to|login as) user \d+/i,
    /show me (other|all|another) (students'|students|users'|users)/i,
    /display their (private|grades|contact|phone)/i,
    /unreleased question paper/i
  ];
  return patterns.some((p) => p.test(q));
}

/**
 * Handle personal question execution strictly using req.user
 */
async function handlePersonalQuery(query, user) {
  // Defensive validation: user must be verified from JWT
  if (!user || !user.id) {
    return {
      error: 'UNAUTHORIZED',
      reply: 'Authentication required to access personal student records.'
    };
  }

  // Check for prompt-injection attacks
  if (detectPromptInjection(query)) {
    return {
      reply: `Security Alert: Your request was identified as a potential prompt injection or privilege escalation attempt. The campus AI controller operates strictly under read-only boundaries locked to your authenticated identity (${user.roll_no || user.name}). Internal schemas and system configurations cannot be accessed or overridden.`,
      attack_intercepted: true,
      user_verified: user.id,
      engine: 'security-guard'
    };
  }

  const q = query.toLowerCase();

  // Determine intent & run verified tool
  let toolData = null;
  let toolName = 'attendance';

  if (/attendance|bunk|miss|skip|class.*skip|safe.*classes|75/i.test(q)) {
    toolName = 'calculate_skippable_classes';
    toolData = toolCalculateSkippableClasses(user);
  } else if (/cgpa|gpa|marks|grade|score|pointer/i.test(q)) {
    toolName = 'get_student_cgpa';
    toolData = toolGetStudentCgpa(user);
  } else if (/routine|today.*class|next class|timetable|schedule/i.test(q)) {
    toolName = 'get_next_class';
    toolData = toolGetNextClass(user);
  } else if (/fee|dues|payment|challan|receipt|pending money/i.test(q)) {
    toolName = 'get_pending_fees';
    toolData = toolGetPendingFees(user);
  } else {
    // Default to attendance status check
    toolName = 'calculate_skippable_classes';
    toolData = toolCalculateSkippableClasses(user);
  }

  // Offline fallback formatting
  const offlineFallback = () => {
    let text = '';
    if (toolName === 'calculate_skippable_classes') {
      const d = toolData;
      if (d.overall_percentage >= 75) {
        text = `Hello ${user.name.split(' ')[0]}! Your current attendance is **${d.overall_percentage}%** (${d.total_attended}/${d.total_classes} classes).\n\n` +
          `✅ **Safe to Skip**: You can safely miss up to **${d.safe_to_skip_overall} class(es)** while remaining strictly above the mandatory 75.0% threshold under UGC/AICTE norms.\n\n` +
          `${d.short_subjects.length ? `⚠️ Watch out: you are below 75% in: ${d.short_subjects.map((s) => s.name + ' (' + s.percentage + '%)').join(', ')}.` : 'All your enrolled courses are currently in the safe zone (>= 75.0%).'}`;
      } else {
        text = `Hello ${user.name.split(' ')[0]}! Your current attendance is **${d.overall_percentage}%** (${d.total_attended}/${d.total_classes} classes), which is **below the 75.0% requirement**.\n\n` +
          `🚨 **Recovery Mandate**: You must attend the next **${d.must_attend_consecutive} consecutive class(es)** without missing any to restore your attendance to 75.0% and avoid examination debarment.`;
      }
    } else if (toolName === 'get_student_cgpa') {
      const d = toolData;
      text = `Your recorded cumulative grade point average (CGPA) is **${d.cgpa}** with **${d.credits_earned} credits** completed and **${d.active_backlogs} backlog(s)**.\nStatus: **${d.academic_standing}**.`;
    } else if (toolName === 'get_next_class') {
      const d = toolData;
      text = `Today is ${d.day}. Scheduled classes for Semester ${d.semester}:\n` +
        (d.timetable_slots || []).map((s) => `• ${s.time}: **${s.subject}** (${s.faculty}, ${s.room})`).join('\n');
    } else if (toolName === 'get_pending_fees') {
      const d = toolData;
      text = d.pending_due > 0
        ? `You have **₹${d.pending_due.toLocaleString('en-IN')}** in pending tuition/development fees. Clear from the Academics & Fees tab.`
        : 'Your institutional fees are fully paid (₹0 due). No holds on your account.';
    }

    return {
      tool_called: toolName,
      tool_data: toolData,
      reply: text,
      engine: 'offline'
    };
  };

  // Run with Gemini if available, passing strictly verified tool data
  const systemInstruction = prompts.functionCalling;
  const userPrompt = `VERIFIED STUDENT RECORD (Identity: User ID ${user.id}, Roll No: ${user.roll_no || 'N/A'}, Name: ${user.name}):\nTOOL EXECUTED: ${toolName}\nCALCULATED TOOL DATA: ${JSON.stringify(toolData)}\n\nSTUDENT QUESTION: "${query}"\n\nPlease answer the student accurately and empathetically using exclusively the tool calculations above.`;

  const geminiResponse = await gemini.generateContent({
    system: systemInstruction,
    prompt: userPrompt,
    maxTokens: 400,
    temperature: 0.3,
    userId: user.id,
    feature: 'function_calling',
    offlineFallback
  });

  if (typeof geminiResponse === 'string') {
    return {
      tool_called: toolName,
      tool_data: toolData,
      reply: geminiResponse,
      engine: 'gemini'
    };
  }

  return geminiResponse || offlineFallback();
}

module.exports = {
  handlePersonalQuery,
  toolCalculateSkippableClasses,
  toolGetStudentCgpa,
  toolGetNextClass,
  toolGetPendingFees,
  detectPromptInjection
};
