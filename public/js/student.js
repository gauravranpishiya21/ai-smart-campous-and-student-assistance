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
            <option value="4" selected>Semester 4</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
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
          semester: Number($('authSem')?.value || 4)
        };
        const regRes = await api('/auth/register', { body, noAuthRedirect: true });
        toast(regRes.message || 'Registration successful! Please log in.', 'ok');
        setMode('login');
        $('authId').value = body.roll_no;
        $('authPass').value = '';
        $('authPass').focus();
        $('authErr').className = 'text-emerald-400 text-xs font-semibold min-h-[1rem]';
        $('authErr').textContent = 'Account created successfully! Please enter your password to log in.';
        return;
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
  document.querySelectorAll('#sidebar .sidebar-item').forEach((a) => {
    const on = (a.getAttribute('onclick') || '').includes(`showSection('${id}')`);
    a.classList.toggle('active', on);
  });
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
  if (me.role === 'admin' || me.role === 'super_admin') {
    let adminBtn = $('adminConsoleBtn');
    if (!adminBtn) {
      adminBtn = document.createElement('a');
      adminBtn.id = 'adminConsoleBtn';
      adminBtn.href = '/admin.html';
      adminBtn.className = 'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition mr-2';
      adminBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Admin Console';
      $('logoutBtn')?.parentElement?.prepend(adminBtn);
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

// ---------- syllabus roadmap ----------
let syl = null, sylYear = null;
window.loaders['syllabus-roadmap'] = async function () {
  syl = await api('/syllabus');
  $('roadmapActiveYearBadge').textContent = 'Enrolled: Year ' + syl.enrolledYear; $('roadmapDeptLabel').textContent = syl.dept;
  $('roadmapProgramTotal').textContent = syl.semesters.reduce((x, s) => x + s.subjects.reduce((y, z) => y + z.credits, 0), 0) + ' credits · 8 semesters';
  filterSyllabusYear(sylYear ?? syl.enrolledYear); loadTimeline('all');
};
window.filterSyllabusYear = (y) => {
  sylYear = y; if (!syl) return;
  const sems = y === 'all' ? syl.semesters : syl.semesters.filter((s) => s.sem === y * 2 - 1 || s.sem === y * 2);
  [1, 2, 3, 4, 'all'].forEach((n) => { const b = $('tab-year-' + n); if (b) b.classList.toggle('bg-indigo-600', n === y), b?.classList.toggle('text-white', n === y); const nd = $('node-year-' + n); if (nd) nd.style.outline = n === y ? '2px solid #6366f1' : ''; });
  $('roadmapFilterNotification').querySelector('span').textContent = y === 'all' ? 'Showing all 4 years.' : y === syl.enrolledYear ? 'Showing curriculum for your enrolled year.' : `Showing Year ${y} curriculum.`;
  $('syllabusSemestersContainer').innerHTML = sems.map((s) => `<div class="bg-white border rounded-2xl p-5 mb-4"><h4 class="font-extrabold text-gray-800 mb-3">Semester ${s.sem} <span class="text-xs text-gray-400 font-bold">· ${s.subjects.reduce((x, z) => x + z.credits, 0)} credits</span></h4>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">${s.subjects.map((x) => `<button type="button" class="text-left border rounded-xl p-3 hover:border-indigo-400 transition" onclick="openSyllabusModal(${x.id})"><div class="flex justify-between"><span class="text-[10px] font-black text-indigo-600">${esc(x.code)}</span>${pill(x.category, x.category === 'Core' ? 'blue' : 'gray')}</div><p class="font-bold text-sm mt-1">${esc(x.name)}</p><p class="text-xs text-gray-400">${x.credits} credits · ${esc(x.faculty)}</p></button>`).join('')}</div></div>`).join('');
};
window.openSyllabusModal = (id) => {
  const sub = syl.semesters.flatMap((s) => s.subjects).find((x) => x.id === id); if (!sub) return;
  $('modalSubCode').textContent = sub.code; $('modalSubCredits').textContent = sub.credits + ' Credits'; $('modalSubCategory').textContent = sub.category; $('modalSubTitle').textContent = sub.name;
  $('modalSubPrereq').innerHTML = `<i class="fas fa-link mr-1"></i> Prerequisite: ${esc(sub.prereq)}`;
  $('modalModulesList').innerHTML = sub.modules.map((m, i) => `<div class="flex gap-3 p-3 border rounded-xl mb-2 text-sm"><span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0">${i + 1}</span><span>${esc(m)}</span></div>`).join('');
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
  selectedDate: '2026-11-11',
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
  if (me && me.year) {
    calState.enrolledYear = Number(me.year) || 2;
    if (!calState.selectedYear) calState.selectedYear = calState.enrolledYear;
  }
  if (preferredYear) calState.selectedYear = Number(preferredYear);

  // Set today if in 2026/2027 or default to 2026-11-11
  const t = today();
  if (t && (t.startsWith('2026') || t.startsWith('2027'))) {
    calState.selectedDate = t;
    const [yStr, mStr] = t.split('-');
    calState.currentMonth = new Date(Number(yStr), Number(mStr) - 1, 1);
  }

  // Update enrolled year badge in header
  const enBadge = $('calEnrolledYearBadge');
  if (enBadge) {
    enBadge.textContent = `Enrolled: Year ${calState.enrolledYear} (Sem ${calState.enrolledYear * 2})`;
  }

  // Update Year Cards active styling
  updateYearCardsUI();

  // Fetch annual calendar data from backend
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
  for (let y = 1; y <= 4; y++) {
    const card = $(`calYearCard-${y}`);
    const tag = $(`calEnrolledTag-${y}`);
    if (tag) {
      if (y === calState.enrolledYear) tag.classList.remove('hidden');
      else tag.classList.add('hidden');
    }
    if (card) {
      if (y === calState.selectedYear) {
        card.classList.add('border-indigo-600', 'bg-indigo-50/70', 'dark:bg-indigo-950/60', 'ring-2', 'ring-indigo-500/20', 'shadow-md');
        card.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-slate-50', 'dark:bg-slate-800/80');
      } else {
        card.classList.remove('border-indigo-600', 'bg-indigo-50/70', 'dark:bg-indigo-950/60', 'ring-2', 'ring-indigo-500/20', 'shadow-md');
        card.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-slate-50', 'dark:bg-slate-800/80');
      }
    }
  }
}

window.switchCalendarYear = async function (year) {
  calState.selectedYear = Number(year);
  updateYearCardsUI();
  await window.loadAcademicCalendar(calState.selectedYear);
  toast(`Switched to Year ${year} Working Mechanism & Academic Calendar.`, 'info');
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
    calState.currentMonth = new Date(2027, 0, 1); // Jan 2027
  }

  renderCalendarMonthGrid();
  renderCalendarYearMatrix();
  renderCalendarAgenda();
};

window.switchCalendarView = function (view) {
  calState.activeView = view;
  ['month', 'year', 'agenda'].forEach(v => {
    const container = $(`calViewContainer-${v}`);
    const tab = $(`tabView-${v}`);
    if (container) {
      if (v === view) container.classList.remove('hidden');
      else container.classList.add('hidden');
    }
    if (tab) {
      if (v === view) {
        tab.classList.add('active', 'bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-400', 'shadow-sm');
        tab.classList.remove('text-slate-600', 'dark:text-slate-400');
      } else {
        tab.classList.remove('active', 'bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-400', 'shadow-sm');
        tab.classList.add('text-slate-600', 'dark:text-slate-400');
      }
    }
  });

  const monthNav = $('calMonthNavControls');
  if (monthNav) {
    if (view === 'month') monthNav.classList.remove('opacity-30', 'pointer-events-none');
    else monthNav.classList.add('opacity-30', 'pointer-events-none');
  }
};

window.filterCalendarCategory = function (category, btn) {
  calState.activeCategory = category;
  document.querySelectorAll('.cal-cat-pill').forEach(b => {
    b.classList.remove('active', 'bg-slate-800', 'text-white', 'dark:bg-slate-700');
  });
  if (btn) btn.classList.add('active', 'bg-slate-800', 'text-white', 'dark:bg-slate-700');

  renderCalendarMonthGrid();
  renderCalendarAgenda();
};

window.changeCalendarMonth = function (delta) {
  const cur = calState.currentMonth;
  calState.currentMonth = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
  renderCalendarMonthGrid();
};

window.jumpToCalendarToday = function () {
  const t = today();
  const [yStr, mStr] = t.split('-');
  calState.currentMonth = new Date(Number(yStr), Number(mStr) - 1, 1);
  calState.selectedDate = t;
  renderCalendarMonthGrid();
  window.selectCalendarDate(t);
};

function renderCalendarKpis() {
  if (!calState.data || !calState.data.kpis) return;
  const kpis = calState.data.kpis;

  const wdVal = $('kpiWorkingDaysVal');
  if (wdVal) wdVal.innerHTML = `${kpis.elapsedWorkingDays} <span class="text-sm font-bold text-slate-400">/ ${kpis.totalWorkingDays} Days</span>`;

  const wdBar = $('kpiWorkingDaysBar');
  if (wdBar) wdBar.style.width = `${kpis.progressPercent}%`;

  const wdRem = $('kpiWorkingDaysRemain');
  if (wdRem) wdRem.textContent = `${kpis.remainingWorkingDays} days left`;

  const phTitle = $('kpiActivePhaseTitle');
  if (phTitle) phTitle.textContent = kpis.activePhase || 'Core Instruction Block';

  const phDesc = $('kpiActivePhaseDesc');
  if (phDesc) phDesc.textContent = kpis.activePhaseDetails || 'University instructional and review phase.';

  const exCount = $('kpiExamCountdown');
  if (exCount) exCount.textContent = kpis.daysUntilNextExam > 0 ? `In ${kpis.daysUntilNextExam} Days` : 'In Progress';

  const exTitle = $('kpiExamTitle');
  if (exTitle) exTitle.textContent = kpis.nextExamTitle;

  const exDate = $('kpiExamDate');
  if (exDate) exDate.textContent = `${kpis.nextExamDate} · 50 Marks`;

  const attCut = $('kpiAttendanceAuditDate');
  if (attCut) attCut.textContent = `Audit Cutoff: ${kpis.attendanceCutoffDate}`;
}

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

function renderCalendarMonthGrid() {
  const grid = $('calMonthGrid');
  if (!grid || !calState.data) return;

  const cur = calState.currentMonth;
  const year = cur.getFullYear();
  const month = cur.getMonth();

  const titleEl = $('calCurrentMonthTitle');
  if (titleEl) titleEl.textContent = `${CAL_MONTHS[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Convert Sunday=0 to Monday=0 (Mon=0, Tue=1, ..., Sun=6)
  const shiftIndex = (firstDayWeekday + 6) % 7;

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();

  const allEvents = calState.data.events || [];
  const eventsByDate = {};
  allEvents.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  let html = '';

  // Leading empty / prev-month cells
  for (let i = shiftIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    html += `
      <div class="min-h-[92px] p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 opacity-30 select-none">
        <span class="text-xs font-semibold text-slate-400">${dNum}</span>
      </div>
    `;
  }

  // Current month active cells
  const todayStr = today();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = (shiftIndex + day - 1) % 7; // 0=Mon, 5=Sat, 6=Sun
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === calState.selectedDate;
    const isSunday = dayOfWeek === 6;

    // Filter events by selected category & term
    let dayEvents = eventsByDate[dateStr] || [];
    if (calState.activeCategory !== 'all') {
      dayEvents = dayEvents.filter(e => e.type === calState.activeCategory);
    }
    if (calState.selectedTerm === 'odd') {
      dayEvents = dayEvents.filter(e => e.sem === 'odd' || e.sem === 1 || e.sem === 3 || e.sem === 5 || e.sem === 7 || e.sem === 'all');
    } else if (calState.selectedTerm === 'even') {
      dayEvents = dayEvents.filter(e => e.sem === 'even' || e.sem === 2 || e.sem === 4 || e.sem === 6 || e.sem === 8 || e.sem === 'all');
    }

    // Determine cell border/ring styling
    let cellClasses = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-indigo-400';
    if (isSelected) {
      cellClasses = 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/50 shadow-md';
    } else if (isToday) {
      cellClasses = 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20';
    } else if (isSunday) {
      cellClasses = 'border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60';
    }

    // Badges / pills rendering
    let pillsHtml = '';
    dayEvents.slice(0, 2).forEach(ev => {
      let badgeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
      if (ev.type === 'exam') badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold';
      else if (ev.type === 'assignment') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold';
      else if (ev.type === 'holiday') badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold';
      else if (ev.type === 'placement') badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold';

      pillsHtml += `
        <div class="px-1.5 py-0.5 rounded text-[10px] truncate ${badgeColor}" title="${esc(ev.title)}">
          ${esc(ev.title)}
        </div>
      `;
    });

    if (dayEvents.length > 2) {
      pillsHtml += `
        <div class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 text-right pr-1">
          +${dayEvents.length - 2} more
        </div>
      `;
    }

    // Instructional Day indicator (if regular teaching day Mon-Fri)
    let instTag = '';
    if (!isSunday && dayEvents.length === 0) {
      instTag = `<span class="text-[9px] font-bold text-slate-300 dark:text-slate-600">Lecture</span>`;
    }

    html += `
      <div class="cal-day-cell min-h-[96px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${cellClasses}" onclick="window.selectCalendarDate('${dateStr}')">
        <div class="flex items-center justify-between mb-1">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isToday ? 'bg-indigo-600 text-white' : (isSunday ? 'text-rose-500' : 'text-slate-800 dark:text-white')}">
            ${day}
          </span>
          ${instTag}
        </div>
        <div class="space-y-1 overflow-hidden">
          ${pillsHtml}
        </div>
      </div>
    `;
  }

  // Trailing next-month cells
  const totalRendered = shiftIndex + daysInMonth;
  const trailingCells = (7 - (totalRendered % 7)) % 7;
  for (let i = 1; i <= trailingCells; i++) {
    html += `
      <div class="min-h-[92px] p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 opacity-30 select-none">
        <span class="text-xs font-semibold text-slate-400">${i}</span>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function renderCalendarYearMatrix() {
  const container = $('calYearMatrixGrid');
  if (!container || !calState.data) return;

  const months = [
    { name: 'August 2026', y: 2026, m: 7, term: 'Odd Sem', tag: 'Term Start' },
    { name: 'September 2026', y: 2026, m: 8, term: 'Odd Sem', tag: 'CIE-1 Week' },
    { name: 'October 2026', y: 2026, m: 9, term: 'Odd Sem', tag: 'Attendance Audit' },
    { name: 'November 2026', y: 2026, m: 10, term: 'Odd Sem', tag: 'CIE-2 / Review' },
    { name: 'December 2026', y: 2026, m: 11, term: 'Odd Sem', tag: 'SEE Finals' },
    { name: 'January 2027', y: 2027, m: 0, term: 'Even Sem', tag: 'Even Sem Start' },
    { name: 'February 2027', y: 2027, m: 1, term: 'Even Sem', tag: 'Core Sprints' },
    { name: 'March 2027', y: 2027, m: 2, term: 'Even Sem', tag: 'Tech Fest & CIE-1' },
    { name: 'April 2027', y: 2027, m: 3, term: 'Even Sem', tag: 'CIE-2 / Pre-SEE' },
    { name: 'May 2027', y: 2027, m: 4, term: 'Even Sem', tag: 'Even SEE Finals' },
    { name: 'June 2027', y: 2027, m: 5, term: 'Vacation', tag: 'Internship Drive' },
    { name: 'July 2027', y: 2027, m: 6, term: 'Vacation', tag: 'Summer Recess' },
  ];

  const allEvents = calState.data.events || [];

  container.innerHTML = months.map(mon => {
    const prefix = `${mon.y}-${String(mon.m + 1).padStart(2, '0')}`;
    const evCount = allEvents.filter(e => e.date.startsWith(prefix)).length;
    const examCount = allEvents.filter(e => e.date.startsWith(prefix) && e.type === 'exam').length;
    const holCount = allEvents.filter(e => e.date.startsWith(prefix) && e.type === 'holiday').length;

    let termColor = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    if (mon.term === 'Even Sem') termColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    else if (mon.term === 'Vacation') termColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';

    return `
      <div class="cursor-pointer p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-400 hover:shadow-md transition" onclick="window.jumpToMatrixMonth(${mon.y}, ${mon.m})">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-black text-slate-800 dark:text-white">${mon.name}</span>
          <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded ${termColor}">${mon.term}</span>
        </div>
        <p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">${mon.tag}</p>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
          <div><p class="font-extrabold text-slate-700 dark:text-slate-300">${evCount}</p><p class="text-slate-400">Events</p></div>
          <div><p class="font-extrabold text-rose-600 dark:text-rose-400">${examCount}</p><p class="text-slate-400">Exams</p></div>
          <div><p class="font-extrabold text-emerald-600 dark:text-emerald-400">${holCount}</p><p class="text-slate-400">Holidays</p></div>
        </div>
      </div>
    `;
  }).join('');
}

window.jumpToMatrixMonth = function (y, m) {
  calState.currentMonth = new Date(y, m, 1);
  window.switchCalendarView('month');
  renderCalendarMonthGrid();
};

function renderCalendarAgenda() {
  const container = $('calAgendaList');
  const countEl = $('calAgendaCount');
  if (!container || !calState.data) return;

  let events = [...(calState.data.events || [])];
  if (calState.activeCategory !== 'all') {
    events = events.filter(e => e.type === calState.activeCategory);
  }
  if (calState.selectedTerm === 'odd') {
    events = events.filter(e => e.sem === 'odd' || e.sem === 1 || e.sem === 3 || e.sem === 5 || e.sem === 7 || e.sem === 'all');
  } else if (calState.selectedTerm === 'even') {
    events = events.filter(e => e.sem === 'even' || e.sem === 2 || e.sem === 4 || e.sem === 6 || e.sem === 8 || e.sem === 'all');
  }

  if (countEl) countEl.textContent = `${events.length} Scheduled Events`;

  if (!events.length) {
    container.innerHTML = empty('No scheduled events found for this filter criteria.');
    return;
  }

  container.innerHTML = events.map(e => {
    let icon = 'fa-calendar';
    let iconBg = 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400';
    if (e.type === 'exam') {
      icon = 'fa-file-pen';
      iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400';
    } else if (e.type === 'assignment') {
      icon = 'fa-diagram-project';
      iconBg = 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
    } else if (e.type === 'holiday') {
      icon = 'fa-champagne-glasses';
      iconBg = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400';
    } else if (e.type === 'placement') {
      icon = 'fa-briefcase';
      iconBg = 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400';
    }

    return `
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-indigo-400 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 text-base">
            <i class="fas ${icon}"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${esc(e.date)}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${iconBg}">${esc((e.type || 'Event').toUpperCase())}</span>
              ${e.weight ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">${esc(e.weight)}</span>` : ''}
            </div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-1">${esc(e.title)}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${esc(e.details || e.desc || '')}</p>
            <div class="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
              <span><i class="fas fa-clock mr-1"></i> ${esc(e.time || 'Schedule time')}</span>
              <span><i class="fas fa-location-dot mr-1"></i> ${esc(e.location || 'Campus')}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5" onclick="window.openAcademicEventModal('${e.id}')">
            <i class="fas fa-eye"></i> Details
          </button>
          <button class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5" onclick="window.addSingleEventToPlanner('${e.id}')">
            <i class="fas fa-plus"></i> Planner
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.selectCalendarDate = function (dateStr) {
  calState.selectedDate = dateStr;

  const titleEl = $('calDayBriefingTitle');
  if (titleEl) titleEl.textContent = fdateFull(dateStr);

  if (!calState.data) return;

  const allEvents = calState.data.events || [];
  const dayEvents = allEvents.filter(e => e.date === dateStr);

  const countEl = $('calDayEventsCount');
  if (countEl) countEl.textContent = `${dayEvents.length} Activity${dayEvents.length === 1 ? '' : 'ies'}`;

  // Calculate day index relative to Aug 01, 2026
  const startDate = new Date('2026-08-01T00:00:00');
  const thisDate = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.max(0, Math.floor((thisDate - startDate) / (1000 * 60 * 60 * 24)));
  const dayIndex = Math.min(90, Math.max(1, Math.round(diffDays * (5 / 7))));

  const badgeEl = $('calDayInstructionalBadge');
  if (badgeEl) badgeEl.textContent = `Day #${dayIndex} of 90`;

  // Determine stage context for this date
  const mech = calState.data.mechanism;
  const stageEl = $('calDayMechStage');
  const notesEl = $('calDayMechNotes');
  if (mech && stageEl && notesEl) {
    const stage = mech.stages[Math.min(mech.stages.length - 1, Math.floor(dayIndex / 10))] || mech.stages[0];
    stageEl.textContent = stage.title;
    notesEl.textContent = stage.details;
  }

  // Populate events list for this day
  const listEl = $('calDayEventsList');
  if (listEl) {
    if (!dayEvents.length) {
      listEl.innerHTML = `
        <div class="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <p class="text-xs text-slate-400 font-medium">Regular instructional timetable schedule.</p>
          <p class="text-[11px] text-slate-400 mt-0.5">No examinations or project deadlines on this day.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = dayEvents.map(e => `
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-start justify-between gap-2.5">
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">${esc(e.type)}</span>
              <span class="text-[10px] font-bold text-slate-500">${esc(e.time || '09:00 AM')}</span>
            </div>
            <h5 class="text-xs font-bold text-slate-900 dark:text-white mb-0.5">${esc(e.title)}</h5>
            <p class="text-[10px] text-slate-500 dark:text-slate-400"><i class="fas fa-location-dot mr-1"></i> ${esc(e.location || 'Campus')}</p>
          </div>
          <button class="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-xs shrink-0 transition" title="Inspect" onclick="window.openAcademicEventModal('${e.id}')">
            <i class="fas fa-arrow-up-right-from-square"></i>
          </button>
        </div>
      `).join('');
    }
  }
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
  const c = await api('/curriculum?sem=' + (val('curriculumSemFilter') || 4));
  $('curriculumCgpa').textContent = c.cgpa?.toFixed(2) ?? '--'; $('curriculumCredits').textContent = c.credits; $('curriculumBacklogs').textContent = c.backlogs;
  $('curriculumGrid').innerHTML = c.subjects.map((s) => `<button type="button" class="text-left w-full border rounded-xl p-3 mb-2 hover:border-indigo-400" onclick='showOutcomes(${JSON.stringify(s).replace(/'/g, '&#39;')})'><b>${esc(s.code)} · ${esc(s.name)}</b><p class="text-xs text-gray-400">${s.credits} credits ${s.grade ? '· Grade ' + s.grade : s.internal != null ? '· Internal ' + s.internal + '/25' : ''}</p></button>`).join('');
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
