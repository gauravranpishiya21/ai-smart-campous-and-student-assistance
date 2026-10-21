
const API_BASE = 'http://localhost:5000';
let socket = null;
try { socket = (typeof io === 'function') ? io(API_BASE) : null; } catch (_) { socket = null; }
let attendanceChart, performanceChart;

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

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

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!token || user.role !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    // Dynamic Role-Based Theme
    const body = document.body;
    if (user.dept_name) {
        const dept = user.dept_name.toLowerCase();
        if (dept.includes('computer') || dept.includes('engineering') || dept.includes('cse')) {
            body.setAttribute('data-role', 'student-cse');
        } else if (dept.includes('medical') || dept.includes('mbbs') || dept.includes('anatomy')) {
            body.setAttribute('data-role', 'student-medical');
        }
    }

    document.getElementById('studentName').textContent = user.name;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Load initial data
    loadDashboard();
    loadGamification();
    initTheme();
    
    // Socket listeners
    if (socket) {
        socket.on('dashboard_update', loadDashboard);
        socket.on('gamification_update', loadGamification);
    }
});

function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('fade-in');
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
        selectedSection.classList.add('fade-in');
    }

    // Update sidebar active state
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Handle active state
    const activeLink = document.querySelector(`a[onclick="showSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section specific data
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'curriculum') loadCurriculum();
    if (sectionId === 'learning') resetLearningBrowse();
    if (sectionId === 'academic-calendar') loadAcademicCalendar();
    if (sectionId === 'timetable') loadTimetable();
    if (sectionId === 'leaderboard') loadLeaderboard();
    if (sectionId === 'notices') loadNotices();
    if (sectionId === 'social-feed') loadSocialFeed();
    if (sectionId === 'library') { renderSemChips(); loadLibraryBooks(); }
    if (sectionId === 'placement') loadPlacementJobs();
    if (sectionId === 'campus') loadCampusServices();
    if (sectionId === 'forum') loadForumTopics();
    if (sectionId === 'faculty') loadFacultyProfiles();
    if (sectionId === 'exams') loadMockTests();
    if (sectionId === 'planner') loadPlannerUI();
    if (sectionId === 'cgpa') loadGpaTracker();
    if (sectionId === 'resume') loadResumeData();
    if (sectionId === 'cafeteria') loadCafeteriaMenu();
    if (sectionId === 'health') loadHealthRecords();
    if (sectionId === 'parking') loadParkingSlots();
    if (sectionId === 'streaming') loadLiveEvents();
    if (sectionId === 'learning') {
        resetLearningBrowse();
        loadBengaluruColleges();
    }
    if (sectionId === 'projects') loadProjects();
}

// BENGALURU COLLEGES & FACULTY
async function loadBengaluruColleges() {
    try {
        const res = await fetch(`${API_BASE}/institutions/detailed`);
        const data = await res.json();
        const grid = document.getElementById('bengaluruCollegeGrid');
        if (!grid) return;

        grid.innerHTML = data.items.map(inst => `
            <div class="bg-gray-50 p-4 rounded-lg border hover:border-indigo-300 transition group">
                <img src="${inst.image_url || 'assets/banner.svg'}" class="w-full h-32 object-cover rounded-lg mb-3">
                <h4 class="font-bold text-gray-800 group-hover:text-indigo-600">${inst.name}</h4>
                <p class="text-[10px] text-gray-500 uppercase font-bold mb-2">${inst.type}</p>
                <div class="flex flex-wrap gap-1">
                    ${inst.departments.slice(0, 3).map(d => `<span class="text-[9px] bg-white px-1.5 py-0.5 rounded border text-gray-400">${d.name}</span>`).join('')}
                    ${inst.departments.length > 3 ? `<span class="text-[9px] text-gray-400">+${inst.departments.length - 3} more</span>` : ''}
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-8 col-span-full">No college data available.</p>';
    } catch (err) { console.error(err); }
}

async function loadFacultyProfiles() {
    try {
        const res = await fetch(`${API_BASE}/faculty/profiles`);
        const data = await res.json();
        const grid = document.getElementById('facultyProfilesGrid');
        if (!grid) return;

        grid.innerHTML = data.items.map(f => `
            <div class="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
                <div class="flex items-center space-x-4 mb-6">
                    <img src="${f.image_url || 'assets/avatar.svg'}" class="w-16 h-16 rounded-full object-cover border-2 border-indigo-100">
                    <div>
                        <h4 class="font-bold text-gray-800">${f.faculty_name}</h4>
                        <p class="text-xs text-indigo-600 font-bold">${f.designation}</p>
                        <p class="text-[10px] text-gray-400 uppercase">${f.department_name || 'General'}</p>
                    </div>
                </div>
                <div class="space-y-3">
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase">Specialization</p>
                        <p class="text-sm text-gray-700">${f.specialization || 'Academic Excellence'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase">Biography</p>
                        <p class="text-xs text-gray-500 leading-relaxed line-clamp-3">${f.bio || 'Dedicated educator committed to student success and academic research.'}</p>
                    </div>
                </div>
                <button class="w-full mt-6 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-600 hover:text-white transition">
                    View Publications
                </button>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">Faculty data coming soon.</p>';
    } catch (err) { console.error(err); }
}

// GAMIFICATION
async function loadGamification() {
    try {
        const data = await authedGet('/student/gamification');
        const statusEl = document.getElementById('gamificationStatus');
        if (!data || !statusEl) return;
        
        statusEl.classList.remove('hidden');
        document.getElementById('studentLevel').textContent = data.level;
        document.getElementById('studentXP').textContent = data.xp;
        
        const currentLevelXP = data.xp % 100;
        const percent = currentLevelXP; // Level up every 100 XP
        document.getElementById('xpBar').style.width = `${percent}%`;
    } catch (err) { console.error(err); }
}

// CURRICULUM & OBE (master data + GPA)
async function loadCurriculum() {
    const sem = document.getElementById('curriculumSemFilter').value;
    const grid = document.getElementById('curriculumGrid');
    const gpaBar = document.getElementById('curriculumGpaBar');
    try {
        const response = await fetch(`${API_BASE}/academic/curriculum?semester=${sem}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.gpa && gpaBar) {
            gpaBar.classList.remove('hidden');
            document.getElementById('curriculumCgpa').textContent = data.gpa.cgpa != null ? data.gpa.cgpa : 'N/A';
            document.getElementById('curriculumCredits').textContent = data.gpa.credits_earned ?? 0;
            document.getElementById('curriculumBacklogs').textContent = data.gpa.backlogs ?? 0;
        }
        const items = data.items || [];
        grid.innerHTML = items.map(sub => {
            const grade = sub.grade || {};
            const status = grade.status || 'pending';
            const gp = grade.grade_points != null ? `GP ${grade.grade_points}` : 'Not graded';
            const statusCls = status === 'passed' ? 'text-emerald-600' : status === 'backlog' || status === 'failed' ? 'text-rose-600' : 'text-gray-500';
            const masterId = sub.source === 'master' ? sub.id : null;
            const clickId = masterId || sub.id;
            const clickHandler = masterId
                ? `loadOBE(${sub.id}, true)`
                : `loadOBE(${sub.id}, false)`;
            return `
            <div onclick="${clickHandler}" class="bg-white p-4 rounded-lg shadow-sm border hover:border-indigo-500 transition cursor-pointer">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <p class="text-[10px] font-mono text-gray-400">${sub.code || ''} Â· ${sub.department_name || 'Dept'}</p>
                        <h4 class="font-bold text-gray-800">${sub.subject_name}</h4>
                        <p class="text-xs text-gray-500">${sub.credits} credits Â· ${sub.material_count || 0} materials</p>
                        ${sub.syllabus ? `<p class="text-xs text-gray-400 mt-1 line-clamp-2">${sub.syllabus}</p>` : ''}
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-xs font-bold ${statusCls}">${status.toUpperCase()}</p>
                        <p class="text-[10px] text-gray-500">${gp}</p>
                    </div>
                </div>
            </div>`;
        }).join('') || '<p class="text-center text-gray-500 py-8">No subjects in master catalog for this semester. Ask admin to add subjects in Master Data.</p>';
    } catch (err) {
        console.error(err);
        if (grid) grid.innerHTML = '<p class="text-red-500 text-sm">Failed to load curriculum.</p>';
    }
}

async function loadOBE(subjectId, isMaster = false) {
    try {
        const qs = isMaster
            ? `master_subject_id=${subjectId}`
            : `subject_id=${subjectId}`;
        const response = await fetch(`${API_BASE}/academic/obe?${qs}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('obeOutcomesList');
        if (!data.items || data.items.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-sm italic">No CO/PO outcomes mapped yet for this subject.</p>';
            return;
        }
        list.innerHTML = data.items.map(o => `
            <div class="p-3 bg-gray-50 rounded border">
                <div class="flex justify-between mb-1">
                    <span class="text-[10px] font-bold text-indigo-600 uppercase">${o.outcome_type} ${o.outcome_code}</span>
                    <span class="text-[10px] font-bold text-gray-400">Target: ${o.target_attainment}%</span>
                </div>
                <p class="text-xs text-gray-700">${o.description}</p>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

async function loadGpaTracker() {
    try {
        const [gpaData, predictData] = await Promise.all([
            authedGet('/academic/gpa/me'),
            fetch(`${API_BASE}/cgpa/predict`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json())
        ]);
        const recordedEl = document.getElementById('recordedCgpaVal');
        if (recordedEl) recordedEl.textContent = gpaData?.cgpa != null ? gpaData.cgpa : 'N/A';
        const creditsEl = document.getElementById('gpaCreditsEarned');
        if (creditsEl) creditsEl.textContent = gpaData?.credits_earned ?? 0;
        const backlogEl = document.getElementById('gpaBacklogCount');
        if (backlogEl) backlogEl.textContent = gpaData?.backlogs ?? 0;
        const list = document.getElementById('gpaGradesList');
        const grades = gpaData?.grades || [];
        if (list) {
            list.innerHTML = grades.length ? grades.map(g => `
                <div class="flex justify-between p-3 rounded border bg-gray-50">
                    <div>
                        <p class="font-semibold">${g.subject_name}</p>
                        <p class="text-xs text-gray-500">${g.subject_code || ''} Â· ${g.credits} cr</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold">${g.grade_points != null ? g.grade_points : '--'}</p>
                        <p class="text-xs uppercase ${g.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'}">${g.status}</p>
                    </div>
                </div>
            `).join('') : '<p class="text-gray-500">No graded subjects yet. Faculty will record marks here.</p>';
        }
        if (predictData?.predicted_cgpa != null) {
            document.getElementById('predictedCgpaVal').textContent = predictData.predicted_cgpa;
            const f = predictData.factors || {};
            document.getElementById('cgpaFeedback').textContent =
                `Based on attendance ${f.attendance}%, study ${f.study_hours}h, sleep ${f.sleep_hours}h.`;
        }
    } catch (err) {
        console.error(err);
    }
}

// TIMETABLE
// Routine guidance (timetable-based)
async function loadRoutine() {
    const todayEl = document.getElementById('routineToday');
    const weekEl = document.getElementById('routineWeek');
    if (!todayEl || !weekEl) return;
    try {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const response = await fetch(`${API_BASE}/api/timetable/${user.dept_id || 1}/${user.semester_id || 1}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        const sortByTime = (a, b) => (a.start_time || '').localeCompare(b.start_time || '');

        const slotHtml = (slot, highlight) => `
            <div class="flex items-center justify-between p-2.5 rounded ${highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-100'}">
                <div class="min-w-0">
                    <p class="text-xs font-bold ${highlight ? 'text-emerald-800' : 'text-gray-700'} truncate">${slot.subject_name || 'Subject'}</p>
                    <p class="text-[10px] text-gray-400">${highlight ? '<i class="fas fa-person-chalkboard mr-1"></i>' : ''}${slot.start_time} - ${slot.end_time} · ${slot.room_number || 'Room TBD'}</p>
                </div>
                ${highlight ? '<span class="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">NEXT</span>' : ''}
            </div>`;

        const todaySlots = items.filter(i => i.day_of_week === todayName).sort(sortByTime);
        if (!todaySlots.length) {
            todayEl.innerHTML = '<p class="text-xs text-gray-400">No classes scheduled today. Enjoy your day off.</p>';
        } else {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const toMin = t => { const [h, m] = String(t).split(':').map(Number); return (h % 24) * 60 + (m || 0); };
            const nextIdx = todaySlots.findIndex(s => toMin(s.end_time) > nowMin - 10);
            const order = nextIdx >= 0 ? [...todaySlots.slice(nextIdx), ...todaySlots.slice(0, nextIdx)] : todaySlots;
            todayEl.innerHTML = `
                <p class="text-[10px] font-black text-gray-500 uppercase mb-1">${todayName} · ${todaySlots.length} class${todaySlots.length > 1 ? 'es' : ''}</p>
                ${order.map((s, i) => slotHtml(s, i === 0)).join('')}
            `;
        }

        const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        weekEl.innerHTML = weekDays.map(day => {
            const slots = items.filter(i => i.day_of_week === day).sort(sortByTime);
            if (!slots.length) return '';
            return `
                <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
                    <p class="text-[10px] font-black text-gray-500 uppercase mb-1.5 ${day === todayName ? 'text-emerald-600' : ''}"><i class="fas fa-calendar-day mr-1"></i>${day}${day === todayName ? ' · Today' : ''}</p>
                    ${slots.map(s => slotHtml(s, false)).join('')}
                </div>`;
        }).filter(Boolean).join('') || '<p class="text-xs text-gray-400 italic">No routine published yet.</p>';
    } catch (err) { console.error(err); }
}

async function loadTimetable() {
    const user = JSON.parse(localStorage.getItem('user'));
    const sem = user.semester_id || 1;
    const deptId = user.dept_id || 1;
    
    try {
        const response = await fetch(`${API_BASE}/api/timetable/${deptId}/${sem}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('timetableBody');
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        tbody.innerHTML = days.map(day => {
            const daySlots = data.items.filter(i => i.day_of_week === day);
            return `
                <tr class="hover:bg-gray-50">
                    <td class="p-4 border-b font-bold text-gray-600 bg-gray-50">${day}</td>
                    ${[1, 2, 'lunch', 3, 4].map(slot => {
                        if (slot === 'lunch') return '<td class="p-4 border-b text-center text-gray-400 italic bg-gray-50">Lunch Break</td>';
                        
                        const slotIdx = slot > 2 ? slot - 2 : slot - 1;
                        const item = daySlots[slotIdx];
                        return `
                            <td class="p-4 border-b text-center">
                                ${item ? `
                                    <div class="text-xs font-bold text-indigo-600">${item.subject_name}</div>
                                    <div class="text-[9px] text-gray-400">${item.room_number || 'Room TBD'}</div>
                                ` : '<span class="text-gray-200">-</span>'}
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/student/leaderboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('leaderboardBody');
        
        tbody.innerHTML = data.items.map((s, i) => `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-4 font-bold text-gray-500">#${i + 1}</td>
                <td class="p-4">
                    <div class="flex items-center space-x-3">
                        <img src="assets/avatar.svg" class="w-8 h-8 rounded-full">
                        <span class="font-bold text-gray-800">${s.student_name}</span>
                    </div>
                </td>
                <td class="p-4 text-right"><span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">Lvl ${s.level}</span></td>
                <td class="p-4 text-right font-bold text-indigo-600">${s.xp} XP</td>
            </tr>
        `).join('') || '<p class="text-center py-8">No data available.</p>';
    } catch (err) { console.error(err); }
}

async function loadNotices() {
    try {
        const response = await fetch(`${API_BASE}/campus/notices`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('noticesList');
        
        list.innerHTML = data.items.map(notice => `
            <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="font-bold text-lg text-gray-800">${notice.title}</h4>
                    <span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                        ${notice.target_role === 'all' ? 'Universal' : 'Targeted'}
                    </span>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed mb-4">${notice.content}</p>
                <div class="text-[10px] text-gray-400 font-bold uppercase">
                    Posted: ${new Date(notice.created_at).toLocaleDateString()}
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">No active notices.</p>';
    } catch (err) { console.error(err); }
}

// CAMPUS SOCIAL FEED
async function loadSocialFeed() {
    try {
        const response = await fetch(`${API_BASE}/campus/social-feed`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('socialFeedList');
        
        list.innerHTML = data.items.map(post => `
            <div class="bg-white p-6 rounded-lg shadow-sm border">
                <div class="flex items-center space-x-3 mb-4">
                    <img src="assets/avatar.svg" class="w-10 h-10 rounded-full">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${post.author_role === 'student' ? 'Student' : 'Faculty Member'}</p>
                        <p class="text-[10px] text-gray-400 uppercase font-bold">${new Date(post.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <p class="text-gray-700 leading-relaxed">${post.content}</p>
                ${post.media_url ? `<img src="${post.media_url}" class="mt-4 rounded-lg w-full h-48 object-cover border">` : ''}
                <div class="mt-6 flex items-center space-x-6 border-t pt-4 text-gray-500">
                    <button class="text-sm hover:text-indigo-600 transition">
                        <i class="far fa-heart mr-2"></i> ${post.likes_count} Likes
                    </button>
                    <button class="text-sm hover:text-indigo-600 transition">
                        <i class="far fa-comment mr-2"></i> Comment
                    </button>
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12">The campus is quiet today. Be the first to post!</p>';
    } catch (err) { console.error(err); }
}

async function submitSocialPost() {
    const content = document.getElementById('socialPostContent').value;
    if (!content) return showToast('Post content cannot be empty', 'error');

    try {
        const response = await fetch(`${API_BASE}/campus/social-feed`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        if (response.ok) {
            showToast('Update posted! +10 XP', 'success');
            document.getElementById('socialPostContent').value = '';
            loadSocialFeed();
            loadGamification();
        }
    } catch (err) { console.error(err); }
}

// AI ADVISOR
async function sendAIChatMessage() {
    const input = document.getElementById('aiChatInput');
    const query = input.value.trim();
    if (!query) return;

    const messages = document.getElementById('aiChatMessages');
    
    // Add user message
    messages.innerHTML += `
        <div class="flex items-start justify-end space-x-3">
            <div class="bg-indigo-600 text-white p-3 rounded-lg shadow-sm text-sm max-w-[80%]">
                ${query}
            </div>
            <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                <i class="fas fa-user text-xs"></i>
            </div>
        </div>
    `;
    
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Show typing
    const typingId = 'typing-' + Date.now();
    messages.innerHTML += `
        <div id="${typingId}" class="flex items-start space-x-3">
            <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <i class="fas fa-robot text-xs"></i>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-400">
                Thinking...
            </div>
        </div>
    `;
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/ai/advisor`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        
        document.getElementById(typingId).remove();
        
        messages.innerHTML += `
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <i class="fas fa-robot text-xs"></i>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-700 max-w-[80%]">
                    ${data.response}
                </div>
            </div>
        `;
        messages.scrollTop = messages.scrollHeight;
    } catch (err) {
        console.error(err);
        if (document.getElementById(typingId)) document.getElementById(typingId).remove();
        showToast('AI connection failed', 'error');
    }
}

// Add enter key support for AI chat
document.addEventListener('DOMContentLoaded', () => {
    const aiInput = document.getElementById('aiChatInput');
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAIChatMessage();
        });
    }
});

// CAFETERIA SYSTEM
let cafeteriaCart = [];

async function loadCafeteriaMenu() {
    try {
        const response = await fetch(`${API_BASE}/cafeteria/menu`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const grid = document.getElementById('cafeteriaMenuGrid');
        
        grid.innerHTML = data.items.map(item => `
            <div class="bg-white p-4 rounded-lg shadow-sm border hover:border-indigo-300 transition">
                <div class="h-32 bg-gray-100 rounded mb-4 flex items-center justify-center">
                    <i class="fas fa-hamburger text-4xl text-gray-300"></i>
                </div>
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-gray-800">${item.item_name}</h4>
                    <span class="text-indigo-600 font-bold">₹${item.price}</span>
                </div>
                <p class="text-xs text-gray-500 mb-4">${item.category}</p>
                <button onclick="addToCafeteriaCart(${item.id}, '${item.item_name}', ${item.price})" 
                        class="w-full py-2 rounded bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-600 hover:text-white transition">
                    Add to Cart
                </button>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-8 col-span-full">Cafeteria is currently closed.</p>';
        
        updateCafeteriaCartUI();
    } catch (err) { console.error(err); }
}

function addToCafeteriaCart(id, name, price) {
    const existing = cafeteriaCart.find(i => i.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cafeteriaCart.push({ id, name, price, qty: 1 });
    }
    updateCafeteriaCartUI();
    showToast(`${name} added to cart`, 'success');
}

function updateCafeteriaCartUI() {
    const list = document.getElementById('cartItems');
    const count = document.getElementById('cartCount');
    const total = document.getElementById('cartTotal');
    
    if (cafeteriaCart.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Cart is empty</p>';
        count.textContent = '0';
        total.textContent = '0';
        return;
    }

    list.innerHTML = cafeteriaCart.map(item => `
        <div class="flex justify-between items-center text-sm">
            <div class="flex-1">
                <p class="font-bold text-gray-800">${item.name}</p>
                <p class="text-xs text-gray-500">₹${item.price} x ${item.qty}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="removeFromCafeteriaCart(${item.id})" class="text-gray-400 hover:text-red-500">
                    <i class="fas fa-minus-circle"></i>
                </button>
                <span class="font-bold">${item.qty}</span>
                <button onclick="addToCafeteriaCart(${item.id}, '${item.name}', ${item.price})" class="text-gray-400 hover:text-indigo-500">
                    <i class="fas fa-plus-circle"></i>
                </button>
            </div>
        </div>
    `).join('');

    const totalVal = cafeteriaCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const countVal = cafeteriaCart.reduce((sum, i) => sum + i.qty, 0);
    
    count.textContent = countVal;
    total.textContent = totalVal;
}

function removeFromCafeteriaCart(id) {
    const idx = cafeteriaCart.findIndex(i => i.id === id);
    if (idx > -1) {
        if (cafeteriaCart[idx].qty > 1) {
            cafeteriaCart[idx].qty--;
        } else {
            cafeteriaCart.splice(idx, 1);
        }
    }
    updateCafeteriaCartUI();
}

async function placeCafeteriaOrder() {
    if (cafeteriaCart.length === 0) return showToast('Cart is empty', 'error');
    
    const total_price = cafeteriaCart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    try {
        const response = await fetch(`${API_BASE}/cafeteria/order`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: cafeteriaCart, total_price })
        });
        if (response.ok) {
            showToast('Order placed! Collect from counter.', 'success');
            cafeteriaCart = [];
            updateCafeteriaCartUI();
        }
    } catch (err) { console.error(err); }
}

// HEALTH RECORDS
async function loadHealthRecords() {
    try {
        const payload = await authedGet('/student/health-records');
        const data = (payload && (payload.data || payload.record || payload)) || {};
        if (data) {
            document.getElementById('healthBloodGroup').value = data.blood_group || '';
            document.getElementById('healthAllergies').value = data.allergies || '';
            document.getElementById('healthHistory').value = data.medical_history || '';
            document.getElementById('healthEmergencyName').value = data.emergency_contact_name || '';
            document.getElementById('healthEmergencyPhone').value = data.emergency_contact_phone || '';
        }
    } catch (err) { console.error(err); }
}

async function saveHealthRecords() {
    const payload = {
        blood_group: document.getElementById('healthBloodGroup').value,
        allergies: document.getElementById('healthAllergies').value,
        medical_history: document.getElementById('healthHistory').value,
        emergency_contact_name: document.getElementById('healthEmergencyName').value,
        emergency_contact_phone: document.getElementById('healthEmergencyPhone').value
    };

    try {
        const response = await fetch(`${API_BASE}/student/health-records`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Health records updated!', 'success');
        }
    } catch (err) { console.error(err); }
}

// WELLNESS TRACKER
async function loadWellness() {
    try {
        const data = await authedGet('/student/wellness');
        // Update charts or list if needed
    } catch (err) { console.error(err); }
}

async function saveWellness(sleep, stress, focus) {
    try {
        const response = await fetch(`${API_BASE}/student/wellness`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sleep_hours: sleep, stress_level: stress, focus_score: focus })
        });
        if (response.ok) {
            showToast('Wellness log saved!', 'success');
        }
    } catch (err) { console.error(err); }
}

// ADVANCED ACADEMIC (Lectures & Flashcards)
async function loadLectures(subjectId) {
    try {
        const data = await authedGet(`/academic/lectures?subject_id=${subjectId}`);
        // Render lectures
    } catch (err) { console.error(err); }
}

async function loadFlashcards(subjectId) {
    try {
        const data = await authedGet(`/academic/flashcards?subject_id=${subjectId}`);
        // Render flashcards
    } catch (err) { console.error(err); }
}

// PLACEMENT ADVANCED
async function loadMockInterviews() {
    try {
        const data = await authedGet('/placement/mock-interviews');
        const list = document.getElementById('placementInterviewsList');
        if (!list) return;
        list.innerHTML = data.items.map(m => `
            <div class="p-3 bg-gray-50 rounded border">
                <div class="flex justify-between">
                    <span class="font-bold">${m.interviewer_name || 'TBD'}</span>
                    <span class="text-[10px] uppercase font-bold text-indigo-600">${m.status}</span>
                </div>
                <p class="text-xs text-gray-500">${new Date(m.scheduled_at).toLocaleString()}</p>
                ${m.feedback ? `<p class="text-[10px] text-gray-400 mt-1 italic">"${m.feedback}"</p>` : ''}
            </div>
        `).join('') || '<p class="text-xs text-gray-500">No interviews scheduled.</p>';
    } catch (err) { console.error(err); }
}

// CAMPUS ADVANCED
async function loadStudyGroups() {
    try {
        const data = await authedGet('/campus/study-groups');
        // Render groups
    } catch (err) { console.error(err); }
}

// PARKING
async function loadParkingSlots() {
    try {
        const data = await authedGet('/campus/parking/slots');
        const grid = document.getElementById('parkingSlotsGrid');
        if (!grid) return;
        
        grid.innerHTML = data.items.map(slot => `
            <div class="bg-white p-4 rounded-lg border shadow-sm text-center">
                <div class="text-3xl mb-2 ${slot.status === 'available' ? 'text-emerald-500' : 'text-rose-500'}">
                    <i class="fas fa-parking"></i>
                </div>
                <p class="font-bold text-gray-800">${slot.slot_number}</p>
                <p class="text-[10px] text-gray-400 uppercase font-bold">${slot.zone}</p>
                <span class="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    slot.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }">${slot.status}</span>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

async function registerVehicle() {
    const payload = {
        vehicle_number: document.getElementById('vehicleNumber').value,
        vehicle_type: document.getElementById('vehicleType').value
    };

    if (!payload.vehicle_number) return showToast('Vehicle number is required', 'error');

    try {
        const response = await fetch(`${API_BASE}/campus/parking/register`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Vehicle registered!', 'success');
            closeModal('registerVehicleModal');
        } else {
            const data = await response.json();
            showToast(data.message, 'error');
        }
    } catch (err) { console.error(err); }
}

// LIVE EVENTS & STREAMING
async function loadLiveEvents() {
    try {
        const data = await authedGet('/campus/events/live');
        const grid = document.getElementById('liveEventsGrid');
        if (!grid) return;
        
        grid.innerHTML = data.items.map(event => `
            <div class="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col md:flex-row">
                <div class="md:w-48 h-48 bg-indigo-600 flex items-center justify-center text-white text-4xl">
                    <i class="fas ${event.is_live ? 'fa-broadcast-tower' : 'fa-calendar-alt'}"></i>
                </div>
                <div class="p-6 flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-xl text-gray-800">${event.title}</h4>
                        ${event.is_live ? '<span class="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded animate-pulse">LIVE</span>' : ''}
                    </div>
                    <p class="text-sm text-gray-500 mb-4">${event.description}</p>
                    <div class="flex items-center justify-between mt-auto">
                        <span class="text-xs text-gray-400 font-bold">${new Date(event.event_date).toLocaleString()}</span>
                        <a href="${event.stream_url || '#'}" target="_blank" class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition">
                            ${event.is_live ? 'Join Stream' : 'View Details'}
                        </a>
                    </div>
                </div>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">No upcoming events or live streams.</p>';
    } catch (err) { console.error(err); }
}

async function getAIExamAdvice() {
    try {
        const response = await fetch(`${API_BASE}/academic/exams/adaptive-difficulty`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const adviceEl = document.getElementById('aiExamAdvice');
        adviceEl.classList.remove('hidden');
        adviceEl.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="px-3 py-1 bg-white text-indigo-600 rounded-full text-xs font-bold uppercase">${data.recommended_difficulty}</span>
                <p class="text-sm">${data.reason}</p>
            </div>
        `;
        showToast('AI analysis complete', 'success');
    } catch (err) { console.error(err); }
}

// AI Cheat Detection Mock
let tabSwitches = [];
window.addEventListener('blur', () => {
    tabSwitches.push(new Date().toISOString());
    if (tabSwitches.length > 3) {
        reportSuspiciousActivity();
    }
});

async function reportSuspiciousActivity() {
    try {
        const response = await fetch(`${API_BASE}/academic/exams/cheat-detection`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patterns: tabSwitches })
        });
        const data = await response.json();
        if (data.is_suspicious) {
            console.warn('AI Cheat Detection:', data.alert);
            // In a real app, this would alert the proctor
        }
    } catch (err) { console.error(err); }
}

// CGPA PREDICTOR FIX
async function runCgpaPrediction() {
    try {
        const data = await authedGet('/predict');
        const cgpaVal = document.getElementById('predictedCgpaVal');
        if (cgpaVal) cgpaVal.textContent = data.predicted_cgpa;
        
        const feedbackEl = document.getElementById('cgpaFeedback');
        if (feedbackEl) {
            let feedback = "";
            if (data.predicted_cgpa >= 9.0) feedback = "Excellent! You're on track for a Gold Medal.";
            else if (data.predicted_cgpa >= 8.0) feedback = "Great performance! Keep it up.";
            else if (data.predicted_cgpa >= 7.0) feedback = "Good, but focus more on internals.";
            else feedback = "Needs significant improvement in attendance and marks.";
            feedbackEl.textContent = feedback;
        }

        const factorsGrid = document.getElementById('cgpaFactors');
        if (factorsGrid) {
            factorsGrid.innerHTML = `
                <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500 font-bold uppercase text-[10px]">Attendance Impact</span>
                    <span class="text-green-600 font-bold">+${data.factors.attendance_impact}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500 font-bold uppercase text-[10px]">Internal Marks Impact</span>
                    <span class="text-blue-600 font-bold">+${data.factors.internal_impact}</span>
                </div>
            `;
        }
    } catch (err) { console.error(err); }
}

// RESUME BUILDER
async function loadResumeData() {
    try {
        const response = await fetch(`${API_BASE}/student/resume`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.resume_data) {
            const rd = data.resume_data;
            document.getElementById('resumeName').value = rd.name || '';
            document.getElementById('resumeEmail').value = rd.email || '';
            document.getElementById('resumeSummary').value = rd.summary || '';
            updateResumePreview();
        }
    } catch (err) { console.error(err); }
}

async function saveResumeData() {
    const name = document.getElementById('resumeName').value;
    const email = document.getElementById('resumeEmail').value;
    const summary = document.getElementById('resumeSummary').value;

    try {
        const response = await fetch(`${API_BASE}/student/resume`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, summary })
        });
        if (response.ok) {
            showToast('Resume saved!', 'success');
            updateResumePreview();
        }
    } catch (err) { console.error(err); }
}

function updateResumePreview() {
    const name = document.getElementById('resumeName').value || 'Your Name';
    const email = document.getElementById('resumeEmail').value || 'email@example.com';
    const summary = document.getElementById('resumeSummary').value || 'Your professional summary will appear here...';

    const preview = document.getElementById('resumePreview');
    if (!preview) return;
    preview.innerHTML = `
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold uppercase">${name}</h1>
            <p class="text-gray-500">${email}</p>
        </div>
        <div class="mb-6">
            <h2 class="text-lg font-bold border-b-2 border-gray-800 mb-2 uppercase">Professional Summary</h2>
            <p class="text-gray-700">${summary}</p>
        </div>
        <div class="mb-6">
            <h2 class="text-lg font-bold border-b-2 border-gray-800 mb-2 uppercase">Education</h2>
            <p class="text-gray-700 font-bold">Bachelor of Technology</p>
            <p class="text-gray-500 italic">Digital University | 2022 - 2026</p>
        </div>
    `;
}

async function analyzeResumeATS() {
    try {
        const response = await fetch(`${API_BASE}/placement/analyze-resume`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('atsScoreCard').classList.remove('hidden');
            document.getElementById('atsScoreVal').textContent = `${data.score}%`;
            document.getElementById('atsFeedback').textContent = data.feedback;
            showToast('ATS Analysis Complete!', 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) { console.error(err); }
}

function exportResumePDF() {
    showToast('Generating PDF...', 'info');
    window.print();
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function loadDashboard() {
    try {
        const data = await authedGet('/student/dashboard');
        
        // Update stats
        document.getElementById('attendanceRate').textContent = `${data.attendance_rate}%`;
        document.getElementById('avgMarks').textContent = data.average_marks;
        document.getElementById('completedAssignments').textContent = data.assignments_completed;
        document.getElementById('pendingTasks').textContent = data.pending_tasks;

        // Charts
        updateCharts(data);
        
        // Notifications & Recommendations
        loadNotifications();
        loadRecommendations();
        loadAttendanceRule();
        loadRoutine();
    } catch (err) { console.error(err); }
}

async function loadNotifications() {
    try {
        const data = await authedGet('/notifications');
        const list = document.getElementById('notificationList');
        list.innerHTML = data.map(n => `
            <div class="p-3 border-b last:border-0">
                <p class="text-sm font-semibold">${n.title}</p>
                <p class="text-xs text-gray-500">${n.message}</p>
                <p class="text-[10px] text-gray-400 mt-1">${new Date(n.created_at).toLocaleString()}</p>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-4">No notifications.</p>';
    } catch (err) { console.error(err); }
}

async function loadRecommendations() {
    try {
        const data = await authedGet('/student/recommendations');
        const list = document.getElementById('recommendationList');
        list.innerHTML = data.items.map(item => `
            <div class="p-3 rounded bg-indigo-50 border border-indigo-100">
                <p class="text-sm font-bold text-indigo-900">${item.title}</p>
                <p class="text-xs text-indigo-700 mt-1">${item.description}</p>
                <span class="inline-block mt-2 text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-bold uppercase">${item.type}</span>
            </div>
        `).join('') || '<p class="text-xs text-gray-500 italic">No recommendations yet.</p>';
    } catch (err) { console.error(err); }
}

function updateCharts(data) {
    const ctxAtt = document.getElementById('attendanceChart').getContext('2d');
    if (attendanceChart) attendanceChart.destroy();
    
    // Add forecast point
    const labels = data.attendance_history.map(h => h.date);
    const values = data.attendance_history.map(h => h.value);
    
    // Simple forecast: average of last 3 points
    const forecast = (values.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(1);
    labels.push('Forecast');
    values.push(parseFloat(forecast));

    attendanceChart = new Chart(ctxAtt, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Attendance %',
                data: values,
                borderColor: '#4f46e5',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                pointBackgroundColor: (context) => context.dataIndex === values.length - 1 ? '#ef4444' : '#4f46e5',
                pointRadius: (context) => context.dataIndex === values.length - 1 ? 6 : 3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    document.getElementById('attendanceForecast').textContent = `${forecast}%`;

    const ctxPerf = document.getElementById('performanceChart').getContext('2d');
    if (performanceChart) performanceChart.destroy();
    performanceChart = new Chart(ctxPerf, {
        type: 'bar',
        data: {
            labels: data.performance_data.map(p => p.subject),
            datasets: [{
                label: 'Marks',
                data: data.performance_data.map(p => p.marks),
                backgroundColor: '#818cf8',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function submitSelfAttendance() {
    try {
        const response = await fetch(`${API_BASE}/student/attendance/self`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Attendance marked!', 'success');
            loadDashboard();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) { console.error(err); }
}

async function loadAttendanceRule() {
    const body = document.getElementById('attendanceRuleBody');
    const badge = document.getElementById('attendanceRuleBadge');
    if (!body || !badge) return;
    try {
        const res = await fetch(`${API_BASE}/api/attendance/summary/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) { body.innerHTML = '<p class="text-gray-400 text-xs">Rule summary unavailable.</p>'; return; }
        const s = await res.json();
        const cfg = {
            high: ['text-emerald-700 bg-emerald-100', 'High'],
            ok: ['text-indigo-700 bg-indigo-100', 'On Track'],
            warning: ['text-amber-700 bg-amber-100', 'At Risk'],
            critical: ['text-rose-700 bg-rose-100', 'Critical']
        };
        const c = cfg[s.status] || cfg.critical;
        badge.className = `text-[10px] font-black px-2 py-1 rounded-full ${c[0]}`;
        badge.textContent = c[1];
        const state = (s.status === 'high' || s.status === 'ok') ? 'text-emerald-600' : (s.status === 'warning' ? 'text-amber-600' : 'text-rose-600');
        const bar = s.status === 'high' ? 'bg-emerald-500' : s.status === 'ok' ? 'bg-indigo-500' : s.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
        let msg;
        if (s.percentage >= 75) {
            msg = s.can_miss > 0
                ? `<div class="flex items-start gap-2 text-gray-600"><i class="fas fa-thumbs-up mt-1 text-emerald-500"></i><span>You can skip <b>${s.can_miss}</b> more class${s.can_miss === 1 ? '' : 'es'} and stay at the 75% target.</span></div>`
                : `<div class="flex items-start gap-2 text-gray-600"><i class="fas fa-thumbs-up mt-1 text-emerald-500"></i><span>You meet the 75% attendance requirement.</span></div>`;
        } else {
            msg = `<div class="flex items-start gap-2 text-rose-600"><i class="fas fa-exclamation-triangle mt-1"></i><span>Attend <b>${s.additional_needed}</b> more session${s.additional_needed === 1 ? '' : 's'} to reach 75%.</span></div>`;
        }
        body.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-gray-500 font-bold uppercase text-[10px]">Current</span>
                <span class="text-2xl font-black ${state}">${s.percentage}%</span>
            </div>
            <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full ${bar}" style="width:${Math.min(100, s.percentage)}%"></div>
            </div>
            <div class="h-1 w-full bg-gray-300 rounded-full"></div>
            <p class="text-[10px] text-gray-400 font-bold -mt-1">75% minimum target</p>
            ${msg}
            <p class="text-[10px] text-gray-400 font-bold">Present ${s.present} / ${s.total_classes} classes
                ${s.total_classes ? `&middot; Absent ${s.absent}` : ''}</p>
            ${s.pending_leave > 0 ? `<p class="text-amber-600 text-xs"><i class="fas fa-hourglass-half mr-1"></i>${s.pending_leave} leave request(s) pending approval.</p>` : ''}
        `;
    } catch (err) { console.error(err); }
}

function openLeaveModal() {
    document.getElementById('leaveFrom').value = '';
    document.getElementById('leaveTo').value = '';
    document.getElementById('leaveReason').value = '';
    document.getElementById('leaveDoc').value = '';
    openModal('leaveModal');
}

async function submitLeaveForm() {
    const leaveFrom = document.getElementById('leaveFrom').value;
    const leaveTo = document.getElementById('leaveTo').value;
    const reason = document.getElementById('leaveReason').value.trim();
    if (!leaveFrom || !leaveTo || !reason) return showToast('Fill leave dates and reason', 'error');
    const fd = new FormData();
    fd.append('leave_from', leaveFrom);
    fd.append('leave_to', leaveTo);
    fd.append('reason', reason);
    const doc = document.getElementById('leaveDoc').files[0];
    if (doc) fd.append('document', doc);
    try {
        const res = await fetch(`${API_BASE}/api/leaves`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: fd
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            closeModal('leaveModal');
            loadDashboard();
        } else {
            showToast(data.message || 'Could not submit leave.', 'error');
        }
    } catch (err) { console.error(err); }
}

function initSliderListeners() {
    const studySlider = document.getElementById('studyHoursInput');
    const sleepSlider = document.getElementById('sleepHoursInput');
    const attendanceSlider = document.getElementById('attendanceInput');

    studySlider.addEventListener('input', () => {
        document.getElementById('studyHoursDisplay').textContent = `${studySlider.value} hrs`;
    });

    sleepSlider.addEventListener('input', () => {
        document.getElementById('sleepHoursDisplay').textContent = `${sleepSlider.value} hrs`;
    });

    attendanceSlider.addEventListener('input', () => {
        document.getElementById('attendanceDisplay').textContent = `${attendanceSlider.value}%`;
    });
}

function getPredictionFeedback(marks) {
    if (marks >= 90) {
        return "ðŸŒŸ Excellent! You're on track for top grades!";
    } else if (marks >= 75) {
        return "ðŸ‘ Great job! Keep up the good work!";
    } else if (marks >= 60) {
        return "ðŸ“š Good, but you can improve by studying more!";
    } else {
        return "âš ï¸ Needs improvement! Increase study hours and attendance!";
    }
}

function getPredictionColor(marks) {
    if (marks >= 90) return '#4caf50';
    if (marks >= 75) return '#4fc3f7';
    if (marks >= 60) return '#ff9800';
    return '#f44336';
}

async function loadRecommendations() {
    try {
        const response = await fetch(`${API_BASE}/recommendations/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('myRecommendationsList');
        if (list) {
            list.innerHTML = data.recommendations.map(tip => `<li>${tip}</li>`).join('');
        }
        
        // Update dashboard with stream/dept info if available
        if (data.stream && data.dept_name) {
            const metaEl = document.getElementById('studentPersonalMeta');
            if (metaEl) {
                metaEl.textContent = `${data.stream.toUpperCase()} | ${data.dept_name}`;
            }
        }
    } catch (err) {
        console.error(err);
    }
}

let currentQuiz = null;

async function loadQuickQuiz() {
    try {
        const response = await fetch(`${API_BASE}/quizzes/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        currentQuiz = data;
        
        document.getElementById('quickQuizMeta').textContent = `Subject: ${data.subject_name} | ${data.time_limit_mins} mins`;
        const container = document.getElementById('quickQuizQuestions');
        container.innerHTML = data.questions.map((q, idx) => `
            <div class="p-3 bg-white rounded border border-gray-100">
                <p class="font-medium mb-2">${idx + 1}. ${q.text}</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${q.options.map((opt, oIdx) => `
                        <label class="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                            <input type="radio" name="q${q.id}" value="${oIdx}" class="text-indigo-600">
                            <span class="text-sm">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load quiz:', err);
    }
}

async function submitQuickQuiz() {
    if (!currentQuiz) return;
    let score = 0;
    currentQuiz.questions.forEach(q => {
        const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
        if (selected && parseInt(selected.value) === q.answer) {
            score++;
        }
    });
    
    const resultEl = document.getElementById('quickQuizResult');
    resultEl.textContent = `Score: ${score}/${currentQuiz.questions.length}`;
    showToast('Quiz submitted!', 'success');
}

async function generateStudyPlanner() {
    const exam_date = document.getElementById('plannerExamDate').value;
    const weak_subjects = document.getElementById('plannerWeakSubjects').value;
    const hours_per_day = document.getElementById('plannerHours').value;
    
    try {
        const response = await fetch(`${API_BASE}/study-plans/me`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ exam_date, weak_subjects, hours_per_day })
        });
        const data = await response.json();
        
        const container = document.getElementById('studyPlannerSchedule');
        container.innerHTML = data.plan.map(p => `
            <div class="p-2 bg-white rounded border-l-4 border-teal-500 shadow-sm">
                <div class="flex justify-between items-start">
                    <span class="font-bold text-teal-800">${p.day}</span>
                    <span class="text-xs text-teal-600">${p.duration}</span>
                </div>
                <p class="text-sm font-medium mt-1">${p.topic}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to generate plan:', err);
    }
}

async function loadLearningHub() {
    try {
        const response = await fetch(`${API_BASE}/learning-hub/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('learningHubOverall').textContent = `Overall progress: ${data.overall_progress}%`;
        const list = document.getElementById('learningHubList');
        list.innerHTML = data.resources.map(r => `
            <div class="flex items-center justify-between p-2 bg-white rounded shadow-sm">
                <div class="flex items-center space-x-2">
                    <i class="fas ${r.type === 'video' ? 'fa-video text-purple-500' : 'fa-file-pdf text-red-500'}"></i>
                    <span class="text-sm font-medium">${r.title}</span>
                </div>
                <div class="w-24 bg-gray-200 rounded-full h-1.5">
                    <div class="bg-teal-500 h-1.5 rounded-full" style="width: ${r.progress}%"></div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load hub:', err);
    }
}



function initCharts(chartData) {
    const ctx1 = document.getElementById('attendanceChart');
    if (ctx1) {
        attendanceChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Attendance %',
                    data: chartData.attendance,
                    backgroundColor: 'rgba(79, 195, 247, 0.6)'
                }]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#e0e0e0' } } }, scales: { x: { ticks: { color: '#e0e0e0' } }, y: { ticks: { color: '#e0e0e0' } } } }
        });
    }

    const ctx2 = document.getElementById('performanceChart');
    if (ctx2) {
        performanceChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Study Hours',
                    data: chartData.study_hours,
                    borderColor: '#4fc3f7',
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#e0e0e0' } } }, scales: { x: { ticks: { color: '#e0e0e0' } }, y: { ticks: { color: '#e0e0e0' } } } }
        });
    }
}

async function loadNotes() {
    try {
        const response = await fetch(`${API_BASE}/notes`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const notes = await response.json();
        const container = document.getElementById('notesList');
        container.innerHTML = notes.map(note => `
            <div class="student-item">
                <div>
                    <h3>${note.course}</h3>
                    <p>Uploaded: ${new Date(note.uploaded_at).toLocaleDateString()}</p>
                </div>
                <a href="${API_BASE}/uploads/${note.file}" target="_blank" style="color: #4fc3f7;">Download</a>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_BASE}/announcements`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const announcements = await response.json();
        const container = document.getElementById('announcementsList');
        container.innerHTML = announcements.map(ann => `
            <div class="student-item">
                <p>${ann.message}</p>
                <small>${new Date(ann.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

if (socket) {
    socket.on('new_announcement', (data) => {
        showToast('New announcement!', 'alert');
        loadAnnouncements();
    });
}

function initChatbot() {
    const bubble = document.querySelector('.chatbot-bubble');
    const window = document.querySelector('.chatbot-window');
    const input = document.querySelector('.chatbot-input input');
    const button = document.querySelector('.chatbot-input button');
    const messages = document.querySelector('.chatbot-messages');

    if (!bubble) return;

    bubble.addEventListener('click', () => {
        window.style.display = window.style.display === 'flex' ? 'none' : 'flex';
    });

    const addMessage = (text, sender) => {
        const msg = document.createElement('div');
        msg.className = `message ${sender}`;
        msg.textContent = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';

        try {
            const response = await fetch(`${API_BASE}/ai/doubt-solver`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: text })
            });
            const data = await response.json();
            addMessage(data.response, 'bot');
            if (data.related_topics) {
                addMessage(`Related: ${data.related_topics.join(', ')}`, 'bot');
            }
        } catch (err) {
            addMessage("Sorry, I'm having trouble connecting to the AI engine.", 'bot');
        }
    };

    button.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

function initVoiceAssistant() {
    document.getElementById('voiceBtn').addEventListener('click', () => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript;
            addMessage(command, 'user');
            const response = getBotResponse(command);
            addMessage(response, 'bot');
            speechSynthesis.speak(new SpeechSynthesisUtterance(response));
        };
        recognition.start();
    });
}

async function loadPrediction() {
    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ study_hours: 3.5, sleep_hours: 7.5, attendance: 85 })
        });
        const data = await response.json();
        updatePredictionDisplay(data.predicted_marks);
    } catch (err) {
        console.error(err);
    }
}

function updatePredictionDisplay(marks) {
    const marksEl = document.getElementById('predictedMarks');
    const feedbackEl = document.getElementById('predictionFeedback');
    
    marksEl.textContent = `${marks}%`;
    marksEl.style.color = getPredictionColor(marks);
    feedbackEl.textContent = getPredictionFeedback(marks);
}

async function predictMarks() {
    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                study_hours: parseFloat(document.getElementById('studyHoursInput').value) || 0,
                sleep_hours: parseFloat(document.getElementById('sleepHoursInput').value) || 0,
                attendance: parseFloat(document.getElementById('attendanceInput').value) || 0
            })
        });
        const data = await response.json();
        updatePredictionDisplay(data.predicted_marks);
        showToast('Prediction updated!', 'success');
    } catch (err) {
        showToast('Prediction failed!', 'error');
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('id', 'toast');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '2000';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.background = type === 'error' ? '#f43f5e' : type === 'info' ? '#3b82f6' : '#10b981';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Learning Center Functions
async function filterDepartments(stream) {
    const streamGrid = document.getElementById('streamGrid');
    const deptContainer = document.getElementById('deptContainer');
    const deptGrid = document.getElementById('deptGrid');
    const backBtn = document.getElementById('learningBackBtn');
    const streamTitle = document.getElementById('currentStreamTitle');

    try {
        const response = await fetch(`${API_BASE}/master/departments?stream=${stream}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        streamGrid.classList.add('hidden');
        deptContainer.classList.remove('hidden');
        if (backBtn) backBtn.classList.remove('hidden');
        
        const streamColor = getStreamColor(stream);
        streamTitle.textContent = `${stream.charAt(0).toUpperCase() + stream.slice(1)} Departments`;
        streamTitle.className = `text-xl font-bold mb-4 ${streamColor}`;

        deptGrid.innerHTML = data.items.map(dept => `
            <div onclick="loadSubjects(${dept.id}, '${dept.name}', '${stream}')" class="department-card card-shadow p-4 bg-white rounded-lg border-l-4 ${getStreamBorder(stream)} hover:bg-gray-50 transition cursor-pointer">
                <div class="flex items-center space-x-3">
                    <i class="${getStreamIcon(stream)} ${streamColor} text-2xl"></i>
                    <h4 class="font-bold text-gray-800">${dept.name}</h4>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        showToast('Failed to load departments', 'error');
    }
}

function getStreamColor(stream) {
    switch(stream) {
        case 'engineering': return 'text-blue-600';
        case 'medical': return 'text-red-600';
        case 'commerce': return 'text-green-600';
        default: return 'text-gray-600';
    }
}

function getStreamBorder(stream) {
    switch(stream) {
        case 'engineering': return 'border-blue-500';
        case 'medical': return 'border-red-500';
        case 'commerce': return 'border-green-500';
        default: return 'border-gray-500';
    }
}

function getStreamIcon(stream) {
    switch(stream) {
        case 'engineering': return 'fas fa-cog';
        case 'medical': return 'fas fa-stethoscope';
        case 'commerce': return 'fas fa-chart-line';
        default: return 'fas fa-graduation-cap';
    }
}

async function loadSubjects(deptId, deptName, stream) {
    const deptContainer = document.getElementById('deptContainer');
    const subjectContainer = document.getElementById('subjectContainer');
    const subjectList = document.getElementById('subjectList');
    const deptTitle = document.getElementById('currentDeptTitle');

    try {
        const response = await fetch(`${API_BASE}/master/subjects?department_id=${deptId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        deptContainer.classList.add('hidden');
        subjectContainer.classList.remove('hidden');
        
        const streamColor = getStreamColor(stream);
        deptTitle.textContent = `Subjects in ${deptName}`;
        deptTitle.className = `text-xl font-bold mb-4 ${streamColor}`;

        subjectList.innerHTML = data.items.map(sub => `
            <div onclick="loadMaterials(${sub.id}, '${sub.name}', '${stream}')" class="p-4 bg-white rounded-lg shadow-sm border hover:${getStreamBorder(stream).replace('border-', 'border-')} transition cursor-pointer flex justify-between items-center">
                <div>
                    <p class="text-xs text-gray-500 font-mono">${sub.code || 'N/A'}</p>
                    <h4 class="font-bold text-gray-800">${sub.name}</h4>
                </div>
                <i class="fas fa-chevron-right ${streamColor} opacity-50"></i>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        showToast('Failed to load subjects', 'error');
    }
}

async function loadMaterials(subjId, subjName, stream) {
    const subjectContainer = document.getElementById('subjectContainer');
    const materialContainer = document.getElementById('materialContainer');
    const materialGrid = document.getElementById('materialGrid');
    const subjectTitle = document.getElementById('currentSubjectTitle');

    try {
        const response = await fetch(`${API_BASE}/master/materials?subject_id=${subjId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        subjectContainer.classList.add('hidden');
        materialContainer.classList.remove('hidden');
        
        const streamColor = getStreamColor(stream);
        subjectTitle.textContent = `Materials for ${subjName}`;
        subjectTitle.className = `text-xl font-bold mb-4 ${streamColor}`;

        if (data.items.length === 0) {
            materialGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No materials found for this subject.</p>';
        } else {
            materialGrid.innerHTML = data.items.map(m => `
                <div class="stats-card card-shadow p-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-12 h-12 ${getMaterialBg(m.material_type)} rounded-lg flex items-center justify-center">
                            <i class="${getMaterialIcon(m.material_type)} ${getMaterialText(m.material_type)} text-xl"></i>
                        </div>
                        <span class="text-xs font-bold uppercase px-2 py-1 rounded bg-gray-100 text-gray-600">${m.material_type}</span>
                    </div>
                    <h4 class="font-bold text-lg mb-2">${m.title}</h4>
                    <p class="text-sm text-gray-600 mb-4 line-clamp-2">${m.description || 'No description available.'}</p>
                    <a href="${m.url}" target="_blank" class="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800">
                        View Resource <i class="fas fa-external-link-alt ml-2 text-xs"></i>
                    </a>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to load materials', 'error');
    }
}

function getMaterialIcon(type) {
    switch(type) {
        case 'note': return 'fas fa-file-alt';
        case 'pdf': return 'fas fa-file-pdf';
        case 'ppt': return 'fas fa-file-powerpoint';
        case 'video': return 'fas fa-video';
        default: return 'fas fa-link';
    }
}

function getMaterialBg(type) {
    switch(type) {
        case 'note': return 'bg-blue-100';
        case 'pdf': return 'bg-red-100';
        case 'ppt': return 'bg-orange-100';
        case 'video': return 'bg-purple-100';
        default: return 'bg-gray-100';
    }
}

function getMaterialText(type) {
    switch(type) {
        case 'note': return 'text-blue-600';
        case 'pdf': return 'text-red-600';
        case 'ppt': return 'text-orange-600';
        case 'video': return 'text-purple-600';
        default: return 'text-gray-600';
    }
}

function learningGoBack() {
    backToStreams();
}

function backToStreams() {
    const streamGrid = document.getElementById('streamGrid');
    const deptContainer = document.getElementById('deptContainer');
    const subjectContainer = document.getElementById('subjectContainer');
    const materialContainer = document.getElementById('materialContainer');
    const backBtn = document.getElementById('learningBackBtn');

    if (!materialContainer.classList.contains('hidden')) {
        materialContainer.classList.add('hidden');
        subjectContainer.classList.remove('hidden');
    } else if (!subjectContainer.classList.contains('hidden')) {
        subjectContainer.classList.add('hidden');
        deptContainer.classList.remove('hidden');
    } else {
        deptContainer.classList.add('hidden');
        streamGrid.classList.remove('hidden');
        backBtn.classList.add('hidden');
    }
}



// COMPETITIVE EXAMS
async function loadMockTests() {
    const type = document.getElementById('examTypeFilter').value;
    try {
        const response = await fetch(`${API_BASE}/exams/mock-tests?type=${type}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const grid = document.getElementById('mockTestsGrid');
        
        grid.innerHTML = data.items.map(test => `
            <div class="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500 hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">${test.exam_type}</span>
                    <span class="text-xs text-gray-500"><i class="fas fa-clock mr-1"></i>${test.duration_mins} mins</span>
                </div>
                <h4 class="font-bold text-lg mb-2">${test.title}</h4>
                <p class="text-sm text-gray-600 mb-4">Total Marks: ${test.total_marks}</p>
                <button onclick="startMockTest(${test.id}, '${test.title}')" class="w-full py-2 bg-gray-800 text-white rounded font-bold hover:bg-black transition">
                    Start Mock Test
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function startMockTest(testId, title) {
    const score = prompt(`Simulating ${title}. Enter your score (0-100):`);
    if (score === null || score === "") return;
    
    try {
        const response = await fetch(`${API_BASE}/exams/submit`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test_id: testId, score: parseInt(score) })
        });
        const data = await response.json();
        if (response.ok) {
            alert(`Test Submitted!\nPredicted Rank: ${data.rank}\nPercentile: ${data.percentile}%`);
            loadMockTests();
        }
    } catch (err) {
        console.error(err);
    }
}

// ACADEMIC PLANNER
async function loadAcademicGoals() {
    try {
        const response = await fetch(`${API_BASE}/planner/goals`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('goalsList');
        
        list.innerHTML = data.items.map(goal => `
            <div class="bg-white p-4 rounded-lg shadow border-l-4 ${goal.status === 'completed' ? 'border-green-500' : 'border-yellow-500'} flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-gray-800">${goal.goal_text}</h4>
                    <p class="text-xs text-gray-500">Target: ${goal.target_date || 'No date'}</p>
                </div>
                <span class="text-xs font-bold uppercase ${goal.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">
                    ${goal.status}
                </span>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadPlannerUI() {
    try {
        const res = await authedGet('/goals/me');
        const goal = (res && (res.goal || res.data)) || {};
        const existing = { target_cgpa: goal.target_cgpa, attendance_goal: goal.attendance_goal, study_hours_goal: goal.study_hours_goal };
        window.__plannerGoal = existing;
        const cg = document.getElementById('targetCgpa');
        const sh = document.getElementById('studyHoursGoal');
        if (cg && goal.target_cgpa != null) cg.value = goal.target_cgpa;
        if (sh && goal.study_hours_goal != null) sh.value = goal.study_hours_goal;
    } catch (err) { window.__plannerGoal = null; }

    const box = document.getElementById('plannerSchedule');
    if (!box) return;
    try {
        const plan = await authedGet('/study-planner/me');
        const items = (plan && plan.schedule) || [];
        const week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (!items.length) {
            box.innerHTML = `<p class="text-sm text-gray-500">No study plan yet.</p><p class="text-xs text-gray-400">Open the AI Planner and generate one.</p>`;
        } else {
            box.innerHTML = `
                <div class="text-xs text-gray-500 mb-2">Exam: ${plan.exam_date} &middot; Focus: ${(plan.weak_subjects || []).join(', ')}</div>
                ${items.map(d => {
                    const dt = new Date(d.day);
                    return `<div class="bg-indigo-50 p-3 rounded-lg">
                        <div class="text-sm font-bold text-indigo-800 mb-1">${d.day} ${isNaN(dt) ? '' : '(' + week[dt.getDay()] + ')'}</div>
                        <ul class="list-disc pl-5 text-xs text-gray-700 space-y-0.5">${(d.tasks || []).map(x => `<li>${x}</li>`).join('')}</ul>
                    </div>`;
                }).join('')}
            `;
        }
    } catch (err) {
        box.innerHTML = `<p class="text-sm text-gray-500">No study plan yet.</p><p class="text-xs text-gray-400">Open the AI Planner and generate one.</p>`;
    }
}

async function savePlannerGoals() {
    const target_cgpa = parseFloat(document.getElementById('targetCgpa').value);
    const study_hours_goal = parseFloat(document.getElementById('studyHoursGoal').value);
    if (!target_cgpa || target_cgpa < 0 || target_cgpa > 10) return showToast('Target CGPA must be between 0 and 10', 'error');
    if (isNaN(study_hours_goal) || study_hours_goal < 0 || study_hours_goal > 24) return showToast('Study hours must be between 0 and 24', 'error');
    const prev = window.__plannerGoal || {};
    const payload = {
        target_cgpa,
        study_hours_goal,
        attendance_goal: (prev.attendance_goal != null ? prev.attendance_goal : 90)
    };
    const response = await fetch(`${API_BASE}/goals/me`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (response.ok) {
        showToast('Goals saved and progress updated!', 'success');
        loadPlannerUI();
    } else {
        showToast('Could not save goals', 'error');
    }
}

async function addGoal() {
    const goal_text = document.getElementById('goalText')?.value;
    const target_date = document.getElementById('goalDate')?.value;
    if (!goal_text) return showToast('Please enter a goal', 'error');
    
    try {
        const response = await fetch(`${API_BASE}/planner/goals`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goal_text, target_date })
        });
        if (response.ok) {
            showToast('Goal added!', 'success');
            closeModal('newGoalModal');
            loadAcademicGoals();
        }
    } catch (err) {
        console.error(err);
    }
}

// CGPA PREDICTOR
async function runCgpaPrediction() {
    try {
        const response = await fetch(`${API_BASE}/cgpa/predict`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('predictedCgpaVal').textContent = data.predicted_cgpa;
        
        const factorsEl = document.getElementById('cgpaFactors');
        factorsEl.innerHTML = `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-sm font-medium">Attendance Impact</span>
                <span class="text-sm font-bold text-blue-600">${data.factors.attendance}%</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-sm font-medium">Study Consistency</span>
                <span class="text-sm font-bold text-green-600">${data.factors.study_hours} hrs/day</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-sm font-medium">Sleep Health</span>
                <span class="text-sm font-bold text-orange-600">${data.factors.sleep_hours} hrs/day</span>
            </div>
        `;
        
        let feedback = "";
        if (data.predicted_cgpa >= 9.0) feedback = "Excellent! You're among the top 5%.";
        else if (data.predicted_cgpa >= 8.0) feedback = "Great performance! Keep it up.";
        else if (data.predicted_cgpa >= 7.0) feedback = "Good, but there's room for growth.";
        else feedback = "Focus on increasing study hours to boost your score.";
        
        document.getElementById('cgpaFeedback').textContent = feedback;
        
    } catch (err) {
        console.error(err);
    }
}



// AI DOUBT SOLVER
async function solveDoubt() {
    const subject = document.getElementById('doubtSubject').value;
    const doubt = document.getElementById('doubtText').value;
    const btn = document.getElementById('solveDoubtBtn');
    const responseEl = document.getElementById('doubtResponse');

    if (!doubt) return showToast('Please enter your doubt', 'error');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyzing Doubt...';

    try {
        const response = await fetch(`${API_BASE}/ai/solve-doubt`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subject, doubt })
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('doubtExplanation').textContent = data.explanation;
            document.getElementById('doubtNotes').innerHTML = data.notes.map(n => `<li>${n}</li>`).join('');
            document.getElementById('doubtTopics').innerHTML = data.related_topics.map(t => `
                <span class="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                    ${t}
                </span>
            `).join('');
            
            responseEl.classList.remove('hidden');
            responseEl.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to solve doubt', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic mr-2"></i> Get AI Explanation';
    }
}

// DIGITAL LIBRARY
let isLibraryHistoryView = false;

function toggleLibraryView() {
    const booksView = document.getElementById('libraryBooksView');
    const historyView = document.getElementById('libraryHistoryView');
    const viewBtn = document.getElementById('libraryViewBtn');
    
    isLibraryHistoryView = !isLibraryHistoryView;
    
    if (isLibraryHistoryView) {
        booksView.classList.add('hidden');
        historyView.classList.remove('hidden');
        viewBtn.innerHTML = '<i class="fas fa-book mr-2"></i> Browse Books';
        loadLibraryHistory();
    } else {
        booksView.classList.remove('hidden');
        historyView.classList.add('hidden');
        viewBtn.innerHTML = '<i class="fas fa-history mr-2"></i> Borrow History';
        loadLibraryBooks();
    }
}

function libEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const LIB_COVER = {
    CSE: 'from-blue-500 to-indigo-600', ECE: 'from-amber-500 to-orange-600',
    MECH: 'from-slate-500 to-slate-700', CIVIL: 'from-emerald-500 to-teal-600',
};

function libSemester() {
    const sel = document.querySelector('#librarySemChips button.active');
    return sel && sel.dataset.sem ? sel.dataset.sem : '';
}

function renderSemChips() {
    const box = document.getElementById('librarySemChips');
    if (!box) return;
    const sems = ['', 3, 4, 5, 6];
    box.innerHTML = sems.map(s => `
        <button data-sem="${s}" onclick="pickLibrarySem(this)"
            class="sem-chip px-3 py-1 rounded-full text-xs font-bold border transition ${s === '' ? 'active bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}">
            ${s === '' ? 'All' : 'Sem ' + s}
        </button>
    `).join('');
}

function pickLibrarySem(btn) {
    document.querySelectorAll('#librarySemChips button').forEach(b => {
        const on = b === btn;
        b.className = 'sem-chip px-3 py-1 rounded-full text-xs font-bold border transition ' +
            (on ? 'active bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400');
    });
    loadLibraryBooks();
}

function readBook(bookId) {
    window.location.href = `reader.html?book=${bookId}`;
}

async function loadLibraryBooks() {
    const search = document.getElementById('librarySearch').value.trim();
    const dept = document.getElementById('libraryDept').value;
    const cat = document.getElementById('libraryCategory').value;
    const sem = libSemester();

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dept) params.set('department', dept);
    if (cat) params.set('category', cat);
    if (sem) params.set('semester', sem);

    const grid = document.getElementById('libraryBooksGrid');
    grid.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400 text-sm">Loading books...</div>';

    try {
        const response = await fetch(`${API_BASE}/library/books?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await response.json();

        // populate filter dropdowns once
        const deptSel = document.getElementById('libraryDept');
        const catSel = document.getElementById('libraryCategory');
        if (deptSel.options.length <= 1) {
            const depts = [...new Set(data.items.map(b => b.department).filter(Boolean))].sort();
            depts.forEach(d => deptSel.insertAdjacentHTML('beforeend', `<option value="${libEsc(d)}">${libEsc(d)}</option>`));
        }
        if (catSel.options.length <= 1) {
            (data.categories || []).forEach(c => catSel.insertAdjacentHTML('beforeend', `<option value="${libEsc(c)}">${libEsc(c)}</option>`));
        }

        const sub = document.getElementById('librarySubtitle');
        if (sub) sub.textContent = `${data.items.length} engineering book${data.items.length === 1 ? '' : 's'} - read online, free.`;

        if (!data.items.length) {
            grid.innerHTML = '<div class="col-span-full py-12 text-center text-gray-400"><i class="fas fa-book-open text-3xl mb-3 block"></i>No books match these filters.</div>';
            return;
        }

        grid.innerHTML = data.items.map(book => {
            const grad = LIB_COVER[book.category] || 'from-gray-500 to-gray-700';
            const pct = Math.round(book.progress_percent || 0);
            const canRead = (book.chapter_count || 0) > 0;
            return `
            <div class="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col">
                <div class="h-32 bg-gradient-to-br ${grad} relative flex items-center justify-center">
                    <i class="fas fa-book text-4xl text-white/80"></i>
                    <span class="absolute top-2 left-2 text-[10px] font-black uppercase bg-white/20 text-white px-2 py-1 rounded">${libEsc(book.category)}</span>
                    ${book.semester ? `<span class="absolute top-2 right-2 text-[10px] font-black bg-white text-gray-700 px-2 py-1 rounded">SEM ${book.semester}</span>` : ''}
                    ${book.subject_code ? `<span class="absolute bottom-2 right-2 text-[10px] font-black text-white/90">${libEsc(book.subject_code)}</span>` : ''}
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <h4 class="font-bold text-gray-800 leading-snug line-clamp-2">${libEsc(book.title)}</h4>
                    <p class="text-xs text-gray-500 mt-1">${libEsc(book.author || '')}</p>
                    <p class="text-xs text-gray-400 mt-2 line-clamp-2 flex-1">${libEsc(book.description || '')}</p>

                    ${pct > 0 ? `
                    <div class="mt-3">
                        <div class="flex justify-between text-[10px] font-bold text-gray-400 mb-1"><span>READING PROGRESS</span><span>${pct}%</span></div>
                        <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div></div>
                    </div>` : ''}

                    <div class="flex items-center justify-between mt-3 text-[10px] font-bold">
                        <span class="text-gray-400"><i class="fas fa-layer-group mr-1"></i>${book.chapter_count || 0} chapters</span>
                        <span class="${book.available_copies > 0 ? 'text-emerald-600' : 'text-rose-500'}">
                            <i class="fas fa-copy mr-1"></i>${book.available_copies} left
                        </span>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button onclick="readBook(${book.id})" ${canRead ? '' : 'disabled'}
                            class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold transition">
                            <i class="fas fa-book-reader mr-1"></i>${pct > 0 && book.last_chapter_id ? 'Continue' : 'Read Online'}
                        </button>
                        <button onclick="borrowBook(${book.id})" ${book.available_copies === 0 ? 'disabled' : ''}
                            class="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-indigo-400 text-gray-600 disabled:opacity-40 text-xs font-bold transition" title="Borrow physical copy">
                            <i class="fas fa-hand-holding"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-red-500 text-sm">Could not load the library.</div>';
    }
}

async function loadLibraryHistory() {
    try {
        const response = await fetch(`${API_BASE}/library/borrows/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('libraryHistoryTableBody');
        
        tbody.innerHTML = data.items.map(b => `
            <tr class="hover:bg-gray-50">
                <td class="p-4 border-b font-medium">${b.title}</td>
                <td class="p-4 border-b text-sm text-gray-600">${new Date(b.borrowed_at).toLocaleDateString()}</td>
                <td class="p-4 border-b text-sm text-gray-600">${new Date(b.due_date).toLocaleDateString()}</td>
                <td class="p-4 border-b">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'returned' ? 'bg-green-100 text-green-700' : 
                        (new Date(b.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')
                    }">
                        ${b.status === 'borrowed' && new Date(b.due_date) < new Date() ? 'overdue' : b.status}
                    </span>
                </td>
                <td class="p-4 border-b">
                    ${b.status === 'borrowed' ? `
                        <button onclick="returnBook(${b.id})" class="text-xs text-indigo-600 font-bold hover:underline">
                            Return Book
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function returnBook(borrowId) {
    try {
        const response = await fetch(`${API_BASE}/library/return`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ borrow_id: borrowId })
        });
        if (response.ok) {
            showToast('Book returned successfully!', 'success');
            loadLibraryHistory();
        }
    } catch (err) {
        console.error(err);
    }
}

async function borrowBook(bookId) {
    try {
        const response = await fetch(`${API_BASE}/library/borrow`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ book_id: bookId })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Book borrowed successfully!', 'success');
            loadLibraryBooks();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

// PLACEMENT PORTAL
let currentPlacementFilter = 'full-time';

async function filterPlacements(type) {
    currentPlacementFilter = type;
    
    // Update UI buttons
    const ftBtn = document.getElementById('btnJobFT');
    const inBtn = document.getElementById('btnJobIntern');
    
    if (type === 'full-time') {
        ftBtn.classList.add('bg-white', 'shadow-sm');
        ftBtn.classList.remove('text-gray-500');
        inBtn.classList.remove('bg-white', 'shadow-sm');
        inBtn.classList.add('text-gray-500');
    } else {
        inBtn.classList.add('bg-white', 'shadow-sm');
        inBtn.classList.remove('text-gray-500');
        ftBtn.classList.remove('bg-white', 'shadow-sm');
        ftBtn.classList.add('text-gray-500');
    }
    
    loadPlacementJobs();
}

async function loadPlacementJobs() {
    try {
        const response = await fetch(`${API_BASE}/placement/jobs?type=${currentPlacementFilter}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('placementJobsList');
        
        // Use Promise.all to check eligibility for all jobs in parallel
        const jobsWithEligibility = await Promise.all(data.items.map(async job => {
            const elRes = await fetch(`${API_BASE}/placement/check-eligibility/${job.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const elData = await elRes.json();
            return { ...job, eligibility: elData };
        }));

        list.innerHTML = jobsWithEligibility.map(job => `
            <div class="bg-white p-6 rounded-lg shadow-md border-l-4 ${currentPlacementFilter === 'internship' ? 'border-orange-500' : 'border-blue-600'}">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h4 class="text-xl font-bold text-gray-800">${job.role}</h4>
                            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded ${job.eligibility.eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${job.eligibility.eligible ? 'Eligible' : 'Ineligible'}
                            </span>
                        </div>
                        <p class="text-blue-600 font-semibold">${job.company_name}</p>
                    </div>
                    <span class="${currentPlacementFilter === 'internship' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'} text-xs font-bold px-3 py-1 rounded-full">
                        ${job.salary_package}
                    </span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm text-gray-600">
                    <div><i class="fas fa-map-marker-alt mr-2"></i>${job.location}</div>
                    <div><i class="fas fa-calendar-alt mr-2"></i>Deadline: ${job.deadline}</div>
                    <div class="col-span-2"><i class="fas fa-graduation-cap mr-2"></i>Req: ${job.min_cgpa} CGPA | ${job.min_attendance}% Att.</div>
                </div>
                ${!job.eligibility.eligible ? `
                    <div class="mt-3 p-2 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">
                        <i class="fas fa-exclamation-circle mr-1"></i> ${job.eligibility.reasons.join(', ')}
                    </div>
                ` : ''}
                <button onclick="applyForJob(${job.id})" 
                        class="mt-4 px-6 py-2 ${!job.eligibility.eligible ? 'bg-gray-300 cursor-not-allowed' : (currentPlacementFilter === 'internship' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700')} text-white rounded transition font-bold"
                        ${!job.eligibility.eligible ? 'disabled' : ''}>
                    ${job.eligibility.eligible ? 'Apply Now' : 'Criteria Not Met'}
                </button>
            </div>
        `).join('') || `<p class="text-center text-gray-500 py-12">No ${currentPlacementFilter} opportunities available at the moment.</p>`;

        loadPlacementApplications();
        loadPlacementInterviews();
        loadPlacementCertificates();
        loadPlacementSummary();

    } catch (err) {
        console.error(err);
    }
}

async function loadPlacementApplications() {
    try {
        const response = await fetch(`${API_BASE}/placement/applications/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('placementApplicationsList');
        
        list.innerHTML = data.items.map(app => `
            <div class="p-3 bg-gray-50 rounded border">
                <div class="flex justify-between items-start">
                    <p class="font-bold text-sm">${app.role}</p>
                    <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        app.status === 'offered' ? 'bg-green-100 text-green-700' : 
                        (app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')
                    }">${app.status}</span>
                </div>
                <p class="text-xs text-blue-600">${app.company_name}</p>
                <p class="text-[10px] text-gray-400 mt-2">Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadPlacementInterviews() {
    try {
        const response = await fetch(`${API_BASE}/placement/interviews/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('placementInterviewsList');
        
        if (data.items.length === 0) {
            list.innerHTML = '<p class="text-xs text-gray-500 italic">No upcoming interviews.</p>';
            return;
        }

        list.innerHTML = data.items.map(i => `
            <div class="p-3 bg-violet-50 rounded border border-violet-100">
                <p class="font-bold text-sm text-violet-800">${i.company_name}</p>
                <p class="text-xs text-violet-600">${i.role}</p>
                <div class="flex items-center mt-2 text-xs text-violet-500">
                    <i class="fas fa-calendar-alt mr-2"></i> ${new Date(i.scheduled_at).toLocaleString()}
                </div>
                ${i.meeting_link ? `
                    <a href="${i.meeting_link}" target="_blank" class="mt-2 inline-block text-[10px] bg-violet-600 text-white px-2 py-1 rounded">
                        Join Interview
                    </a>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadPlacementCertificates() {
    try {
        const response = await fetch(`${API_BASE}/placement/certificates/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('placementCertificatesList');
        
        list.innerHTML = data.items.map(c => `
            <div class="p-3 bg-emerald-50 rounded border border-emerald-100 flex justify-between items-center">
                <div>
                    <p class="font-bold text-sm text-emerald-800">${c.title}</p>
                    <p class="text-xs text-emerald-600">${c.issuer}</p>
                </div>
                ${c.certificate_url ? `
                    <a href="${c.certificate_url}" target="_blank" class="text-emerald-500 hover:text-emerald-700">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function addPlacementCertificate() {
    const title = document.getElementById('certificateTitle').value;
    const issuer = document.getElementById('certificateIssuer').value;
    const category = document.getElementById('certificateCategory').value;
    const issue_date = document.getElementById('certificateDate').value;
    const certificate_url = document.getElementById('certificateUrl').value;

    if (!title || !issuer) return showToast('Title and Issuer are required', 'error');

    try {
        const response = await fetch(`${API_BASE}/placement/certificates/me`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, issuer, category, issue_date, certificate_url })
        });
        if (response.ok) {
            showToast('Certificate added!', 'success');
            document.getElementById('certificateTitle').value = '';
            document.getElementById('certificateIssuer').value = '';
            document.getElementById('certificateUrl').value = '';
            loadPlacementCertificates();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadPlacementSummary() {
    try {
        const appsRes = await fetch(`${API_BASE}/placement/applications/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appsData = await appsRes.json();
        
        const certsRes = await fetch(`${API_BASE}/placement/certificates/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const certsData = await certsRes.json();

        const summaryEl = document.getElementById('placementSummary');
        summaryEl.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-sm border text-center">
                <p class="text-2xl font-bold text-blue-600">${appsData.items.length}</p>
                <p class="text-xs text-gray-500 uppercase font-bold">Applications</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border text-center">
                <p class="text-2xl font-bold text-emerald-600">${certsData.items.length}</p>
                <p class="text-xs text-gray-500 uppercase font-bold">Certifications</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border text-center">
                <p class="text-2xl font-bold text-violet-600">${appsData.items.filter(a => a.status === 'interview').length}</p>
                <p class="text-xs text-gray-500 uppercase font-bold">Interviews</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border text-center">
                <p class="text-2xl font-bold text-green-600">${appsData.items.filter(a => a.status === 'offered').length}</p>
                <p class="text-xs text-gray-500 uppercase font-bold">Offers</p>
            </div>
        `;
    } catch (err) {
        console.error(err);
    }
}

async function applyForJob(jobId) {
    try {
        const response = await fetch(`${API_BASE}/placement/apply`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ job_id: jobId })
        });
        if (response.ok) {
            showToast('Application submitted!', 'success');
        } else {
            showToast('Failed to apply', 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

// CAMPUS SERVICES
async function loadCampusServices() {
    try {
        // Load Hostels
        const hostelRes = await fetch(`${API_BASE}/campus/hostels`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const hostelData = await hostelRes.json();
        
        const hostelStatus = document.getElementById('hostelStatus');
        if (hostelData.my_allocation) {
            hostelStatus.innerHTML = `<span class="bg-green-100 text-green-800 px-2 py-1 rounded">Currently Allocated: ${hostelData.my_allocation.block} - Room ${hostelData.my_allocation.room_number}</span>`;
        } else {
            hostelStatus.innerHTML = `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">No room allocated yet.</span>`;
        }

        document.getElementById('hostelInfo').innerHTML = hostelData.items.map(h => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                    <p class="font-bold">${h.block} - Room ${h.room_number}</p>
                    <p class="text-xs text-gray-500">Available: ${h.available_slots} / ${h.capacity} | Fee: ₹${h.fee_per_sem}</p>
                </div>
                <button onclick="bookHostelRoom(${h.id})" 
                        class="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                        ${hostelData.my_allocation || h.available_slots === 0 ? 'disabled' : ''}>
                    ${hostelData.my_allocation ? 'Allocated' : 'Book Room'}
                </button>
            </div>
        `).join('');

        // Load Transport
        const transportRes = await fetch(`${API_BASE}/campus/transport-routes`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const transportData = await transportRes.json();
        
        const transportStatus = document.getElementById('transportStatus');
        if (transportData.my_allocation) {
            transportStatus.innerHTML = `<span class="bg-green-100 text-green-800 px-2 py-1 rounded">Registered: ${transportData.my_allocation.route_name} (${transportData.my_allocation.pickup_point})</span>`;
        } else {
            transportStatus.innerHTML = `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">No transport registered.</span>`;
        }

        document.getElementById('transportInfo').innerHTML = transportData.items.map(r => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                    <p class="font-bold">${r.route_name} (${r.bus_number})</p>
                    <p class="text-xs text-gray-500">Driver: ${r.driver_name} | Contact: ${r.driver_contact}</p>
                    <p class="text-xs text-gray-500">Fee: ₹${r.fee_per_sem}</p>
                </div>
                <button onclick="registerTransport(${r.id})" 
                        class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                        ${transportData.my_allocation ? 'disabled' : ''}>
                    ${transportData.my_allocation ? 'Registered' : 'Register'}
                </button>
            </div>
        `).join('');

        // Load Complaints
        loadCampusComplaints();

    } catch (err) {
        console.error(err);
        showToast('Failed to load campus services', 'error');
    }
}

async function bookHostelRoom(roomId) {
    try {
        const response = await fetch(`${API_BASE}/campus/hostel/book`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ room_id: roomId })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Room booked successfully!', 'success');
            loadCampusServices();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

async function registerTransport(routeId) {
    const pickup_point = prompt("Enter your pickup point:");
    if (!pickup_point) return;

    try {
        const response = await fetch(`${API_BASE}/campus/transport/register`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ route_id: routeId, pickup_point })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Transport registered successfully!', 'success');
            loadCampusServices();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitCampusComplaint() {
    const category = document.getElementById('complaintCategory').value;
    const subject = document.getElementById('complaintSubject').value;
    const description = document.getElementById('complaintDescription').value;

    if (!subject || !description) return showToast('Please fill all fields', 'error');

    try {
        const response = await fetch(`${API_BASE}/campus/complaints`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category, subject, description })
        });
        if (response.ok) {
            showToast('Complaint submitted!', 'success');
            document.getElementById('complaintSubject').value = '';
            document.getElementById('complaintDescription').value = '';
            loadCampusComplaints();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadCampusComplaints() {
    try {
        const response = await fetch(`${API_BASE}/campus/complaints`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('complaintsList');
        
        list.innerHTML = data.items.map(c => `
            <div class="p-3 bg-gray-50 rounded border-l-4 ${c.status === 'open' ? 'border-red-400' : 'border-green-400'}">
                <div class="flex justify-between items-start">
                    <p class="font-bold text-sm">${c.subject}</p>
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${c.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                        ${c.status}
                    </span>
                </div>
                <p class="text-xs text-gray-600 mt-1">${c.description}</p>
                <p class="text-[10px] text-gray-400 mt-2">${c.category.toUpperCase()} | ${new Date(c.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

// DISCUSSION FORUM
let currentTopicId = null;

async function loadForumTopics() {
    try {
        const response = await fetch(`${API_BASE}/forum/topics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('forumTopicsList');
        
        list.innerHTML = data.items.map(topic => `
            <div onclick="openTopicDetails(${topic.id}, '${topic.title.replace(/'/g, "\\'")}', '${topic.description.replace(/'/g, "\\'")}')" 
                 class="bg-white p-4 rounded-lg shadow border hover:shadow-md transition cursor-pointer">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-bold text-lg text-gray-800">${topic.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">${topic.description}</p>
                        <div class="flex items-center mt-3 text-xs text-gray-400 space-x-4">
                            <span><i class="fas fa-user mr-1"></i>${topic.author_name}</span>
                            <span><i class="fas fa-clock mr-1"></i>${new Date(topic.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="text-center bg-gray-50 p-2 rounded w-16">
                        <p class="font-bold text-blue-600">${topic.reply_count || 0}</p>
                        <p class="text-[10px] uppercase text-gray-500">Replies</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function createForumTopic() {
    const title = document.getElementById('newTopicTitle').value;
    const description = document.getElementById('newTopicDesc').value;

    if (!title) return showToast('Title is required', 'error');

    try {
        const response = await fetch(`${API_BASE}/forum/topics`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });
        if (response.ok) {
            showToast('Topic created!', 'success');
            closeModal('newTopicModal');
            document.getElementById('newTopicTitle').value = '';
            document.getElementById('newTopicDesc').value = '';
            loadForumTopics();
        }
    } catch (err) {
        console.error(err);
    }
}

async function openTopicDetails(topicId, title, description) {
    currentTopicId = topicId;
    document.getElementById('modalTopicTitle').textContent = title;
    document.getElementById('modalTopicDesc').textContent = description;
    document.getElementById('modalRepliesList').innerHTML = '<p class="text-center text-gray-500">Loading replies...</p>';
    
    openModal('topicDetailsModal');
    loadTopicReplies(topicId);
}

async function loadTopicReplies(topicId) {
    try {
        const response = await fetch(`${API_BASE}/forum/topics/${topicId}/replies`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('modalRepliesList');
        
        if (data.items.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-500 py-4">No replies yet. Be the first to reply!</p>';
            return;
        }

        list.innerHTML = data.items.map(r => `
            <div class="p-3 bg-gray-50 rounded border">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-xs text-indigo-600">${r.author_name}</span>
                    <span class="text-[10px] text-gray-400">${new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p class="text-sm text-gray-700">${r.content}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function postForumReply() {
    if (!currentTopicId) return;
    const content = document.getElementById('newReplyContent').value;

    if (!content) return showToast('Reply cannot be empty', 'error');

    try {
        const response = await fetch(`${API_BASE}/forum/topics/${currentTopicId}/replies`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        if (response.ok) {
            showToast('Reply posted!', 'success');
            document.getElementById('newReplyContent').value = '';
            loadTopicReplies(currentTopicId);
            loadForumTopics(); // Update reply count in main list
        }
    } catch (err) {
        console.error(err);
    }
}

// PHASE 8: ENTERPRISE SECURITY & THEMES

async function initTheme() {
    try {
        const data = await authedGet('/user/theme');
        if (data && data.theme === 'dark') {
            document.documentElement.classList.add('dark');
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    } catch (err) { console.error('Failed to init theme:', err); }
}

async function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    const icon = document.getElementById('themeIcon');
    
    if (icon) {
        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    try {
        await fetch(`${API_BASE}/user/theme`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ theme })
        });
    } catch (err) { console.error('Failed to save theme:', err); }
}

async function loadLoginHistory() {
    try {
        const data = await authedGet('/security/login-history');
        const tbody = document.getElementById('loginHistoryTable');
        if (!tbody) return;

        tbody.innerHTML = data.history.map(log => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="py-4">
                    <div class="flex items-center">
                        <i class="fas ${log.device_type === 'Mobile' ? 'fa-mobile-alt' : 'fa-desktop'} mr-3 text-gray-400"></i>
                        <div>
                            <p class="font-bold text-gray-800">${log.device_type}</p>
                            <p class="text-[10px] text-gray-500 truncate max-w-[150px]">${log.user_agent}</p>
                        </div>
                    </div>
                </td>
                <td class="py-4 font-mono text-xs text-gray-600">${log.ip_address}</td>
                <td class="py-4 text-xs text-gray-500">${new Date(log.created_at).toLocaleString()}</td>
                <td class="py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${log.status}
                    </span>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="py-8 text-center text-gray-500 italic">No login history found.</td></tr>';
    } catch (err) { console.error('Failed to load login history:', err); }
}

// UNIVERSAL SEARCH (Phase 7 Fix/Navigation)
let searchTimeout = null;
async function performUniversalSearch() {
    const input = document.getElementById('universalSearchInput');
    const resultsContainer = document.getElementById('universalSearchResults');
    const query = input.value.trim();

    if (!query) {
        resultsContainer.classList.add('hidden');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/universal-search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            
            if (data.results.length === 0) {
                resultsContainer.innerHTML = '<div class="p-4 text-gray-500 text-sm">No matches found.</div>';
            } else {
                resultsContainer.innerHTML = data.results.map(res => `
                    <div onclick="handleSearchNavigation('${res.type}', ${res.id}, '${res.title.replace(/'/g, "\\'")}', '${(res.subtitle || '').replace(/'/g, "\\'")}')" class="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer border-b last:border-0 flex items-center space-x-3">
                        <div class="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-indigo-600">
                            <i class="fas ${getSearchIcon(res.type)}"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-gray-800">${res.title}</p>
                            <p class="text-[10px] text-gray-500">${res.subtitle}</p>
                        </div>
                        <span class="text-[9px] font-bold uppercase text-gray-400 border px-1.5 py-0.5 rounded">${res.type}</span>
                    </div>
                `).join('');
            }
            resultsContainer.classList.remove('hidden');
        } catch (err) { console.error(err); }
    }, 300);
}

function getSearchIcon(type) {
    switch(type) {
        case 'Book': return 'fa-book';
        case 'Subject': return 'fa-scroll';
        case 'Forum': return 'fa-comments';
        default: return 'fa-search';
    }
}

function handleSearchNavigation(type, id, title, subtitle) {
    document.getElementById('universalSearchResults').classList.add('hidden');
    document.getElementById('universalSearchInput').value = '';

    if (type === 'Book') {
        showSection('library');
    } else if (type === 'Subject') {
        showSection('curriculum');
        loadOBE(id);
    } else if (type === 'Forum') {
        showSection('forum');
        openTopicDetails(id, title, subtitle);
    }
}

// Update showSection to handle specific data loads
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'security') loadLoginHistory();
    if (sectionId === 'finance') loadFinanceDashboard();
    if (sectionId === 'exam-schedule') loadExamSchedule();
    if (sectionId === 'academic-calendar') loadAcademicCalendar();
    if (sectionId === 'learning') resetLearningBrowse();
    if (sectionId === 'fees') loadMyFees();
    if (sectionId === 'certificates') loadMyCertificates(false);
    if (sectionId === 'helpdesk') loadHelpdesk();
    if (sectionId === 'academics') loadAcademicsHub();
    if (sectionId === 'counseling') loadCounselingHub();
    if (sectionId === 'attendance-hub') loadAttendanceHub();
    if (sectionId === 'group-chat') loadGroupChatHub();
};

function resetLearningBrowse() {
    const streamGrid = document.getElementById('streamGrid');
    const deptContainer = document.getElementById('deptContainer');
    const subjectContainer = document.getElementById('subjectContainer');
    const materialContainer = document.getElementById('materialContainer');
    const backBtn = document.getElementById('learningBackBtn');
    if (streamGrid) streamGrid.classList.remove('hidden');
    if (deptContainer) deptContainer.classList.add('hidden');
    if (subjectContainer) subjectContainer.classList.add('hidden');
    if (materialContainer) materialContainer.classList.add('hidden');
    if (backBtn) backBtn.classList.add('hidden');
}

async function loadAcademicCalendar() {
    const el = document.getElementById('academicCalendarList');
    if (!el) return;
    const days = document.getElementById('calendarDaysRange')?.value || 30;
    el.innerHTML = '<p class="text-gray-500 text-sm">Loading...</p>';
    try {
        const data = await authedGet(`/academic/calendar?days=${days}`);
        const items = data?.items || [];
        if (!items.length) {
            el.innerHTML = '<p class="text-gray-500 text-sm py-8 text-center">No upcoming events in this range. Assignments, exams, and holidays will appear here.</p>';
            return;
        }
        const typeColors = {
            class: 'bg-blue-100 text-blue-700',
            exam: 'bg-purple-100 text-purple-700',
            assignment: 'bg-amber-100 text-amber-700',
            holiday: 'bg-emerald-100 text-emerald-700',
            meeting: 'bg-rose-100 text-rose-700',
            other: 'bg-gray-100 text-gray-700',
        };
        el.innerHTML = items.map(ev => {
            const t = (ev.event_type || 'other').toLowerCase();
            const badge = typeColors[t] || typeColors.other;
            const when = ev.starts_at || '';
            const sub = ev.subject_name ? `<span class="text-xs text-gray-400"> Â· ${ev.subject_name}</span>` : '';
            return `
                <div class="bg-white p-4 rounded-lg border shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}">${t}</span>
                            <span class="text-[10px] text-gray-400 uppercase">${ev.source || 'calendar'}</span>
                        </div>
                        <p class="font-bold text-gray-800">${ev.title || 'Event'}</p>
                        <p class="text-sm text-gray-600">${ev.description || ''}${sub}</p>
                    </div>
                    <p class="text-sm font-mono text-indigo-600 whitespace-nowrap">${when}</p>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        el.innerHTML = '<p class="text-red-500 text-sm">Failed to load calendar.</p>';
    }
}

// PHASE 10: SMART EXAM SCHEDULER & AUTOMATED WORKFLOW ENGINE

async function loadExamSchedule() {
    try {
        const data = await authedGet('/exams/schedule');
        const tbody = document.getElementById('examScheduleTable');
        if (!tbody) return;

        const today = new Date();
        let nextExamDate = null;

        tbody.innerHTML = data.schedule.map(ex => {
            const examDate = new Date(ex.exam_date);
            const isFuture = examDate > today;
            if (isFuture && (!nextExamDate || examDate < nextExamDate)) {
                nextExamDate = examDate;
            }

            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-4">
                        <p class="font-bold text-gray-800">${ex.subject_name}</p>
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Sem ${ex.semester}</p>
                    </td>
                    <td class="p-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ex.exam_type === 'Semester' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                            ${ex.exam_type}
                        </span>
                    </td>
                    <td class="p-4 text-sm text-gray-600 font-medium">${ex.exam_date}</td>
                    <td class="p-4 text-sm text-gray-500">${ex.start_time} - ${ex.end_time}</td>
                    <td class="p-4 text-sm text-gray-500 font-mono">${ex.room_number || 'TBA'}</td>
                    <td class="p-4 text-right">
                        <span class="text-[10px] font-black uppercase ${isFuture ? 'text-amber-500' : 'text-emerald-500'}">
                            ${isFuture ? 'Upcoming' : 'Completed'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="6" class="p-8 text-center text-gray-500 italic">No exams scheduled yet.</td></tr>';

        // Update countdown
        if (nextExamDate) {
            const diffTime = Math.abs(nextExamDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            document.getElementById('nextExamCountdown').textContent = `${diffDays} Days`;
        } else {
            document.getElementById('nextExamCountdown').textContent = 'None';
        }
    } catch (err) { console.error(err); }
}

async function triggerWorkflows() {
    try {
        const response = await fetch(`${API_BASE}/admin/workflows/run`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
        }
    } catch (err) { console.error(err); }
}

// PHASE 9: FINANCE & CAMPUS STORE

async function loadFinanceDashboard() {
    loadWalletInfo();
    loadStoreItems();
}

async function loadWalletInfo() {
    try {
        const data = await authedGet('/wallet/balance');
        document.getElementById('walletBalance').textContent = data.balance.toFixed(2);
        
        const list = document.getElementById('walletTransactions');
        list.innerHTML = data.transactions.map(t => `
            <div class="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3 ${t.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                        <i class="fas ${t.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800">${t.description}</p>
                        <p class="text-[9px] text-gray-400">${new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <p class="text-sm font-black ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}">
                    ${t.type === 'credit' ? '+' : '-'}₹${t.amount}
                </p>
            </div>
        `).join('') || '<p class="text-center text-gray-500 text-xs py-4">No transactions yet.</p>';
    } catch (err) { console.error(err); }
}

async function submitWalletTopup() {
    const amount = document.getElementById('topupAmount').value;
    if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');

    try {
        const response = await fetch(`${API_BASE}/wallet/topup`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        if (response.ok) {
            showToast(`₹${amount} added to wallet!`, 'success');
            closeModal('topupModal');
            loadWalletInfo();
        }
    } catch (err) { console.error(err); }
}

async function loadStoreItems(category = '') {
    try {
        const url = category ? `/store/items?category=${category}` : '/store/items';
        const data = await authedGet(url);
        const grid = document.getElementById('storeItemsGrid');
        
        grid.innerHTML = data.items.map(item => `
            <div class="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition group">
                <div class="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <i class="fas ${getStoreIcon(item.category)} text-4xl text-gray-300 group-hover:scale-110 transition duration-500"></i>
                    <div class="absolute top-2 right-2">
                        <span class="bg-white/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-600 border border-white">
                            Stock: ${item.stock}
                        </span>
                    </div>
                </div>
                <p class="text-[10px] font-black uppercase text-indigo-500 mb-1">${item.category}</p>
                <h4 class="font-bold text-gray-800 mb-1">${item.name}</h4>
                <p class="text-xs text-gray-500 mb-4 line-clamp-1">${item.description || 'No description available.'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-black text-gray-800">₹${item.price}</span>
                    <button onclick="buyStoreItem(${item.id}, ${item.price}, '${item.name.replace(/'/g, "\\'")}')" 
                            class="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">
                        <i class="fas fa-shopping-cart text-sm"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p class="col-span-full text-center py-12 text-gray-500">No items available in this category.</p>';
    } catch (err) { console.error(err); }
}

function getStoreIcon(category) {
    switch(category) {
        case 'Book': return 'fa-book-open';
        case 'Merchandise': return 'fa-tshirt';
        case 'Stationery': return 'fa-pen-fancy';
        default: return 'fa-box';
    }
}

async function buyStoreItem(itemId, price, name) {
    if (!confirm(`Confirm purchase of "${name}" for ₹${price}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/store/order`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{ id: itemId, quantity: 1, price: price }],
                total_amount: price,
                payment_method: 'wallet'
            })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Purchase successful!', 'success');
            loadFinanceDashboard();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) { console.error(err); }
}

// ============ ACADEMIC PROJECTS ============
let currentProjectId = null;

function projectStatusColor(status) {
    const map = {
        'not_started': 'bg-gray-100 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-700',
        'on_track': 'bg-emerald-100 text-emerald-700',
        'review': 'bg-amber-100 text-amber-700',
        'completed': 'bg-green-100 text-green-700'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
}

function projectStatusLabel(status) {
    return String(status || '').replace(/_/g, ' ').toUpperCase();
}

function projectBarColor(progress) {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-indigo-500';
    return 'bg-amber-500';
}

async function loadProjects() {
    try {
        const data = await authedGet('/api/projects');
        const list = document.getElementById('projectsList');
        if (!list) return;
        const items = data.items || [];
        list.innerHTML = items.map(p => `
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${projectStatusColor(p.status)}">${projectStatusLabel(p.status)}</span>
                    ${p.guide_name
                        ? `<span class="text-[10px] text-gray-400 font-bold uppercase"><i class="fas fa-user-tie mr-1"></i>${p.guide_name}</span>`
                        : '<span class="text-[10px] text-amber-500 font-bold uppercase"><i class="fas fa-hourglass-half mr-1"></i>No guide yet</span>'}
                </div>
                <h4 class="font-bold text-gray-800 mb-2">${p.title}</h4>
                <p class="text-xs text-gray-500 mb-4">${p.description || 'No description provided.'}</p>
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400 font-bold uppercase">Progress</span>
                    <span class="font-bold text-indigo-600">${p.progress || 0}%</span>
                </div>
                <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div class="h-full ${projectBarColor(p.progress || 0)} rounded-full transition-all" style="width: ${p.progress || 0}%"></div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-gray-400 font-bold"><i class="fas fa-flag mr-1"></i>${p.completed_milestones || 0}/${p.milestones_count || 0} milestones</span>
                    <button onclick="openProjectDetail(${p.id})" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </div>
            </div>
        `).join('') || '<div class="lg:col-span-3 text-center text-gray-500 py-16"><i class="fas fa-folder-open text-4xl mb-3 text-gray-300"></i><p class="font-bold mb-1">No projects yet</p><p class="text-sm">Start your first academic project above.</p></div>';

        const guideSelect = document.getElementById('newProjectGuide');
        if (guideSelect && guideSelect.options.length <= 1) {
            loadProjectGuides();
        }
    } catch (err) { console.error('Failed to load projects:', err); }
}

async function loadProjectGuides() {
    try {
        const res = await fetch(`${API_BASE}/faculty/profiles`);
        const data = await res.json();
        const select = document.getElementById('newProjectGuide');
        if (!select) return;
        (data.items || []).forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.user_id;
            opt.textContent = f.faculty_name + (f.department_name ? ' (' + f.department_name + ')' : '');
            select.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

function toggleNewProjectForm() {
    const form = document.getElementById('newProjectForm');
    if (form) form.classList.toggle('hidden');
}

async function createProject() {
    const title = document.getElementById('newProjectTitle').value.trim();
    if (!title) return showToast('Project title is required', 'error');
    const payload = {
        title: title,
        description: document.getElementById('newProjectDesc').value.trim(),
        guide_user_id: document.getElementById('newProjectGuide').value || null
    };
    try {
        const res = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Project created!', 'success');
            document.getElementById('newProjectForm').classList.add('hidden');
            document.getElementById('newProjectTitle').value = '';
            document.getElementById('newProjectDesc').value = '';
            document.getElementById('newProjectGuide').value = '';
            loadProjects();
        } else {
            showToast(data.message || 'Failed to create project', 'error');
        }
    } catch (err) { console.error(err); }
}

function openProjectDetail(id) {
    currentProjectId = id;
    const list = document.getElementById('projectsList');
    const detail = document.getElementById('projectsDetail');
    if (list) list.classList.add('hidden');
    if (detail) detail.classList.remove('hidden');
    renderProjectDetail(id);
}

function closeProjectDetail() {
    currentProjectId = null;
    const list = document.getElementById('projectsList');
    const detail = document.getElementById('projectsDetail');
    if (detail) detail.classList.add('hidden');
    if (list) list.classList.remove('hidden');
    loadProjects();
}

function projectMilestoneRow(m) {
    const colors = { pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
    return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
                <p class="text-sm font-bold text-gray-700 ${m.status === 'completed' ? 'line-through text-gray-400' : ''}">${m.title}</p>
                <p class="text-[10px] text-gray-400">${m.due_date ? 'Due: ' + new Date(m.due_date).toLocaleDateString() : 'No due date'}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${colors[m.status] || colors.pending}">${m.status.replace('_', ' ')}</span>
                <div class="flex gap-1">
                    ${m.status !== 'completed' ? `<button onclick="updateMilestoneStatus(${m.id}, 'completed')" class="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold hover:bg-green-200 transition"><i class="fas fa-check mr-1"></i>Done</button>` : ''}
                    ${m.status === 'pending' ? `<button onclick="updateMilestoneStatus(${m.id}, 'in_progress')" class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-200 transition">Start</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

async function renderProjectDetail(id) {
    try {
        const data = await authedGet(`/api/projects/${id}`);
        const p = data.project;
        document.getElementById('projectDetailMain').innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-gray-800">${p.title}</h3>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${projectStatusColor(p.status)}">${projectStatusLabel(p.status)}</span>
            </div>
            <p class="text-sm text-gray-600 mb-4">${p.description || 'No description provided.'}</p>
            <div class="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                <span><i class="fas fa-user mr-1 text-indigo-500"></i>Owner: ${p.student_name}</span>
                ${p.dept_name ? `<span><i class="fas fa-building mr-1"></i>${p.dept_name}</span>` : ''}
                <span><i class="fas fa-user-tie mr-1 text-emerald-500"></i>Guide: ${p.guide_name || 'Not assigned'}</span>
                <span><i class="fas fa-calendar-alt mr-1"></i>Started: ${new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-400 font-bold uppercase">Overall Progress</span>
                <span class="font-bold text-indigo-600">${p.progress || 0}%</span>
            </div>
            <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full ${projectBarColor(p.progress || 0)} rounded-full transition-all" style="width: ${p.progress || 0}%"></div>
            </div>
        `;

        document.getElementById('projectMilestones').innerHTML = (data.milestones || []).map(projectMilestoneRow).join('') || '<p class="text-sm text-gray-400 italic">No milestones yet. Add the first one above.</p>';

        document.getElementById('projectUpdates').innerHTML = (data.updates || []).map(u => `
            <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-gray-700">${u.author_name || 'Unknown'}</span>
                    <span class="text-[10px] text-gray-400">${new Date(u.created_at).toLocaleString()}</span>
                </div>
                <p class="text-xs text-gray-600 mb-1">${u.note || 'No note'}</p>
                <div class="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-1">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: ${u.progress || 0}%"></div>
                </div>
                <span class="text-[10px] font-bold text-emerald-600">${u.progress || 0}%</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 italic">No progress updates yet.</p>';

        document.getElementById('projectDiscussion').innerHTML = (data.discussion || []).map(msg => `
            <div class="p-3 rounded-lg ${msg.author_type === 'faculty' ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold ${msg.author_type === 'faculty' ? 'text-indigo-700' : 'text-gray-700'}">
                        ${msg.author_type === 'faculty' ? '<i class="fas fa-user-tie mr-1"></i>' : '<i class="fas fa-user-graduate mr-1"></i>'}${msg.author_name || 'Unknown'}
                    </span>
                    <span class="text-[10px] text-gray-400">${new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p class="text-xs text-gray-600">${msg.message}</p>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 italic text-center py-4">Start the conversation!</p>';
    } catch (err) { console.error(err); }
}

async function updateMilestoneStatus(mid, status) {
    if (!currentProjectId) return;
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentProjectId}/milestones/${mid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Milestone updated!', 'success');
            renderProjectDetail(currentProjectId);
        } else {
            showToast(data.message || 'Failed to update milestone', 'error');
        }
    } catch (err) { console.error(err); }
}

function toggleMilestoneForm() {
    const form = document.getElementById('milestoneForm');
    if (form) form.classList.toggle('hidden');
}

async function addMilestoneFromDetail() {
    const title = document.getElementById('newMilestoneTitle').value.trim();
    if (!title || !currentProjectId) return showToast('Milestone title is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentProjectId}/milestones`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, due_date: document.getElementById('newMilestoneDue').value || null })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Milestone added!', 'success');
            document.getElementById('newMilestoneTitle').value = '';
            document.getElementById('newMilestoneDue').value = '';
            document.getElementById('milestoneForm').classList.add('hidden');
            renderProjectDetail(currentProjectId);
        } else {
            showToast(data.message || 'Failed to add milestone', 'error');
        }
    } catch (err) { console.error(err); }
}

async function postProgressFromDetail() {
    const progress = parseInt(document.getElementById('detailProgressValue').value, 10);
    if (isNaN(progress)) return showToast('Enter a progress percentage (0-100)', 'error');
    const note = document.getElementById('detailProgressNote').value.trim();
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentProjectId}/progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progress: progress, note: note })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Progress updated!', 'success');
            document.getElementById('detailProgressValue').value = '';
            document.getElementById('detailProgressNote').value = '';
            renderProjectDetail(currentProjectId);
        } else {
            showToast(data.message || 'Failed to update progress', 'error');
        }
    } catch (err) { console.error(err); }
}

async function postDiscussionFromDetail() {
    const message = document.getElementById('discussionMessage').value.trim();
    if (!message || !currentProjectId) return showToast('Message is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentProjectId}/discussion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Message posted!', 'success');
            document.getElementById('discussionMessage').value = '';
            renderProjectDetail(currentProjectId);
        } else {
            showToast(data.message || 'Failed to post message', 'error');
        }
    } catch (err) { console.error(err); }
}

// ---------------- Fees & Receipts ----------------

function fmtINR(v) {
    const n = Number(v) || 0;
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

async function loadMyFees() {
    const errEl = document.getElementById('feesError');
    errEl.classList.add('hidden');
    try {
        const data = await authedGet('/api/fees/student/me');
        document.getElementById('feeAssessed').textContent = fmtINR(data.assessed);
        document.getElementById('feePaid').textContent = fmtINR(data.paid);
        document.getElementById('feeDues').textContent = fmtINR(data.dues);
        document.getElementById('feeScholarship').textContent = fmtINR(data.scholarship);
        const tbody = document.getElementById('feeReceipts');
        tbody.innerHTML = '';
        const receipts = data.receipts || [];
        const semBody = document.getElementById('feeSemesters');
        if (semBody) {
            const semMeta = document.getElementById('feeSemesterMeta');
            if (semMeta && data.current_semester) semMeta.textContent = `Currently in Semester ${data.current_semester}`;
            const sems = data.semesters || [];
            semBody.innerHTML = sems.length ? sems.map(s => `
                <tr>
                    <td class="p-4 text-sm font-bold text-gray-800">Semester ${s.semester}${s.semester === data.current_semester ? ' <span class="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Current</span>' : ''}</td>
                    <td class="p-4 text-sm text-gray-600">${fmtINR(s.assessed)}</td>
                    <td class="p-4 text-sm font-bold text-emerald-600">${fmtINR(s.paid)}</td>
                    <td class="p-4 text-sm font-bold ${s.dues > 0 ? 'text-rose-600' : 'text-gray-400'}">${fmtINR(s.dues)}</td>
                    <td class="p-4"><span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : s.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">${s.status === 'paid' ? 'Paid' : s.status === 'partial' ? 'Partial' : 'Unpaid'}</span></td>
                </tr>
            `).join('') : '<tr><td colspan="5" class="p-4 text-sm text-gray-400 italic">No fee assessment yet.</td></tr>';
        }
        if (!receipts.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-sm text-gray-400 italic">No payments recorded yet.</td></tr>';
            return;
        }
        receipts.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 text-sm font-bold text-gray-800">${escapeHtml(r.receipt_number || r.id)}</td>
                <td class="p-4 text-sm font-bold text-indigo-600">${fmtINR(r.amount)}</td>
                <td class="p-4 text-sm text-gray-600">${escapeHtml(r.created_at || '')}</td>
                <td class="p-4"><span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">${escapeHtml(r.status || 'completed')}</span></td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        errEl.classList.remove('hidden');
        errEl.textContent = err.message || 'Failed to load fee details.';
    }
}

// ---------------- Certificates & Hall Ticket ----------------

function showCertError(msg) {
    const errEl = document.getElementById('certError');
    if (!msg) { errEl.classList.add('hidden'); return; }
    errEl.classList.remove('hidden');
    errEl.textContent = msg;
}

async function loadMyCertificates(isRefresh) {
    const list = document.getElementById('certRequestsList');
    showCertError(null);
    list.innerHTML = '<p class="p-5 text-sm text-gray-400 italic">Loading...</p>';
    try {
        const data = await authedGet('/api/certificates/me');
        const items = data.items || [];
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<p class="p-5 text-sm text-gray-400 italic">No certificate requests yet. Submit one on the left.</p>';
            return;
        }
        items.forEach(doc => {
            const el = document.createElement('div');
            el.className = 'p-5 flex flex-wrap items-center justify-between gap-4';
            const statusColors = { requested: 'bg-amber-100 text-amber-700', issued: 'bg-emerald-100 text-emerald-700', rejected: 'bg-rose-100 text-rose-700' };
            el.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <i class="fas ${doc.doc_type === 'id_card' ? 'fa-id-card' : 'fa-file-alt'}"></i>
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 capitalize">${escapeHtml(doc.doc_type.replace(/_/g, ' '))}</p>
                        <p class="text-[10px] text-gray-500 uppercase font-bold mt-0.5">Requested ${escapeHtml(doc.created_at || '')}</p>
                        ${doc.details ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(doc.details)}</p>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div id="qrcode-${doc.id}" class="hidden bg-white p-2 border border-gray-200 rounded-lg"></div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[doc.status] || 'bg-gray-100 text-gray-600'}">${escapeHtml(doc.status)}</span>
                    ${doc.qr_token && document.getElementById(`qrcode-${doc.id}`) ? `<button onclick="toggleDocQR(${doc.id})" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"><i class="fas fa-qrcode mr-1"></i>Show QR</button>` : ''}
                </div>`;
            list.appendChild(el);
            if (doc.qr_token && typeof QRCode !== 'undefined') {
                const qrBox = document.getElementById(`qrcode-${doc.id}`);
                if (qrBox && !qrBox.hasChildNodes()) {
                    new QRCode(qrBox, {
                        text: JSON.stringify({ doc: 'student_document', id: doc.id, token: doc.qr_token, type: doc.doc_type }),
                        width: 96, height: 96
                    });
                }
            }
        });
    } catch (err) {
        list.innerHTML = `<p class="p-5 text-sm text-rose-500 italic">${escapeHtml(err.message || 'Failed to load certificates.')}</p>`;
    }
}

function toggleDocQR(id) {
    const box = document.getElementById(`qrcode-${id}`);
    if (box) box.classList.toggle('hidden');
}

async function requestCertificate() {
    const docType = document.getElementById('certDocType').value;
    const details = document.getElementById('certDetails').value.trim();
    if (!docType) return showToast('Select a document type', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/certificates/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ doc_type: docType, details: details })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Request submitted! Track status here.', 'success');
            document.getElementById('certDetails').value = '';
            loadMyCertificates(true);
        } else {
            showToast(data.message || 'Request failed', 'error');
        }
    } catch (err) {
        showToast('Request failed. Is the backend running?', 'error');
    }
}

async function requestRevaluation() {
    const subject = document.getElementById('rvSubject').value.trim();
    const examName = document.getElementById('rvExam').value.trim();
    const reason = document.getElementById('rvReason').value.trim();
    if (!subject) return showToast('Subject name is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/exams/revaluation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subject_name: subject, exam_name: examName, reason: reason })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Revaluation requested!', 'success');
            document.getElementById('rvSubject').value = '';
            document.getElementById('rvExam').value = '';
            document.getElementById('rvReason').value = '';
        } else {
            showToast(data.message || 'Request failed', 'error');
        }
    } catch (err) {
        showToast('Request failed. Is the backend running?', 'error');
    }
}

async function loadHallTicket() {
    const box = document.getElementById('hallTicketBox');
    box.innerHTML = '<p class="text-sm text-gray-400 italic">Loading hall ticket...</p>';
    try {
        const data = await authedGet('/api/exams/hall-ticket/me');
        const s = data.student;
        if (!s) { box.innerHTML = '<p class="text-sm text-rose-500 italic">No student record found.</p>'; return; }
        let rows = '';
        const exams = data.exams || [];
        if (!exams.length) {
            rows = '<tr><td colspan="4" class="p-3 text-sm text-gray-400 italic">No exams scheduled yet.</td></tr>';
        } else {
            exams.forEach(e => {
                rows += `
                    <tr>
                        <td class="p-3 font-bold text-gray-800">${escapeHtml(e.subject_name)}</td>
                        <td class="p-3 text-sm text-gray-600">${escapeHtml(e.exam_type || 'Exam')}</td>
                        <td class="p-3 text-sm text-gray-800">${escapeHtml(e.exam_date || '')}</td>
                        <td class="p-3 text-sm text-gray-600">${escapeHtml(e.start_time || '')} - ${escapeHtml(e.end_time || '')} · ${escapeHtml(e.room_number || '-')}</td>
                    </tr>`;
            });
        }
        box.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div>
                    <p class="text-[10px] font-bold text-gray-500 uppercase">Hall Ticket No</p>
                    <p class="text-xl font-black text-indigo-700">${escapeHtml(s.hall_ticket_no)}</p>
                </div>
                <div class="text-sm text-gray-700">
                    <p class="font-bold">${escapeHtml(s.name)}</p>
                    <p class="text-xs text-gray-500">${escapeHtml(s.dept_name || '')} · ${escapeHtml(s.semester_name || '')}</p>
                </div>
            </div>
            <table class="w-full text-left">
                <thead>
                    <tr class="text-[10px] font-bold text-gray-500 uppercase border-b">
                        <th class="p-3">Subject</th>
                        <th class="p-3">Type</th>
                        <th class="p-3">Date</th>
                        <th class="p-3">Timing / Room</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">${rows}</tbody>
            </table>`;
    } catch (err) {
        box.innerHTML = `<p class="text-sm text-rose-500 italic">${escapeHtml(err.message || 'Failed to load hall ticket.')}</p>`;
    }
}

// ---------------- AI Helpdesk ----------------

function showHelpdeskError(msg) {
    const errEl = document.getElementById('helpdeskError');
    if (!msg) { errEl.classList.add('hidden'); return; }
    errEl.classList.remove('hidden');
    errEl.textContent = msg;
}

async function loadHelpdesk() {
    const list = document.getElementById('helpTicketsList');
    showHelpdeskError(null);
    list.innerHTML = '<p class="p-5 text-sm text-gray-400 italic">Loading...</p>';
    try {
        const data = await authedGet('/api/grievances');
        const items = data.items || [];
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<p class="p-5 text-sm text-gray-400 italic">No tickets yet. Raise one on the left.</p>';
            return;
        }
        items.forEach(g => {
            const statusColors = { open: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700' };
            const el = document.createElement('div');
            el.className = 'p-5';
            el.innerHTML = `
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="font-bold text-gray-800">${escapeHtml(g.title)}</p>
                        <p class="text-xs text-gray-500 mt-1">${escapeHtml(g.description || '')}</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold uppercase">${escapeHtml(g.category)}</span>
                            <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase">To: ${escapeHtml(g.assigned_role)}</span>
                            <span class="px-2 py-1 ${g.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'} rounded-full text-[10px] font-bold uppercase">${escapeHtml(g.priority)} priority</span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[g.status] || 'bg-gray-100 text-gray-600'}">${escapeHtml(g.status.replace(/_/g, ' '))}</span>
                </div>`;
            list.appendChild(el);
        });
    } catch (err) {
        list.innerHTML = `<p class="p-5 text-sm text-rose-500 italic">${escapeHtml(err.message || 'Failed to load tickets.')}</p>`;
    }
}

async function raiseGrievance() {
    const title = document.getElementById('helpTitle').value.trim();
    const description = document.getElementById('helpDesc').value.trim();
    if (!title) return showToast('Title is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/grievances`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, description: description })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Routed to ${data.assigned_role} (${data.category}, ${data.priority}).`, 'success');
            document.getElementById('helpTitle').value = '';
            document.getElementById('helpDesc').value = '';
            loadHelpdesk();
        } else {
            showToast(data.message || 'Submission failed', 'error');
        }
    } catch (err) {
        showToast('Submission failed. Is the backend running?', 'error');
    }
}

// ==========================================
// ACADEMICS HUB (Fees, Scholarships, Results)
// ==========================================

let _academicsLoaded = false;

async function loadAcademicsHub() {
    if (_academicsLoaded) return;
    _academicsLoaded = true;
    // Load fees data into the hub cards
    try {
        const data = await authedGet('/api/fees/student/me');
        if (data) {
            const el = id => document.getElementById(id);
            if (el('hubFeeAssessed')) el('hubFeeAssessed').textContent = fmtINR(data.assessed);
            if (el('hubFeePaid')) el('hubFeePaid').textContent = fmtINR(data.paid);
            if (el('hubFeeDues')) el('hubFeeDues').textContent = fmtINR(data.dues);
            if (el('hubFeeScholarship')) el('hubFeeScholarship').textContent = fmtINR(data.scholarship);
            const paidPct = data.assessed > 0 ? Math.round((data.paid / data.assessed) * 100) : 0;
            if (el('hubFeePaidPct')) el('hubFeePaidPct').textContent = paidPct + '% cleared';

            // Populate semester-wise breakdown
            const semBody = el('hubFeeSemesters');
            if (semBody) {
                const sems = data.semesters || [];
                semBody.innerHTML = sems.length ? sems.map(s => `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="p-3 text-sm font-bold text-gray-800">Semester ${s.semester}${s.semester === data.current_semester ? ' <span class="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Current</span>' : ''}</td>
                        <td class="p-3 text-sm text-gray-600">${fmtINR(s.assessed)}</td>
                        <td class="p-3 text-sm font-bold text-emerald-600">${fmtINR(s.paid)}</td>
                        <td class="p-3 text-sm font-bold ${s.dues > 0 ? 'text-rose-600' : 'text-gray-400'}">${fmtINR(s.dues)}</td>
                        <td class="p-3"><span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : s.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">${s.status === 'paid' ? 'Paid' : s.status === 'partial' ? 'Partial' : 'Unpaid'}</span></td>
                    </tr>
                `).join('') : '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">No fee assessments available.</td></tr>';
            }

            // Populate receipts
            const receiptsBody = document.getElementById('hubFeeReceipts');
            if (receiptsBody) {
                const receipts = data.receipts || [];
                receiptsBody.innerHTML = receipts.length ? receipts.map(r => `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="p-3 text-sm font-bold text-gray-800">${escapeHtml(r.receipt_number || 'REC-' + r.id)}</td>
                        <td class="p-3 text-sm font-bold text-indigo-600">${fmtINR(r.amount)}</td>
                        <td class="p-3 text-sm text-gray-600">${escapeHtml(r.created_at || '-')}</td>
                        <td class="p-3 text-xs font-mono text-gray-500">${escapeHtml(r.transaction_id || 'TXN' + Date.now())}</td>
                        <td class="p-3"><span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">${escapeHtml(r.status || 'completed')}</span></td>
                        <td class="p-3 text-right">
                            <button onclick="window.print()" class="text-xs text-indigo-600 font-bold hover:underline"><i class="fas fa-download mr-1"></i>PDF</button>
                        </td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">No receipts generated yet.</td></tr>';
            }
        }
    } catch (err) {
        console.error('Academics Hub fees load error:', err);
    }

    // Load scholarship applications
    loadScholarshipApplications();
    // Load result report
    loadResultReport();
}

async function loadScholarshipApplications() {
    try {
        const data = await authedGet('/api/fees/student/me');
        const tbody = document.getElementById('hubScholarshipsList');
        if (!tbody) return;
        const scholarships = data?.scholarships || [];
        tbody.innerHTML = scholarships.length ? scholarships.map(s => `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 text-sm font-bold text-gray-800">${escapeHtml(s.name)}</td>
                <td class="p-3 text-sm font-bold text-emerald-600">${fmtINR(s.amount)}</td>
                <td class="p-3 text-sm text-gray-500">${escapeHtml(s.applied_date || s.created_at || '-')}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                    }">${escapeHtml(s.status || 'pending')}</span>
                </td>
                <td class="p-3 text-xs text-gray-400">${escapeHtml(s.remarks || 'Under review')}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">No scholarship applications on record.</td></tr>';
    } catch (err) {
        console.error('Scholarships load error:', err);
    }
}

function switchAcademicsTab(tab) {
    // Hide all sub-tabs
    ['fees', 'scholarships', 'results'].forEach(t => {
        const panel = document.getElementById('acadTab-' + t);
        const btn = document.getElementById('acadTabBtn-' + t);
        if (panel) panel.classList.add('hidden');
        if (btn) {
            btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
            btn.classList.add('text-gray-600');
        }
    });
    // Show selected
    const activePanel = document.getElementById('acadTab-' + tab);
    const activeBtn = document.getElementById('acadTabBtn-' + tab);
    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
        activeBtn.classList.remove('text-gray-600');
    }
    // Reload result report when switching to results tab
    if (tab === 'results') loadResultReport();
}

async function payFeeFromHub() {
    const amountEl = document.getElementById('hubPayAmount');
    const amount = parseFloat(amountEl?.value);
    if (!amount || amount <= 0) {
        showToast('Please enter a valid payment amount.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/fees/pay`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Payment of ${fmtINR(amount)} successful! Receipt: ${data.receipt_number || data.id || 'Generated'}`, 'success');
            amountEl.value = '';
            _academicsLoaded = false;
            loadAcademicsHub();
        } else {
            showToast(data.message || 'Payment failed. Try again.', 'error');
        }
    } catch (err) {
        showToast('Payment gateway error. Is the backend running?', 'error');
    }
}

function quickApplyScholarship(schemeName, amount) {
    // Pre-fill the modal and open it
    const schemeSelect = document.getElementById('scholarshipModalScheme');
    if (schemeSelect) {
        for (let i = 0; i < schemeSelect.options.length; i++) {
            if (schemeSelect.options[i].value === schemeName || schemeSelect.options[i].text.includes(schemeName)) {
                schemeSelect.selectedIndex = i;
                break;
            }
        }
    }
    openModal('scholarshipApplyModal');
}

function openScholarshipModal() {
    openModal('scholarshipApplyModal');
}

async function submitScholarshipApplication() {
    const scheme = document.getElementById('scholarshipModalScheme')?.value;
    const gpa = document.getElementById('scholarshipModalGpa')?.value;
    const income = document.getElementById('scholarshipModalIncome')?.value;
    const reason = document.getElementById('scholarshipModalReason')?.value;

    if (!scheme) {
        showToast('Please select a scholarship scheme.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/fees/scholarships/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scheme_name: scheme,
                gpa: parseFloat(gpa) || 0,
                family_income: parseFloat(income) || 0,
                statement: reason || ''
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Scholarship application submitted successfully! Status: Under Review.', 'success');
            closeModal('scholarshipApplyModal');
            // Clear form
            if (document.getElementById('scholarshipModalGpa')) document.getElementById('scholarshipModalGpa').value = '';
            if (document.getElementById('scholarshipModalIncome')) document.getElementById('scholarshipModalIncome').value = '';
            if (document.getElementById('scholarshipModalReason')) document.getElementById('scholarshipModalReason').value = '';
            // Reload scholarships table
            loadScholarshipApplications();
        } else {
            showToast(data.message || 'Application failed.', 'error');
        }
    } catch (err) {
        showToast('Submission failed. Check your connection.', 'error');
    }
}

async function loadResultReport() {
    try {
        const data = await authedGet('/api/student/result-report');
        if (!data) return;

        const user = JSON.parse(localStorage.getItem('user'));

        // Populate student credentials
        const el = id => document.getElementById(id);
        if (el('repStudentName')) el('repStudentName').textContent = data.student_name || user?.name || '-';
        if (el('repRollNo')) el('repRollNo').textContent = data.enrollment_no || user?.roll_no || '-';
        if (el('repDept')) el('repDept').textContent = data.programme || user?.dept_name || '-';
        if (el('repSession')) el('repSession').textContent = data.exam_session || 'May - June 2026';

        // Populate grades table
        const tbody = el('repGradesBody');
        if (tbody && data.subjects) {
            tbody.innerHTML = data.subjects.map(s => {
                const total = (s.internal || 0) + (s.external || 0);
                const gradeColor = s.grade === 'O' || s.grade === 'A+' ? 'text-emerald-600' :
                                   s.grade === 'A' || s.grade === 'B+' ? 'text-blue-600' :
                                   s.grade === 'F' ? 'text-rose-600' : 'text-gray-700';
                return `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="p-3 text-xs font-mono font-bold text-gray-600">${escapeHtml(s.code || '-')}</td>
                        <td class="p-3 text-sm font-bold text-gray-800">${escapeHtml(s.name || s.subject_name || '-')}</td>
                        <td class="p-3 text-sm text-center font-bold text-indigo-600">${s.credits || '-'}</td>
                        <td class="p-3 text-sm text-center text-gray-600">${s.internal ?? '-'}</td>
                        <td class="p-3 text-sm text-center text-gray-600">${s.external ?? '-'}</td>
                        <td class="p-3 text-sm text-center font-bold text-gray-800">${total || '-'}</td>
                        <td class="p-3 text-sm text-center font-black ${gradeColor}">${escapeHtml(s.grade || '-')}</td>
                        <td class="p-3 text-sm text-center text-gray-700">${s.grade_point ?? '-'}</td>
                        <td class="p-3 text-center">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.grade === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">${s.grade === 'F' ? 'FAIL' : 'PASS'}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Summary stats
        if (el('repTotalCredits')) el('repTotalCredits').textContent = data.total_credits || '-';
        if (el('repSgpa')) el('repSgpa').textContent = data.sgpa ? parseFloat(data.sgpa).toFixed(2) : '-';
        if (el('repCgpa')) el('repCgpa').textContent = data.cgpa ? parseFloat(data.cgpa).toFixed(2) : '-';

    } catch (err) {
        console.error('Result report load error:', err);
    }
}

function downloadResultReportPDF() {
    const marksheet = document.getElementById('printableMarksheet');
    if (!marksheet) {
        showToast('No marksheet content to download.', 'error');
        return;
    }
    // Use browser print for PDF download
    window.print();
    showToast('Print dialog opened. Save as PDF to download your official marksheet.', 'success');
}

// ==========================================
// COUNSELLING & MENTORSHIP HUB
// ==========================================

async function loadCounselingHub() {
    loadCounselingData();
    loadTodayWellness();
}

function prefillCounselor(name) {
    const select = document.getElementById('counselorSelect');
    if (select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === name || select.options[i].text.includes(name)) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    // Scroll to booking form
    const form = document.querySelector('#counseling .bg-white');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function bookCounselingSession() {
    const counselor = document.getElementById('counselorSelect')?.value;
    const dateTime = document.getElementById('counselDate')?.value;
    const category = document.getElementById('counselCategory')?.value;
    const notes = document.getElementById('counselNotes')?.value;

    if (!counselor || !dateTime) {
        showToast('Please select a counselor and preferred date/time.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/counseling/book`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                counselor_name: counselor,
                appointment_date: dateTime,
                category: category || 'General',
                notes: notes || ''
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Appointment booked with ${counselor}! You'll receive a confirmation.`, 'success');
            document.getElementById('counselDate').value = '';
            document.getElementById('counselNotes').value = '';
            loadCounselingData();
        } else {
            showToast(data.message || 'Booking failed.', 'error');
        }
    } catch (err) {
        showToast('Could not book appointment. Check backend connection.', 'error');
    }
}

async function saveWellnessLog() {
    const sleep = parseFloat(document.getElementById('sleepSlider')?.value) || 7;
    const stress = parseInt(document.getElementById('stressSlider')?.value) || 5;
    const focus = parseInt(document.getElementById('focusSlider')?.value) || 5;

    try {
        const res = await fetch(`${API_BASE}/api/wellness/log`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sleep_hours: sleep,
                stress_level: stress,
                focus_score: focus
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Wellness logged: ${sleep}h sleep, stress ${stress}/10, focus ${focus}/10`, 'success');
        } else {
            showToast(data.message || 'Failed to log wellness.', 'error');
        }
    } catch (err) {
        showToast('Wellness logging failed. Try again.', 'error');
    }
}

async function loadCounselingData() {
    const list = document.getElementById('counselingAppointmentsList');
    if (!list) return;
    list.innerHTML = '<p class="text-gray-400 text-xs italic">Loading appointments...</p>';

    try {
        const data = await authedGet('/api/counseling/appointments');
        const appointments = data?.appointments || [];
        const counselors = data?.counselors || [];

        if (!appointments.length) {
            list.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-calendar-check text-3xl text-gray-200 mb-3"></i>
                    <p class="text-sm font-bold text-gray-500">No appointments yet</p>
                    <p class="text-xs text-gray-400 mt-1">Book a session with your mentor to get started.</p>
                </div>`;
            return;
        }

        list.innerHTML = appointments.map(a => {
            const statusColors = {
                scheduled: 'bg-indigo-100 text-indigo-700',
                completed: 'bg-emerald-100 text-emerald-700',
                cancelled: 'bg-gray-100 text-gray-500',
                pending: 'bg-amber-100 text-amber-700'
            };
            const statusColor = statusColors[a.status] || statusColors.pending;
            const apptDate = a.appointment_date ? new Date(a.appointment_date) : null;
            const dateStr = apptDate ? apptDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            const timeStr = apptDate ? apptDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            <i class="fas fa-user-doctor"></i>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${escapeHtml(a.counselor_name || 'Counselor')}</p>
                            <p class="text-[10px] text-gray-500"><i class="fas fa-calendar-day mr-1"></i>${dateStr} ${timeStr}</p>
                            ${a.notes ? `<p class="text-[10px] text-gray-400 mt-0.5 italic">"${escapeHtml(a.notes)}"</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor}">${escapeHtml(a.status || 'pending')}</span>
                        ${a.status === 'scheduled' || a.status === 'pending' ? `
                            <button onclick="cancelCounselingAppt(${a.id})" class="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition">
                                <i class="fas fa-times mr-0.5"></i>Cancel
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = '<p class="text-rose-500 text-xs italic">Failed to load appointments.</p>';
        console.error('Counseling data load error:', err);
    }
}

async function cancelCounselingAppt(apptId) {
    if (!confirm('Cancel this appointment?')) return;
    try {
        const res = await fetch(`${API_BASE}/api/counseling/cancel/${apptId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            showToast('Appointment cancelled.', 'success');
            loadCounselingData();
        } else {
            showToast('Could not cancel appointment.', 'error');
        }
    } catch (err) {
        showToast('Cancellation failed.', 'error');
    }
}

async function loadTodayWellness() {
    try {
        const data = await authedGet('/api/wellness/today');
        if (data?.logs?.length) {
            const latest = data.logs[0];
            if (latest.sleep_hours != null) {
                const slider = document.getElementById('sleepSlider');
                const val = document.getElementById('sleepHoursVal');
                if (slider) slider.value = latest.sleep_hours;
                if (val) val.textContent = latest.sleep_hours + ' hrs';
            }
            if (latest.stress_level != null) {
                const slider = document.getElementById('stressSlider');
                const val = document.getElementById('stressLevelVal');
                if (slider) slider.value = latest.stress_level;
                if (val) val.textContent = 'Level ' + latest.stress_level;
            }
            if (latest.focus_score != null) {
                const slider = document.getElementById('focusSlider');
                const val = document.getElementById('focusScoreVal');
                if (slider) slider.value = latest.focus_score;
                if (val) val.textContent = 'Score ' + latest.focus_score;
            }
        }
    } catch (err) { console.error('Wellness today load error:', err); }
}

// ==========================================
// ATTENDANCE HUB
// ==========================================

async function loadAttendanceHub() {
    try {
        const data = await authedGet('/student/attendance');
        if (!data) return;

        const subjects = data.items || data.subjects || [];

        // Calculate overall attendance
        let totalAttended = 0, totalClasses = 0;
        subjects.forEach(s => {
            totalAttended += (s.present || s.attended || 0);
            totalClasses += (s.total || s.total_classes || 0);
        });
        const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
        const isSafe = overallPct >= 75;

        // Update circular gauge
        const circle = document.getElementById('hubAttCircle');
        const pctLabel = document.getElementById('hubAttPercent');
        if (circle) circle.setAttribute('stroke-dasharray', `${overallPct}, 100`);
        if (circle) circle.classList.toggle('text-emerald-500', isSafe);
        if (circle) circle.classList.toggle('text-rose-500', !isSafe);
        if (pctLabel) pctLabel.textContent = overallPct + '%';

        // Update compliance badge
        const badge = pctLabel?.closest('.bg-white')?.querySelector('.px-2');
        if (badge) {
            badge.textContent = isSafe ? 'Compliance Safe' : 'Below Threshold';
            badge.className = `px-2 py-0.5 ${isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} rounded font-black text-[10px] uppercase`;
        }

        // Update counters
        const attendedEl = document.getElementById('hubTotalAttended');
        if (attendedEl) {
            attendedEl.textContent = totalAttended;
            const totalSpan = attendedEl.nextElementSibling;
            if (totalSpan) totalSpan.textContent = `/ ${totalClasses} classes`;
        }

        // Smart Bunk Calculator
        const bunkEl = document.getElementById('hubBunkSummary');
        if (bunkEl) {
            if (isSafe) {
                // Calculate how many classes can be skipped and remain above 75%
                // Formula: (attended - 0.75 * (total + canSkip)) >= 0 => canSkip = (attended - 0.75*total) / 0.75
                const canSkip = Math.floor((totalAttended - 0.75 * totalClasses) / 0.75);
                bunkEl.innerHTML = canSkip > 0
                    ? `You can safely miss up to <strong>${canSkip} more classes</strong> and remain above 75%.`
                    : `You're at the threshold. <strong>Do not miss any more classes</strong> to stay safe.`;
            } else {
                const mustAttend = Math.ceil((0.75 * totalClasses - totalAttended) / 0.25);
                bunkEl.innerHTML = `⚠️ You must attend at least <strong>${mustAttend} consecutive classes</strong> to reach 75%.`;
            }
        }

        // Subject-wise breakdown table
        const tbody = document.getElementById('hubSubjectAttendance');
        if (tbody) {
            tbody.innerHTML = subjects.map(s => {
                const attended = s.present || s.attended || 0;
                const total = s.total || s.total_classes || 0;
                const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
                const safe = pct >= 75;
                const barColor = pct >= 85 ? 'bg-emerald-500' : pct >= 75 ? 'bg-indigo-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';

                return `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="p-3.5 text-xs font-mono font-bold text-gray-500">${escapeHtml(s.subject_code || s.code || '-')}</td>
                        <td class="p-3.5 text-sm font-bold text-gray-800">${escapeHtml(s.subject_name || s.name || '-')}</td>
                        <td class="p-3.5 text-sm text-center font-bold text-indigo-600">${attended}</td>
                        <td class="p-3.5 text-sm text-center text-gray-600">${total}</td>
                        <td class="p-3.5">
                            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div class="h-full ${barColor} rounded-full transition-all" style="width: ${pct}%"></div>
                            </div>
                        </td>
                        <td class="p-3.5 text-sm text-center font-black ${safe ? 'text-emerald-600' : 'text-rose-600'}">${pct}%</td>
                        <td class="p-3.5 text-center">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${safe ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                ${safe ? 'Safe' : 'At Risk'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">No subject attendance data found.</td></tr>';
        }
    } catch (err) {
        console.error('Attendance Hub load error:', err);
    }
}

// ==========================================
// GROUP CHAT & STUDY LOUNGE
// ==========================================

let _currentChatChannel = 'general';
let _chatSocketListenerSet = false;

async function loadGroupChatHub() {
    loadChatMessages(_currentChatChannel);

    // Set up Socket.IO listener for real-time messages (once)
    if (socket && !_chatSocketListenerSet) {
        _chatSocketListenerSet = true;
        socket.on('group_chat_message', (msg) => {
            if (msg.channel === _currentChatChannel) {
                appendChatMessage(msg);
            }
        });
    }
}

function switchChatChannel(channel) {
    _currentChatChannel = channel;

    // Update channel button styles
    ['general', 'study-group', 'projects', 'doubts'].forEach(ch => {
        const btn = document.getElementById('chatChan-' + ch);
        if (btn) {
            if (ch === channel) {
                btn.className = 'w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between bg-indigo-50 text-indigo-700';
            } else {
                btn.className = 'w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between text-gray-600 hover:bg-gray-100';
            }
        }
    });

    // Update channel title
    const channelNames = {
        'general': 'general-lounge',
        'study-group': 'study-group-cse',
        'projects': 'project-collab',
        'doubts': 'doubt-clearing'
    };
    const titleEl = document.getElementById('activeChatChannelTitle');
    if (titleEl) titleEl.textContent = channelNames[channel] || channel;

    // Update input placeholder
    const input = document.getElementById('chatInputMessage');
    if (input) input.placeholder = `Type message in #${channelNames[channel] || channel}... (Press Enter to send)`;

    // Load messages for this channel
    loadChatMessages(channel);
}

async function loadChatMessages(channel) {
    const stream = document.getElementById('chatMessagesStream');
    if (!stream) return;
    stream.innerHTML = '<p class="text-center text-gray-400 text-xs italic">Loading chat messages...</p>';

    try {
        const data = await authedGet(`/api/group-chat/messages?channel=${channel}`);
        const messages = data?.messages || [];

        if (!messages.length) {
            stream.innerHTML = `
                <div class="text-center py-16">
                    <i class="fas fa-comments text-4xl text-gray-200 mb-3"></i>
                    <p class="text-sm font-bold text-gray-500">No messages yet</p>
                    <p class="text-xs text-gray-400 mt-1">Be the first to say something!</p>
                </div>`;
            return;
        }

        stream.innerHTML = messages.map(m => renderChatMessage(m)).join('');
        // Scroll to bottom
        stream.scrollTop = stream.scrollHeight;
    } catch (err) {
        stream.innerHTML = '<p class="text-center text-rose-400 text-xs italic">Failed to load messages.</p>';
        console.error('Chat load error:', err);
    }
}

function renderChatMessage(m) {
    const user = JSON.parse(localStorage.getItem('user'));
    const isMe = m.user_id === user?.id;
    const isStaff = m.role === 'faculty' || m.role === 'admin';
    const timestamp = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

    return `
        <div class="flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''} group">
            <div class="w-8 h-8 rounded-xl ${isStaff ? 'bg-indigo-100 text-indigo-600' : isMe ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center text-xs font-black shrink-0">
                ${(m.user_name || '?').charAt(0).toUpperCase()}
            </div>
            <div class="max-w-[70%]">
                <div class="flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''} mb-0.5">
                    <span class="font-bold text-xs text-gray-800">${escapeHtml(m.user_name || 'Anonymous')}</span>
                    ${isStaff ? '<span class="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">Faculty</span>' : ''}
                    <span class="text-[10px] text-gray-400">${dateStr} ${timestamp}</span>
                </div>
                <div class="${isMe ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'} border rounded-xl px-3.5 py-2.5 text-sm text-gray-700 leading-relaxed">
                    ${escapeHtml(m.message || '')}
                </div>
            </div>
        </div>
    `;
}

function appendChatMessage(msg) {
    const stream = document.getElementById('chatMessagesStream');
    if (!stream) return;
    // Remove "no messages" placeholder if present
    const placeholder = stream.querySelector('.text-center');
    if (placeholder && stream.children.length === 1) stream.innerHTML = '';
    stream.insertAdjacentHTML('beforeend', renderChatMessage(msg));
    stream.scrollTop = stream.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chatInputMessage');
    const message = input?.value?.trim();
    if (!message) return;

    try {
        const res = await fetch(`${API_BASE}/api/group-chat/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel: _currentChatChannel,
                message: message
            })
        });
        const data = await res.json();
        if (res.ok) {
            input.value = '';
            // If Socket.IO isn't connected, manually append
            if (!socket || !socket.connected) {
                appendChatMessage(data.message || {
                    user_name: JSON.parse(localStorage.getItem('user'))?.name || 'You',
                    user_id: JSON.parse(localStorage.getItem('user'))?.id,
                    message: message,
                    channel: _currentChatChannel,
                    created_at: new Date().toISOString(),
                    role: 'student'
                });
            }
        } else {
            showToast(data.message || 'Failed to send message.', 'error');
        }
    } catch (err) {
        showToast('Message send failed. Check connection.', 'error');
    }
}

function insertChatEmoji(emoji) {
    const input = document.getElementById('chatInputMessage');
    if (input) {
        input.value += emoji;
        input.focus();
    }
}

