/* Shared "my attendance" card for teachers and staff members, driven by their own login. */
(function () {
    const API_BASE = window.API_BASE || 'http://localhost:5000';

    function token() {
        return localStorage.getItem('token');
    }

    function roleLabel(role) {
        const labels = { faculty: 'Faculty', hod: 'HOD', principal: 'Principal', accounts: 'Accounts', librarian: 'Librarian', warden: 'Warden', super_admin: 'Super Admin', admin: 'Admin' };
        return labels[role] || role;
    }

    async function loadStaffAttendance() {
        const card = document.getElementById('staffAttCard');
        if (!card) return;
        const pctEl = document.getElementById('staffAttPercent');
        const todayEl = document.getElementById('staffAttToday');
        const historyEl = document.getElementById('staffAttHistory');
        try {
            const res = await fetch(`${API_BASE}/api/staff/attendance/me`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (!res.ok) {
                if (todayEl) todayEl.textContent = 'Unable to load attendance.';
                return;
            }
            const data = await res.json();
            if (pctEl) {
                pctEl.textContent = `${data.percentage}% overall`;
                pctEl.className = 'text-[10px] font-black bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full';
            }
            if (todayEl) {
                const latest = data.items[0];
                const today = latest && latest.date === new Date().toISOString().slice(0, 10) ? latest : null;
                todayEl.innerHTML = today
                    ? `Today: <b class="${today.status === 'present' ? 'text-emerald-600' : today.status === 'half_day' ? 'text-amber-600' : 'text-rose-600'}">${today.status.replace('_', ' ')}</b>`
                    : 'Not marked today yet.';
            }
            if (historyEl) {
                const badges = { present: 'bg-emerald-100 text-emerald-700', half_day: 'bg-amber-100 text-amber-700', leave: 'bg-cyan-100 text-cyan-700', absent: 'bg-rose-100 text-rose-700' };
                historyEl.innerHTML = data.items.length
                    ? data.items.slice(0, 8).map(i => `
                        <div class="flex items-center justify-between py-1 text-sm">
                            <span class="font-bold text-cyan-900">${i.date}</span>
                            <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${badges[i.status] || 'bg-gray-100 text-gray-600'} uppercase">${i.status.replace('_', ' ')}</span>
                        </div>`).join('')
                    : '<p class="text-xs text-cyan-400 italic">No records yet. Mark today\'s attendance above.</p>';
            }
        } catch (err) { console.error(err); }
    }

    async function markStaffAttendance(status) {
        const notes = (document.getElementById('staffAttNotes') || {}).value || '';
        try {
            const res = await fetch(`${API_BASE}/api/staff/attendance`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            const data = await res.json();
            if (typeof showToast === 'function') showToast(data.message || 'Attendance saved', res.ok ? 'success' : 'error');
            if (res.ok) loadStaffAttendance();
        } catch (err) { console.error(err); }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('staffAttCard')) loadStaffAttendance();
    });

    window.loadStaffAttendance = loadStaffAttendance;
    window.markStaffAttendance = markStaffAttendance;
})();