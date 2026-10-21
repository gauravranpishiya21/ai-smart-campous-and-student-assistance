
const API_BASE = 'http://localhost:5000';
let socket = null;
try { socket = (typeof io === 'function') ? io(API_BASE) : null; } catch (_) { socket = null; }
let adminChart;

async function authedGet(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    return await response.json();
}

async function authedPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    });
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    return await response.json();
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.sidebar-item').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
    }
    
    const sidebarLink = document.querySelector(`a[onclick*="showSection('${sectionId}')"]`);
    if (sidebarLink) {
        sidebarLink.classList.add('active');
    }

    if (sectionId === 'analytics-advanced') loadInstitutionComparison();
    if (sectionId === 'projects') loadProjectAnalytics();
}

let deptProjectsChart, weeklyProjectsChart;

async function loadProjectAnalytics() {
    try {
        const data = await authedGet('/api/admin/project-analytics');

        document.getElementById('projTotal').textContent = data.total_projects || 0;
        document.getElementById('projStudents').textContent = data.students_involved || 0;
        document.getElementById('projAvgProgress').textContent = `${data.avg_progress || 0}%`;
        document.getElementById('projInProgress').textContent = (data.by_status && (data.by_status['in_progress'] || data.by_status['on_track'] || 0)) || 0;

        const statusColors = {
            'not_started': 'bg-gray-100 text-gray-600',
            'in_progress': 'bg-blue-100 text-blue-700',
            'on_track': 'bg-emerald-100 text-emerald-700',
            'review': 'bg-amber-100 text-amber-700',
            'completed': 'bg-green-100 text-green-700'
        };
        const statusList = document.getElementById('projectStatusList');
        const statusKeys = ['completed', 'on_track', 'in_progress', 'review', 'not_started'];
        statusList.innerHTML = statusKeys
            .filter(k => (data.by_status && data.by_status[k]))
            .map(k => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[k] || 'bg-gray-100 text-gray-600'}">${k.replace(/_/g, ' ')}</span>
                    <span class="font-bold text-gray-800">${data.by_status[k]}</span>
                </div>
            `).join('') || '<p class="text-sm text-gray-400 italic">No projects yet.</p>';

        const activity = document.getElementById('projectRecentActivity');
        activity.innerHTML = (data.recent_updates || []).map(u => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <i class="fas ${u.author_type === 'faculty' ? 'fa-user-tie' : 'fa-user-graduate'}"></i>
                    </span>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-gray-800 truncate">${u.project_title}</p>
                        <p class="text-xs text-gray-500">${u.author_name || 'Unknown'} posted ${u.progress || 0}% ${u.note ? '— ' + u.note : ''}</p>
                    </div>
                </div>
                <span class="text-[10px] text-gray-400 shrink-0 ml-3">${new Date(u.created_at).toLocaleString()}</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 italic">No activity yet.</p>';

        const perDept = data.per_department || [];
        const deptCtx = document.getElementById('departmentProjectsChart');
        if (deptCtx) {
            if (deptProjectsChart) deptProjectsChart.destroy();
            deptProjectsChart = new Chart(deptCtx, {
                type: 'bar',
                data: {
                    labels: perDept.map(d => d.department),
                    datasets: [{
                        label: 'Projects',
                        data: perDept.map(d => d.project_count),
                        backgroundColor: '#6366f1',
                        borderRadius: 8
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const weekCtx = document.getElementById('projectWeeklyChart');
        if (weekCtx) {
            if (weeklyProjectsChart) weeklyProjectsChart.destroy();
            weeklyProjectsChart = new Chart(weekCtx, {
                type: 'line',
                data: {
                    labels: (data.weekly_created || []).map(w => w.label.slice(5)),
                    datasets: [{
                        label: 'Projects Created',
                        data: (data.weekly_created || []).map(w => w.count),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (err) {
        console.error('Failed to load project analytics:', err);
    }
}

async function loadInstitutionComparison() {
    try {
        const data = await authedGet('/admin/institution-comparison');
        const grid = document.getElementById('comparisonList');
        if (!grid) return;

        grid.innerHTML = data.comparison.map(dept => `
            <div class="bg-white p-6 rounded-lg border shadow-sm">
                <h4 class="font-bold text-gray-800 mb-2">${dept.department}</h4>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">Avg Attendance</span>
                    <span class="font-bold text-blue-600">${dept.avg_attendance?.toFixed(1) || 0}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2 mb-4">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${dept.avg_attendance || 0}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 font-bold uppercase">
                    <span>${dept.student_count} Students</span>
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">No comparison data available.</p>';
        
        // Update Chart
        const ctx = document.getElementById('comparisonChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.comparison.map(d => d.department),
                    datasets: [{
                        label: 'Avg Attendance %',
                        data: data.comparison.map(d => d.avg_attendance),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (err) { console.error(err); }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const welcomeMsgEl = document.getElementById('welcomeMsg');
    if (welcomeMsgEl) welcomeMsgEl.textContent = `Welcome, ${user.name}!`;

    loadDashboard();
    loadStudents();
    loadPayments();
    loadUsers();
    loadAdminNotifications();

    document.getElementById('searchStudent').addEventListener('input', loadStudents);
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    const notifToggle = document.getElementById('notificationToggleBtn');
    const notifPanel = document.getElementById('notificationPanel');
    if (notifToggle && notifPanel) {
        notifToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            loadAdminNotifications();
        });
        document.addEventListener('click', (e) => {
            if (!notifPanel.classList.contains('hidden') && !notifPanel.contains(e.target) && e.target !== notifToggle) {
                notifPanel.classList.add('hidden');
            }
        });
    }
    const clearBtn = document.getElementById('clearNotificationsBtn');
    if (clearBtn) clearBtn.addEventListener('click', async () => {
        await authedPost('/notifications/mark-read', { all: true }).catch(() => {});
        loadAdminNotifications();
    });

    setInterval(loadAdminNotifications, 15000);

    if (socket) {
        socket.on('dashboard_update', loadDashboard);
        socket.on('notification_push', loadAdminNotifications);
    }
});

async function loadAdminNotifications() {
    const badge = document.getElementById('notificationCountBadge');
    const list = document.getElementById('notificationList');
    if (!list) return;
    try {
        const data = await authedGet('/notifications/me?limit=30');
        const items = data.items || [];
        if (badge) {
            const unread = data.unread_count || 0;
            badge.textContent = unread > 99 ? '99+' : String(unread);
            badge.classList.toggle('hidden', unread === 0);
        }
        list.innerHTML = items.length ? items.map(n => `
            <div class="p-3 border-b last:border-b-0 ${n.is_read ? 'bg-white' : 'bg-indigo-50'}">
                <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-bold ${n.is_read ? 'text-gray-500' : 'text-gray-800'}">${n.title || 'Notification'}</p>
                    ${!n.is_read ? '<span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>' : ''}
                </div>
                <p class="text-xs text-gray-500 mt-0.5">${n.message || ''}</p>
                <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${(n.category || 'general') === 'ops' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}">${n.category || 'general'}</span>
                    <span class="text-[10px] text-gray-400">${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
                </div>
            </div>
        `).join('') : '<div class="p-4 text-sm text-gray-500">No notifications yet.</div>';
        if (!items.length) badge && badge.classList.add('hidden');
    } catch (err) { console.error(err); }
}

async function loadDashboard() {
    try {
        const [statsData, dashboardData] = await Promise.all([
            authedGet('/admin/dashboard-stats'),
            authedGet('/dashboard')
        ]);
        
        document.getElementById('totalStudentsStat').textContent = statsData.total_students || 0;
        document.getElementById('avgAttendanceStat').textContent = `${(statsData.avg_attendance || 0).toFixed(1)}%`;
        document.getElementById('atRiskStudentsStat').textContent = statsData.at_risk_count || 0;
        document.getElementById('totalPaymentsStat').textContent = `₹${statsData.total_payments || 0}`;
        
        if (dashboardData && dashboardData.chart_data) {
            initChart(dashboardData.chart_data);
        }

        loadStaffOps();
    } catch (err) {
        console.error('Failed to load admin stats:', err);
    }
}

async function loadStaffOps() {
    if (!document.getElementById('adminRollCall')) return;
    try {
        const [sa, leaves] = await Promise.all([
            authedGet('/api/staff/attendance/all'),
            authedGet('/api/leaves/all')
        ]);
        if (Array.isArray(sa.records)) renderRollCall(sa);
        if (leaves && Array.isArray(leaves.items)) renderLeaves(leaves);
    } catch (err) { console.error('No staff ops panel:', err); }
}

function renderRollCall(sa) {
    const chip = {
        present: 'bg-emerald-100 text-emerald-700',
        half_day: 'bg-amber-100 text-amber-700',
        leave: 'bg-cyan-100 text-cyan-700',
        absent: 'bg-rose-100 text-rose-700',
        none: 'bg-gray-100 text-gray-500'
    };
    const label = { present: 'Present', half_day: 'Half Day', leave: 'On Leave', absent: 'Absent', none: 'Not marked' };

    const marked = {}; 
    (sa.roll_call || []).forEach(r => { marked[r.user_id] = r.status; });

    const roster = [...(sa.staff_list || [])].sort((a, b) => {
        const order = { faculty: 0, hod: 1, principal: 2, accounts: 3, librarian: 4, warden: 5, super_admin: 6 };
        return (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name);
    });

    const meta = document.getElementById('adminStaffAttMeta');
    if (meta) {
        const done = Object.keys(marked).length;
        const total = roster.length;
        meta.innerHTML = `Today (${sa.today}): <b>${done}/${total}</b> staff members have marked attendance.`;
    }

    const rollCall = document.getElementById('adminRollCall');
    rollCall.innerHTML = roster.map(u => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-bold shrink-0">${(u.name || '?').charAt(0).toUpperCase()}</div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">${u.name}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-bold">${u.role}</p>
                </div>
            </div>
            <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${chip[marked[u.id]] || chip.none}">${markStatusBadge(marked[u.id])}</span>
        </div>`).join('') || '<p class="text-sm text-gray-400 italic">No staff users found.</p>';

    const summary = document.getElementById('adminStaffSummary');
    const people = Object.values(sa.per_person || {}).sort((a, b) => b.percentage - a.percentage);
    summary.innerHTML = people.map(p => `
        <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-gray-800 truncate">${p.name}</span>
                <span class="text-xs font-black ${p.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}">${p.percentage}%</span>
            </div>
            <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full ${p.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width:${Math.min(100, p.percentage)}%"></div>
            </div>
            <p class="text-[10px] text-gray-400 mt-1">${p.present} present · ${p.total} days</p>
        </div>`).join('')
        || '<p class="text-sm text-gray-400 italic col-span-2">No attendance recorded yet.</p>';
}

function markStatusBadge(status) {
    return { present: 'Present', half_day: 'Half Day', leave: 'On Leave', absent: 'Absent' }[status] || 'Not marked';
}

function renderLeaves(data) {
    const meta = document.getElementById('adminLeaveMeta');
    if (meta) meta.innerHTML = `Pending: <b class="text-amber-600">${data.stats.pending || 0}</b> · Approved: <b class="text-emerald-600">${data.stats.approved || 0}</b> · Rejected: <b class="text-rose-600">${data.stats.rejected || 0}</b>`;

    const list = document.getElementById('adminLeaveList');
    list.innerHTML = (data.items || []).slice(0, 25).map(l => {
        const badge = l.status === 'approved'
            ? '<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">Approved</span>'
            : l.status === 'rejected'
                ? '<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700">Rejected</span>'
                : '<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700">Pending</span>';
        const docBtn = l.document_path
            ? `<a href="${API_BASE}/api/leaves/${l.id}/document" target="_blank" class="text-[10px] font-bold text-blue-600 hover:underline mr-3"><i class="fas fa-paperclip mr-1"></i>Document</a>`
            : '';
        return `
        <div class="p-3 bg-gray-50 rounded-lg border ${l.status === 'pending' ? 'border-amber-200' : 'border-gray-100'}">
            <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">${l.user_name || l.user_role}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-bold">${l.user_role} · #${l.id}</p>
                </div>
                ${badge}
            </div>
            <p class="text-sm text-gray-600 mt-1">${l.leave_from} → ${l.leave_to}</p>
            <p class="text-xs text-gray-500 mt-1">${l.reason}</p>
            ${l.review_note ? `<p class="text-[10px] text-gray-400 mt-1 italic">Review note: ${l.review_note}</p>` : ''}
            <div class="flex items-center gap-2 mt-2 flex-wrap">
                ${docBtn}
                ${l.status === 'pending' ? `
                    <button onclick="reviewLeave(${l.id}, 'approved')" class="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700">Approve</button>
                    <button onclick="reviewLeave(${l.id}, 'rejected')" class="text-[10px] font-bold bg-rose-500 text-white px-3 py-1 rounded hover:bg-rose-600">Reject</button>` : ''}
            </div>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400 italic">No leave applications.</p>';
}

async function reviewLeave(id, status) {
    try {
        const res = await fetch(`${API_BASE}/api/leaves/${id}/review`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) loadStaffOps(); else console.error(data.message);
    } catch (err) { console.error(err); }
}

function initChart(chartData) {
    const ctx = document.getElementById('attendanceTrendChart');
    if (ctx) {
        if (adminChart) adminChart.destroy();
        adminChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Attendance %',
                    data: chartData.attendance,
                    backgroundColor: 'rgba(79, 70, 229, 0.6)',
                    borderRadius: 8
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false } 
                }, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: 100,
                        ticks: { stepSize: 20 }
                    } 
                } 
            }
        });
    }
}

async function loadStudents() {
    try {
        const search = document.getElementById('searchStudent').value;
        const students = await authedGet(`/students?search=${search}`);
        const container = document.getElementById('studentsList');
        if (!container) return;

        container.innerHTML = students.map(student => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div>
                    <h3 class="font-bold text-gray-800">${student.name}</h3>
                    <p class="text-xs text-gray-500">Attendance: ${student.attendance}% | Study: ${student.study_hours}h | Sleep: ${student.sleep_hours}h</p>
                </div>
                <div class="flex gap-2">
                    <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" onclick="editStudent(${student.id}, '${student.name}', ${student.attendance}, ${student.study_hours}, ${student.sleep_hours})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" onclick="deleteStudent(${student.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-400 py-4">No students found.</p>';
    } catch (err) {
        console.error(err);
    }
}

async function loadPayments() {
    try {
        const payments = await authedGet('/payments');
        const container = document.getElementById('paymentsList');
        if (!container) return;

        container.innerHTML = payments.map(payment => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                    <h3 class="font-bold text-gray-800">Payment #${payment.id}</h3>
                    <p class="text-xs text-gray-500">Student ID: ${payment.student_id} | Status: <span class="text-emerald-600 font-bold uppercase">${payment.status}</span></p>
                </div>
                <div class="text-right">
                    <p class="font-black text-gray-800">₹${payment.amount}</p>
                    <p class="text-[10px] text-gray-400">${new Date(payment.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-400 py-4">No payments found.</p>';
    } catch (err) {
        console.error(err);
    }
}

async function loadUsers() {
    try {
        const users = await authedGet('/admin/users');
        const container = document.getElementById('usersList');
        if (!container) return;

        container.innerHTML = users.map(user => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        ${user.name.charAt(0)}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800">${user.name}</h3>
                        <p class="text-xs text-gray-500">${user.role.toUpperCase()} | ${user.mobile}</p>
                    </div>
                </div>
                <button class="text-rose-600 text-sm font-bold hover:underline" onclick="deleteUser(${user.id})">Revoke</button>
            </div>
        `).join('') || '<p class="text-center text-gray-400 py-4">No users found.</p>';
    } catch (err) {
        console.error(err);
    }
}

async function addStudent() {
    // This should ideally open a modal, but using prompt for simplicity as per original code
    const name = prompt('Enter student name:');
    if (!name) return;
    
    try {
        await fetch(`${API_BASE}/students`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, attendance: 0, study_hours: 0, sleep_hours: 0 })
        });
        loadStudents();
        showToast('Student added successfully!', 'success');
    } catch (err) {
        showToast('Failed to add student!', 'error');
    }
}

async function editStudent(id, name, attendance, study_hours, sleep_hours) {
    const newName = prompt('Enter new name:', name);
    if (newName === null) return;
    
    const newAtt = prompt('Enter attendance %:', attendance);
    const newStudy = prompt('Enter study hours:', study_hours);
    const newSleep = prompt('Enter sleep hours:', sleep_hours);
    
    try {
        await fetch(`${API_BASE}/students/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name: newName, 
                attendance: parseFloat(newAtt), 
                study_hours: parseFloat(newStudy), 
                sleep_hours: parseFloat(newSleep) 
            })
        });
        loadStudents();
        showToast('Student updated!', 'success');
    } catch (err) {
        showToast('Update failed!', 'error');
    }
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
        await fetch(`${API_BASE}/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        loadStudents();
        showToast('Student deleted', 'success');
    } catch (err) {
        showToast('Delete failed', 'error');
    }
}

async function runCloudBackup() {
    const statusEl = document.getElementById('backupStatus');
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Initializing cloud backup...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/cloud-backup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) {
            statusEl.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fas fa-check-circle mr-2"></i> Backup Successful!</span><br>ID: ${data.backup_id} | Size: ${data.size_mb} MB`;
            showToast('Cloud backup complete', 'success');
        }
    } catch (err) {
        statusEl.innerHTML = '<span class="text-rose-600">Backup failed.</span>';
        console.error(err);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-[2000] text-white font-bold transition-all transform translate-y-0 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
