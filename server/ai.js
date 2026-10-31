// AI engine: analytics models (always on, offline) + optional Claude LLM for conversational features.
const { db, rec } = require('./db');

// ---------- LLM (optional) ----------
let client = null;
function llmAvailable() { return !!process.env.ANTHROPIC_API_KEY; }
async function llm(system, messages, { maxTokens = 700 } = {}) {
  if (!llmAvailable()) return null;
  try {
    if (!client) { const Anthropic = require('@anthropic-ai/sdk'); client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
    const res = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages,
    }, { timeout: 25000 });
    return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || null;
  } catch (e) { console.warn('[ai] LLM unavailable, using offline engine:', e.message); return null; }
}

// ---------- grading ----------
function grade(total) {
  const t = [[90, 'O', 10], [80, 'A+', 9], [70, 'A', 8], [60, 'B+', 7], [50, 'B', 6], [45, 'C', 5], [40, 'P', 4]];
  for (const [min, g, gp] of t) if (total >= min) return { grade: g, gp };
  return { grade: 'F', gp: 0 };
}

// ---------- snapshot of one student ----------
function snapshot(userId) {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  const subs = db.prepare('SELECT * FROM subjects WHERE sem=? ORDER BY id').all(u.semester);
  const rows = subs.map((s) => {
    const a = db.prepare('SELECT * FROM attendance WHERE user_id=? AND subject_id=?').get(userId, s.id) || { attended: 0, total: 0 };
    const m = db.prepare('SELECT * FROM marks WHERE user_id=? AND subject_id=?').get(userId, s.id) || {};
    const pct = a.total ? (a.attended / a.total) * 100 : 100;
    const total = (m.internal ?? 0) + (m.endsem ?? 0);
    const g = m.endsem != null ? grade(total) : null;
    return { ...s, attended: a.attended, classes: a.total, pct, internal: m.internal ?? null, endsem: m.endsem ?? null,
      total: m.endsem != null ? total : null, grade: g?.grade ?? null, gp: g?.gp ?? null,
      assign_done: m.assign_done ?? 0, assign_total: m.assign_total ?? 0 };
  });
  const att = rows.reduce((x, r) => x + r.attended, 0), tot = rows.reduce((x, r) => x + r.classes, 0);
  const wellness = rec.list('wellness', userId, { limit: 5 });
  return { user: u, subjects: rows, attended: att, classes: tot, attendancePct: tot ? (att / tot) * 100 : 100, wellness };
}

const r1 = (n) => Math.round(n * 10) / 10;

// ---------- attendance intelligence ----------
function bunkPlan(attended, total, target = 75) {
  const t = target / 100;
  const canMiss = Math.max(0, Math.floor(attended / t - total));
  const need = attended / total >= t ? 0 : Math.ceil((t * total - attended) / (1 - t));
  return { canMiss, mustAttend: need };
}
function forecast(snap) {
  // simple trend: assume recent regularity continues for the remaining ~40 classes of the term
  const remaining = 40, pct = snap.attendancePct / 100;
  const projected = ((snap.attended + remaining * pct) / (snap.classes + remaining)) * 100;
  return { current: r1(snap.attendancePct), projected: r1(projected), ...bunkPlan(snap.attended, snap.classes) };
}

// ---------- backlog / performance risk (transparent weighted model) ----------
function risk(snap) {
  const withMarks = snap.subjects.filter((s) => s.internal != null);
  const avgInternalPct = withMarks.length ? (withMarks.reduce((x, s) => x + s.internal, 0) / withMarks.length / 25) * 100 : 70;
  const attGap = Math.max(0, 75 - snap.attendancePct) / 75;
  const marksGap = Math.max(0, 55 - avgInternalPct) / 55;
  const at = snap.subjects.reduce((x, s) => x + s.assign_total, 0), ad = snap.subjects.reduce((x, s) => x + s.assign_done, 0);
  const assignGap = at ? 1 - ad / at : 0;
  const stress = snap.wellness.length ? snap.wellness.reduce((x, w) => x + (w.stress || 0), 0) / snap.wellness.length : 4;
  const lowSubjects = snap.subjects.filter((s) => s.pct < 75).length / Math.max(1, snap.subjects.length);
  const p = Math.min(0.97, 0.05 + 0.3 * attGap + 0.3 * marksGap + 0.12 * assignGap + 0.1 * (stress / 10) + 0.18 * lowSubjects);
  const probability = Math.round(p * 100);
  const level = probability >= 55 ? 'High Risk' : probability >= 25 ? 'Medium Risk' : 'Low Risk';
  const drivers = [];
  if (attGap > 0) drivers.push('attendance below 75%');
  if (lowSubjects > 0) drivers.push(`${snap.subjects.filter((s) => s.pct < 75).length} subject(s) short on attendance`);
  if (marksGap > 0) drivers.push('internal marks below the safe zone');
  if (assignGap > 0.3) drivers.push('pending assignments');
  if (stress >= 7) drivers.push('elevated stress levels');
  return { probability, level, drivers, avgInternalPct: r1(avgInternalPct) };
}

// ---------- CGPA ----------
function recordedCgpa(userId) {
  const rows = db.prepare(`SELECT s.credits c, m.internal i, m.endsem e FROM marks m JOIN subjects s ON s.id=m.subject_id
    WHERE m.user_id=? AND m.endsem IS NOT NULL`).all(userId);
  let cr = 0, pts = 0, back = 0;
  for (const r of rows) { const g = grade(r.i + r.e); cr += r.c; pts += r.c * g.gp; if (g.gp === 0) back++; }
  return { cgpa: cr ? r1(pts / cr * 100) / 100 : null, credits: cr, backlogs: back };
}
function predictCgpa(userId) {
  const snap = snapshot(userId), rc = recordedCgpa(userId);
  const base = rc.cgpa ?? 7;
  const internals = snap.subjects.filter((s) => s.internal != null);
  const iPct = internals.length ? internals.reduce((x, s) => x + s.internal, 0) / internals.length / 25 : 0.7;
  const trendGp = Math.min(10, Math.max(0, iPct * 10 + 0.5));
  const attBonus = snap.attendancePct >= 85 ? 0.15 : snap.attendancePct < 75 ? -0.3 : 0;
  const predicted = Math.round(Math.min(10, Math.max(0, 0.55 * base + 0.45 * trendGp + attBonus)) * 100) / 100;
  const delta = predicted - base;
  const feedback = delta > 0.15 ? 'Your current internals suggest an upward trend. Keep this momentum.'
    : delta < -0.15 ? 'Current internals are pulling your CGPA down; focus on the weakest subjects below.'
    : 'You are stable. Small gains in weak subjects can lift your CGPA.';
  const weak = [...internals].sort((a, b) => a.internal - b.internal).slice(0, 2).map((s) => s.name);
  const factors = [
    { label: 'Attendance', value: `${r1(snap.attendancePct)}%`, impact: attBonus >= 0 ? 'positive' : 'negative' },
    { label: 'Avg internals', value: `${r1(iPct * 100)}%`, impact: iPct >= 0.65 ? 'positive' : 'negative' },
    { label: 'Weakest subjects', value: weak.join(', ') || '—', impact: 'neutral' },
  ];
  return { recorded: rc, predicted, feedback, factors };
}

// ---------- recommendations / study plan / exam advice ----------
function recommendations(snap, rk) {
  const out = [];
  const low = snap.subjects.filter((s) => s.pct < 75).sort((a, b) => a.pct - b.pct)[0];
  if (low) out.push({ icon: 'fa-user-clock', text: `Prioritise ${low.name}: attendance is ${r1(low.pct)}%. Attend the next ${bunkPlan(low.attended, low.classes).mustAttend} classes to cross 75%.` });
  const weak = snap.subjects.filter((s) => s.internal != null).sort((a, b) => a.internal - b.internal)[0];
  if (weak && weak.internal < 15) out.push({ icon: 'fa-book', text: `Revise ${weak.name} (internal ${weak.internal}/25). Try 45 minutes of practice problems daily.` });
  const pend = snap.subjects.reduce((x, s) => x + (s.assign_total - s.assign_done), 0);
  if (pend > 0) out.push({ icon: 'fa-list-check', text: `${pend} assignment(s) pending. Clear the oldest one today.` });
  if (rk.level !== 'Low Risk') out.push({ icon: 'fa-hand-holding-heart', text: 'Book a mentor session. Early support makes a big difference.' });
  if (out.length < 3) out.push({ icon: 'fa-briefcase', text: 'Update your resume and run the ATS analysis to prepare for placements.' });
  if (out.length < 3) out.push({ icon: 'fa-robot', text: 'Ask the AI Doubt Solver about your toughest topic.' });
  return out.slice(0, 4);
}
function studyPlan(snap, hoursPerDay = 4, customRoutine = null) {
  let subs = [];
  const weakSubjectsList = (customRoutine?.weakSubjects || []).map((s) => s.toLowerCase());

  if (snap && snap.subjects && snap.subjects.length > 0) {
    subs = snap.subjects.map((s) => {
      let weakness = (s.internal != null ? (25 - s.internal) / 25 : 0.3) + Math.max(0, 75 - s.pct) / 150;
      if (weakSubjectsList.some((w) => s.name.toLowerCase().includes(w))) {
        weakness += 0.6;
      }
      return { name: s.name, w: 0.15 + weakness };
    });
  }

  if (subs.length === 0) {
    subs = [
      { name: 'Deep Learning', w: 1.0 },
      { name: 'Natural Language Processing', w: 0.9 },
      { name: 'Internet of Things', w: 0.85 },
      { name: 'Cyber Security', w: 0.95 },
      { name: 'Project Phase I', w: 0.8 },
    ];
  }

  const sum = subs.reduce((x, s) => x + s.w, 0);
  const totalWeeklyStudyHours = Math.round(hoursPerDay * 6);
  const alloc = subs.map((s) => {
    const h = Math.max(2, Math.round(((s.w / sum) * totalWeeklyStudyHours) * 2) / 2);
    return { name: s.name, hours: h };
  });

  const s0 = alloc[0]?.name || 'Deep Learning';
  const s1 = alloc[1]?.name || 'Natural Language Processing';
  const s2 = alloc[2]?.name || 'Internet of Things';
  const s3 = alloc[3]?.name || 'Cyber Security';
  const s4 = alloc[4]?.name || 'Project Phase I';

  const schedule = [
    { day: 'Mon', blocks: [`${s0} · 2h`, `${s3} · 1.5h`] },
    { day: 'Tue', blocks: [`${s1} · 2h`, `${s4} · 1.5h`] },
    { day: 'Wed', blocks: [`${s2} · 2h`, `${s0} · 1.5h`] },
    { day: 'Thu', blocks: [`${s3} · 2h`, `${s1} · 1.5h`] },
    { day: 'Fri', blocks: [`${s4} · 2h`, `${s2} · 1.5h`] },
    { day: 'Sat', blocks: [`${s0} · 2h`, `${s3} · 1.5h`] },
    { day: 'Sun', blocks: ['Weekly revision + mock test · 2h', 'Rest and planning · 1h'] },
  ];

  return { alloc, schedule };
}
function examAdvice(snap) {
  const withM = snap.subjects.filter((s) => s.internal != null);
  const avg = withM.length ? withM.reduce((x, s) => x + s.internal, 0) / withM.length / 25 * 100 : 60;
  const level = avg >= 80 ? 'Hard' : avg >= 60 ? 'Medium' : 'Easy';
  const why = { Hard: 'Your internals are strong. Challenge yourself with advanced sets and timed full-length papers.',
    Medium: 'Your performance is solid but uneven. Use mixed-difficulty tests and review every wrong answer.',
    Easy: 'Build fundamentals first. Start with easy and medium sets, then ramp up each week.' }[level];
  return { level, score: r1(avg), advice: why };
}

// ---------- leave auto-decision ----------
function leaveDecision(snap, days, reason = '') {
  const afterMissed = bunkPlan(snap.attended, snap.classes);
  const projected = (snap.attended / (snap.classes + days * 5)) * 100;
  const medical = /medical|fever|hospital|doctor|sick|surgery|health|injur/i.test(reason);
  if (projected >= 75 && days <= 3) return { decision: 'Approved', note: `Auto-approved: attendance stays about ${r1(projected)}% after the leave.` };
  if (medical && days <= 7) return { decision: 'Approved', note: 'Auto-approved on medical grounds. Submit the certificate within 3 days.' };
  if (projected < 70) return { decision: 'Declined', note: `Attendance would fall to about ${r1(projected)}%, below the safe limit. Please contact your mentor.` };
  return { decision: 'Under Review', note: `Escalated to faculty: projected attendance ${r1(projected)}% (margin ${afterMissed.canMiss} classes).` };
}

// ---------- helpdesk triage ----------
const DEPTS = [
  ['IT Services', /wifi|wi-fi|internet|network|login|password|portal|lms|email|software|laptop|computer|printer|server/i],
  ['Hostel Office', /hostel|mess|room|warden|laundry|roommate|water heater|hostel food/i],
  ['Accounts & Fees', /fee|fees|payment|refund|receipt|scholarship|challan|invoice|dues/i],
  ['Examination Cell', /exam|marks|result|revaluation|hall ticket|grade|backlog|admit card/i],
  ['Transport Office', /bus|transport|route|driver|vehicle|parking/i],
  ['Maintenance', /lab|projector|fan|light|ac |air conditioner|electric|furniture|bench|leak|broken|plumbing|equipment|toilet|cleaning/i],
  ['Library', /library|book|borrow|journal|e-?book/i],
  ['Academic Office', /timetable|faculty|class|syllabus|attendance|course|teacher|lecture/i],
];
function classifyTicket(text) {
  let best = { dept: 'Student Affairs', score: 0 };
  for (const [dept, re] of DEPTS) {
    const m = text.match(new RegExp(re.source, 'gi'));
    if (m && m.length > best.score) best = { dept, score: m.length };
  }
  const urgent = /urgent|emergency|immediately|asap|fire|harass|ragging|unsafe|medical|shock|flood|not working since|danger/i.test(text);
  const medium = /not working|broken|unable|cannot|can't|failed|deadline|tomorrow|exam/i.test(text);
  const priority = urgent ? 'High' : medium ? 'Medium' : 'Low';
  const sla = { High: '4 hours', Medium: '24 hours', Low: '3 working days' }[priority];
  return { department: best.dept, priority, sla, confidence: Math.min(0.97, 0.55 + best.score * 0.15) };
}

// ---------- notice summariser ----------
function summarizeNotice(body) {
  const sentences = body.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const dates = body.match(/\b\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(\s+\d{4})?/gi) || [];
  let s = sentences.slice(0, 2).join(' ');
  if (s.length > 180) s = s.slice(0, 177).trim() + '...';
  return dates.length ? `${s} (Key date: ${dates[0]})` : s;
}

// ---------- resume ATS ----------
const SKILLS = ['python', 'java', 'javascript', 'typescript', 'react', 'node', 'sql', 'mysql', 'mongodb', 'c++', 'c#', 'html', 'css', 'git', 'github', 'docker',
  'aws', 'azure', 'linux', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'data structures', 'algorithms', 'django', 'flask', 'spring',
  'rest api', 'agile', 'communication', 'leadership', 'teamwork', 'problem solving', 'excel', 'power bi', 'tableau', 'nlp', 'cloud', 'devops'];
function atsAnalyze(r) {
  const text = `${r.name || ''} ${r.email || ''} ${r.summary || ''}`.toLowerCase();
  const found = SKILLS.filter((s) => new RegExp(`(^|[^a-z+#])${s.replace(/[+#.]/g, '\\$&')}($|[^a-z+#])`).test(text));
  const words = (r.summary || '').trim().split(/\s+/).filter(Boolean).length;
  const hasNums = /\d+\s*(%|\+|x|users|projects|students)|\b\d{2,}\b/.test(r.summary || '');
  let score = 20 + Math.min(40, found.length * 6) + (words >= 40 ? 15 : words >= 20 ? 8 : 0) + (hasNums ? 10 : 0)
    + (/@/.test(r.email || '') ? 5 : 0) + (r.name ? 5 : 0) + (/project|intern|experience|certif/.test(text) ? 5 : 0);
  score = Math.min(98, score);
  const tips = [];
  if (found.length < 5) tips.push('Add more role-relevant skills (e.g. Python, SQL, Git, REST APIs).');
  if (words < 40) tips.push('Expand the summary to 40–80 words covering strengths, projects and goals.');
  if (!hasNums) tips.push('Quantify impact with numbers (e.g. "built an app used by 200+ students").');
  if (!/project|intern/.test(text)) tips.push('Mention at least one project or internship.');
  if (!/@/.test(r.email || '')) tips.push('Add a valid email address.');
  if (!tips.length) tips.push('Strong resume. Tailor keywords to each job description.');
  return { score, skills: found, tips };
}

// ---------- doubt solver ----------
const KB = [
  { k: ['deadlock'], t: 'Deadlock', e: 'A deadlock is a state where a set of processes are blocked forever because each holds a resource and waits for one held by another. It needs four Coffman conditions at once: mutual exclusion, hold and wait, no preemption and circular wait. Break any one of them to prevent deadlock.', n: ['Prevention: break one Coffman condition', 'Avoidance: Banker\'s algorithm keeps the system in a safe state', 'Detection: find cycles in the resource-allocation graph, then recover'], r: ['Banker\'s Algorithm', 'Resource Allocation Graph', 'Process Synchronization'] },
  { k: ['process', 'thread'], t: 'Process vs Thread', e: 'A process is a program in execution with its own address space. A thread is a lightweight unit of execution inside a process; threads share code, data and heap but keep their own stack and registers. Threads are cheaper to create and switch, but need synchronisation because they share memory.', n: ['Process: isolated memory, heavy context switch', 'Thread: shared memory, light context switch', 'Use mutexes/semaphores to avoid race conditions'], r: ['Context Switching', 'Mutex & Semaphore', 'Multithreading'] },
  { k: ['normalization', 'normalisation', '1nf', '2nf', '3nf', 'bcnf'], t: 'Database Normalization', e: 'Normalization organises tables to reduce redundancy and update anomalies. 1NF removes repeating groups (atomic values), 2NF removes partial dependencies on a composite key, 3NF removes transitive dependencies, and BCNF requires every determinant to be a candidate key.', n: ['1NF: atomic columns', '2NF: no partial dependency', '3NF: no transitive dependency', 'BCNF: determinant must be a candidate key'], r: ['Functional Dependencies', 'ER Modelling', 'Denormalization'] },
  { k: ['sql', 'join', 'query'], t: 'SQL Joins', e: 'A JOIN combines rows from two tables on a related column. INNER JOIN returns only matching rows, LEFT JOIN keeps all rows from the left table (NULL where no match), RIGHT JOIN is the mirror, and FULL OUTER JOIN keeps everything from both.', n: ['INNER: intersection', 'LEFT/RIGHT: keep one side', 'FULL: union with NULLs', 'Index join columns for speed'], r: ['Indexes', 'Subqueries', 'GROUP BY & HAVING'] },
  { k: ['recursion', 'recursive'], t: 'Recursion', e: 'Recursion solves a problem by reducing it to smaller instances of itself. Every recursive function needs a base case that stops the calls and a recursive case that moves toward it. Each call uses stack space, so very deep recursion can overflow; memoization or iteration can fix that.', n: ['Always define a base case', 'Each call must progress toward the base case', 'Memoize overlapping subproblems'], r: ['Dynamic Programming', 'Call Stack', 'Divide and Conquer'] },
  { k: ['binary search', 'bst', 'tree', 'linked list', 'stack', 'queue', 'data structure', 'array', 'heap', 'graph'], t: 'Data Structures', e: 'Pick a data structure by the operations you need most. Arrays give O(1) index access; linked lists give O(1) insert at a known node; stacks and queues restrict access to LIFO/FIFO; balanced BSTs give O(log n) search/insert; heaps give O(1) min/max; hash tables give average O(1) lookup; graphs model relationships.', n: ['Binary search needs sorted data: O(log n)', 'BST ops are O(h); balance it (AVL/Red-Black)', 'BFS uses a queue; DFS uses a stack/recursion'], r: ['Time Complexity', 'Hashing', 'Graph Traversals'] },
  { k: ['big o', 'complexity', 'time complexity'], t: 'Time Complexity', e: 'Big-O describes how the running time grows with input size n, ignoring constants. Common classes from fastest to slowest: O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n). Count the dominant loop or recursion to find it.', n: ['Nested loops over n: O(n^2)', 'Halving each step: O(log n)', 'Merge sort: O(n log n)'], r: ['Master Theorem', 'Space Complexity', 'Amortized Analysis'] },
  { k: ['oop', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction', 'object oriented'], t: 'Object-Oriented Programming', e: 'OOP models software as objects combining data and behaviour. Encapsulation hides internal state, abstraction exposes only essentials, inheritance reuses a parent class, and polymorphism lets one interface have many implementations (overriding/overloading).', n: ['Encapsulation: private fields + public methods', 'Inheritance: is-a relationship', 'Polymorphism: same call, different behaviour'], r: ['Design Patterns', 'Interfaces vs Abstract Classes', 'SOLID Principles'] },
  { k: ['derivative', 'differentiation', 'calculus', 'integration', 'integral', 'limit'], t: 'Calculus Basics', e: 'The derivative measures the instantaneous rate of change of a function, defined as the limit of (f(x+h) - f(x))/h as h tends to 0. Integration is the reverse process and gives accumulated area. The Fundamental Theorem of Calculus links the two.', n: ['d/dx x^n = n x^(n-1)', 'Product rule: (uv)\' = u\'v + uv\'', 'Chain rule: (f(g(x)))\' = f\'(g)·g\'', 'Integral of x^n = x^(n+1)/(n+1) + C'], r: ['Chain Rule', 'Definite Integrals', 'Taylor Series'] },
  { k: ['matrix', 'determinant', 'eigen', 'linear algebra'], t: 'Matrices & Eigenvalues', e: 'A matrix represents a linear transformation. An eigenvector keeps its direction under the transformation and is only scaled by its eigenvalue λ, satisfying A v = λ v. Eigenvalues are the roots of det(A − λI) = 0.', n: ['det(A − λI) = 0 gives eigenvalues', 'Sum of eigenvalues = trace', 'Product of eigenvalues = determinant'], r: ['Diagonalization', 'Rank of a Matrix', 'Cayley–Hamilton Theorem'] },
  { k: ['newton', 'force', 'motion', 'momentum', 'kinematics'], t: 'Newton\'s Laws of Motion', e: 'First law: a body stays at rest or in uniform motion unless a net force acts. Second law: F = m a, so acceleration is proportional to net force. Third law: every action has an equal and opposite reaction. Together they explain most classical mechanics problems.', n: ['F = m a', 'Momentum p = m v is conserved without external force', 'Draw a free-body diagram first'], r: ['Work-Energy Theorem', 'Friction', 'Circular Motion'] },
  { k: ['ohm', 'current', 'voltage', 'resistance', 'circuit'], t: 'Ohm\'s Law and Circuits', e: 'Ohm\'s law states V = I R: for a conductor at constant temperature, current is proportional to voltage. Series resistors add (R = R1 + R2); parallel resistors add as reciprocals (1/R = 1/R1 + 1/R2).', n: ['V = I R', 'Series: same current, voltages add', 'Parallel: same voltage, currents add', 'Power P = V I'], r: ['Kirchhoff\'s Laws', 'Capacitors', 'AC Circuits'] },
  { k: ['mole', 'molar', 'stoichiometry', 'periodic', 'bond', 'acid', 'base', 'ph'], t: 'Basic Chemistry Concepts', e: 'A mole is 6.022×10^23 particles. Stoichiometry uses balanced equations and mole ratios to relate reactants and products. pH = −log10[H+]; acids have pH < 7 and bases pH > 7. Bonding comes from electron sharing (covalent) or transfer (ionic).', n: ['Balance the equation before calculating', 'moles = mass / molar mass', 'pH = −log10[H+]'], r: ['Limiting Reagent', 'Chemical Equilibrium', 'Periodic Trends'] },
  { k: ['osi', 'tcp', 'udp', 'network', 'ip address', 'http', 'dns'], t: 'Computer Networks', e: 'The OSI model splits networking into 7 layers (Physical, Data Link, Network, Transport, Session, Presentation, Application). TCP is connection-oriented and reliable (handshake, ordering, retransmission); UDP is connectionless and faster but unreliable. DNS maps names to IP addresses.', n: ['TCP: reliable, ordered, 3-way handshake', 'UDP: low latency, no guarantee', 'IP routes packets; MAC delivers in LAN'], r: ['Subnetting', 'Routing Algorithms', 'HTTP/HTTPS'] },
  { k: ['machine learning', 'neural', 'overfitting', 'regression', 'classification', 'ai '], t: 'Machine Learning Basics', e: 'Machine learning learns patterns from data instead of explicit rules. Supervised learning maps inputs to known labels (regression, classification); unsupervised learning finds structure (clustering). Overfitting is when a model memorises training data and fails on new data; counter it with more data, regularisation and validation.', n: ['Split data: train / validation / test', 'Overfitting: high train score, low test score', 'Evaluate with the right metric (accuracy, F1, RMSE)'], r: ['Bias–Variance Tradeoff', 'Gradient Descent', 'Neural Networks'] },
];
const norm = (s) => ` ${s.toLowerCase()} `;
function doubtLocal(subject, text) {
  const q = norm(text);
  let best = null, bs = 0;
  for (const e of KB) { const sc = e.k.filter((k) => q.includes(k)).length; if (sc > bs) { bs = sc; best = e; } }
  if (best) return { explanation: `**${best.t}**\n\n${best.e}`, notes: best.n, topics: best.r, source: 'offline-kb' };
  return {
    explanation: `Let's break your ${subject} doubt into steps:\n\n1. Restate the question in your own words and note what is given and what is asked.\n2. Identify the core concept or formula involved.\n3. Work a tiny example by hand before generalising.\n4. Check edge cases and units.\n\nFor a precise explanation, add the exact topic name (e.g. "deadlock", "normalization", "eigenvalues") or enable the Claude API key on the server for open-ended answers.`,
    notes: ['Write down the givens and the unknown', 'Match the problem to a known concept', 'Verify with a small example'], topics: [subject + ' fundamentals', 'Previous year questions', 'Worked examples'], source: 'offline-generic' };
}
async function doubtSolve(subject, text) {
  const out = await llm(
    'You are a patient university tutor. Answer the student doubt clearly and accurately for an engineering undergraduate. Respond ONLY with JSON: {"explanation": string (use short paragraphs, may use **bold**), "notes": [3-5 short key points], "topics": [3 related topics]}.',
    [{ role: 'user', content: `Subject: ${subject}\nDoubt: ${text}` }], { maxTokens: 900 });
  if (out) {
    try { const j = JSON.parse(out.replace(/^```json|```$/gm, '').trim()); if (j.explanation) return { ...j, source: 'claude' }; } catch { /* fall through */ }
    return { explanation: out, notes: [], topics: [], source: 'claude' };
  }
  return doubtLocal(subject, text);
}

// ---------- conversational advisor ----------
function nextClass(user) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = days[new Date().getDay()];
  const tt = rec.list('timetable', null, { order: 'ASC' }).find((d) => d.day === today);
  if (!tt) return null;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const starts = [9, 10.75, 13, 13.5, 15.25];
  const idx = tt.slots.findIndex((_, i) => starts[i] > h);
  const s = idx >= 0 ? tt.slots[idx] : null;
  return s ? { ...s, start: ['09:00', '10:45', '13:30', '15:15'][idx] ?? '', day: today } : null;
}
function chatLocal(userId, msg) {
  const snap = snapshot(userId), f = forecast(snap), rk = risk(snap), c = recordedCgpa(userId);
  const m = msg.toLowerCase();
  const has = (...w) => w.some((x) => m.includes(x));
  if (has('hello', 'hi ', 'hey') && m.length < 20) return `Hi ${snap.user.name.split(' ')[0]}! I can check your attendance, CGPA, timetable, exams, fees, risk and study plan. What would you like?`;
  if (has('attendance', 'bunk', 'miss', '75')) {
    const low = snap.subjects.filter((s) => s.pct < 75).map((s) => `${s.name} (${r1(s.pct)}%)`);
    return `Your overall attendance is ${f.current}%. ${f.mustAttend ? `You must attend the next ${f.mustAttend} classes to reach 75%.` : `You can safely miss up to ${f.canMiss} more classes and stay above 75%.`} ${low.length ? 'Short subjects: ' + low.join(', ') + '.' : 'All subjects are above 75%.'} Projected finish: ${f.projected}%.`;
  }
  if (has('cgpa', 'gpa', 'grade', 'marks', 'score')) {
    const p = predictCgpa(userId);
    return `Your recorded CGPA is ${c.cgpa ?? 'not available yet'} with ${c.credits} credits and ${c.backlogs} backlog(s). My predicted CGPA is ${p.predicted}. ${p.feedback}`;
  }
  if (has('next class', 'timetable', 'schedule', 'class today', 'lecture')) {
    const n = nextClass(snap.user);
    return n ? `Your next class is ${n.subject} at ${n.start} in ${n.room} with ${n.faculty}.` : 'You have no more classes today. Check the Timetable tab for the full week.';
  }
  if (has('exam')) {
    const ex = rec.list('exam', null, { order: 'ASC' }).filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))[0];
    return ex ? `Your next exam is ${ex.subject} (${ex.type}) on ${ex.date} at ${ex.time}, room ${ex.room}. ${examAdvice(snap).advice}` : 'No upcoming exams are scheduled right now.';
  }
  if (has('fee', 'payment', 'due')) {
    const fees = rec.list('fee', userId, { order: 'ASC' });
    const due = fees.reduce((x, r) => x + (r.assessed - r.paid), 0);
    return due > 0 ? `You have ₹${due.toLocaleString('en-IN')} in pending fees. You can pay from Academics & Fees.` : 'Your fees are fully paid. Nothing due.';
  }
  if (has('risk', 'backlog', 'fail')) return `Your backlog risk is **${rk.level}** (${rk.probability}%). ${rk.drivers.length ? 'Main factors: ' + rk.drivers.join(', ') + '.' : 'No major risk factors.'}`;
  if (has('study', 'plan', 'tip', 'prepare', 'revise')) {
    const sp = studyPlan(snap);
    const top = [...sp.alloc].sort((a, b) => b.hours - a.hours).slice(0, 2).map((a) => a.name);
    return `Focus most on ${top.join(' and ')}. Use 50-minute study blocks with 10-minute breaks, practise past papers weekly, and review mistakes daily. See the Planner for the full schedule.`;
  }
  if (has('stress', 'anxious', 'depress', 'sad', 'overwhelm', 'sleep')) return 'I\'m sorry you\'re feeling this way. Taking small breaks and talking to someone helps. You can book a confidential session under Counselling & Mentor. If you need urgent support, call Tele-MANAS at 14416 (24x7).';
  if (has('placement', 'job', 'intern', 'resume')) return 'Open Placements for live openings and use the Resume Builder\'s ATS Analysis to improve your resume score.';
  if (has('notice', 'announcement')) {
    const n = db.prepare('SELECT title, summary FROM notices ORDER BY id DESC LIMIT 3').all();
    return 'Latest notices:\n' + n.map((x) => `• ${x.title}: ${x.summary}`).join('\n');
  }
  return `I can help with attendance, CGPA, timetable, exams, fees, risk, study plans and campus notices. Right now: attendance ${f.current}%, backlog risk ${rk.level}. Try asking "Can I bunk classes?" or "How is my CGPA?".`;
}
async function chat(userId, history, msg) {
  const snap = snapshot(userId);
  const ctx = {
    student: snap.user.name, dept: snap.user.dept, semester: snap.user.semester,
    attendance: forecast(snap), risk: risk(snap), cgpa: recordedCgpa(userId),
    subjects: snap.subjects.map((s) => ({ name: s.name, attendancePct: r1(s.pct), internal: s.internal, grade: s.grade })),
    nextClass: nextClass(snap.user), notices: db.prepare('SELECT title, summary FROM notices ORDER BY id DESC LIMIT 3').all(),
  };
  const out = await llm(
    `You are the AI Campus Advisor of a university's Smart Campus system. Be concise, warm and practical (max ~120 words). Use ONLY the student's data below for personal facts; never invent numbers. For distress, recommend counselling and Tele-MANAS 14416.\nSTUDENT DATA: ${JSON.stringify(ctx)}`,
    [...(history || []).slice(-8).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content).slice(0, 1000) })), { role: 'user', content: msg }]);
  return { reply: out || chatLocal(userId, msg), engine: out ? 'claude' : 'offline' };
}

async function plannerChat(userId, history, msg) {
  const snap = snapshot(userId);
  const p = rec.getDoc('planner', userId, { targetCgpa: 9.0, studyHours: 3.5 });
  const raw = String(msg || '').toLowerCase();

  // Detect college timings (e.g. 9 to 4:30, 9:00 AM - 4:00 PM, 6 days)
  let collegeTimings = p.collegeTimings || 'Mon - Sat: 09:00 AM - 04:30 PM (6-Day College Schedule)';
  if (raw.includes('college') || raw.includes('class') || raw.includes('routine') || raw.includes('mon') || raw.includes('sat') || raw.includes('9') || raw.includes('timing')) {
    if (raw.includes('8:30') || raw.includes('8.30')) {
      collegeTimings = 'Mon - Sat: 08:30 AM - 03:30 PM (6-Day Classes)';
    } else if (raw.includes('9') || raw.includes('4:30') || raw.includes('4')) {
      collegeTimings = 'Mon - Sat: 09:00 AM - 04:30 PM (6-Day Classes)';
    } else {
      const timeMatch = msg.match(/\d{1,2}(:\d{2})?\s*(am|pm)?\s*(-|to)\s*\d{1,2}(:\d{2})?\s*(am|pm)?/i);
      if (timeMatch) collegeTimings = `Mon - Sat: ${timeMatch[0]} (6-Day Classes)`;
    }
  }

  // Detect weaker subjects
  let weakSubjects = p.weakSubjects || ['Deep Learning', 'Natural Language Processing', 'Internet of Things', 'Cyber Security', 'Project Phase I'];
  const candidates = [
    { key: 'deep learning', name: 'Deep Learning' },
    { key: 'natural language processing', name: 'Natural Language Processing' },
    { key: 'nlp', name: 'Natural Language Processing' },
    { key: 'internet of things', name: 'Internet of Things' },
    { key: 'iot', name: 'Internet of Things' },
    { key: 'cyber security', name: 'Cyber Security' },
    { key: 'cybersecurity', name: 'Cyber Security' },
    { key: 'project', name: 'Project Phase I' },
    { key: 'machine learning', name: 'Machine Learning' },
    { key: 'operating systems', name: 'Operating Systems' },
    { key: 'os', name: 'Operating Systems' },
    { key: 'networks', name: 'Computer Networks' },
    { key: 'math', name: 'Mathematics' },
    { key: 'dbms', name: 'Database Management Systems' },
  ];
  const detectedSubs = [];
  for (const item of candidates) {
    if (raw.includes(item.key) && !detectedSubs.includes(item.name)) {
      detectedSubs.push(item.name);
    }
  }
  if (detectedSubs.length > 0) {
    weakSubjects = detectedSubs;
  }

  // Detect study hours
  let studyHours = p.studyHours || 3.5;
  const hoursMatch = raw.match(/(\d+(\.\d+)?)\s*(h|hr|hour|hours)/);
  if (hoursMatch) {
    studyHours = parseFloat(hoursMatch[1]);
  }

  // Detect target CGPA
  let targetCgpa = p.targetCgpa || 9.0;
  const cgpaMatch = raw.match(/(\d\.\d+)\s*(cgpa|gpa)?/);
  if (cgpaMatch) {
    targetCgpa = parseFloat(cgpaMatch[1]);
  }

  const customRoutine = { collegeTimings, weakSubjects, targetCgpa, studyHours };
  const plan = studyPlan(snap, studyHours, customRoutine);

  // Save updated preferences to DB
  rec.setDoc('planner', userId, {
    ...p,
    collegeTimings,
    weakSubjects,
    targetCgpa,
    studyHours,
    plan,
  });

  // Try calling LLM if key is configured, otherwise fallback to high quality offline response
  let reply = null;
  if (llmAvailable()) {
    reply = await llm(
      `You are the AI Study Routine & Timetable Architect for a college student in Smart Campus AI.
The student has a full 6-day college schedule (Monday to Saturday).
Help them balance daily classes, fatigue, and self-study targeting ${targetCgpa} CGPA.
Explain how the timetable allocates higher hours (5h/week) to their weaker subjects (${weakSubjects.join(', ')}).
Keep your tone warm, encouraging, and actionable (max 150 words).`,
      [
        ...(history || []).slice(-4).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content).slice(0, 500) })),
        { role: 'user', content: msg },
      ]
    );
  }

  if (!reply) {
    const sName = snap.user?.name ? snap.user.name.split(' ')[0] : 'Student';
    if (raw.includes('hi') || raw.includes('hello') || raw.includes('hey')) {
      reply = `Hello ${sName}! 👋 I'm your **AI Study Planner Bot**.\n\n` +
        `I build personalized timetables designed around your **full 6-day college classes (Monday to Saturday)** and optimize your study hours so you achieve your target **${targetCgpa} CGPA**.\n\n` +
        `📋 **Your Routine Profile**:\n` +
        `• 🏫 **College Hours**: ${collegeTimings}\n` +
        `• 🎯 **Target CGPA**: ${targetCgpa}\n` +
        `• ⏳ **Evening Study**: ${studyHours}h / day\n` +
        `• ⚡ **Focus Subjects**: ${weakSubjects.join(', ')}\n\n` +
        `I've updated your 7-day study plan below with extra weekly hours for weaker subjects! Click **"Sync to Calendar"** to push these sessions directly into your calendar.`;
    } else {
      reply = `Understood! I've recalibrated your schedule based on your routine 🚀:\n\n` +
        `• 🏫 **6-Day College Schedule**: Anchored to **${collegeTimings}**.\n` +
        `• ⚡ **Target & Focus**: **${targetCgpa} CGPA** goal with **${studyHours}h** evening self-study.\n` +
        `• 📚 **Weaker Subject Weighting**: Allocated **5h/week** to core modules (${weakSubjects.slice(0, 3).join(', ')}).\n` +
        `• 💡 **Anti-Burnout Strategy**: Post-college sessions are split into a 2h focused block (18:00–20:00) and a 1.5h revision block (20:30–22:00). Saturday wraps up assignments, and Sunday is reserved for mock tests.\n\n` +
        `Your timetable below has been dynamically updated!`;
    }
  }

  return {
    reply,
    plan,
    goals: { targetCgpa, studyHours, collegeTimings, weakSubjects },
  };
}

module.exports = { llmAvailable, grade, snapshot, forecast, bunkPlan, risk, recordedCgpa, predictCgpa, recommendations, studyPlan, examAdvice,
  leaveDecision, classifyTicket, summarizeNotice, atsAnalyze, doubtSolve, chat, plannerChat, nextClass, r1 };
