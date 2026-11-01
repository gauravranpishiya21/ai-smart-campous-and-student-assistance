/* AI-Powered Smart Campus: student portal core.
   Auth, navigation, dashboard, academics, attendance, counselling, community, syllabus, timetable, notices.
   Long-tail sections live in features.js. Both talk to the Express API in /server. */
const API_BASE = '/api';
window.loaders = window.loaders || {};

// ---------- tiny helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fdate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };
const empty = (t) => `<p class="text-sm text-gray-400 italic p-3">${esc(t)}</p>`;
const tone = { green: 'bg-emerald-100 text-emerald-700', red: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-indigo-100 text-indigo-700', gray: 'bg-gray-100 text-gray-600' };
const pill = (text, t = 'gray') => `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tone[t]}">${esc(text)}</span>`;
const statusTone = (s) => (/paid|approved|issued|confirmed|success|returned|safe|pass|shortlisted/i.test(s) ? 'green' : /fail|declin|not eligible|overdue|short|high/i.test(s) ? 'red' : /review|pending|routed|submitted|requested|medium|applied|borrowed/i.test(s) ? 'amber' : 'gray');
window.$ = $; window.esc = esc; window.inr = inr; window.fdate = fdate; window.empty = empty; window.pill = pill; window.statusTone = statusTone;

function token() { try { return localStorage.getItem('token'); } catch { return null; } }
async function api(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* non-json */ }
  if (res.status === 401 && !opts.noAuthRedirect) { showLogin(); throw new Error(data?.message || 'Please log in.'); }
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}
window.api = api;

function toast(msg, type = 'ok') {
  let box = $('toastBox');
  if (!box) { box = document.createElement('div'); box.id = 'toastBox'; box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:3000;display:flex;flex-direction:column;gap:8px;max-width:360px'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.setAttribute('role', 'status');
  t.className = `px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${type === 'err' ? 'bg-rose-600' : 'bg-emerald-600'}`;
  t.textContent = msg; box.appendChild(t); setTimeout(() => t.remove(), 4500);
}
window.toast = toast;
// run an action, toast result/error
async function act(fn, okMsg) { try { const r = await fn(); if (okMsg !== false) toast(okMsg || r?.message || 'Done'); return r; } catch (e) { toast(e.message, 'err'); return null; } }
window.act = act;
const val = (id) => ($(id)?.value ?? '').trim();
window.val = val;

function openModal(id) { const m = $(id); if (m) m.style.display = 'block'; }
function closeModal(id) { const m = $(id); if (m) m.style.display = 'none'; }
window.openModal = openModal; window.closeModal = closeModal;

// ---------- theme ----------
function toggleDarkMode() {
  const on = document.documentElement.classList.toggle('dark');
  document.body.classList.toggle('dark', on);
  $('themeIcon').className = on ? 'fas fa-sun' : 'fas fa-moon';
  try { localStorage.setItem('theme', on ? 'dark' : 'light'); } catch { /* ignore */ }
}
window.toggleDarkMode = toggleDarkMode;

// ---------- login / register overlay ----------
function showLogin() {
  if ($('loginOverlay')) return;
  const el = document.createElement('div');
  el.id = 'loginOverlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:5000;background:radial-gradient(circle at 20% 10%,#312e81,#020617 60%);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  el.innerHTML = `
  <div class="w-full max-w-md rounded-2xl p-8 shadow-2xl" style="background:#0f172a;border:1px solid rgba(255,255,255,.12);color:#f1f5f9">
    <div class="flex items-center gap-3 mb-5"><div class="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl"><i class="fas fa-graduation-cap"></i></div>
      <div><h1 class="text-xl font-extrabold leading-tight">Smart Campus AI</h1><p class="text-[11px] text-slate-400 font-semibold">Management & Student Assistance System</p></div></div>
    <div class="flex bg-slate-800 rounded-lg p-1 mb-4 text-sm font-bold"><button id="tabLogin" class="flex-1 py-2 rounded-md bg-indigo-600 text-white">Login</button><button id="tabRegister" class="flex-1 py-2 rounded-md text-slate-300">Register</button></div>
    <form id="authForm" class="space-y-3" autocomplete="on">
      <div id="regFields" class="hidden space-y-3">
        <input id="authName" class="form-input" placeholder="Full name (e.g. Gaurav Sharma)">
        <input id="authEmail" type="email" class="form-input" placeholder="Email address (e.g. gaurav@smartcampus.edu)">
        <div class="grid grid-cols-2 gap-2">
          <select id="authDept" class="form-input text-xs">
            <option value="Information Technology">IT (Information Tech)</option>
            <option value="Computer Science & Engineering">CSE (Computer Science)</option>
          </select>
          <select id="authSem" class="form-input text-xs">
            <option value="1" selected>Semester 1 (Freshman)</option>
            <option value="2">Semester 2 (Freshman)</option>
            <option value="3">Semester 3 (Sophomore)</option>
            <option value="4">Semester 4 (Sophomore)</option>
            <option value="5">Semester 5 (Junior)</option>
            <option value="6">Semester 6 (Junior)</option>
            <option value="7">Semester 7 (Senior)</option>
            <option value="8">Semester 8 (Senior)</option>
          </select>
        </div>
      </div>
      <input id="authId" class="form-input" placeholder="Roll number or email" value="" required>
      <input id="authPass" type="password" class="form-input" placeholder="Password (minimum 6 characters)" value="" required>
      <p id="authErr" class="text-rose-400 text-xs font-semibold min-h-[1rem]"></p>
      <button class="btn-primary w-full" id="authSubmit">Login</button>
    </form>
    <p class="text-[11px] text-slate-400 mt-4 leading-relaxed text-center">New student? Click <b>Register</b> to create your account · Admin: <b>ADMIN001</b> / <b>student123</b></p>
  </div>`;
  document.body.appendChild(el);
  let mode = 'login';
  const setMode = (m) => {
    mode = m; $('regFields').classList.toggle('hidden', m === 'login');
    $('authSubmit').textContent = m === 'login' ? 'Login' : 'Create Account';
    $('tabLogin').className = 'flex-1 py-2 rounded-md ' + (m === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-300');
    $('tabRegister').className = 'flex-1 py-2 rounded-md ' + (m === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-300');
    $('authId').placeholder = m === 'login' ? 'Roll number or email' : 'Choose Roll number (e.g. 2024CS0042)';
    $('authErr').textContent = '';
  };
  $('tabLogin').onclick = () => setMode('login'); $('tabRegister').onclick = () => setMode('register');
  $('authForm').onsubmit = async (e) => {
    e.preventDefault(); $('authErr').textContent = ''; $('authErr').className = 'text-rose-400 text-xs font-semibold min-h-[1rem]';
    try {
      if (mode === 'register') {
        const body = {
          name: val('authName'),
          email: val('authEmail'),
          roll_no: val('authId'),
          password: $('authPass').value,
          dept: $('authDept')?.value || 'Computer Science & Engineering',
          semester: Number($('authSem')?.value || 1)
        };
        if (!body.name || !body.email || !body.roll_no || !body.password) {
          $('authErr').textContent = 'Please fill in name, email, roll number, and password.';
          return;
        }
        if (body.password.length < 6) {
          $('authErr').textContent = 'Password must be at least 6 characters.';
          return;
        }

        const regRes = await api('/auth/register', { body, noAuthRedirect: true });
        if (regRes.token) {
          localStorage.setItem('token', regRes.token);
          toast(`Account created successfully! Welcome, ${regRes.user?.name || body.name}!`, 'ok');
          el.remove();
          boot();
          return;
        }
      }

      const body = { id: val('authId'), password: $('authPass').value };
      const data = await api('/auth/login', { body, noAuthRedirect: true });
      localStorage.setItem('token', data.token); el.remove();
      if (data.user?.role === 'admin' || data.user?.role === 'super_admin') {
        window.location.href = '/admin.html';
        return;
      }
      boot();
    } catch (err) { $('authErr').textContent = err.message; }
  };
}

function logout() { try { localStorage.removeItem('token'); } catch { /* ignore */ } location.reload(); }

// ---------- navigation ----------
function showSection(id) {
  document.querySelectorAll('.content-section').forEach((s) => s.classList.add('hidden'));
  const sec = $(id); if (!sec) return;
  sec.classList.remove('hidden');
  document.querySelectorAll('.sidebar-item').forEach((a) => {
    const target = a.dataset.sec || a.getAttribute('data-sec');
    const on = (target === id) || (a.getAttribute('onclick') || '').includes(`'${id}'`);
    a.classList.toggle('active', !!on);
  });
  document.body.classList.remove('nav-open');
  try { history.replaceState(null, '', '#' + id); } catch { /* ignore */ }
  window.scrollTo({ top: 0 });
  const fn = window.loaders[id];
  if (fn) act(fn, false);
}
window.showSection = showSection;

// ---------- boot ----------
let me = null, socket = null;
async function boot() {
  if (!token()) return showLogin();
  try { me = await api('/auth/me'); } catch { return; }
  $('studentName').textContent = me.name;
  const topName = $('topHeaderStudentName'); if (topName) topName.textContent = me.name ? me.name.split(' ')[0] : 'Profile';
  const cohortBadge = $('studentCohortBadge');
  if (cohortBadge) {
    cohortBadge.textContent = (me.role === 'admin' || me.role === 'super_admin') ? 'Administrator' : ('Year ' + (me.year || 1) + ' • Sem ' + (me.semester || 1));
  }
  syncDoubtSolverSubjects();
  if (me.role === 'admin' || me.role === 'super_admin') {
    const adminShortcut = $('adminShortcutContainer');
    if (adminShortcut) {
      adminShortcut.classList.remove('hidden');
    }
  }
  const g = $('gamificationStatus'); g.classList.remove('hidden');
  $('studentLevel').textContent = me.level; $('studentXP').textContent = me.xp; $('xpBar').style.width = me.progress + '%';
  try { if (typeof io !== 'undefined' && !socket) { socket = io({ auth: { token: token() } }); socket.on('chat:message', onChatSocket); } } catch { /* offline ok */ }
  startClock();
  const start = (location.hash || '#dashboard').slice(1);
  showSection($(start) ? start : 'dashboard');
}
let clockOffset = 0;
async function startClock() {
  try { const t = await api('/time'); clockOffset = new Date(t.now) - Date.now(); } catch { /* ignore */ }
  const tick = () => { $('serverTime').textContent = new Date(Date.now() + clockOffset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  tick(); setInterval(tick, 1000);
}

// ---------- universal search ----------
let searchTimer;
function performUniversalSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = val('universalSearchInput'), box = $('universalSearchResults');
    if (q.length < 2) return box.classList.add('hidden');
    try {
      const r = await api('/search?q=' + encodeURIComponent(q));
      box.innerHTML = r.length ? r.map((x) => `<button type="button" class="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b text-sm" data-sec="${esc(x.section)}"><span class="text-[10px] font-black uppercase text-indigo-500">${esc(x.type)}</span><br>${esc(x.title)}</button>`).join('')
        : '<p class="p-4 text-sm text-gray-400">No results</p>';
      box.classList.remove('hidden');
      box.querySelectorAll('button').forEach((b) => b.onclick = () => { box.classList.add('hidden'); $('universalSearchInput').value = ''; showSection(b.dataset.sec); });
    } catch { /* ignore */ }
  }, 250);
}
window.performUniversalSearch = performUniversalSearch;
document.addEventListener('click', (e) => { if (!e.target.closest('#universalSearchResults, #universalSearchInput')) $('universalSearchResults')?.classList.add('hidden'); });

// ---------- dashboard ----------
const charts = {};
function chart(id, cfg) {
  if (typeof Chart === 'undefined' || !$(id)) return;
  charts[id]?.destroy();
  Chart.defaults.color = '#94a3b8';
  charts[id] = new Chart($(id), cfg);
}
window.loaders.dashboard = async function () {
  const d = await api('/dashboard');
  $('welcomeTitle').textContent = `Welcome back, ${d.user.name.split(' ')[0]}!`;
  $('studentXP').textContent = d.user.xp; $('studentLevel').textContent = d.user.level; $('xpBar').style.width = d.user.progress + '%';
  const s = d.stats;
  $('attendanceRate').textContent = s.attendance + '%';
  const bar = $('attendanceRate').parentElement.querySelector('.bg-white.rounded-full'); if (bar) bar.style.width = Math.min(100, s.attendance) + '%';
  $('avgMarks').textContent = s.avgMarks + '%';
  $('avgMarksBadge').textContent = s.avgMarks >= 75 ? 'EXCELLENT' : s.avgMarks >= 60 ? 'GOOD' : 'NEEDS FOCUS';
  $('completedAssignments').textContent = `${s.assignmentsDone}/${s.assignmentsTotal}`;
  $('pendingTasks').textContent = s.pending;
  $('pendingHint').textContent = s.pending ? 'Clear them this week' : 'All caught up';
  $('backlogRisk').textContent = d.risk.level;
  $('riskText').textContent = `AI Prediction: ${d.risk.probability}% probability of backlogs this semester.` + (d.risk.drivers.length ? ` Factors: ${d.risk.drivers.join(', ')}.` : ' No risk factors detected.');
  $('attendanceForecast').textContent = d.forecast.projected + '%';
  $('forecastText').textContent = d.forecast.mustAttend ? `Attend the next ${d.forecast.mustAttend} classes to reach 75%.` : `On track to finish at ${d.forecast.projected}%. You can miss up to ${d.forecast.canMiss} classes.`;
  // 75% rule card
  const bad = d.rule.filter((r) => !r.ok);
  const badge = $('attendanceRuleBadge'); badge.textContent = bad.length ? `${bad.length} AT RISK` : 'ALL SAFE';
  badge.className = 'text-[10px] font-black px-2 py-1 rounded-full ' + (bad.length ? tone.red : tone.green);
  $('attendanceRuleBody').innerHTML = d.rule.map((r) => `<div class="flex items-center justify-between gap-2"><span class="truncate">${esc(r.name)}</span><span class="font-bold ${r.ok ? 'text-emerald-600' : 'text-rose-600'}">${r.pct}%${r.ok ? '' : ` · attend ${r.mustAttend}`}</span></div>`).join('');
  $('notificationList').innerHTML = d.notifications.length ? d.notifications.map((n) => `<div class="text-sm border-l-4 ${/warn|risk|fee/.test(n.type) ? 'border-amber-400' : 'border-indigo-400'} pl-3"><p>${esc(n.message)}</p><p class="text-[10px] text-gray-400 mt-0.5">${esc(n.created_at)}</p></div>`).join('') : empty('No notifications');
  $('recommendationList').innerHTML = d.recommendations.map((r) => `<div class="flex gap-3 text-sm items-start"><i class="fas ${r.icon} text-indigo-500 mt-1"></i><p>${esc(r.text)}</p></div>`).join('');
  const slot = (x) => `<div class="flex justify-between gap-2 text-xs bg-gray-50 rounded-lg p-2"><b>${esc(x.subject)}</b><span class="text-gray-500">${esc(x.room)}</span></div>`;
  $('routineToday').innerHTML = d.routine.today.length ? d.routine.today.map(slot).join('') : '<p class="text-gray-400 text-xs">No classes today. Use the time to revise.</p>';
  $('routineWeek').innerHTML = d.routine.week.map((w) => `<div><p class="text-[10px] font-black uppercase text-gray-400">${w.day}</p>${w.slots.map(slot).join('')}</div>`).join('');
  // charts
  const labels = [...d.trend.labels, 'Forecast'];
  chart('attendanceChart', { type: 'line', data: { labels, datasets: [
    { label: 'Attendance %', data: [...d.trend.data, null], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.15)', fill: true, tension: .35 },
    { label: 'AI forecast', data: [...d.trend.data.map(() => null).slice(0, -1), d.trend.data.at(-1), d.forecast.projected], borderColor: '#10b981', borderDash: [6, 5], tension: .35 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,.15)' } }, x: { grid: { display: false } } } } });
  chart('performanceChart', { type: 'bar', data: { labels: d.performance.labels, datasets: [{ label: 'Internal marks %', data: d.performance.data, backgroundColor: d.performance.data.map((v) => (v >= 70 ? '#10b981' : v >= 55 ? '#f59e0b' : '#f43f5e')), borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { title: (i) => d.performance.names[i[0].dataIndex] } } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,.15)' } }, x: { grid: { display: false } } } } });
};
window.submitSelfAttendance = () => act(async () => { const r = await api('/attendance/mark', { method: 'POST' }); window.loaders.dashboard?.(); window.loaders['attendance-hub']?.(); return r; });

// ---------- leave ----------
window.openLeaveModal = () => openModal('leaveModal');
window.submitLeaveForm = () => act(async () => {
  const r = await api('/leaves', { body: { from: val('leaveFrom'), to: val('leaveTo'), reason: val('leaveReason') } });
  closeModal('leaveModal'); window.loaders.dashboard?.(); return r;
});

// ---------- academics: fees / scholarships / results ----------
function switchAcademicsTab(tab) {
  ['overview', 'fees', 'scholarships', 'results'].forEach((t) => {
    $('acadTab-' + t)?.classList.toggle('hidden', t !== tab);
    const btn = $('acadTabBtn-' + t);
    if (btn) btn.className = 'px-4 py-2 rounded-lg font-bold text-xs transition ' + (t === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600');
  });
  if (tab === 'results') loadResults();
  if (tab === 'overview') loadAcademicOverview();
}
window.switchAcademicsTab = switchAcademicsTab;
window.loaders.academics = async function () {
  await Promise.all([loadFees(), loadScholarships(), loadAcademicOverview()]);
};
async function loadAcademicOverview() {
  if (typeof me !== 'undefined' && me) {
    $('acadProfileName').textContent = me.name || '—';
    $('acadProfileRoll').textContent = me.roll_no || '—';
    $('acadProfileDept').textContent = me.dept || '—';
    $('acadProfileSemester').textContent = me.semester ? 'Semester ' + me.semester : '—';
    $('acadProfileYear').textContent = me.year ? 'Year ' + me.year : '—';
    $('acadProfileEmail').textContent = me.email || '—';
  }
  const sem = (typeof me !== 'undefined' && me?.semester) || 5;
  const data = await api('/curriculum?sem=' + encodeURIComponent(sem));
  $('acadSubjectSemester').textContent = 'Semester ' + sem;
  $('acadOverviewCgpa').textContent = Number(data.cgpa || 0).toFixed(2);
  $('acadOverviewCredits').textContent = data.credits ?? 0;
  $('acadOverviewBacklogs').textContent = data.backlogs ?? 0;
  $('acadSubjectsBody').innerHTML = data.subjects.length ? data.subjects.map((s) =>
    `<tr class="border-b"><td class="p-3 font-mono text-xs font-bold">${esc(s.code)}</td><td class="p-3 font-semibold">${esc(s.name)}</td><td class="p-3">${s.credits}</td><td class="p-3">${esc(s.category || 'Core')}</td><td class="p-3">${s.grade ? pill(s.grade, statusTone(s.grade)) : '<span class="text-gray-400">In progress</span>'}</td></tr>`
  ).join('') : '<tr><td colspan="5" class="p-4 text-center text-gray-400">No subjects found for this semester.</td></tr>';
}
async function loadFees() {
  const f = await api('/fees');
  const totals = f.totals || {};
  $('hubFeeSemesters').innerHTML = f.semesters.map((s) =>
    `<tr><td class="p-3 font-bold">Semester ${s.semester}</td><td class="p-3">${inr(s.assessed)}</td><td class="p-3">${inr(s.paid)}</td><td class="p-3 font-bold ${s.due ? 'text-rose-600' : ''}">${inr(s.due)}</td><td class="p-3">${pill(s.due ? 'Due' : 'Paid', s.due ? 'red' : 'green')}</td></tr>`
  ).join('');
  $('hubPayAmount').value = totals.due || '';
  $('hubPayAmount').placeholder = totals.due ? 'Enter amount up to ' + inr(totals.due) : 'No dues';
  if ($('feeOutstandingTotal')) {
    $('feeOutstandingTotal').textContent = inr(totals.due);
    $('feeOutstandingHint').textContent = totals.due > 0 ? 'Payment pending across your semesters' : 'No outstanding fee dues';
    $('feeOutstandingTotal').className = 'text-4xl font-black my-3 ' + (totals.due > 0 ? 'text-rose-600' : 'text-emerald-600');
    $('feeTotalAssessed').textContent = inr(totals.assessed);
    $('feeTotalPaid').textContent = inr(totals.paid);
    $('feeScholarshipCredit').textContent = inr(totals.scholarship);
    $('feeRemainingBalance').textContent = inr(totals.due);
  }
  if ($('hubFeeLedger')) {
    $('hubFeeLedger').innerHTML = f.semesters.length ? f.semesters.map((s) => {
      const balance = Number(s.due || 0);
      const status = balance <= 0 ? 'Paid' : (Number(s.paid || 0) > 0 ? 'Partially Paid' : 'Pending');
      const badge = balance <= 0 ? 'green' : (Number(s.paid || 0) > 0 ? 'amber' : 'red');
      return `<tr><td class="p-3 font-bold">INV-SEM-${String(s.semester).padStart(2, '0')}</td><td class="p-3">Semester ${s.semester} Fee</td><td class="p-3 text-gray-400">Not specified</td><td class="p-3">${inr(s.assessed)}</td><td class="p-3">${inr(s.paid)}</td><td class="p-3 font-bold ${balance ? 'text-rose-600' : 'text-emerald-600'}">${inr(balance)}</td><td class="p-3">${pill(status, badge)}</td></tr>`;
    }).join('') : '<tr><td colspan="7" class="p-4 text-center text-gray-400">No fee records found.</td></tr>';
  }
  $('hubFeeReceipts').innerHTML = f.receipts.length ? f.receipts.map((r) =>
    `<tr><td class="p-3 font-bold">${esc(r.no)}</td><td class="p-3">${inr(r.amount)}</td><td class="p-3">${fdate(r.date)}</td><td class="p-3 text-xs">${esc(r.txn)}</td><td class="p-3">${pill(r.status, 'green')}</td><td class="p-3 text-right"><button class="text-indigo-600 font-bold text-xs" onclick='printReceipt(${JSON.stringify(r).replace(/'/g, '&#39;')})'><i class="fas fa-download mr-1"></i>Receipt</button></td></tr>`
  ).join('') : '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">No receipts generated yet.</td></tr>';
  if ($('feeAssessed')) {
    $('feeAssessed').textContent = inr(totals.assessed);
    $('feePaid').textContent = inr(totals.paid);
    $('feeDues').textContent = inr(totals.due);
    $('feeScholarship').textContent = inr(totals.scholarship);
  }
}
window.loaders.fees = loadFees;
window.payFeeFromHub = () => act(async () => { const r = await api('/fees/pay', { body: { amount: val('hubPayAmount') } }); await loadFees(); return r; });
window.printReceipt = (r) => printHtml('Fee Receipt ' + r.no, `<h2 style="color:#4f46e5">Smart Campus AI · Fee Receipt</h2><table style="width:100%;font-size:14px;line-height:2"><tr><td>Receipt No</td><td><b>${esc(r.no)}</b></td></tr><tr><td>Student</td><td>${esc(me?.name)} (${esc(me?.roll_no)})</td></tr><tr><td>Amount</td><td><b>${inr(r.amount)}</b></td></tr><tr><td>Date</td><td>${fdate(r.date)}</td></tr><tr><td>Transaction</td><td>${esc(r.txn)}</td></tr><tr><td>Status</td><td>${esc(r.status)}</td></tr></table>`);
function printHtml(title, html) {
  const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to download.', 'err');
  w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><link rel="stylesheet" href="${location.origin}/vendor/tailwind.css"><link rel="stylesheet" href="${location.origin}/vendor/font-awesome/css/all.min.css"><style>body{font-family:system-ui,sans-serif;padding:32px;color:#111;background:#fff}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}</style></head><body>${html}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
  w.document.close();
}
window.printHtml = printHtml;

async function loadScholarships() {
  const list = await api('/scholarships');
  $('hubScholarshipsList').innerHTML = list.length ? list.map((a) => `<tr><td class="p-3 font-bold">${esc(a.scheme)}</td><td class="p-3">${inr(a.amount)}</td><td class="p-3">${fdate(a.date)}</td><td class="p-3">${pill(a.status, statusTone(a.status))}</td><td class="p-3 text-xs text-gray-500">${esc(a.remarks)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">No scholarship applications on record.</td></tr>';
}
window.openScholarshipModal = async () => {
  openModal('scholarshipApplyModal');
  try { const c = await api('/ai/cgpa'); if (c.recorded.cgpa && !val('scholarshipModalGpa')) $('scholarshipModalGpa').value = c.recorded.cgpa.toFixed(2); } catch { /* ignore */ }
};
window.quickApplyScholarship = (scheme) => {
  const map = { 'Financial Need & EWS Aid': 'Need-Based Financial Aid', 'Women in STEM Excellence': 'Women in STEM & Diversity Grant' };
  $('scholarshipModalScheme').value = map[scheme] || scheme; window.openScholarshipModal();
};
window.submitScholarshipApplication = () => act(async () => {
  const r = await api('/scholarships/apply', { body: { scheme: val('scholarshipModalScheme'), gpa: val('scholarshipModalGpa'), income: val('scholarshipModalIncome'), reason: val('scholarshipModalReason') } });
  closeModal('scholarshipApplyModal'); await loadScholarships(); return r;
});
async function loadResults() {
  const r = await api('/results');
  $('repStudentName').textContent = r.student; $('repRollNo').textContent = r.roll; $('repDept').textContent = r.dept; $('repSession').textContent = r.session;
  $('repGradesBody').innerHTML = r.rows.map((x) => `<tr class="border-b"><td class="p-3 font-bold">${esc(x.code)}</td><td class="p-3">${esc(x.name)}</td><td class="p-3">${x.credits}</td><td class="p-3">${x.internal}</td><td class="p-3">${x.endsem}</td><td class="p-3 font-bold">${x.total}</td><td class="p-3 font-black text-indigo-600">${x.grade}</td><td class="p-3">${x.gp}</td><td class="p-3">${pill(x.status, x.status === 'PASS' ? 'green' : 'red')}</td></tr>`).join('');
  $('repTotalCredits').textContent = r.credits; $('repSgpa').textContent = r.sgpa.toFixed(2); $('repCgpa').textContent = (r.cgpa ?? 0).toFixed(2);
  const st = $('printableMarksheet').querySelector('span.uppercase:last-of-type, .rounded-full:last-of-type'); if (st && /CLASS|PASS/i.test(st.textContent)) st.textContent = r.standing;
}
window.downloadResultReportPDF = () => printHtml('Marksheet', $('printableMarksheet').outerHTML);

// ---------- attendance hub ----------
window['loaders']['attendance-hub'] = async function () {
  const a = await api('/attendance'), o = a.overall;
  $('hubAttPercent').textContent = o.pct + '%'; $('hubAttCircle').setAttribute('stroke-dasharray', `${Math.min(100, o.pct)}, 100`);
  $('hubAttCircle').setAttribute('class', o.pct >= 75 ? 'text-emerald-500' : 'text-rose-500');
  $('hubTotalAttended').textContent = o.attended; $('hubTotalClasses').textContent = o.total; $('hubAbsent').textContent = o.absent; $('hubLeaveDays').textContent = o.leaveDays + ' days';
  const safe = o.pct >= 75; const b = $('hubComplianceBadge'); b.textContent = safe ? 'Compliance Safe' : 'Shortage Risk';
  b.className = 'px-2 py-0.5 rounded font-black text-[10px] uppercase ' + (safe ? tone.green : tone.red);
  $('hubComplianceText').textContent = safe ? 'Above the mandatory 75% university examination threshold.' : 'Below the mandatory 75% threshold. You may be barred from exams.';
  $('hubBunkSummary').innerHTML = a.plan.mustAttend ? `Attend the next <strong>${a.plan.mustAttend} classes</strong> without a miss to reach 75%.` : `You can safely miss up to <strong>${a.plan.canMiss} more classes</strong> and remain above 75%.`;
  const worst = [...a.subjects].sort((x, y) => x.pct - y.pct)[0]; if (worst) $('hubTip').textContent = `Tip: Keep ${worst.name} attended this week.`;
  $('hubSubjectAttendance').innerHTML = a.subjects.map((s) => `<tr class="border-b"><td class="p-3 font-bold">${esc(s.code)}</td><td class="p-3">${esc(s.name)}</td><td class="p-3">${s.attended}</td><td class="p-3">${s.total}</td>
    <td class="p-3"><div class="h-2 w-28 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${s.pct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width:${Math.min(100, s.pct)}%"></div></div></td>
    <td class="p-3 font-bold">${s.pct}%</td><td class="p-3">${pill(s.pct >= 75 ? `Safe · can miss ${s.canMiss}` : `Attend ${s.mustAttend}`, s.pct >= 75 ? 'green' : 'red')}</td></tr>`).join('');
};

// ---------- counselling & wellness ----------
window.prefillCounselor = (name) => { $('counselorSelect').value = name; $('counselDate').focus(); };
window.loaders.counseling = async function () {
  const d = await api('/counseling');
  $('counselingAppointmentsList').innerHTML = d.appointments.length ? d.appointments.map((a) => `<div class="border rounded-xl p-3 mb-2 text-sm"><div class="flex justify-between"><b>${esc(a.counselor)}</b>${pill(a.status, 'green')}</div><p class="text-xs text-gray-500">${esc(a.category)} · ${esc(String(a.date).replace('T', ' '))}</p>${a.notes ? `<p class="text-xs mt-1">${esc(a.notes)}</p>` : ''}</div>`).join('') : empty('No appointments yet.');
};
window.loadCounselingData = () => act(window.loaders.counseling, false);
window.bookCounselingSession = () => act(async () => { const r = await api('/counseling', { body: { category: val('counselCategory'), counselor: val('counselorSelect'), date: val('counselDate'), notes: val('counselNotes') } }); $('counselNotes').value = ''; await window.loaders.counseling(); return r; });
window.saveWellnessLog = () => act(() => api('/wellness', { body: { sleep: val('sleepSlider'), stress: val('stressSlider'), focus: val('focusSlider') } }));

// ---------- community chat ----------
let chatChannel = 'general';
const chatNames = { general: 'general-lounge', 'study-group': 'study-group-cse', projects: 'project-collab', doubts: 'doubt-clearing' };
function chatBubble(m) {
  const mine = me && m.user_id === me.id;
  return `<div class="flex ${mine ? 'justify-end' : ''} mb-2"><div class="max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}"><p class="text-[10px] font-black opacity-70">${esc(m.name)}</p><p>${esc(m.message)}</p></div></div>`;
}
async function loadChat() {
  const msgs = await api('/chat/' + chatChannel), box = $('chatMessagesStream');
  box.innerHTML = msgs.map(chatBubble).join('') || empty('No messages yet. Say hello!'); box.scrollTop = box.scrollHeight;
}
function onChatSocket(m) { if (m.channel !== chatChannel) return; const box = $('chatMessagesStream'); box.insertAdjacentHTML('beforeend', chatBubble(m)); box.scrollTop = box.scrollHeight; }
window.switchChatChannel = (ch) => {
  chatChannel = ch; $('activeChatChannelTitle').textContent = chatNames[ch];
  $('chatInputMessage').placeholder = `Type message in #${chatNames[ch]}... (Press Enter to send)`;
  Object.keys(chatNames).forEach((c) => $('chatChan-' + c).classList.toggle('bg-indigo-100', c === ch));
  loadChat();
};
window.loaders['group-chat'] = () => window.switchChatChannel(chatChannel);
window.sendChatMessage = async () => { const t = val('chatInputMessage'); if (!t) return; $('chatInputMessage').value = ''; await act(() => api('/chat/' + chatChannel, { body: { message: t } }), false); };
window.insertChatEmoji = (e) => { $('chatInputMessage').value += e; $('chatInputMessage').focus(); };

// ---------- syllabus (enrolled semester only) ----------
let syl = null;
window.loaders['syllabus-roadmap'] = async function () {
  syl = await api('/syllabus');
  const userSem = (me && me.semester) ? me.semester : (syl.enrolledSem || 1);
  const badge = $('roadmapActiveYearBadge');
  if (badge) badge.textContent = 'Enrolled: Semester ' + userSem;
  const dept = $('roadmapDeptLabel');
  if (dept) dept.textContent = syl.dept || 'Engineering';

  const totalCredits = (syl.semesters || []).reduce((acc, s) => acc + (s.subjects || []).reduce((c, x) => c + x.credits, 0), 0);
  const progTotal = $('roadmapProgramTotal');
  if (progTotal) progTotal.textContent = `${totalCredits} Credits · Semester ${userSem}`;

  const container = $('syllabusSemestersContainer');
  if (!container) return;

  if (!syl.semesters || !syl.semesters.length) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border"><p class="text-sm font-semibold">No syllabus records found for Semester ${userSem}.</p></div>`;
    return;
  }

  container.innerHTML = syl.semesters.map((s) => `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5 gap-3">
        <div>
          <h4 class="font-extrabold text-slate-800 dark:text-white text-lg">Semester ${s.sem} Curriculum</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400">Official university accredited syllabus, modules, and evaluation schemes.</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 self-start sm:self-auto">
          ${s.subjects.reduce((acc, z) => acc + z.credits, 0)} Total Credits · ${s.subjects.length} Courses
        </span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${s.subjects.map((x) => `
          <button type="button" class="text-left border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition bg-slate-50/50 dark:bg-slate-800/40 group cursor-pointer" onclick="openSyllabusModal(${x.id})">
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">${esc(x.code)}</span>
              ${pill(x.category, x.category === 'Core' ? 'blue' : 'gray')}
            </div>
            <p class="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-500 transition line-clamp-1">${esc(x.name)}</p>
            <div class="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <span>${x.credits} Credits</span>
              <span>${x.modules ? x.modules.length : 5} Units <i class="fas fa-chevron-right ml-1 text-[10px] text-slate-400"></i></span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
};

window.filterSyllabusYear = () => { if (window.loaders['syllabus-roadmap']) window.loaders['syllabus-roadmap'](); };
window.openSyllabusModal = (id) => {
  const sub = (syl?.semesters || []).flatMap((s) => s.subjects).find((x) => x.id === id);
  if (!sub) return;
  $('modalSubCode').textContent = sub.code;
  $('modalSubCredits').textContent = sub.credits + ' Credits';
  $('modalSubCategory').textContent = sub.category;
  $('modalSubTitle').textContent = sub.name;
  $('modalSubPrereq').innerHTML = `<i class="fas fa-link mr-1"></i> Prerequisite: ${esc(sub.prereq || 'None')}`;
  $('modalModulesList').innerHTML = (sub.modules || []).map((m, i) => `
    <div class="flex gap-3 p-3 border rounded-xl mb-2 text-sm bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
      <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-black flex items-center justify-center shrink-0">${i + 1}</span>
      <span class="text-slate-700 dark:text-slate-200">${esc(m)}</span>
    </div>
  `).join('');
  openModal('syllabusModal');
};
window.closeSyllabusModal = () => closeModal('syllabusModal');
async function loadTimeline(type) {
  const ev = await api('/calendar?days=120'), icons = { exam: 'fa-file-pen', assignment: 'fa-diagram-project', class: 'fa-chalkboard', meeting: 'fa-trophy' };
  const list = ev.filter((e) => type === 'all' || e.type === type);
  $('roadmapEventsList').innerHTML = list.length ? list.map((e) => `<div class="flex items-center gap-4 p-4 border rounded-xl mb-2 bg-white"><div class="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><i class="fas ${icons[e.type] || 'fa-calendar'}"></i></div><div class="flex-1"><p class="font-bold text-sm">${esc(e.title)}</p><p class="text-xs text-gray-400">${fdate(e.date)}</p></div>${pill(e.type, 'blue')}</div>`).join('') : empty('No events.');
}
window.filterCalendarTimeline = (type, btn) => { btn?.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('bg-indigo-600', 'text-white')); btn?.classList.add('bg-indigo-600', 'text-white'); loadTimeline(type); };
// =========================================================================
// COMPREHENSIVE ANNUAL ACADEMIC CALENDAR & INSTITUTIONAL WORKING MECHANISM
// =========================================================================
let calState = {
  selectedYear: 2,
  enrolledYear: 2,
  selectedTerm: 'all', // 'all', 'odd', 'even'
  currentMonth: new Date(2026, 10, 1), // Nov 2026
  selectedDate: '2026-11-08',
  activeView: 'month', // 'month', 'year', 'agenda'
  activeCategory: 'all', // 'all', 'class', 'exam', 'assignment', 'holiday', 'placement'
  compactMechanism: false,
  data: null,
  modalEvent: null
};

const CAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function fdateFull(dStr) {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length < 3) return dStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]}, ${CAL_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

window.loaders['academic-calendar'] = window.loadAcademicCalendar = async function (preferredYear, preferredSem) {
  const userYear = Number(me?.year) || 1;
  const userSem = Number(me?.semester) || 1;
  calState.enrolledYear = userYear;
  calState.selectedYear = userYear;

  // Set today if in 2026/2027 or default to 2026-11-08
  const t = today();
  if (t && (t.startsWith('2026') || t.startsWith('2027'))) {
    calState.selectedDate = t;
    const [yStr, mStr] = t.split('-');
    calState.currentMonth = new Date(Number(yStr), Number(mStr) - 1, 1);
  } else {
    calState.selectedDate = '2026-11-08';
    calState.currentMonth = new Date(2026, 10, 1);
  }

  // Update enrolled year badge in header
  const enBadge = $('calEnrolledYearBadge');
  if (enBadge) {
    enBadge.textContent = `Enrolled: Year ${calState.enrolledYear} (Sem ${userSem})`;
  }

  // Update Year Cards active styling (locks strictly to enrolled year card)
  updateYearCardsUI();
  try {
    const semParam = calState.selectedTerm === 'odd' ? (calState.selectedYear * 2 - 1) : (calState.selectedTerm === 'even' ? (calState.selectedYear * 2) : 4);
    const res = await api(`/calendar/annual?year=${calState.selectedYear}&sem=${semParam}`);
    calState.data = res;

    // Render all components
    renderCalendarKpis();
    renderWorkingMechanismPipeline();
    renderCalendarMonthGrid();
    renderCalendarYearMatrix();
    renderCalendarAgenda();
    window.selectCalendarDate(calState.selectedDate || '2026-11-11');
    renderUpcomingDeadlines();
  } catch (err) {
    console.error('Failed to load annual calendar:', err);
    toast('Error loading academic calendar schedule.', 'error');
  }
};

function updateYearCardsUI() {
  const enYear = Number(me?.year) || calState.enrolledYear || 1;
  const enSem = Number(me?.semester) || (enYear * 2 - 1);
  calState.enrolledYear = enYear;
  calState.selectedYear = enYear;

  const cohortTitles = {
    1: '1st Year Engineering (Freshmen)',
    2: '2nd Year Engineering (Sophomore)',
    3: '3rd Year Engineering (Junior)',
    4: '4th Year Engineering (Senior)'
  };

  const titleEl = $('calEnrolledCohortTitle');
  if (titleEl) titleEl.textContent = cohortTitles[enYear] || `Year ${enYear} Engineering`;

  const yearNumEl = $('calEnrolledYearNum');
  if (yearNumEl) yearNumEl.textContent = enYear;

  const semNumEl = $('calEnrolledSemNum');
  if (semNumEl) semNumEl.textContent = `Semester ${enSem}`;

  const enBadge = $('calEnrolledYearBadge');
  if (enBadge) enBadge.textContent = `Enrolled: Year ${enYear} (Sem ${enSem})`;

  // SHOW ONLY THE ENROLLED YEAR CARD - HIDE ALL OTHER 3 YEARS
  for (let y = 1; y <= 4; y++) {
    const card = $(`calYearCard-${y}`);
    const tag = $(`calEnrolledTag-${y}`);
    if (card) {
      if (y === enYear) {
        card.classList.remove('hidden');
        card.classList.add('border-indigo-600', 'bg-indigo-50/70', 'dark:bg-indigo-950/60', 'ring-2', 'ring-indigo-500/20', 'shadow-md');
        card.classList.remove('cursor-pointer', 'hover:border-indigo-400');
        card.style.pointerEvents = 'none'; // Lock card, cannot click to toggle
        if (tag) tag.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    }
  }
}

window.switchCalendarYear = async function (year) {
  // Calendar is strictly locked to enrolled cohort
  if (Number(year) !== calState.enrolledYear) {
    if (typeof toast === 'function') {
      toast(`Academic Calendar is locked to your enrolled Year ${calState.enrolledYear}.`, 'info');
    }
    return;
  }
  await window.loadAcademicCalendar(calState.enrolledYear);
};

window.switchCalendarTerm = function (term) {
  calState.selectedTerm = term;
  document.querySelectorAll('.cal-scope-pill').forEach(btn => {
    btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-400', 'shadow-sm');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
  });
  const activeBtn = $(`calScope-${term}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-400', 'shadow-sm');
    activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
  }

  // Auto jump month according to term
  if (term === 'odd') {
    calState.currentMonth = new Date(2026, 10, 1); // Nov 2026
  } else if (term === 'even') {
    calState.currentMonth = new Date(2027, 2, 1); // Mar 2027
  }
  renderCalendarMonthGrid();
  renderCalendarAgenda();
};
function renderWorkingMechanismPipeline() {
  const container = $('calMechanismPipeline');
  if (!container || !calState.data || !calState.data.mechanism) return;

  const mech = calState.data.mechanism;
  const hTitle = $('calMechanismHeaderTitle');
  if (hTitle) hTitle.textContent = `Institutional Working Mechanism: ${mech.title}`;

  const hDesc = $('calMechanismHeaderDesc');
  if (hDesc) hDesc.textContent = mech.description;

  const stages = mech.stages || [];
  container.innerHTML = stages.map((st) => {
    let statusClass = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80';
    let badgeClass = 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    let icon = 'fa-clock';

    if (st.status === 'Completed') {
      statusClass = 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20';
      badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
      icon = 'fa-circle-check';
    } else if (st.status === 'In Progress') {
      statusClass = 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md';
      badgeClass = 'bg-indigo-600 text-white animate-pulse';
      icon = 'fa-spinner fa-spin';
    }

    return `
      <div class="p-4 rounded-xl border transition-all ${statusClass} flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black uppercase text-slate-400">Stage ${String(st.stageNumber).padStart(2, '0')}</span>
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeClass} flex items-center gap-1">
              <i class="fas ${icon} text-[8px]"></i> ${esc(st.status)}
            </span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">${esc(st.title)}</h4>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed line-clamp-3">${esc(st.details)}</p>
        </div>
        <div class="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] space-y-1">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span><i class="fas fa-calendar text-indigo-500 mr-1"></i> ${esc(st.period)}</span>
          </div>
          <div class="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400">
            <span>${esc(st.instructionalDays)}</span>
            <span>${esc(st.targetSyllabus)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleMechanismView = function () {
  calState.compactMechanism = !calState.compactMechanism;
  const container = $('calMechanismPipeline');
  const txt = $('calMechToggleText');
  const icon = $('calMechToggleIcon');
  if (container) {
    if (calState.compactMechanism) {
      container.classList.add('hidden');
      if (txt) txt.textContent = 'Expand Roadmap';
      if (icon) icon.className = 'fas fa-chevron-down';
    } else {
      container.classList.remove('hidden');
      if (txt) txt.textContent = 'Compact View';
      if (icon) icon.className = 'fas fa-list-check';
    }
  }
};

function getCustomCalendarTasks(dateStr) {
  try {
    const all = JSON.parse(localStorage.getItem('smartcampus_calendar_tasks') || '[]');
    return dateStr ? all.filter(t => t.date === dateStr) : all;
  } catch {
    return [];
  }
}

function saveCustomCalendarTask(task) {
  try {
    const all = getCustomCalendarTasks();
    all.push(task);
    localStorage.setItem('smartcampus_calendar_tasks', JSON.stringify(all));
  } catch (e) {
    console.error(e);
  }
}

function removeCustomCalendarTask(id) {
  try {
    let all = getCustomCalendarTasks();
    all = all.filter(t => t.id !== id);
    localStorage.setItem('smartcampus_calendar_tasks', JSON.stringify(all));
  } catch (e) {
    console.error(e);
  }
}

function renderPriorityBadge(p) {
  if (p === 'high') {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200"><span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>High load</span>`;
  }
  if (p === 'low') {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>Low</span>`;
  }
  return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>Medium</span>`;
}

function renderCalendarMonthGrid() {
  const grid = $('calMonthGrid');
  if (!grid || !calState.data) return;

  const cur = calState.currentMonth;
  const year = cur.getFullYear();
  const month = cur.getMonth();

  const titleEl = $('calCurrentMonthTitle');
  if (titleEl) titleEl.textContent = `${CAL_MONTHS[month]} ${year}`;

  const jumpSel = $('calMonthJumpSelect');
  if (jumpSel) jumpSel.value = `${year}-${String(month + 1).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 is Sunday
  const shiftIndex = (firstDayWeekday + 6) % 7; // Mon=0, Sun=6
  const prevMonthDays = new Date(year, month, 0).getDate();

  const allEvents = calState.data.events || [];
  const eventsByDate = {};
  allEvents.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let html = '';

  // 1. Previous month trailing days (e.g. 26..31 for Nov 2026)
  for (let i = shiftIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    html += `
      <div class="w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-medium text-slate-300 text-xs select-none">
        ${dNum}
      </div>
    `;
  }

  // 2. Days of the current month (1..daysInMonth)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = (calState.selectedDate === dateStr);
    const isToday = (dateStr === todayStr) || (day === 1 && month === 10 && year === 2026 && !isSelected);

    let dayEvents = eventsByDate[dateStr] || [];
    if (calState.selectedTerm === 'odd') {
      dayEvents = dayEvents.filter(e => e.sem === 'odd' || e.sem === 1 || e.sem === 3 || e.sem === 5 || e.sem === 7 || e.sem === 'all');
    } else if (calState.selectedTerm === 'even') {
      dayEvents = dayEvents.filter(e => e.sem === 'even' || e.sem === 2 || e.sem === 4 || e.sem === 6 || e.sem === 8 || e.sem === 'all');
    }
    const customTasks = getCustomCalendarTasks(dateStr);
    const totalTasks = [...dayEvents, ...customTasks];

    const hasHigh = totalTasks.some(t => t.type === 'exam' || t.priority === 'high' || t.type === 'placement');
    const hasMed = totalTasks.some(t => t.type === 'assignment' || t.priority === 'medium' || t.type === 'class');
    const hasLow = totalTasks.some(t => t.type === 'holiday' || t.priority === 'low');

    if (isSelected) {
      // Solid purple/indigo pill with soft shadow (matching Day 8 in screenshot)
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl bg-[#5B5FC7] text-white font-bold flex items-center justify-center text-sm shadow-lg shadow-indigo-500/35 cursor-pointer transition transform active:scale-95" onclick="window.selectCalendarDate('${dateStr}')">
          ${day}
        </div>
      `;
    } else if (isToday) {
      // Outlined purple/indigo pill (matching Day 1 in screenshot)
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl border-2 border-[#5B5FC7] text-[#5B5FC7] font-bold flex items-center justify-center text-sm cursor-pointer hover:bg-indigo-50 transition transform active:scale-95" onclick="window.selectCalendarDate('${dateStr}')">
          ${day}
        </div>
      `;
    } else if (hasHigh) {
      // High load date (Red dot)
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl flex flex-col items-center justify-center relative font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition" onclick="window.selectCalendarDate('${dateStr}')">
          <span class="text-xs leading-none">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1"></span>
        </div>
      `;
    } else if (hasMed) {
      // Medium load date (Orange/Amber dot)
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl flex flex-col items-center justify-center relative font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition" onclick="window.selectCalendarDate('${dateStr}')">
          <span class="text-xs leading-none">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1"></span>
        </div>
      `;
    } else if (hasLow) {
      // Low load date (Green dot)
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl flex flex-col items-center justify-center relative font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition" onclick="window.selectCalendarDate('${dateStr}')">
          <span class="text-xs leading-none">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1"></span>
        </div>
      `;
    } else {
      // Normal weekday with no special milestones
      html += `
        <div class="w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-medium text-slate-700 hover:bg-slate-100 text-xs cursor-pointer transition" onclick="window.selectCalendarDate('${dateStr}')">
          ${day}
        </div>
      `;
    }
  }

  // 3. Trailing cells into next month to complete the 7-col grid (e.g. 1..6 for Nov 2026)
  const totalRendered = shiftIndex + daysInMonth;
  const remainingCells = (totalRendered % 7 === 0) ? 0 : (7 - (totalRendered % 7));
  for (let d = 1; d <= remainingCells; d++) {
    html += `
      <div class="w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-medium text-slate-300 text-xs select-none">
        ${d}
      </div>
    `;
  }

  grid.innerHTML = html;
}

window.selectCalendarDate = function (dateStr) {
  calState.selectedDate = dateStr;

  const titleEl = $('calDayBriefingTitle');
  if (titleEl) titleEl.textContent = fdateFull(dateStr);

  // Re-render grid to reflect active selected day
  renderCalendarMonthGrid();

  if (!calState.data) return;

  const allEvents = calState.data.events || [];
  let dayEvents = allEvents.filter(e => e.date === dateStr);
  if (calState.selectedTerm === 'odd') {
    dayEvents = dayEvents.filter(e => e.sem === 'odd' || e.sem === 1 || e.sem === 3 || e.sem === 5 || e.sem === 7 || e.sem === 'all');
  } else if (calState.selectedTerm === 'even') {
    dayEvents = dayEvents.filter(e => e.sem === 'even' || e.sem === 2 || e.sem === 4 || e.sem === 6 || e.sem === 8 || e.sem === 'all');
  }
  const customTasks = getCustomCalendarTasks(dateStr);

  const mappedEvents = dayEvents.map(e => {
    let priority = 'medium';
    if (e.type === 'exam' || e.type === 'placement') priority = 'high';
    else if (e.type === 'holiday') priority = 'low';

    let status = 'Scheduled';
    if (e.type === 'holiday') status = 'Holiday';
    else if (e.type === 'exam') status = 'Mandatory';

    return {
      id: e.id,
      task: e.title,
      priority: priority,
      status: status,
      deadline: fdate(e.date),
      time: e.time || '09:00 AM',
      isCustom: false,
      details: e.details || e.desc
    };
  });

  const mappedCustom = customTasks.map(t => ({
    id: t.id,
    task: t.title,
    priority: t.priority || 'medium',
    status: t.status || 'Scheduled',
    deadline: fdate(t.date),
    time: t.time || '10:00 AM',
    isCustom: true
  }));

  const allDayTasks = [...mappedEvents, ...mappedCustom];

  const countEl = $('calDayEventsCount');
  if (countEl) countEl.textContent = `${allDayTasks.length} Event${allDayTasks.length === 1 ? '' : 's'}`;

  const listEl = $('calDayEventsList');
  if (listEl) {
    if (!allDayTasks.length) {
      // EXACT Empty State from Screenshot
      listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center select-none">
          <div class="w-14 h-14 rounded-2xl bg-slate-100/90 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
            <i class="fas fa-clipboard-list text-slate-300"></i>
          </div>
          <p class="text-slate-400 text-xs font-normal">There are no tasks for the chosen day yet.</p>
        </div>
      `;
    } else {
      // Clean Table Rows matching screenshot headers: N° | Task | Priority | Status | Deadline | Time | Action
      listEl.innerHTML = `
        <div class="divide-y divide-slate-100">
          ${allDayTasks.map((t, idx) => `
            <div class="grid grid-cols-12 gap-2 py-3 px-2 text-xs items-center hover:bg-slate-50 rounded-xl transition">
              <div class="col-span-1 font-bold text-slate-400">${idx + 1}</div>
              <div class="col-span-4 font-semibold text-slate-800 truncate" title="${esc(t.task)}">${esc(t.task)}</div>
              <div class="col-span-2 text-center">
                ${renderPriorityBadge(t.priority)}
              </div>
              <div class="col-span-2 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">${esc(t.status)}</span>
              </div>
              <div class="col-span-1 text-center text-slate-500 text-[11px] truncate">${esc(t.deadline)}</div>
              <div class="col-span-1 text-center text-slate-500 text-[11px] truncate">${esc(t.time)}</div>
              <div class="col-span-1 text-right flex items-center justify-end gap-1">
                ${t.isCustom ? `
                  <button class="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition" title="Delete Task" onclick="window.deleteCalendarTask('${t.id}')">
                    <i class="fas fa-trash-alt text-[10px]"></i>
                  </button>
                ` : `
                  <button class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition" title="View details" onclick="window.openAcademicEventModal('${t.id}')">
                    <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
                  </button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
};

window.jumpToSelectedMonth = function (val) {
  if (!val) return;
  const [yStr, mStr] = val.split('-');
  calState.currentMonth = new Date(Number(yStr), Number(mStr) - 1, 1);
  renderCalendarMonthGrid();
};

window.openAddCalendarTaskModal = function() {
  const modal = $('addCalendarTaskModal');
  if (!modal) return;
  const dateTitle = $('addCalModalDateTitle');
  if (dateTitle) dateTitle.textContent = `Add Task for ${fdateFull(calState.selectedDate)}`;
  const titleInput = $('addCalTaskTitle');
  if (titleInput) { titleInput.value = ''; titleInput.focus(); }
  modal.classList.remove('hidden');
};

window.closeAddCalendarTaskModal = function() {
  const modal = $('addCalendarTaskModal');
  if (modal) modal.classList.add('hidden');
};

window.saveCalendarCustomTask = function(e) {
  if (e) e.preventDefault();
  const title = ($('addCalTaskTitle')?.value || '').trim();
  if (!title) return;
  const priority = $('addCalTaskPriority')?.value || 'medium';
  const status = $('addCalTaskStatus')?.value || 'Scheduled';
  const time = ($('addCalTaskTime')?.value || '').trim() || '10:00 AM';

  const newTask = {
    id: 'ctask_' + Date.now(),
    date: calState.selectedDate,
    title: title,
    priority: priority,
    status: status,
    time: time
  };

  saveCustomCalendarTask(newTask);
  window.closeAddCalendarTaskModal();
  selectCalendarDate(calState.selectedDate);
  renderCalendarMonthGrid();
  if (typeof toast === 'function') toast('Task scheduled successfully!', 'success');
};

window.deleteCalendarTask = function(id) {
  removeCustomCalendarTask(id);
  selectCalendarDate(calState.selectedDate);
  renderCalendarMonthGrid();
  if (typeof toast === 'function') toast('Task removed.', 'info');
};
function renderUpcomingDeadlines() {
  const container = $('calUpcomingDeadlinesList');
  if (!container || !calState.data) return;

  const now = new Date();
  const events = (calState.data.events || []).filter(e => {
    return (e.type === 'exam' || e.type === 'assignment') && new Date(e.date) >= now;
  }).slice(0, 4);

  if (!events.length) {
    container.innerHTML = '<p class="text-[11px] text-slate-400 italic">No impending exam deadlines.</p>';
    return;
  }

  container.innerHTML = events.map(e => {
    const diff = Math.max(0, Math.ceil((new Date(e.date) - now) / (1000 * 60 * 60 * 24)));
    return `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
        <div class="min-w-0 pr-2">
          <p class="font-bold text-slate-800 dark:text-white truncate text-[11px]">${esc(e.title)}</p>
          <p class="text-[10px] text-slate-400">${esc(e.date)}</p>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${diff <= 7 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'} shrink-0">
          ${diff}d left
        </span>
      </div>
    `;
  }).join('');
}

window.openAcademicEventModal = function (eventId) {
  if (!calState.data) return;
  const ev = (calState.data.events || []).find(e => e.id === eventId);
  if (!ev) return;

  calState.modalEvent = ev;
  const modal = $('calEventModal');
  if (!modal) return;

  $('modalCalType').textContent = (ev.type || 'Academic').toUpperCase();
  $('modalCalDate').textContent = fdateFull(ev.date);
  $('modalCalWeight').textContent = ev.weight || 'Assessment';
  $('modalCalTitle').textContent = ev.title;
  $('modalCalTime').innerHTML = `<i class="fas fa-clock mr-1 text-indigo-500"></i> ${esc(ev.time || 'Scheduled Session')}`;
  $('modalCalLocation').innerHTML = `<i class="fas fa-location-dot mr-1 text-rose-500"></i> ${esc(ev.location || 'Smart Campus')}`;
  $('modalCalDesc').textContent = ev.details || ev.desc || 'Institutional academic milestone.';

  modal.classList.remove('hidden');
};

window.closeAcademicEventModal = function () {
  const modal = $('calEventModal');
  if (modal) modal.classList.add('hidden');
  calState.modalEvent = null;
};

window.addModalEventToPlanner = async function () {
  if (!calState.modalEvent) return;
  const ev = calState.modalEvent;
  try {
    await api('/planner/tasks', {
      method: 'POST',
      body: {
        task: `[${(ev.type || 'ACAD').toUpperCase()}] ${ev.title}`,
        priority: ev.type === 'exam' ? 'high' : 'medium',
        deadline: ev.date,
        time: ev.time || '10:00 AM',
        completed: 0
      }
    });
    toast(`Added "${ev.title}" to your AI Study Planner!`, 'success');
    window.closeAcademicEventModal();
  } catch (err) {
    toast('Could not sync task to planner.', 'error');
  }
};

window.addSingleEventToPlanner = async function (eventId) {
  if (!calState.data) return;
  const ev = (calState.data.events || []).find(e => e.id === eventId);
  if (!ev) return;
  try {
    await api('/planner/tasks', {
      method: 'POST',
      body: {
        task: `[${(ev.type || 'ACAD').toUpperCase()}] ${ev.title}`,
        priority: ev.type === 'exam' ? 'high' : 'medium',
        deadline: ev.date,
        time: ev.time || '10:00 AM',
        completed: 0
      }
    });
    toast(`Added "${ev.title}" to AI Study Planner!`, 'success');
  } catch (err) {
    toast('Failed to add to study planner.', 'error');
  }
};

window.addDayEventsToPlanner = async function () {
  if (!calState.data || !calState.selectedDate) return;
  const dayEvents = (calState.data.events || []).filter(e => e.date === calState.selectedDate);
  if (!dayEvents.length) {
    await api('/planner/tasks', {
      method: 'POST',
      body: {
        task: `Instructional Revision Session (${fdateFull(calState.selectedDate)})`,
        priority: 'medium',
        deadline: calState.selectedDate,
        time: '04:00 PM',
        completed: 0
      }
    });
    toast(`Added study session for ${calState.selectedDate} to planner.`, 'success');
    return;
  }

  for (const ev of dayEvents) {
    await api('/planner/tasks', {
      method: 'POST',
      body: {
        task: `[${(ev.type || 'ACAD').toUpperCase()}] ${ev.title}`,
        priority: ev.type === 'exam' ? 'high' : 'medium',
        deadline: ev.date,
        time: ev.time || '10:00 AM',
        completed: 0
      }
    });
  }
  toast(`Added ${dayEvents.length} scheduled activity(ies) to your Study Planner!`, 'success');
};

window.syncCalendarToPlanner = async function () {
  if (!calState.data) return;
  const now = new Date();
  const milestones = (calState.data.events || []).filter(e => {
    return (e.type === 'exam' || e.type === 'assignment') && new Date(e.date) >= now;
  });

  if (!milestones.length) {
    toast('All scheduled milestones for this term are completed.', 'info');
    return;
  }

  let count = 0;
  for (const ev of milestones.slice(0, 10)) {
    try {
      await api('/planner/tasks', {
        method: 'POST',
        body: {
          task: `[${(ev.type || 'ACAD').toUpperCase()}] ${ev.title}`,
          priority: ev.type === 'exam' ? 'high' : 'medium',
          deadline: ev.date,
          time: ev.time || '10:00 AM',
          completed: 0
        }
      });
      count++;
    } catch (e) { /* ignore single error */ }
  }

  toast(`Synced ${count} upcoming academic milestones to your AI Study Planner!`, 'success');
};

window.downloadAcademicIcs = function () {
  const y = calState.selectedYear || 2;
  window.open(`/api/calendar/ics?year=${y}`, '_blank');
  toast(`Downloading Year ${y} Academic Calendar (.ics) for Google/Apple Calendar.`, 'info');
};

window.printAcademicCalendar = function () {
  window.print();
};

// ---------- curriculum / OBE ----------
window.loaders.curriculum = window.loadCurriculum = async function () {
  const userSem = (me && me.semester) ? me.semester : 1;
  const filter = $('curriculumSemFilter');
  const badge = $('curriculumCohortBadge');

  if (me && me.role === 'student') {
    if (filter) {
      filter.innerHTML = `<option value="${userSem}">Semester ${userSem} (Enrolled)</option>`;
      filter.value = String(userSem);
      filter.classList.add('hidden');
    }
    if (badge) {
      badge.textContent = `Semester ${userSem} (Enrolled Cohort)`;
      badge.classList.remove('hidden');
    }
  } else {
    if (filter) {
      filter.classList.remove('hidden');
      if (!filter.options.length || filter.options.length <= 1) {
        filter.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}">Semester ${s}</option>`).join('');
      }
    }
    if (badge) badge.classList.add('hidden');
  }

  const querySem = (me && me.role === 'student') ? userSem : (filter?.value || userSem);
  const c = await api('/curriculum?sem=' + querySem);
  $('curriculumCgpa').textContent = c.cgpa?.toFixed(2) ?? '--';
  $('curriculumCredits').textContent = c.credits;
  $('curriculumBacklogs').textContent = c.backlogs;
  $('curriculumGrid').innerHTML = c.subjects.map((s) => `<button type="button" class="text-left w-full border rounded-xl p-3 mb-2 hover:border-indigo-400 transition" onclick='showOutcomes(${JSON.stringify(s).replace(/'/g, '&#39;')})'><b>${esc(s.code)} · ${esc(s.name)}</b><p class="text-xs text-gray-400">${s.credits} credits ${s.grade ? '· Grade ' + s.grade : s.internal != null ? '· Internal ' + s.internal + '/25' : ''}</p></button>`).join('');
};
window.showOutcomes = (s) => { $('obeOutcomesList').innerHTML = s.modules.map((m, i) => `<div class="text-sm p-2 border-b"><b>CO${i + 1}</b> Apply and analyse <i>${esc(m.toLowerCase())}</i> in practical engineering problems.</div>`).join(''); $('curriculumMaterialsHint').textContent = s.code; };

// ---------- timetable, leaderboard, notices ----------
window.loaders.timetable = async function () {
  const tt = await api('/timetable'), todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const cell = (s) => `<td class="p-3 text-xs"><b>${esc(s.subject)}</b><br><span class="text-gray-400">${esc(s.room)} · ${esc(s.faculty)}</span></td>`;
  $('timetableBody').innerHTML = tt.map((d) => `<tr class="border-b ${d.day === todayName ? 'bg-indigo-50/60' : ''}"><td class="p-3 font-black">${d.day}${d.day === todayName ? ' <span class="text-[9px] text-indigo-600">TODAY</span>' : ''}</td>${cell(d.slots[0])}${cell(d.slots[1])}<td class="p-3 text-xs text-gray-400 italic">Lunch</td>${cell(d.slots[2])}${cell(d.slots[3])}</tr>`).join('');
};
window.loaders.leaderboard = async function () {
  const l = await api('/leaderboard');
  $('leaderboardBody').innerHTML = l.map((u) => `<tr class="border-b ${u.me ? 'bg-indigo-50/60 font-bold' : ''}"><td class="p-3">${u.rank <= 3 ? ['🥇', '🥈', '🥉'][u.rank - 1] : u.rank}</td><td class="p-3">${esc(u.name)}${u.me ? ' (you)' : ''}</td><td class="p-3">Lv ${u.level}</td><td class="p-3">${u.xp}</td></tr>`).join('');
};
window.loaders.notices = async function () {
  const n = await api('/notices');
  $('noticesList').innerHTML = n.map((x) => `<div class="bg-white border rounded-2xl p-5 mb-4"><div class="flex flex-wrap items-center gap-2 mb-1">${pill(x.category, 'blue')}${pill(x.priority, x.priority === 'High' ? 'red' : x.priority === 'Medium' ? 'amber' : 'gray')}<span class="text-xs text-gray-400">${fdate(x.created_at)}</span></div>
    <h4 class="font-bold text-gray-800">${esc(x.title)}</h4><p class="text-sm mt-2 p-3 rounded-lg bg-indigo-50 text-indigo-800"><i class="fas fa-wand-magic-sparkles mr-1"></i><b>AI summary:</b> ${esc(x.summary)}</p>
    <details class="mt-2"><summary class="text-xs font-bold text-indigo-600 cursor-pointer">Read full notice</summary><p class="text-sm text-gray-600 mt-2">${esc(x.body)}</p></details></div>`).join('');
};

// =========================================================================
// CENTRAL CORE EXECUTION ENGINE (KERNEL CORE v1.0) CONTROLLER
// =========================================================================
let kernelState = {
  activePayload: null,
  isExecuting: false
};

window.openKernelCommander = function () {
  const modal = $('kernelCommanderModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Update user context pill
  const pill = $('kernelContextPill');
  if (pill && me) {
    pill.textContent = `ROLE: ${me.role || 'student'} · ID: ${me.roll_no || me.id || '2024CS0042'}`;
  }

  const input = $('kernelInputPrompt');
  if (input) {
    input.focus();
    input.select();
  }
};

window.closeKernelCommander = function () {
  const modal = $('kernelCommanderModal');
  if (modal) modal.classList.add('hidden');
};

window.setKernelPrompt = function (text) {
  const input = $('kernelInputPrompt');
  if (input) {
    input.value = text;
    window.submitKernelIntent();
  }
};

window.clearKernelOutput = function () {
  const container = $('kernelOutputContainer');
  if (container) container.classList.add('hidden');
  kernelState.activePayload = null;
  const input = $('kernelInputPrompt');
  if (input) {
    input.value = '';
    input.focus();
  }
};

window.submitKernelIntent = async function () {
  const input = $('kernelInputPrompt');
  if (!input) return;
  const intent = input.value.trim();
  if (!intent) {
    toast('Please enter a command intent.', 'warning');
    return;
  }

  const outContainer = $('kernelOutputContainer');
  if (outContainer) outContainer.classList.remove('hidden');

  const respBox = $('kernelResponseBox');
  const msgEl = $('kernelResponseMessage');
  const badge = $('kernelClassifiedBadge');
  const targetFn = $('kernelTargetFunc');
  const targetUi = $('kernelUiModule');
  const jsonPre = $('kernelJsonOutput');
  const jumpBtn = $('kernelJumpBtn');
  const statusRow = $('kernelStatusRow');
  const valTag = $('kernelValidationTag');

  if (msgEl) msgEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Kernel Core evaluating intent, cross-verifying role permissions, and classifying domain...';
  if (jsonPre) jsonPre.textContent = 'Processing request envelope...';

  try {
    const envelope = {
      user_id: me ? (me.id || me.roll_no) : '2024CS0042',
      role: me ? (me.role || 'student') : 'student',
      action_intent: intent
    };

    const res = await api('/ai-engine', {
      method: 'POST',
      body: envelope
    });

    kernelState.activePayload = res;

    // Handle Authorization Breach vs Normal Execution
    if (res.status === 'AUTHORIZATION_BREACH' || res.intent_classified === 'UNAUTHORIZED_PRIVILEGE_ESCALATION') {
      badge.textContent = `[${res.intent_classified}]`;
      badge.className = 'px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white animate-pulse';
      targetFn.textContent = res.target_function || 'security_audit_log_breach';
      targetUi.textContent = res.ui_target_module || 'security-alert';

      respBox.className = 'p-4 rounded-xl bg-rose-950/70 border border-rose-500/60 text-sm text-rose-200';
      msgEl.innerHTML = `<strong class="text-rose-400 block mb-1">⚠️ PRIVILEGE ESCALATION INTERCEPTED</strong>${esc(res.response_message)}`;

      statusRow.className = 'flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-rose-500/40';
      valTag.textContent = '● REJECTED BY KERNEL CORE ROLE POLICY';
      valTag.className = 'text-[10px] text-rose-400 font-mono font-bold';

      jsonPre.textContent = JSON.stringify(res, null, 2);
      if (jumpBtn) jumpBtn.classList.add('hidden');
      toast('Security Authorization Breach detected and halted.', 'error');
      return;
    }

    // Normal successful execution
    let badgeColor = 'bg-indigo-600 text-white';
    if (res.intent_classified === 'PREDICTIVE_ANALYTICS') badgeColor = 'bg-cyan-500 text-slate-950';
    else if (res.intent_classified === 'DOCUMENT_PROCESSING') badgeColor = 'bg-amber-500 text-slate-950';
    else if (res.intent_classified === 'ASSISTANCE_ROUTING') badgeColor = 'bg-purple-600 text-white';

    badge.textContent = `[${res.intent_classified}]`;
    badge.className = `px-2.5 py-1 rounded-lg text-xs font-black ${badgeColor}`;

    targetFn.textContent = res.target_function || 'direct_execution';
    targetUi.textContent = res.ui_target_module || 'dashboard';

    respBox.className = 'p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-sm leading-relaxed';
    msgEl.textContent = res.response_message || 'Execution completed.';

    statusRow.className = 'flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-indigo-500/20';
    valTag.textContent = '● Validated by Kernel Core v1.0';
    valTag.className = 'text-[10px] text-emerald-400 font-mono font-bold';

    jsonPre.textContent = JSON.stringify(res, null, 2);
    if (jumpBtn) {
      jumpBtn.classList.remove('hidden');
      const jumpText = $('kernelJumpText');
      if (jumpText) jumpText.textContent = `Open in [${res.ui_target_module || 'dashboard'}]`;
    }

    toast(`Executed intent: [${res.intent_classified}]`, 'success');

  } catch (err) {
    console.error('Kernel execution error:', err);
    if (msgEl) msgEl.textContent = 'Error processing request in Kernel Core.';
    if (jsonPre) jsonPre.textContent = String(err.message || err);
  }
};

window.jumpToKernelModule = function () {
  if (!kernelState.activePayload) return;
  const mod = kernelState.activePayload.ui_target_module || 'dashboard';
  window.closeKernelCommander();

  // Route to the target module widget
  if (mod === 'acadTab-fees') {
    showSection('academics');
    if (window.switchAcademicsTab) window.switchAcademicsTab('fees');
  } else if (mod === 'acadTab-results') {
    showSection('academics');
    if (window.switchAcademicsTab) window.switchAcademicsTab('results');
  } else if (mod === 'acadTab-scholarships') {
    showSection('academics');
    if (window.switchAcademicsTab) window.switchAcademicsTab('scholarships');
  } else if (mod === 'curriculumGpaBar') {
    showSection('curriculum');
  } else {
    showSection(mod);
  }
};

// Global Hotkey Listener: Ctrl+K or Cmd+K
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const modal = $('kernelCommanderModal');
    if (modal && !modal.classList.contains('hidden')) {
      window.closeKernelCommander();
    } else {
      window.openKernelCommander();
    }
  } else if (e.key === 'Escape') {
    window.closeKernelCommander();
  }
});

// ---------- init ----------
document.addEventListener('DOMContentLoaded', () => {
  try { if (localStorage.getItem('theme') === 'light') { document.documentElement.classList.remove('dark'); $('themeIcon').className = 'fas fa-moon'; } } catch { /* ignore */ }
  $('logoutBtn').onclick = logout;
  boot();
});


// ---------- Study Materials (Cohort Isolated) ----------
let cachedCohortMaterials = [];
let currentSubjectFilter = 'ALL';

async function loadStudyMaterials() {
  const grid = $('studyMaterialsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-full p-12 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading course materials for your semester...</div>';

  try {
    const data = await api('/materials');
    cachedCohortMaterials = data.items || data.materials || [];

    // Update cohort badge
    const badge = $('learningCohortBadge');
    if (badge) {
      badge.textContent = `Year ${data.studentYear || 2} • Sem ${data.studentSem || 4} • ${data.dept || 'Engineering'}`;
    }

    populateStudyMaterialPills(cachedCohortMaterials);
    renderStudyMaterialsGrid(cachedCohortMaterials);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full p-12 text-center text-rose-500 font-semibold"><i class="fas fa-circle-exclamation mr-2"></i>Failed to load course materials: ${esc(err.message || 'Server error')}</div>`;
  }
}

function populateStudyMaterialPills(materials) {
  const container = $('materialsSubjectFilterPills');
  if (!container) return;

  const subjects = ['ALL', ...new Set(materials.map(m => m.subject_code || m.subject_name).filter(Boolean))];
  container.innerHTML = subjects.map(sub => `
    <button type="button" onclick="setStudyMaterialFilter('${esc(sub)}')" class="px-3 py-1 rounded-full text-xs font-bold transition ${currentSubjectFilter === sub ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}">
      ${esc(sub === 'ALL' ? 'All Subjects' : sub)}
    </button>
  `).join('');
}

function setStudyMaterialFilter(sub) {
  currentSubjectFilter = sub;
  populateStudyMaterialPills(cachedCohortMaterials);
  filterStudyMaterials();
}

function filterStudyMaterials() {
  const query = ($('materialsSearchInput')?.value || '').toLowerCase().trim();
  let list = cachedCohortMaterials;

  if (currentSubjectFilter !== 'ALL') {
    list = list.filter(m => (m.subject_code === currentSubjectFilter) || (m.subject_name === currentSubjectFilter));
  }

  if (query) {
    list = list.filter(m =>
      (m.title && m.title.toLowerCase().includes(query)) ||
      (m.description && m.description.toLowerCase().includes(query)) ||
      (m.subject_name && m.subject_name.toLowerCase().includes(query)) ||
      (m.subject_code && m.subject_code.toLowerCase().includes(query)) ||
      (m.material_type && m.material_type.toLowerCase().includes(query))
    );
  }

  renderStudyMaterialsGrid(list);
}

function renderStudyMaterialsGrid(materials) {
  const grid = $('studyMaterialsGrid');
  if (!grid) return;

  if (!materials.length) {
    grid.innerHTML = `
      <div class="col-span-full p-12 text-center bg-white rounded-2xl border border-gray-200">
        <i class="fas fa-folder-open text-3xl text-gray-400 mb-3 block"></i>
        <p class="text-sm font-bold text-gray-700">No study materials found</p>
        <p class="text-xs text-gray-400 mt-1">Check back later or try adjusting your search filters.</p>
      </div>`;
    return;
  }

  const badgeColors = {
    'Syllabus': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Lecture Slides': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Lab Manual': 'bg-purple-50 text-purple-700 border-purple-200',
    'Formula Sheet': 'bg-amber-50 text-amber-700 border-amber-200',
    'Past Paper Solutions': 'bg-rose-50 text-rose-700 border-rose-200',
    'Reference Book': 'bg-cyan-50 text-cyan-700 border-cyan-200'
  };

  grid.innerHTML = materials.map(m => {
    const badgeCls = badgeColors[m.material_type] || 'bg-gray-100 text-gray-700 border-gray-200';
    return `
      <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              ${esc(m.subject_code || 'ACAD')}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}">
              ${esc(m.material_type || 'Study Guide')}
            </span>
          </div>
          <h3 class="font-extrabold text-base text-gray-800 mb-1 leading-snug">${esc(m.title)}</h3>
          <p class="text-xs text-indigo-600 font-semibold mb-2">${esc(m.subject_name || m.dept)}</p>
          <p class="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed">${esc(m.description || 'Institutional cohort curriculum material.')}</p>
        </div>
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
          <span class="text-[11px] text-gray-400 font-medium">
            <i class="fas fa-layer-group text-gray-400 mr-1"></i>Year ${m.year} (Sem ${m.semester})
          </span>
          <button type="button" onclick="downloadStudyMaterial(${m.id}, '${esc(m.title).replace(/'/g, "\\'")}')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
            <i class="fas fa-file-arrow-down"></i>
            <span>Download</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function downloadStudyMaterial(id, title) {
  try {
    const res = await fetch(`/api/materials/${id}/download`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch (_) {}
      throw new Error(err?.message || 'Download failed');
    }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'study_material').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Could not download material: ' + err.message);
  }
}

window.loadStudyMaterials = loadStudyMaterials;
window.filterStudyMaterials = filterStudyMaterials;
window.setStudyMaterialFilter = setStudyMaterialFilter;
window.downloadStudyMaterial = downloadStudyMaterial;
window.loaders = window.loaders || {};
window.loaders.learning = loadStudyMaterials;


// ---------- Student Profile & Academic Cohort Controller ----------
window.loaders = window.loaders || {};
window.loaders.profile = window.loadProfile = async function () {
  try {
    const res = await api('/profile');
    const u = res.user;
    const acad = res.academic;

    if ($('profileCardName')) $('profileCardName').textContent = u.name || 'Student';
    if ($('profileCardYearSem')) $('profileCardYearSem').textContent = `Year ${u.year} · Sem ${u.semester}`;
    if ($('profileCardDept')) $('profileCardDept').textContent = `Department of ${u.dept || 'Engineering'}`;
    if ($('profileCardRoll')) $('profileCardRoll').textContent = u.roll_no || '--';

    if ($('profileEmailVal')) $('profileEmailVal').textContent = u.email || '--';
    if ($('profileProgramVal')) $('profileProgramVal').textContent = `B.Tech - ${u.dept || 'Computer Science & Engineering'}`;
    if ($('profileYearVal')) $('profileYearVal').textContent = `Year ${u.year}`;
    if ($('profileSemVal')) $('profileSemVal').textContent = `Semester ${u.semester}`;

    if ($('profileCgpaVal')) $('profileCgpaVal').textContent = acad?.cgpa ? acad.cgpa.toFixed(2) : '8.80';
    if ($('profileAttVal')) $('profileAttVal').textContent = (acad?.attendance ? Math.round(acad.attendance) : 85) + '%';
    if ($('profileSubjectCount')) $('profileSubjectCount').textContent = (acad?.subjectsCount || 5) + ' Courses';

    const phoneInput = $('profilePhoneInput');
    if (phoneInput) phoneInput.value = u.phone || '';
    const bioInput = $('profileBioInput');
    if (bioInput) bioInput.value = u.bio || '';

    const cohortSelect = $('profileCohortSelect');
    if (cohortSelect) cohortSelect.value = String(u.semester || 1);

    // Enrolled cohort subjects
    const subjRes = await api('/academics/subjects');
    const list = $('profileEnrolledSubjectsList');
    if (list && subjRes.subjects) {
      list.innerHTML = subjRes.subjects.map(s => `
        <div class="flex items-center justify-between p-3 rounded-xl border border-gray-700/60" style="background: rgba(30, 30, 30, 0.7);">
          <div>
            <span class="text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">${esc(s.code)}</span>
            <p class="text-xs font-bold text-slate-100 mt-1">${esc(s.name)}</p>
          </div>
          <span class="text-xs font-bold text-slate-400">${s.credits} Credits</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
};

window.handleProfileSubmit = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const phone = $('profilePhoneInput')?.value || '';
  const bio = $('profileBioInput')?.value || '';
  const sem = $('profileCohortSelect')?.value;

  try {
    const res = await api('/profile', {
      method: 'PUT',
      body: { phone, bio, semester: sem }
    });
    toast('Profile & Academic Cohort updated successfully!', 'success');

    // Refresh authenticated user identity
    me = await api('/auth/me');
    if ($('studentName')) $('studentName').textContent = me.name;
    const topName = $('topHeaderStudentName');
    if (topName) topName.textContent = me.name ? me.name.split(' ')[0] : 'Profile';
    const cohortBadge = $('studentCohortBadge');
    if (cohortBadge) {
      cohortBadge.textContent = (me.role === 'admin' || me.role === 'super_admin') ? 'Administrator' : ('Year ' + (me.year || 1) + ' · Sem ' + (me.semester || 1));
    }

    await window.loadProfile();

    // Reload cohort-dependent views
    if (window.loaders.dashboard) window.loaders.dashboard();
    if (window.loadStudyMaterials) window.loadStudyMaterials();
    if (window.loadDigitalStudyMaterials) window.loadDigitalStudyMaterials();
    if (window.loaders.timetable) window.loaders.timetable();
    if (window.loaders.curriculum) window.loaders.curriculum();
    if (window.loaders.notices) window.loaders.notices();
    if (window.loaders['academic-calendar']) window.loaders['academic-calendar'](me.year, me.semester);
    if (window.loaders['syllabus-roadmap']) window.loaders['syllabus-roadmap']();
    syncDoubtSolverSubjects();
  } catch (err) {
    toast('Could not update profile: ' + (err.message || 'Server error'), 'error');
  }
};

async function syncDoubtSolverSubjects() {
  const sel = $('doubtSubject');
  if (!sel) return;
  try {
    const data = await api('/academics/subjects');
    if (data.subjects && data.subjects.length) {
      sel.innerHTML = data.subjects.map(s => `<option value="${esc(s.name)}">${esc(s.name)} (${esc(s.code)})</option>`).join('') + '<option value="General">General Doubt</option>';
    }
  } catch (_) {}
}
window.syncDoubtSolverSubjects = syncDoubtSolverSubjects;
