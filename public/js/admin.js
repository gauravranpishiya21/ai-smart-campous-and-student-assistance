/* Smart Campus AI - Enterprise Administration Console Core Controller */
const API_BASE = '/api';
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fdate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };
const val = (id) => ($(id)?.value ?? '').trim();

// Toast notification system
function toast(msg, type = 'ok') {
  let box = $('toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:380px;pointer-events:none;';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.style.pointerEvents = 'auto';
  t.className = `px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${
    type === 'err' ? 'bg-rose-600' : type === 'warn' ? 'bg-amber-600' : 'bg-emerald-600'
  }`;
  const icon = type === 'err' ? 'fa-circle-exclamation' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
  t.innerHTML = `<i class="fas ${icon} text-base"></i><span>${esc(msg)}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => {
    t.classList.remove('translate-y-2', 'opacity-0');
  });
  setTimeout(() => {
    t.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

function openModal(id) {
  const m = $(id);
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}
function closeModal(id) {
  const m = $(id);
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

// Token & API fetcher
function token() {
  try {
    return localStorage.getItem('token') || localStorage.getItem('admin_token') || null;
  } catch {
    return null;
  }
}

async function api(path, opts = {}) {
  const clean = path.startsWith('/') ? path : '/' + path;
  const res = await fetch(API_BASE + clean, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: 'Bearer ' + token() } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }

  if (res.status === 401 && !opts.noAuthRedirect) {
    showAdminLogin();
    throw new Error(data?.message || 'Admin login required.');
  }
  if (res.status === 403) {
    showAdminLogin('Admin privileges required. Please sign in with ADMIN001.');
    throw new Error(data?.message || 'Admin privileges required.');
  }
  if (!res.ok) {
    throw new Error(data?.message || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

// ---------- State ----------
let currentAdmin = null;
let cachedStudents = [];
let cachedAttendance = [];
let cachedFees = null;
let charts = {};

function renderChart(id, cfg) {
  if (typeof Chart === 'undefined' || !$(id)) return;
  if (charts[id]) {
    charts[id].destroy();
  }
  Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b';
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
  charts[id] = new Chart($(id), cfg);
}

// ---------- Navigation ----------
function showSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  const sec = $(id);
  if (!sec) return;
  sec.classList.remove('hidden');

  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const target = item.getAttribute('data-sec');
    const active = target === id;
    item.classList.toggle('bg-indigo-600', active);
    item.classList.toggle('text-white', active);
    item.classList.toggle('text-slate-400', !active);
    item.classList.toggle('hover:bg-slate-800', !active);
  });

  try { history.replaceState(null, '', '#' + id); } catch {}
  window.scrollTo({ top: 0 });

  // Trigger section loader
  if (id === 'sec-overview') loadOverview();
  else if (id === 'sec-students') loadStudents();
  else if (id === 'sec-attendance') loadAttendance();
  else if (id === 'sec-academics') loadAcademics();
  else if (id === 'sec-fees') loadFees();
  else if (id === 'sec-notices') loadNotices();
  else if (id === 'sec-tickets') loadTickets();
  else if (id === 'sec-leaves') loadLeaves();
  else if (id === 'sec-automation') loadAutomation();
  else if (id === 'sec-audit') loadAudit();
  else if (id === 'sec-library' || id === 'digital-library') { if (typeof window.loadDigitalLibraryFiles === 'function') window.loadDigitalLibraryFiles(); }
}

// ---------- Section 1: Overview ----------
async function loadOverview() {
  try {
    const data = await api('/admin/overview');
    const k = data.kpis;

    $('kpiStudents').textContent = k.totalStudents;
    $('kpiFaculty').textContent = k.totalFaculty;
    $('kpiSubjects').textContent = k.totalSubjects;
    $('kpiAttendance').textContent = k.avgAttendance + '%';
    $('kpiAtRisk').textContent = k.atRiskCount;
    $('kpiAssessed').textContent = inr(k.totalAssessed);
    $('kpiCollected').textContent = inr(k.totalPaid);
    $('kpiDues').textContent = inr(k.totalDues);
    $('kpiOpenTickets').textContent = k.openTickets;
    $('kpiPendingLeaves').textContent = k.pendingLeaves;
    $('aiEngineBadge').textContent = k.aiModel;

    // Chart 1: Attendance Health
    renderChart('chartAttendanceHealth', {
      type: 'doughnut',
      data: {
        labels: ['Safe Attendance (≥75%)', 'Shortage (<75%)'],
        datasets: [{
          data: [Math.max(0, k.totalStudents - k.atRiskCount), k.atRiskCount],
          backgroundColor: ['#10b981', '#f43f5e'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: '600' } } }
        },
        cutout: '72%'
      }
    });

    // Chart 2: Departments Breakdown
    const deptLabels = Object.keys(data.depts);
    const deptValues = Object.values(data.depts);
    renderChart('chartDeptEnrollment', {
      type: 'bar',
      data: {
        labels: deptLabels.map(l => l.replace('Computer Science & Engineering', 'CSE')),
        datasets: [{
          label: 'Students Enrolled',
          data: deptValues,
          backgroundColor: '#6366f1',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(148,163,184,.1)' } },
          x: { grid: { display: false } }
        }
      }
    });

    // Recent automation log snippet
    const autoList = $('overviewAutomationList');
    if (autoList) {
      autoList.innerHTML = data.recentAutomation.length ? data.recentAutomation.map(l => `
        <div class="flex items-center justify-between text-xs py-2 border-b border-slate-700/50">
          <span class="font-mono text-indigo-400 font-bold">${esc(l.job)}</span>
          <span class="text-slate-400 truncate max-w-[200px]">${esc(l.detail)}</span>
          <span class="text-slate-500 font-mono">${esc(l.created_at ? l.created_at.slice(11, 16) : '')}</span>
        </div>
      `).join('') : '<p class="text-xs text-slate-500 italic p-3">No recent automation records.</p>';
    }

  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 2: Student Directory ----------
async function loadStudents() {
  try {
    $('studentTableBody').innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading student directory...</td></tr>';
    cachedStudents = await api('/admin/students');
    renderStudentTable();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function renderStudentTable() {
  const query = val('studentSearch').toLowerCase();
  const deptFilter = val('studentDeptFilter');
  const riskFilter = val('studentRiskFilter');

  const filtered = cachedStudents.filter(s => {
    const matchQ = (s.name + s.roll_no + s.email).toLowerCase().includes(query);
    const matchDept = !deptFilter || s.dept === deptFilter;
    const matchRisk = !riskFilter || s.riskLevel === riskFilter;
    return matchQ && matchDept && matchRisk;
  });

  $('studentCountPill').textContent = `${filtered.length} students found`;

  const tbody = $('studentTableBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400 italic">No matching students found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isShortage = s.attendance < 75;
    const riskBadge = s.riskLevel === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : s.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

    return `
      <tr class="border-b border-slate-700/50 hover:bg-slate-800/40 transition">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
              ${esc(s.name.charAt(0))}
            </div>
            <div>
              <p class="font-bold text-slate-200 text-sm">${esc(s.name)}</p>
              <p class="text-xs text-slate-400">${esc(s.email)}</p>
            </div>
          </div>
        </td>
        <td class="p-4 font-mono font-bold text-xs text-indigo-300">${esc(s.roll_no)}</td>
        <td class="p-4 text-xs text-slate-300">
          <span class="truncate block max-w-[160px]">${esc(s.dept)}</span>
          <span class="text-[10px] text-slate-500">Yr ${s.year} · Sem ${s.semester}</span>
        </td>
        <td class="p-4">
          <div class="w-28">
            <div class="flex justify-between text-xs mb-1">
              <span class="font-bold ${isShortage ? 'text-rose-400' : 'text-emerald-400'}">${s.attendance}%</span>
              <span class="text-[10px] text-slate-500">${isShortage ? 'DEFICIT' : 'SAFE'}</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full ${isShortage ? 'bg-rose-500' : 'bg-emerald-500'}" style="width:${Math.min(100, s.attendance)}%"></div>
            </div>
          </div>
        </td>
        <td class="p-4 text-sm font-bold text-slate-200">${s.avgMarks}%</td>
        <td class="p-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${riskBadge}">
            ${esc(s.riskLevel)}
          </span>
        </td>
        <td class="p-4 text-xs font-mono text-slate-400">Lv ${s.level} · ${s.xp} XP</td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="p-1.5 rounded-lg bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition text-xs" title="Edit Student" onclick="openEditStudent(${s.id})">
              <i class="fas fa-pencil"></i>
            </button>
            <button class="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-600 text-slate-300 hover:text-white transition text-xs" title="Delete Student" onclick="deleteStudent(${s.id}, '${esc(s.name)}')">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Student CRUD Actions
async function submitAddStudent() {
  const name = val('addName');
  const roll = val('addRoll');
  const email = val('addEmail');
  const pass = val('addPass') || 'student123';
  const dept = val('addDept');
  const sem = val('addSem');
  const year = val('addYear');
  const role = val('addRole') || 'student';

  if (!name || !roll || !email) {
    return toast('Please enter name, roll number, and email.', 'warn');
  }

  try {
    const res = await api('/admin/students', {
      body: { name, roll_no: roll, email, password: pass, dept, semester: sem, year, role }
    });
    toast(res.message);
    closeModal('modalAddStudent');
    loadStudents();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function openEditStudent(id) {
  const s = cachedStudents.find(x => x.id === id);
  if (!s) return;
  $('editStudentId').value = s.id;
  $('editName').value = s.name;
  $('editRoll').value = s.roll_no;
  $('editEmail').value = s.email;
  $('editDept').value = s.dept;
  $('editSem').value = s.semester;
  $('editYear').value = s.year;
  $('editXp').value = s.xp;
  $('editRole').value = s.role;
  $('editPass').value = '';
  openModal('modalEditStudent');
}

async function submitEditStudent() {
  const id = $('editStudentId').value;
  const body = {
    name: val('editName'),
    email: val('editEmail'),
    dept: val('editDept'),
    semester: val('editSem'),
    year: val('editYear'),
    xp: val('editXp'),
    role: val('editRole'),
    password: val('editPass') || undefined
  };

  try {
    const res = await api('/admin/students/' + id, { method: 'PUT', body });
    toast(res.message);
    closeModal('modalEditStudent');
    loadStudents();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete student "${name}"? This will delete all attendance, marks, and registration records.`)) {
    return;
  }
  try {
    const res = await api('/admin/students/' + id, { method: 'DELETE' });
    toast(res.message);
    loadStudents();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function exportStudentsCSV() {
  if (!cachedStudents.length) return toast('No students to export', 'warn');
  const headers = ['ID', 'Roll No', 'Name', 'Email', 'Department', 'Year', 'Semester', 'Attendance %', 'Average Marks', 'Risk Level', 'XP'];
  const rows = cachedStudents.map(s => [
    s.id, `"${s.roll_no}"`, `"${s.name}"`, `"${s.email}"`, `"${s.dept}"`, s.year, s.semester, s.attendance, s.avgMarks, s.riskLevel, s.xp
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SmartCampus_Students_${today()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast('Student directory exported to CSV.');
}

// ---------- Section 3: Attendance Control & Deficit Scanner ----------
async function loadAttendance() {
  try {
    cachedAttendance = await api('/admin/attendance');
    renderAttendanceView();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function renderAttendanceView() {
  const shortageList = cachedAttendance.filter(s => s.isShortage);
  $('shortageCountBadge').textContent = `${shortageList.length} Students below 75%`;

  // Deficit scanner table
  const tbody = $('deficitTableBody');
  if (!shortageList.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-emerald-400 font-bold"><i class="fas fa-shield-heart text-2xl mb-2 block"></i>Outstanding! All students meet the minimum 75% attendance threshold.</td></tr>';
  } else {
    tbody.innerHTML = shortageList.map(s => `
      <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
        <td class="p-4 font-mono font-bold text-indigo-300 text-xs">${esc(s.roll_no)}</td>
        <td class="p-4">
          <p class="font-bold text-slate-200 text-sm">${esc(s.name)}</p>
          <p class="text-xs text-slate-400">${esc(s.dept)}</p>
        </td>
        <td class="p-4 font-bold text-rose-400 text-sm">${s.overallPct}%</td>
        <td class="p-4 text-xs text-slate-300">${s.attended} / ${s.classes} classes</td>
        <td class="p-4">
          <div class="space-y-1">
            ${s.shortageSubjects.map(sub => `
              <div class="text-[11px] flex items-center justify-between gap-3 bg-slate-800 px-2.5 py-1 rounded-lg">
                <span class="font-bold text-slate-300">${esc(sub.code)}: <span class="text-rose-400">${sub.pct}%</span></span>
                <span class="text-amber-400 font-semibold">Attend next ${sub.needed} classes</span>
              </div>
            `).join('')}
          </div>
        </td>
        <td class="p-4 text-right">
          <button class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition" onclick="openOverrideModal(${s.studentId}, '${esc(s.name)}')">
            <i class="fas fa-hand-holding-medical mr-1"></i> Override
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Populate student select in override modal
  const select = $('overrideStudentSelect');
  if (select) {
    select.innerHTML = '<option value="">-- Choose Student --</option>' + cachedAttendance.map(s => `
      <option value="${s.studentId}">${esc(s.roll_no)} - ${esc(s.name)} (${s.overallPct}%)</option>
    `).join('');
  }
}

function openOverrideModal(sid, name) {
  if (sid) $('overrideStudentSelect').value = sid;
  openModal('modalAttendanceOverride');
}

async function submitAttendanceOverride() {
  const sid = val('overrideStudentSelect');
  const addAtt = val('overrideAddAttended');
  const reason = val('overrideReason');

  if (!sid) return toast('Please select a student.', 'warn');
  if (!addAtt) return toast('Enter number of sessions to add.', 'warn');

  try {
    const res = await api('/admin/attendance/override', {
      body: {
        studentId: sid,
        addAttended: Number(addAtt),
        reason: reason || 'Administrative duty exemption / medical leave'
      }
    });
    toast(res.message);
    closeModal('modalAttendanceOverride');
    loadAttendance();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 4: Academics & Grading ----------
async function loadAcademics() {
  try {
    const data = await api('/admin/academics');
    const tbody = $('academicsTableBody');
    if (!data.marks.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400">No marks entered yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.marks.map(m => `
      <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
        <td class="p-4 font-mono font-bold text-indigo-300 text-xs">${esc(m.roll_no)}</td>
        <td class="p-4 font-bold text-slate-200 text-sm">${esc(m.student_name)}</td>
        <td class="p-4 text-xs text-slate-300">
          <span class="font-bold">${esc(m.subject_code)}</span> · ${esc(m.subject_name)}
        </td>
        <td class="p-4 font-bold ${m.internal >= 15 ? 'text-emerald-400' : 'text-rose-400'} text-sm">${m.internal} / 25</td>
        <td class="p-4 text-sm text-slate-300 font-semibold">${m.endsem != null ? m.endsem + ' / 75' : '<span class="text-slate-500 italic">Pending</span>'}</td>
        <td class="p-4 text-xs text-slate-400 font-mono">${m.assign_done} / ${m.assign_total} done</td>
        <td class="p-4 text-right">
          <button class="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-200 text-xs font-bold transition" onclick="openMarksModal(${m.user_id}, ${m.subject_id}, '${esc(m.student_name)}', '${esc(m.subject_code)}', ${m.internal}, ${m.endsem || 0}, ${m.assign_done})">
            Edit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast(err.message, 'err');
  }
}

function openMarksModal(userId, subId, sName, subCode, internal, endsem, assignDone) {
  $('marksUserId').value = userId;
  $('marksSubjectId').value = subId;
  $('marksTargetTitle').textContent = `${sName} · ${subCode}`;
  $('marksInternal').value = internal;
  $('marksEndsem').value = endsem || '';
  $('marksAssignments').value = assignDone;
  openModal('modalEditMarks');
}

async function submitMarksUpdate() {
  const userId = $('marksUserId').value;
  const subId = $('marksSubjectId').value;
  const internal = val('marksInternal');
  const endsem = val('marksEndsem');
  const assignDone = val('marksAssignments');

  try {
    const res = await api('/admin/marks/update', {
      body: {
        studentId: userId,
        subjectId: subId,
        internal: Number(internal),
        endsem: endsem === '' ? null : Number(endsem),
        assignDone: Number(assignDone),
        assignTotal: 5
      }
    });
    toast(res.message);
    closeModal('modalEditMarks');
    loadAcademics();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 5: Finance & Fee Ledgers ----------
async function loadFees() {
  try {
    cachedFees = await api('/admin/fees');
    $('feeTotalAssessed').textContent = inr(cachedFees.totals.assessed);
    $('feeTotalPaid').textContent = inr(cachedFees.totals.paid);
    $('feeTotalDue').textContent = inr(cachedFees.totals.due);

    // Populate student selector in fee modal
    $('recordFeeStudent').innerHTML = '<option value="">-- Select Student --</option>' + cachedFees.ledgers.map(s => `
      <option value="${s.studentId}">${esc(s.roll_no)} - ${esc(s.name)} (Due: ${inr(s.due)})</option>
    `).join('');

    renderFeeTable();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function renderFeeTable() {
  const tbody = $('feesTableBody');
  if (!cachedFees || !cachedFees.ledgers.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400">No fee ledgers found.</td></tr>';
    return;
  }

  tbody.innerHTML = cachedFees.ledgers.map(s => `
    <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
      <td class="p-4 font-mono font-bold text-indigo-300 text-xs">${esc(s.roll_no)}</td>
      <td class="p-4 font-bold text-slate-200 text-sm">${esc(s.name)}</td>
      <td class="p-4 text-xs text-slate-300">${esc(s.dept)}</td>
      <td class="p-4 text-sm text-slate-300 font-semibold">${inr(s.assessed)}</td>
      <td class="p-4 text-sm font-bold text-emerald-400">${inr(s.paid)}</td>
      <td class="p-4 text-sm font-bold ${s.due > 0 ? 'text-rose-400' : 'text-slate-500'}">${inr(s.due)}</td>
      <td class="p-4 text-right">
        <button class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition" onclick="openPaymentForStudent(${s.studentId})">
          <i class="fas fa-receipt mr-1"></i> Record
        </button>
      </td>
    </tr>
  `).join('');
}

function openPaymentForStudent(sid) {
  $('recordFeeStudent').value = sid;
  openModal('modalRecordFee');
}

async function submitRecordPayment() {
  const sid = val('recordFeeStudent');
  const sem = val('recordFeeSemester');
  const amount = val('recordFeeAmount');
  const mode = val('recordFeeMode');
  const remarks = val('recordFeeRemarks');

  if (!sid || !amount || Number(amount) <= 0) {
    return toast('Please select student and enter a valid positive amount.', 'warn');
  }

  try {
    const res = await api('/admin/fees/record', {
      body: { studentId: sid, semester: sem, amount: Number(amount), paymentMode: mode, remarks }
    });
    toast(res.message);
    closeModal('modalRecordFee');
    loadFees();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 6: Notices & Campus Bulletins ----------
async function loadNotices() {
  try {
    const list = await api('/admin/notices');
    const container = $('noticesGrid');
    if (!list.length) {
      container.innerHTML = '<p class="col-span-full p-8 text-center text-slate-500 italic">No notices currently published.</p>';
      return;
    }

    container.innerHTML = list.map(n => {
      const prBadge = n.priority === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : n.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

      return `
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${prBadge}">${esc(n.priority)}</span>
              <span class="text-xs text-slate-500">${fdate(n.created_at)}</span>
            </div>
            <h3 class="font-bold text-slate-100 text-base mb-2">${esc(n.title)}</h3>
            <p class="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-3">${esc(n.body)}</p>
            <div class="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-xs">
              <p class="font-bold text-[10px] uppercase text-indigo-400 mb-1 flex items-center gap-1.5">
                <i class="fas fa-wand-magic-sparkles"></i> AI Summary
              </p>
              ${esc(n.summary || 'Summary generated by campus AI model.')}
            </div>
          </div>
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
            <span class="text-[11px] text-slate-500 font-semibold">${esc(n.category)}</span>
            <button class="text-rose-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1" onclick="deleteNotice(${n.id})">
              <i class="fas fa-trash-can"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function submitPublishNotice() {
  const title = val('noticeTitle');
  const body = val('noticeBody');
  const category = val('noticeCategory');
  const priority = val('noticePriority');

  if (!title || !body) return toast('Please provide a title and notice body.', 'warn');

  try {
    const res = await api('/admin/notices', { body: { title, body, category, priority } });
    toast(res.message);
    closeModal('modalAddNotice');
    $('noticeTitle').value = '';
    $('noticeBody').value = '';
    loadNotices();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteNotice(id) {
  if (!confirm('Are you sure you want to remove this notice?')) return;
  try {
    const res = await api('/admin/notices/' + id, { method: 'DELETE' });
    toast(res.message);
    loadNotices();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 7: Grievances & Helpdesk ----------
async function loadTickets() {
  try {
    const list = await api('/admin/tickets');
    const tbody = $('ticketsTableBody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400">No helpdesk tickets on file.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(t => {
      const st = t.status || 'Open';
      const stBadge = st === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : st === 'In Progress' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

      return `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
          <td class="p-4 font-mono font-bold text-xs text-indigo-400">#${t.id}</td>
          <td class="p-4">
            <p class="font-bold text-slate-200 text-sm">${esc(t.title)}</p>
            <p class="text-xs text-slate-400 line-clamp-1">${esc(t.desc)}</p>
          </td>
          <td class="p-4 text-xs text-slate-300">
            <p class="font-semibold">${esc(t.student?.name || 'Student')}</p>
            <p class="text-[10px] text-slate-500 font-mono">${esc(t.student?.roll_no || '')}</p>
          </td>
          <td class="p-4 text-xs text-slate-400">${esc(t.category || 'General')}</td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${stBadge}">${esc(st)}</span>
          </td>
          <td class="p-4 text-xs text-slate-500 font-mono">${fdate(t.created_at)}</td>
          <td class="p-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${st !== 'Resolved' ? `
                <button class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" onclick="updateTicketStatus(${t.id}, 'Resolved')">
                  Resolve
                </button>
              ` : ''}
              ${st === 'Open' ? `
                <button class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs" onclick="updateTicketStatus(${t.id}, 'In Progress')">
                  Assign
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function updateTicketStatus(id, status) {
  try {
    const res = await api(`/admin/tickets/${id}/status`, {
      body: { status, resolution: `Marked ${status} by Administrator.` }
    });
    toast(res.message);
    loadTickets();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 8: Student Leaves Queue ----------
async function loadLeaves() {
  try {
    const list = await api('/admin/leaves');
    const tbody = $('leavesTableBody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">No leave applications submitted.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(l => {
      const st = l.status || 'Pending';
      const stBadge = st === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : st === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

      return `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
          <td class="p-4">
            <p class="font-bold text-slate-200 text-sm">${esc(l.student?.name || 'Student')}</p>
            <p class="text-xs text-slate-400 font-mono">${esc(l.student?.roll_no || '')}</p>
          </td>
          <td class="p-4 text-xs font-semibold text-indigo-300">${fdate(l.from)} — ${fdate(l.to)}</td>
          <td class="p-4 text-xs text-slate-300 max-w-xs">${esc(l.reason)}</td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${stBadge}">${esc(st)}</span>
          </td>
          <td class="p-4 text-xs text-slate-400 italic">${esc(l.remarks || 'None')}</td>
          <td class="p-4 text-right">
            ${st === 'Pending' ? `
              <div class="flex items-center justify-end gap-2">
                <button class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" onclick="reviewLeave(${l.id}, 'Approved')">
                  Approve
                </button>
                <button class="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs" onclick="reviewLeave(${l.id}, 'Rejected')">
                  Reject
                </button>
              </div>
            ` : `<span class="text-xs text-slate-500">Reviewed</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function reviewLeave(id, status) {
  try {
    const res = await api(`/admin/leaves/${id}/review`, { body: { status } });
    toast(res.message);
    loadLeaves();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 9: Automation & AI Control Room ----------
async function loadAutomation() {
  try {
    const data = await api('/admin/automation');
    $('automationModelTitle').textContent = data.model;
    $('automationStatusDot').className = data.llm ? 'w-3 h-3 rounded-full bg-emerald-500 animate-pulse' : 'w-3 h-3 rounded-full bg-indigo-500';

    const grid = $('automationJobsGrid');
    grid.innerHTML = data.jobs.map(j => `
      <div class="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 flex items-center justify-between">
        <div>
          <p class="font-mono font-bold text-sm text-slate-200">${esc(j)}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Automated background daemon job</p>
        </div>
        <button class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition" onclick="triggerJob('${esc(j)}')">
          <i class="fas fa-play mr-1 text-[10px]"></i> Run
        </button>
      </div>
    `).join('');

    const logBox = $('automationLogList');
    logBox.innerHTML = data.logs.length ? data.logs.map(l => `
      <div class="py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <span class="font-mono text-indigo-400 font-bold w-40 truncate">${esc(l.job)}</span>
        <span class="text-slate-300 flex-1 truncate px-4">${esc(l.detail)}</span>
        <span class="text-slate-500 font-mono text-[11px]">${esc(l.created_at)}</span>
      </div>
    `).join('') : '<p class="text-xs text-slate-500 p-4">No automation records.</p>';

  } catch (err) {
    toast(err.message, 'err');
  }
}

async function triggerJob(job) {
  toast(`Executing ${job || 'all jobs'}...`, 'info');
  try {
    const res = await api('/admin/automation/run', { body: { job } });
    toast(res.message);
    loadAutomation();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Section 10: Security Audit Log ----------
async function loadAudit() {
  try {
    const logs = await api('/admin/audit-log');
    const tbody = $('auditTableBody');
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">No login audit logs found.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr class="border-b border-slate-700/50 hover:bg-slate-800/40">
        <td class="p-4 text-xs font-mono text-slate-400">${fdate(l.created_at)}</td>
        <td class="p-4 font-bold text-slate-200 text-sm">${esc(l.user?.name || 'Guest User')}</td>
        <td class="p-4 font-mono text-xs text-indigo-300">${esc(l.user?.roll_no || '-')}</td>
        <td class="p-4 text-xs text-slate-400 font-mono">${esc(l.ip || '127.0.0.1')}</td>
        <td class="p-4 text-xs text-slate-300 truncate max-w-xs">${esc(l.device || 'Browser')}</td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            l.status === 'Success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }">${esc(l.status || 'Success')}</span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------- Admin Auth Overlay ----------
function showAdminLogin(errMsg = '') {
  if ($('adminLoginOverlay')) return;
  const el = document.createElement('div');
  el.id = 'adminLoginOverlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:radial-gradient(circle at 20% 10%,#1e1b4b,#020617 75%);display:flex;align-items:center;justify-content:center;padding:16px;';
  el.innerHTML = `
    <div class="w-full max-w-md rounded-3xl p-8 shadow-2xl border border-indigo-500/20 bg-slate-900 text-slate-100">
      <div class="flex items-center gap-3.5 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-600/40">
          <i class="fas fa-shield-halved"></i>
        </div>
        <div>
          <h1 class="text-xl font-extrabold leading-tight text-white">Campus Administration</h1>
          <p class="text-xs text-slate-400">Security Clearance & Management Portal</p>
        </div>
      </div>
      <form id="adminLoginForm" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Admin ID or Email</label>
          <input id="adminAuthId" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-indigo-500 focus:outline-none" value="ADMIN001" required>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Password</label>
          <input id="adminAuthPass" type="password" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" value="student123" required>
        </div>
        <p id="adminAuthErr" class="text-rose-400 text-xs font-semibold min-h-[1rem]">${esc(errMsg)}</p>
        <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition">
          Authenticate & Enter Console
        </button>
      </form>
      <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Default: <b>ADMIN001</b> / <b>student123</b></span>
        <a href="/" class="text-indigo-400 hover:underline">Student Portal</a>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  $('adminLoginForm').onsubmit = async (e) => {
    e.preventDefault();
    $('adminAuthErr').textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: val('adminAuthId'), password: $('adminAuthPass').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        throw new Error('This account does not possess administrator clearance.');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin_token', data.token);
      el.remove();
      bootAdmin();
    } catch (err) {
      $('adminAuthErr').textContent = err.message;
    }
  };
}

function logoutAdmin() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
  } catch {}
  location.reload();
}

// ---------- Boot ----------
async function bootAdmin() {
  if (!token()) return showAdminLogin();
  try {
    currentAdmin = await api('/auth/me');
    if (currentAdmin.role !== 'admin' && currentAdmin.role !== 'super_admin') {
      return showAdminLogin('Access restricted. Please log in with your Admin credentials.');
    }
  } catch {
    return showAdminLogin();
  }

  if ($('adminNameDisplay')) $('adminNameDisplay').textContent = currentAdmin.name;
  if ($('adminRoleDisplay')) $('adminRoleDisplay').textContent = currentAdmin.roll_no + ' · ' + currentAdmin.role.toUpperCase();
  if ($('adminName')) $('adminName').textContent = currentAdmin.name;

  const startSec = (location.hash || '#sec-overview').slice(1);
  showSection($(startSec) ? startSec : 'sec-overview');
}

document.addEventListener('DOMContentLoaded', () => {
  bootAdmin();
});


// Window exports for UI event handlers
Object.assign(window, {
  showSection,
  openModal,
  closeModal,
  loadOverview,
  loadStudents,
  renderStudentTable,
  submitAddStudent,
  openEditStudent,
  submitEditStudent,
  deleteStudent,
  exportStudentsCSV,
  loadAttendance,
  openOverrideModal,
  submitAttendanceOverride,
  loadAcademics,
  openMarksModal,
  submitMarksUpdate,
  loadFees,
  openPaymentForStudent,
  submitRecordPayment,
  loadNotices,
  submitPublishNotice,
  deleteNotice,
  loadTickets,
  updateTicketStatus,
  loadLeaves,
  reviewLeave,
  loadAutomation,
  triggerJob,
  loadAudit,
  showAdminLogin,
  logoutAdmin,
  bootAdmin
});
