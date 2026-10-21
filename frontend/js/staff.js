const API_BASE = 'http://localhost:5000';

const STAFF_ROLES = ['hod', 'accounts', 'librarian', 'warden', 'principal', 'super_admin', 'admin'];
const staffRoleLevel = {
    principal: 1, super_admin: 1, admin: 1, hod: 2, accounts: 3, librarian: 4, warden: 5
};

let user = null;
let token = localStorage.getItem('token');

try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
} catch (e) { user = null; }

if (!token || !user || !STAFF_ROLES.includes(user.role)) {
    window.location.href = 'index.html';
}

const ROLE_LABEL = {
    hod: 'Head of Department', accounts: 'Accounts Officer', librarian: 'Librarian',
    warden: 'Warden', principal: 'Principal', super_admin: 'Super Admin', admin: 'Administrator'
};

function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function api(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders(), ...options });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
    return data;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '2000';
    if (type === 'error') toast.style.background = '#f43f5e';
    else toast.style.background = '#10b981';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSection(name) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(name);
    if (section) section.classList.remove('hidden');
    document.querySelectorAll('.sidebar-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`.sidebar-item[onclick*="${name}"]`);
    if (nav) nav.classList.add('active');
    const loaders = {
        overview: loadOverview,
        grievances: () => loadGrievances(document.getElementById('grievanceFilter').value || ''),
        certificates: loadCertificates,
        finance: loadFinance,
        insights: loadDirectory,
        directory: loadDirectory
    };
    if (loaders[name]) {
        loaders[name]();
    }
}

function setupRoleGating() {
    const isMgmt = ['admin', 'super_admin', 'principal', 'hod'].includes(user.role);
    document.getElementById('navCertificates').classList.toggle('hidden', !isMgmt);
    document.getElementById('navFinance').classList.toggle('hidden', user.role !== 'accounts');
    document.getElementById('navInsights').classList.toggle('hidden', user.role !== 'hod');
    document.getElementById('helpCert').classList.toggle('hidden', !isMgmt);
    document.getElementById('helpFinance').classList.toggle('hidden', user.role !== 'accounts');

    const titles = {
        hod: 'HOD Console', accounts: 'Accounts Desk', librarian: 'Library Desk',
        warden: 'Hostel & Transport Desk', principal: 'Principal Desktop',
        super_admin: 'Super Admin Console', admin: 'Admin Console'
    };
    document.getElementById('portalTitle').textContent = titles[user.role] || 'Staff Portal';
    document.getElementById('staffName').textContent = user.name || user.mobile || 'Staff Member';
    document.getElementById('staffRole').textContent = ROLE_LABEL[user.role] || user.role;
}

async function loadOverview() {
    try {
        const data = await api('/api/grievances');
        const items = (data.items || []);
        const count = (s) => items.filter(x => x.status === s).length;
        document.getElementById('statOpen').textContent = count('open');
        document.getElementById('statProgress').textContent = count('in_progress');
        document.getElementById('statResolved').textContent = count('resolved');
        const list = document.getElementById('overviewGrievances');
        list.innerHTML = '';
        const recent = items.slice(0, 5);
        if (!recent.length) { list.innerHTML = '<p class="text-cyan-400 text-sm italic">No grievances yet.</p>'; return; }
        recent.forEach(g => {
            const card = document.createElement('div');
            card.className = 'flex items-center justify-between p-3 rounded-lg bg-cyan-50 border border-cyan-100';
            card.innerHTML = `
                <div>
                    <p class="text-sm font-bold text-cyan-950">${escapeHtml(g.title)}</p>
                    <p class="text-[10px] text-cyan-500 font-bold uppercase mt-1">${escapeHtml(g.student_name || '')} · ${escapeHtml(g.category)}</p>
                </div>
                <span class="badge ${g.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${g.priority}</span>`;
            list.appendChild(card);
        });
    } catch (err) {
        document.getElementById('overviewGrievances').innerHTML = `<p class="text-rose-500 text-sm italic">${escapeHtml(err.message)}</p>`;
    }
}

async function loadGrievances(filter = '') {
    const q = filter ? `?status=${encodeURIComponent(filter)}` : '';
    const tbody = document.getElementById('grievancesList');
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-cyan-400 italic">Loading...</td></tr>';
    try {
        const data = await api('/api/grievances' + q);
        const items = data.items || [];
        tbody.innerHTML = '';
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-cyan-400 italic">No grievances match.</td></tr>';
            return;
        }
        items.forEach(g => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-bold text-cyan-800">#${g.id}</td>
                <td class="p-3 text-sm">${escapeHtml(g.student_name || '')}<div class="text-[10px] text-cyan-500 mt-1">${escapeHtml(g.dept_name || '')}</div></td>
                <td class="p-3 text-sm capitalize">${escapeHtml(g.title)}</td>
                <td class="p-3"><span class="badge bg-cyan-50 text-cyan-700 border border-cyan-100">${escapeHtml(g.category)}</span></td>
                <td class="p-3"><span class="badge ${g.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${g.priority}</span></td>
                <td class="p-3">
                    <select data-gid="${g.id}" class="input-field !py-1.5 !px-2 !w-32" onchange="updateGrievanceStatus(${g.id}, this.value)">
                        ${['open', 'in_progress', 'resolved'].map(s => `<option value="${s}" ${g.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
                    </select>
                </td>
                <td class="p-3 text-[10px] text-cyan-500 uppercase font-bold">routed to ${escapeHtml(g.assigned_role)}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-rose-500 italic">${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateGrievanceStatus(id, status) {
    try {
        await api(`/api/grievances/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        showToast('Grievance updated!');
    } catch (err) {
        showToast(err.message, 'error');
        loadGrievances('');
    }
}

async function loadCertificates() {
    const requestsBox = document.getElementById('certRequests');
    const rvBody = document.getElementById('revaluationList');
    requestsBox.innerHTML = '<p class="text-cyan-400 text-sm italic">Loading...</p>';
    rvBody.innerHTML = '<tr><td colspan="4" class="p-4 text-cyan-400 italic">Loading...</td></tr>';
    try {
        const [certData, rvData] = await Promise.all([
            api('/certificates'),
            api('/exams/revaluations')
        ]);
        const docs = certData.items || [];
        requestsBox.innerHTML = '';
        if (!docs.length) requestsBox.innerHTML = '<p class="text-cyan-400 text-sm italic">No certificate requests yet.</p>';
        docs.forEach(d => {
            const el = document.createElement('div');
            el.className = 'p-4 rounded-lg bg-cyan-50 border border-cyan-100';
            const statusBadge = d.status === 'issued' ? 'bg-emerald-100 text-emerald-700'
                : d.status === 'rejected' ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700';
            el.innerHTML = `
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <p class="font-bold text-cyan-950 text-sm capitalize">${escapeHtml(d.doc_type.replace(/_/g, ' '))}</p>
                        <p class="text-[10px] text-cyan-500 font-bold uppercase mt-1">${escapeHtml(d.student_name || '')} · ${escapeHtml(d.dept_name || '')} · #${d.id}</p>
                        ${d.details ? `<p class="text-xs text-cyan-700 mt-1">${escapeHtml(d.details)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="badge ${statusBadge}">${d.status}</span>
                        ${d.status === 'requested' ? `
                            <button onclick="resolveCert(${d.id}, 'issue')" class="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"><i class="fas fa-check mr-1"></i>Issue</button>
                            <button onclick="resolveCert(${d.id}, 'reject')" class="text-[10px] font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition"><i class="fas fa-times mr-1"></i>Reject</button>`
                        : ''}
                    </div>
                </div>`;
            requestsBox.appendChild(el);
        });

        const revaluations = rvData.items || [];
        rvBody.innerHTML = '';
        if (!revaluations.length) rvBody.innerHTML = '<tr><td colspan="4" class="p-4 text-cyan-400 italic">No revaluation requests.</td></tr>';
        revaluations.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-bold text-cyan-800">${escapeHtml(r.subject_name)}</td>
                <td class="p-3 text-sm">${escapeHtml(r.student_name || '')}</td>
                <td class="p-3 text-sm">${escapeHtml(r.exam_name || '-')}</td>
                <td class="p-3"><span class="badge bg-cyan-50 text-cyan-700 border border-cyan-100">${r.status}</span></td>`;
            rvBody.appendChild(tr);
        });
    } catch (err) {
        requestsBox.innerHTML = `<p class="text-rose-500 text-sm italic">${escapeHtml(err.message)}</p>`;
        rvBody.innerHTML = `<tr><td colspan="4" class="p-4 text-rose-500 italic">${escapeHtml(err.message)}</td></tr>`;
    }
}

async function resolveCert(id, action) {
    try {
        await api(`/certificates/${id}`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        showToast(action === 'issue' ? 'Certificate issued!' : 'Certificate rejected.');
        loadCertificates();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadFinance() {
    const structures = document.getElementById('structuresList');
    const duesBody = document.getElementById('duesList');
    const defBody = document.getElementById('defaulterList');
    structures.innerHTML = '<p class="text-sm italic text-cyan-400">Loading...</p>';
    duesBody.innerHTML = '<tr><td colspan="5" class="p-4 text-cyan-400 italic">Loading...</td></tr>';
    defBody.innerHTML = '<tr><td colspan="3" class="p-4 text-cyan-400 italic">Loading...</td></tr>';
    try {
        const [fs, dues, def] = await Promise.all([
            api('/fees/structures'),
            api('/fees/dues'),
            api('/fees/defaulter-report')
        ]);
        structures.innerHTML = '';
        const list = fs.items || [];
        if (!list.length) structures.innerHTML = '<p class="text-sm italic text-cyan-400">No structures yet.</p>';
        list.slice(0, 12).forEach(s => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-3 rounded-lg bg-cyan-50 border border-cyan-100';
            el.innerHTML = `<span class="text-sm font-bold text-cyan-950">${escapeHtml(s.head)}</span>
                <span class="text-xs text-cyan-600 capitalize">${escapeHtml(s.department_name || '')} · ${escapeHtml(s.semester_name || '')}</span>
                <span class="text-sm font-black text-cyan-800">${formatMoney(s.amount)}</span>`;
            structures.appendChild(el);
        });

        duesBody.innerHTML = '';
        const duesRows = dues.items || [];
        if (!duesRows.length) duesBody.innerHTML = '<tr><td colspan="5" class="p-4 text-cyan-400 italic">No students on record.</td></tr>';
        duesRows.forEach(d => {
            const pct = d.assessed > 0 ? Math.round((d.paid / d.assessed) * 100) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 text-sm">${escapeHtml(d.student_name || '#' + d.student_id)}</td>
                <td class="p-3 text-sm font-bold">${formatMoney(d.assessed)}</td>
                <td class="p-3 text-sm">${formatMoney(d.paid)}</td>
                <td class="p-3 text-sm font-black ${d.dues > 0 ? 'text-rose-600' : 'text-emerald-600'}">${formatMoney(d.dues)}</td>
                <td class="p-3 text-sm font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-amber-600'}">${pct}%</td>`;
            duesBody.appendChild(tr);
        });

        defBody.innerHTML = '';
        const defRows = def.items || [];
        if (!defRows.length) defBody.innerHTML = '<tr><td colspan="3" class="p-4 text-emerald-600 italic font-bold">No defaulters - all caught up!</td></tr>';
        defRows.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 text-sm">${escapeHtml(d.student_name || '#' + d.student_id)}</td>
                <td class="p-3 text-sm">${escapeHtml(d.department || '')}</td>
                <td class="p-3 text-sm font-black text-rose-600">${formatMoney(d.dues)}</td>`;
            defBody.appendChild(tr);
        });
    } catch (err) {
        structures.innerHTML = `<p class="text-sm italic text-rose-500">${escapeHtml(err.message)}</p>`;
        duesBody.innerHTML = `<tr><td colspan="5" class="p-4 text-rose-500 italic">${escapeHtml(err.message)}</td></tr>`;
        defBody.innerHTML = `<tr><td colspan="3" class="p-4 text-rose-500 italic">${escapeHtml(err.message)}</td></tr>`;
    }
}

function formatMoney(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

async function createFeeStructure() {
    const dept = document.getElementById('fsDept').value;
    const sem = document.getElementById('fsSem').value;
    const head = document.getElementById('fsHead').value.trim();
    const amount = document.getElementById('fsAmount').value;
    if (!dept || !sem || !head || !amount) return showToast('Fill all fields!', 'error');
    try {
        await api('/fees/structures', {
            method: 'POST',
            body: JSON.stringify({ department_id: Number(dept), semester_id: Number(sem), head, amount: Number(amount) })
        });
        showToast('Fee structure saved!');
        document.getElementById('fsDept').value = '';
        document.getElementById('fsSem').value = '';
        document.getElementById('fsHead').value = '';
        document.getElementById('fsAmount').value = '';
        loadFinance();
    } catch (err) { showToast(err.message, 'error'); }
}

async function createScholarship() {
    const studentId = document.getElementById('schStudent').value;
    const amount = document.getElementById('schAmount').value;
    const name = document.getElementById('schName').value.trim();
    if (!studentId || !amount || !name) return showToast('Fill all fields!', 'error');
    try {
        await api('/fees/scholarships', {
            method: 'POST',
            body: JSON.stringify({ student_id: Number(studentId), amount: Number(amount), name })
        });
        showToast('Scholarship approved!');
        document.getElementById('schStudent').value = '';
        document.getElementById('schAmount').value = '';
        document.getElementById('schName').value = '';
    } catch (err) { showToast(err.message, 'error'); }
}

async function askAnalytics() {
    const query = document.getElementById('nlQueryInput').value.trim();
    if (!query) return showToast('Ask a question first!', 'error');
    const resultBox = document.getElementById('nlResult');
    const intentEl = document.getElementById('nlIntent');
    const summaryEl = document.getElementById('nlSummary');
    const dataEl = document.getElementById('nlData');
    resultBox.classList.remove('hidden');
    intentEl.textContent = 'Thinking...';
    summaryEl.textContent = 'Analyzing the request...';
    dataEl.innerHTML = '';
    try {
        const res = await api('/analytics/nl-query', { method: 'POST', body: JSON.stringify({ query }) });
        intentEl.textContent = `Intent: ${res.intent}`;
        summaryEl.textContent = res.summary;
        dataEl.innerHTML = '';
        const rows = [];
        if (Array.isArray(res.data)) {
            res.data.forEach(item => {
                Object.entries(item).forEach(([k, v]) => {
                    rows.push([k.replace(/_/g, ' '), typeof v === 'number' ? v.toLocaleString() : v]);
                });
            });
        } else if (res.data && typeof res.data === 'object') {
            Object.entries(res.data).forEach(([k, v]) => rows.push([k.replace(/_/g, ' '), typeof v === 'number' ? v.toLocaleString() : v]));
        }
        if (!rows.length) {
            dataEl.innerHTML = '<tr><td colspan="2" class="p-4 text-cyan-400 italic">No tabular data.</td></tr>';
        } else {
            rows.forEach(([k, v]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td class="p-3 text-sm capitalize text-cyan-700 font-bold">${escapeHtml(String(k))}</td><td class="p-3 text-sm">${escapeHtml(String(v))}</td>`;
                dataEl.appendChild(tr);
            });
        }
    } catch (err) {
        intentEl.textContent = 'Error';
        summaryEl.textContent = err.message;
    }
}

async function loadDirectory() {
    const tbody = document.getElementById('staffDirectory');
    tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-cyan-400 italic">Loading...</td></tr>';
    try {
        const data = await api('/staff/list');
        const items = data.items || [];
        tbody.innerHTML = '';
        if (!items.length) tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-cyan-400 italic">No staff yet.</td></tr>';
        items.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 text-sm font-bold text-cyan-950">${escapeHtml(s.name)}</td>
                <td class="p-3"><span class="badge bg-cyan-50 text-cyan-700 border border-cyan-100">${escapeHtml(s.role.replace(/_/g, ' '))}</span></td>
                <td class="p-3 text-sm">${escapeHtml(s.mobile)}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-rose-500 italic">${escapeHtml(err.message)}</td></tr>`;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', () => {
    setupRoleGating();
    showSection('overview');
});