const API_BASE = 'http://localhost:5000';
let campusSocket = null;
try { campusSocket = (typeof io === 'function') ? io(API_BASE) : null; } catch (_) { campusSocket = null; }
let dmTarget = null;

let lastUpdated = 0;

function updateSync() {
    const el = document.getElementById('ccLastSync');
    if (!el) return;
    const ago = lastUpdated ? Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000)) : 0;
    el.textContent = `Updated ${new Date().toLocaleTimeString()} · ${ago}s ago`;
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function authHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function showToast(msg, type) {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-lg text-sm font-bold shadow-lg text-white transition ' +
        (type === 'error' ? 'bg-rose-600' : 'bg-emerald-600');
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.remove(); }, 2800);
}

function chip(status) {
    if (!status) return '<span class="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-gray-200 text-gray-500">Not marked</span>';
    const map = { present: ['bg-emerald-100 text-emerald-700', 'Present'], absent: ['bg-rose-100 text-rose-700', 'Absent'], leave: ['bg-amber-100 text-amber-700', 'On Leave'], half_day: ['bg-cyan-100 text-cyan-700', 'Half Day'] };
    const m = map[status] || ['bg-indigo-100 text-indigo-700', status];
    return `<span class="text-[9px] font-black uppercase px-2 py-1 rounded-full ${m[0]}">${m[1]}</span>`;
}

function roleLabel(role) {
    return esc(String(role || 'member').replace(/_/g, ' '));
}

async function loadCampus() {
    try {
        const res = await fetch(`${API_BASE}/api/campus/status`, { headers: authHeaders() });
        if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'login.html'; return; }
        const data = await res.json();
        render(data);
    } catch (err) { console.error(err); }
}

function render(data) {
    const s = data.summary || {};
    lastUpdated = Date.now();
    document.getElementById('ccStudentsIn').textContent = `${s.students_marked}/${s.students_total}`;
    document.getElementById('ccStaffIn').textContent = `${s.staff_marked}/${s.staff_total}`;
    document.getElementById('ccPendingLeaves').textContent = s.pending_leaves;
    updateSync();

    const students = data.students || [];
    const stuEl = document.getElementById('ccStudents');
    stuEl.innerHTML = students.length ? students.map(st => `
        <div class="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
                <img src="assets/avatar.svg" alt="" class="w-8 h-8 rounded-full shrink-0">
                <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-800 truncate">${esc(st.name || 'Student')}</p>
                    <p class="text-[10px] text-gray-400 truncate">${esc(st.department_name || '')}${st.semester_id ? ' · Sem ' + st.semester_id : ''}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                ${st.marked_today ? '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>' : '<span class="w-2 h-2 rounded-full bg-gray-300"></span>'}
                <span class="text-[10px] font-bold text-gray-500">${st.marked_today ? 'On campus' : 'Not marked'}</span>
                ${st.user_id ? `<button onclick="openDM(${st.user_id}, 'student')" class="text-[10px] font-black text-indigo-600 hover:text-indigo-800"><i class="fas fa-comment-dots mr-1"></i>Message</button>` : ''}
            </div>
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No students yet.</p>';

    const presence = data.presence || [];
    const staffEl = document.getElementById('ccStaff');
    staffEl.innerHTML = presence.length ? presence.map(p => `
        <div class="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
                <img src="assets/avatar.svg" alt="" class="w-8 h-8 rounded-full shrink-0">
                <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-800 truncate">${esc(p.name || 'Member')}</p>
                    <p class="text-[10px] text-gray-400 truncate">${roleLabel(p.role)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                ${chip(p.today_status)}
                <button onclick="openDM(${p.user_id}, '${p.role}')" class="text-[10px] font-black text-indigo-600 hover:text-indigo-800"><i class="fas fa-comment-dots mr-1"></i>Message</button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No staff profiles.</p>';

    const feeds = data.activity || [];
    const feedEl = document.getElementById('ccActivity');
    feedEl.innerHTML = feeds.length ? feeds.map(a => `
        <div class="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] ${a.type === 'staff' ? 'bg-cyan-100 text-cyan-600' : a.type === 'leave' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}">
                <i class="fas ${a.type === 'staff' ? 'fa-user-check' : a.type === 'leave' ? 'fa-file-medical' : 'fa-comment'}"></i>
            </div>
            <div class="min-w-0">
                <p class="text-sm text-gray-700 break-words">${esc(a.text)}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">${a.time ? new Date(a.time + 'Z').toLocaleString() : ''}</p>
            </div>
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No activity yet today.</p>';

    const leaves = data.leaves || [];
    const leaveEl = document.getElementById('ccLeaves');
    const isAdmin = (JSON.parse(localStorage.getItem('user')) || {}).role === 'admin';
    leaveEl.innerHTML = leaves.length ? leaves.map(l => `
        <div class="bg-white p-3 rounded-lg border ${l.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'}">
            <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold text-gray-800 truncate">${esc(l.user_name || 'Applicant')}</p>
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${esc(l.status)}</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">${esc(l.leave_from || '')} → ${esc(l.leave_to || '')}</p>
            <p class="text-xs text-gray-600 mt-1 break-words">${esc(l.reason || '')}</p>
            ${isAdmin && l.status === 'pending' ? `
            <div class="mt-2 flex gap-2">
                <button onclick="reviewLeave(${l.id}, 'approved')" class="text-[10px] font-black px-3 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600">Approve</button>
                <button onclick="reviewLeave(${l.id}, 'rejected')" class="text-[10px] font-black px-3 py-1 rounded bg-rose-500 text-white hover:bg-rose-600">Reject</button>
            </div>` : ''}
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No leave applications yet.</p>';
}

async function reviewLeave(id, status) {
    try {
        const res = await fetch(`${API_BASE}/api/leaves/${id}/review`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
            body: JSON.stringify({ status, note: 'Reviewed from Campus Connect.' })
        });
        const data = await res.json();
        if (res.ok) { showToast(data.message || `Leave ${status}.`, 'success'); loadCampus(); }
        else showToast(data.message || 'Review failed.', 'error');
    } catch (err) { console.error(err); }
}

function openDM(userId, role) {
    dmTarget = { id: userId, role };
    const me = JSON.parse(localStorage.getItem('user')) || {};
    const label = role.replace(/_/g, ' ');
    document.getElementById('dmLabel').textContent = `Message ${label}`;
    document.getElementById('dmBody').value = '';
    document.getElementById('dmModal').classList.remove('hidden');
    document.getElementById('dmBody').focus();
}

function closeDM() {
    document.getElementById('dmModal').classList.add('hidden');
}

async function sendDM() {
    if (!dmTarget) return;
    const body = document.getElementById('dmBody').value.trim();
    if (!body) { showToast('Write a message first.', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/messages/send`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
            body: JSON.stringify({ recipient_role: dmTarget.role, recipient_id: dmTarget.id, body })
        });
        const data = await res.json();
        if (res.ok) { showToast('Message sent.', 'success'); closeDM(); }
        else showToast(data.message || 'Send failed.', 'error');
    } catch (err) { console.error(err); }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }
    const meEl = document.getElementById('ccMe');
    if (user && meEl) meEl.textContent = `You're viewing as ${user.name || 'Member'} · ${user.role || ''}`;

    document.getElementById('dmCancel').addEventListener('click', closeDM);
    document.getElementById('dmSend').addEventListener('click', sendDM);
    document.getElementById('dmBody').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); } });
    document.getElementById('ccPortalBack').addEventListener('click', () => {
        const map = { admin: 'admin.html', faculty: 'faculty.html', student: 'student.html', principal: 'staff.html', hod: 'staff.html', accounts: 'staff.html', librarian: 'staff.html', warden: 'staff.html', super_admin: 'admin.html' };
        window.location.href = map[(user || {}).role] || 'login.html';
    });

    loadCampus();
    if (campusSocket) {
        campusSocket.on('campus_update', loadCampus);
        campusSocket.on('attendance_update', loadCampus);
        campusSocket.on('staff_attendance_update', loadCampus);
    }
    setInterval(loadCampus, 10000);
    setInterval(updateSync, 1000);
});