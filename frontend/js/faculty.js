
const API_BASE = 'http://localhost:5000';
let socket = null;
try { socket = (typeof io === 'function') ? io(API_BASE) : null; } catch (_) { socket = null; }
let facultyChart;

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

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
        sec.style.display = ''; // Reset inline style if any
    });
    document.querySelectorAll('.sidebar-item').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
    }
    
    const sidebarLink = document.querySelector(`a[onclick="showSection('${sectionId}')"]`);
    if (sidebarLink) {
        sidebarLink.classList.add('active');
    }

    // Reload data
    if (sectionId === 'research') loadResearch();
    if (sectionId === 'appointments') loadAppointments();
    if (sectionId === 'guides') loadGuidedProjects();
    if (sectionId === 'observations') { loadObservationForm(); loadObservations(); }
    if (sectionId === 'lesson-planner') loadLessonPlans();
    if (sectionId === 'analytics') { loadTopicAnalytics(); loadDashboard(); }
    if (sectionId === 'voice-notes') loadVoiceNotes();
    if (sectionId === 'placements-admin') loadMockInterviews();
    if (sectionId === 'flashcards-admin') loadFlashcards();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('facultyName').textContent = user.name;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    loadDashboard();
    loadStudents();
    loadAttendanceMarking();
    loadAttendanceProgrammes();
    loadNotes();
    loadAnnouncements();
    initForms();
    loadLessonPlans();
    loadTopicAnalytics();
    loadVoiceNotes();
    initPhase3Listeners();

    const searchStudentEl = document.getElementById('searchStudent');
    if (searchStudentEl) searchStudentEl.addEventListener('input', loadStudents);
    if (socket) {
        socket.on('attendance_update', loadDashboard);
        socket.on('dashboard_update', loadDashboard);
    }
});

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('totalStudents').textContent = data.total_students;
        document.getElementById('avgAttendance').textContent = `${data.avg_attendance}%`;
        
        initChart(data.chart_data);
    } catch (err) {
        console.error(err);
    }
}

function initChart(chartData) {
    const ctx = document.getElementById('facultyChart');
    if (ctx) {
        if (facultyChart) facultyChart.destroy();
        facultyChart = new Chart(ctx, {
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
}

async function loadStudents() {
    try {
        const search = document.getElementById('searchStudent').value;
        const response = await fetch(`${API_BASE}/students?search=${search}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const students = await response.json();
        const container = document.getElementById('studentsList');
        container.innerHTML = students.map(student => `
            <div class="student-item">
                <div>
                    <h3>${student.name}</h3>
                    <p>Attendance: ${student.attendance}% | Study: ${student.study_hours}h | Sleep: ${student.sleep_hours}h</p>
                </div>
                <div>
                    <button class="btn-edit" onclick="editStudent(${student.id}, '${student.name}', ${student.attendance}, ${student.study_hours}, ${student.sleep_hours})">Edit</button>
                    <button class="btn-delete" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAttendanceMarking() {
    try {
        const response = await fetch(`${API_BASE}/students`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const students = await response.json();
        const container = document.getElementById('attendanceMarking');
        container.innerHTML = students.map(student => `
            <div class="student-item">
                <span>${student.name}</span>
                <div>
                    <button onclick="markAttendance(${student.id}, 'present')" class="btn-edit">Present</button>
                    <button onclick="markAttendance(${student.id}, 'absent')" class="btn-delete">Absent</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

let attendanceState = {};

async function loadAttendanceProgrammes() {
    const deptSel = document.getElementById('attendanceDept');
    if (!deptSel) return;
    try {
        deptSel.innerHTML = '<option value="">All programmes</option>';
        const res = await fetch(`${API_BASE}/master/departments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) return;
        const depts = await res.json();
        const items = Array.isArray(depts) ? depts : (depts.items || []);
        items.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            deptSel.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

async function loadStudentsForAttendance() {
    if (!document.getElementById('attendanceDept')) return;
    const dept = document.getElementById('attendanceDept').value;
    const sem = document.getElementById('attendanceSem').value;
    const dateEl = document.getElementById('attendanceDate');
    if (!dateEl.value) {
        dateEl.value = new Date().toISOString().slice(0, 10);
    }
    const list = document.getElementById('attendanceList');
    const saveBtn = document.getElementById('saveAttendanceBtn');
    list.innerHTML = '<p class="text-cyan-300 text-sm italic">Loading enrolled students...</p>';
    attendanceState = {};
    if (saveBtn) saveBtn.classList.add('hidden');
    try {
        const res = await fetch(`${API_BASE}/students?limit=500`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) return;
        let students = await res.json();
        if (Array.isArray(students)) {
            if (dept) students = students.filter(s => String(s.department_id) === dept);
            if (sem) students = students.filter(s => String(s.semester_id) === sem || String(s.semester) === sem);
        }
        if (!students.length) {
            list.innerHTML = '<p class="text-cyan-300 text-sm italic">No students enrolled in this programme + semester.</p>';
            return;
        }
        list.innerHTML = students.map(s => `
            <div class="flex items-center justify-between p-3 bg-cyan-900/40 rounded-lg" data-stuid="${s.id}">
                <div class="min-w-0">
                    <p class="text-sm font-bold text-cyan-50 truncate">${s.name || 'Student #' + s.id}</p>
                    <p class="text-[10px] text-cyan-400">${s.department_name || ''}${s.semester_id ? ' · Sem ' + s.semester_id : ''}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="setAttendanceRow(${s.id}, 'present', this)" class="text-[10px] font-black px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600">Present</button>
                    <button onclick="setAttendanceRow(${s.id}, 'absent', this)" class="text-[10px] font-black px-3 py-1.5 rounded bg-rose-500 text-white hover:bg-rose-600">Absent</button>
                </div>
            </div>
        `).join('');
        if (saveBtn) saveBtn.classList.remove('hidden');
    } catch (err) { console.error(err); }
}

function setAttendanceRow(studentId, status, btn) {
    const row = btn.closest('[data-stuid]');
    row.querySelectorAll('button').forEach(b => b.classList.add('opacity-40'));
    btn.classList.remove('opacity-40');
    btn.classList.add('ring-2', 'ring-white');
    attendanceState[studentId] = status;
}

async function saveAttendance() {
    const items = Object.entries(attendanceState).map(([student_id, status]) => ({ student_id: Number(student_id), status, notes: '' }));
    if (!items.length) return showToast('Mark at least one student!', 'error');
    const date = document.getElementById('attendanceDate').value;
    try {
        const res = await fetch(`${API_BASE}/attendance/bulk`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, items })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`${data.inserted} student(s) marked!`, 'success');
            attendanceState = {};
            document.getElementById('attendanceList').innerHTML = '';
            document.getElementById('saveAttendanceBtn').classList.add('hidden');
        } else {
            showToast(data.message || 'Save failed.', 'error');
        }
    } catch (err) { console.error(err); }
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

function initForms() {
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) addStudentBtn.addEventListener('click', async () => {
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
            loadAttendanceMarking();
            showToast('Student added!', 'success');
        } catch (err) {
            showToast('Failed to add student!', 'error');
        }
    });

    const uploadNotesForm = document.getElementById('uploadNotesForm');
    if (uploadNotesForm) uploadNotesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('course', document.getElementById('courseName').value);
        formData.append('file', document.getElementById('noteFile').files[0]);
        
        try {
            await fetch(`${API_BASE}/notes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            loadNotes();
            showToast('Note uploaded!', 'success');
            document.getElementById('uploadNotesForm').reset();
        } catch (err) {
            showToast('Upload failed!', 'error');
        }
    });

    const announcementForm = document.getElementById('announcementForm');
    if (!announcementForm) return;
    announcementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE}/announcements`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: document.getElementById('announcementText').value })
            });
            loadAnnouncements();
            showToast('Announcement posted!', 'success');
            document.getElementById('announcementForm').reset();
        } catch (err) {
            showToast('Failed to post!', 'error');
        }
    });
}

async function editStudent(id, name, attendance, study_hours, sleep_hours) {
    const newName = prompt('Enter new name:', name);
    const newAtt = prompt('Enter attendance %:', attendance);
    const newStudy = prompt('Enter study hours:', study_hours);
    const newSleep = prompt('Enter sleep hours:', sleep_hours);
    
    if (!newName) return;
    
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
    if (!confirm('Delete this student?')) return;
    
    try {
        await fetch(`${API_BASE}/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        loadStudents();
        loadAttendanceMarking();
        showToast('Student deleted!', 'success');
    } catch (err) {
        showToast('Delete failed!', 'error');
    }
}

async function markAttendance(studentId, status) {
    try {
        await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                student_id: studentId, 
                date: new Date().toISOString().split('T')[0], 
                status, 
                notes: '' 
            })
        });
        showToast(`Marked as ${status}!`, 'success');
    } catch (err) {
        showToast('Attendance failed!', 'error');
    }
}

// PHASE 3 FACULTY LOGIC

async function loadLessonPlans() {
    try {
        const response = await fetch(`${API_BASE}/faculty/lesson-plans`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const grid = document.getElementById('lessonPlansGrid');
        if (!grid) return;

        grid.innerHTML = data.items.map(plan => `
            <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Week ${plan.week_number}</span>
                    <span class="text-xs uppercase font-bold ${plan.status === 'completed' ? 'text-green-600' : 'text-orange-600'}">${plan.status}</span>
                </div>
                <h4 class="font-bold text-lg mb-1">${plan.topic}</h4>
                <p class="text-sm text-gray-500 mb-3">${plan.subject_name}</p>
                <div class="space-y-1">
                    <p class="text-xs font-bold text-gray-400 uppercase">Learning Outcomes:</p>
                    <ul class="text-xs text-gray-600 list-disc list-inside">
                        ${plan.learning_outcomes.split(',').map(o => `<li>${o.trim()}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function addLessonPlan() {
    const subject_id = document.getElementById('lessonPlanSubject').value;
    const topic = document.getElementById('lessonPlanTopic').value;
    const week_number = document.getElementById('lessonPlanWeek').value;
    const learning_outcomes = document.getElementById('lessonPlanOutcomes').value;

    if (!topic) return showToast('Topic is required', 'error');

    try {
        const response = await fetch(`${API_BASE}/faculty/lesson-plans`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subject_id, topic, week_number, learning_outcomes })
        });
        if (response.ok) {
            showToast('Lesson plan saved!', 'success');
            closeModal('newLessonPlanModal');
            loadLessonPlans();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadTopicAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/faculty/topic-analytics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('topicAnalyticsList');
        if (!list) return;

        list.innerHTML = data.items.map(topic => `
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold text-gray-800">${topic.topic_name}</h4>
                    <span class="text-xs font-bold ${topic.fail_rate > 30 ? 'text-red-600' : 'text-green-600'}">
                        ${topic.fail_rate}% Struggle Rate
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${topic.avg_score}%"></div>
                </div>
                <div class="flex justify-between mt-1">
                    <span class="text-[10px] text-gray-400">Average Score</span>
                    <span class="text-[10px] font-bold text-gray-600">${topic.avg_score}%</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function generateAIQuestions() {
    const topic = document.getElementById('aiGenTopic').value;
    const difficulty = document.getElementById('aiGenDifficulty').value;

    if (!topic) return showToast('Please enter a topic', 'error');

    const output = document.getElementById('aiGeneratedOutput');
    output.innerHTML = '<div class="text-center py-20"><i class="fas fa-robot fa-spin text-4xl text-indigo-500 mb-4"></i><p>AI is thinking...</p></div>';

    try {
        const response = await fetch(`${API_BASE}/faculty/ai-generate-assignment`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topic, difficulty })
        });
        const data = await response.json();
        
        output.innerHTML = `
            <div class="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold text-indigo-800">Topic: ${data.topic}</h4>
                    <span class="text-xs font-bold text-indigo-600 uppercase">${data.difficulty}</span>
                </div>
                <p class="text-xs text-indigo-500">Suggested Due Date: ${data.suggested_due_date}</p>
            </div>
            <div class="space-y-4">
                ${data.generated_questions.map((q, i) => `
                    <div class="p-4 border rounded-lg hover:border-indigo-300 transition">
                        <div class="flex justify-between mb-2">
                            <span class="text-xs font-bold text-gray-400 uppercase">Question ${i+1}</span>
                            <span class="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">${q.type}</span>
                        </div>
                        <p class="text-gray-800 font-medium">${q.q}</p>
                    </div>
                `).join('')}
            </div>
            <button class="w-full mt-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg" onclick="showToast('Assignment published to students!', 'success')">
                Publish Assignment
            </button>
        `;
    } catch (err) {
        output.innerHTML = '<p class="text-red-500 text-center py-20">AI Generation failed. Please try again.</p>';
    }
}

async function loadVoiceNotes() {
    try {
        const data = await authedGet('/academic/lectures');
        const grid = document.getElementById('voiceNotesGrid');
        if (!grid) return;

        grid.innerHTML = data.items.map(note => `
            <div class="bg-white p-4 rounded-lg shadow-md border hover:border-red-500 transition">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-play text-red-600"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800">${note.title}</h4>
                        <p class="text-xs text-gray-500">${new Date(note.recorded_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="bg-gray-100 h-1 rounded-full mb-4">
                    <div class="bg-red-500 h-1 rounded-full w-1/3"></div>
                </div>
                <a href="${note.video_url}" target="_blank" class="text-xs font-bold text-red-600 hover:text-red-800 uppercase flex items-center">
                    <i class="fas fa-external-link-alt mr-1"></i> View Recording
                </a>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">No lecture recordings found.</p>';
    } catch (err) {
        console.error(err);
    }
}

async function uploadVoiceNote() {
    const payload = {
        subject_id: document.getElementById('voiceNoteSubject').value,
        title: document.getElementById('voiceNoteTitle').value,
        video_url: document.getElementById('voiceNoteUrl').value,
        duration_minutes: 60 // Default
    };

    if (!payload.title || !payload.video_url) return showToast('Title and URL required', 'error');

    try {
        const response = await fetch(`${API_BASE}/academic/lectures`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Lecture recording added!', 'success');
            closeModal('uploadVoiceModal');
            loadVoiceNotes();
        }
    } catch (err) {
        console.error(err);
    }
}

// ADVANCED PLACEMENT & FLASHCARDS
async function scheduleMockInterview() {
    const payload = {
        student_id: document.getElementById('mockStudentId').value,
        interviewer_name: document.getElementById('mockInterviewer').value,
        scheduled_at: document.getElementById('mockDate').value,
        status: 'scheduled'
    };

    try {
        const response = await fetch(`${API_BASE}/placement/mock-interviews`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Mock interview scheduled!', 'success');
        }
    } catch (err) { console.error(err); }
}

async function addFlashcard() {
    const payload = {
        subject_id: document.getElementById('flashSubjectId').value,
        question: document.getElementById('flashQuestion').value,
        answer: document.getElementById('flashAnswer').value
    };

    try {
        const response = await fetch(`${API_BASE}/academic/flashcards`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Flashcard added!', 'success');
        }
    } catch (err) { console.error(err); }
}

// AUTOMATED GRADING
function openGradeModal(submissionId) {
    document.getElementById('gradeSubmissionId').value = submissionId;
    openModal('gradeSubmissionModal');
}

async function submitGrade() {
    const submission_id = document.getElementById('gradeSubmissionId').value;
    const score = document.getElementById('gradeScore').value;
    const feedback = document.getElementById('gradeFeedback').value;

    if (!score) return showToast('Score is required', 'error');

    try {
        const response = await fetch(`${API_BASE}/faculty/grade-submission`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ submission_id, score, feedback })
        });
        if (response.ok) {
            showToast('Submission graded!', 'success');
            closeModal('gradeSubmissionModal');
            loadFacultyAssignments(); // Refresh list
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadFacultyAssignments() {
    try {
        const response = await fetch(`${API_BASE}/faculty/assignments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const grid = document.getElementById('facultyAssignmentsList');
        if (!grid) return;

        grid.innerHTML = data.items.map(a => `
            <div class="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="font-bold text-lg">${a.title}</h4>
                    <span class="text-xs text-gray-400 font-bold uppercase">${a.subject_name}</span>
                </div>
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Total Submissions</span>
                        <span class="font-bold text-indigo-600">${a.submission_count}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Pending Grading</span>
                        <span class="font-bold text-orange-600">${a.pending_grading}</span>
                    </div>
                </div>
                <button onclick="viewSubmissions(${a.id})" class="w-full py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition">
                    Manage Submissions
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function viewSubmissions(assignmentId) {
    showToast('Loading submissions...', 'info');
    // This would typically open another view/modal with the list of student submissions
    // For demo purposes, we'll simulate opening a grade modal for the first pending one if any
}

function initPhase3Listeners() {
    // Modal controls are already handled by onclick in HTML
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// RESEARCH PORTAL
async function loadResearch() {
    try {
        const response = await fetch(`${API_BASE}/faculty/research`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('researchList');
        if (!list) return;
        
        list.innerHTML = data.items.map(r => `
            <div class="bg-white p-6 rounded-lg shadow-sm border border-l-4 border-indigo-500">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-lg text-gray-800">${r.title}</h4>
                    <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase">${r.publication_type}</span>
                </div>
                <p class="text-sm text-gray-500 italic mb-4">${r.journal_name} • ${new Date(r.publication_date).toLocaleDateString()}</p>
                ${r.url ? `
                    <a href="${r.url}" target="_blank" class="text-xs text-indigo-600 font-bold hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i> View Publication
                    </a>
                ` : ''}
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-12 col-span-full">No publications recorded yet.</p>';
    } catch (err) { console.error(err); }
}

async function submitResearch() {
    const payload = {
        title: document.getElementById('researchTitle').value,
        type: document.getElementById('researchType').value,
        journal: document.getElementById('researchJournal').value,
        date: document.getElementById('researchDate').value,
        url: document.getElementById('researchUrl').value
    };

    if (!payload.title || !payload.date) return showToast('Title and Date are required', 'error');

    try {
        const response = await fetch(`${API_BASE}/faculty/research`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast('Publication added!', 'success');
            closeModal('addResearchModal');
            loadResearch();
        }
    } catch (err) { console.error(err); }
}

// APPOINTMENTS
async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('appointmentsList');
        if (!list) return;
        
        list.innerHTML = data.items.map(a => `
            <tr class="hover:bg-gray-50">
                <td class="p-4 border-b font-medium text-gray-800">${a.parent_name}</td>
                <td class="p-4 border-b text-gray-500">${a.student_name}</td>
                <td class="p-4 border-b text-gray-500">${a.purpose}</td>
                <td class="p-4 border-b text-gray-500">${new Date(a.preferred_date).toLocaleDateString()}</td>
                <td class="p-4 border-b">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        a.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        (a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700')
                    }">${a.status}</span>
                </td>
                <td class="p-4 border-b">
                    ${a.status === 'pending' ? `
                        <div class="flex space-x-2">
                            <button onclick="updateAppStatus(${a.id}, 'approved')" class="text-xs bg-green-600 text-white px-2 py-1 rounded">Approve</button>
                            <button onclick="updateAppStatus(${a.id}, 'cancelled')" class="text-xs bg-red-600 text-white px-2 py-1 rounded">Cancel</button>
                        </div>
                    ` : '-'}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="p-8 text-center text-gray-500 italic">No appointment requests found.</td></tr>';
    } catch (err) { console.error(err); }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-[2000] text-white font-bold transition-all transform translate-y-0 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    toast.setAttribute('id', 'toast');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

async function updateAppStatus(id, status) {
    const remarks = prompt('Enter any remarks (optional):');
    try {
        const response = await fetch(`${API_BASE}/appointments/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, remarks })
        });
        if (response.ok) {
            showToast(`Appointment ${status}!`, 'success');
            loadAppointments();
        }
    } catch (err) { console.error(err); }
}

// ============ STUDENT PROJECTS (GUIDE) ============
let currentGuideProjectId = null;

function fjStatusColor(status) {
    const map = {
        'not_started': 'bg-gray-100 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-700',
        'on_track': 'bg-emerald-100 text-emerald-700',
        'review': 'bg-amber-100 text-amber-700',
        'completed': 'bg-green-100 text-green-700'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
}

function fjBarColor(progress) {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-cyan-500';
    return 'bg-amber-500';
}

function setProjectFilter(kind) {
    const mine = document.getElementById('btnMyGuided');
    const all = document.getElementById('btnAllProjects');
    if (!mine || !all) return;
    mine.className = 'px-4 py-1.5 rounded-md text-xs font-bold ' + (kind === 'mine' ? 'bg-cyan-600 text-white shadow-sm' : 'text-cyan-700 hover:bg-cyan-50 transition');
    all.className = 'px-4 py-1.5 rounded-md text-xs font-bold ' + (kind === 'all' ? 'bg-cyan-600 text-white shadow-sm' : 'text-cyan-700 hover:bg-cyan-50 transition');
}

async function loadGuidedProjects() {
    setProjectFilter('mine');
    try {
        const data = await authedGet('/api/projects');
        renderProjectCards(data.items || []);
    } catch (err) { console.error(err); }
}

async function loadAllProjects() {
    setProjectFilter('all');
    try {
        const data = await authedGet('/api/projects?scope=all');
        renderProjectCards(data.items || []);
    } catch (err) { console.error(err); }
}

function renderProjectCards(items) {
    const grid = document.getElementById('guidedProjectsList');
    if (!grid) return;
    grid.innerHTML = items.map(p => `
        <div class="bg-white p-5 rounded-lg shadow-sm border border-cyan-100 hover:shadow-md transition">
            <div class="flex items-center justify-between mb-3">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${fjStatusColor(p.status)}">${String(p.status).replace(/_/g, ' ')}</span>
                ${p.guide_name
                    ? `<span class="text-[10px] text-cyan-700 font-bold uppercase"><i class="fas fa-user-tie mr-1"></i>${p.guide_name}</span>`
                    : '<button onclick="claimGuide(' + p.id + ')" class="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded font-bold hover:bg-amber-200 transition"><i class="fas fa-hand-pointer mr-1"></i>Claim as Guide</button>'}
            </div>
            <h4 class="font-bold text-gray-800 mb-1">${p.title}</h4>
            <p class="text-xs text-cyan-700 mb-3"><i class="fas fa-user-graduate mr-1"></i>${p.student_name || ''} ${p.dept_name ? '• ' + p.dept_name : ''}</p>
            <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-400 font-bold uppercase">Progress</span>
                <span class="font-bold text-cyan-700">${p.progress || 0}%</span>
            </div>
            <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                <div class="h-full ${fjBarColor(p.progress || 0)} rounded-full" style="width: ${p.progress || 0}%"></div>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-[10px] text-gray-400 font-bold"><i class="fas fa-flag mr-1"></i>${p.completed_milestones || 0}/${p.milestones_count || 0} milestones</span>
                <button onclick="openGuideDetail(${p.id})" class="px-3 py-1.5 bg-cyan-600 text-white rounded-lg font-bold text-xs hover:bg-cyan-700 transition">
                    <i class="fas fa-eye mr-1"></i> View & Feedback
                </button>
            </div>
        </div>
    `).join('') || '<div class="lg:col-span-3 text-center text-gray-500 py-16"><i class="fas fa-folder-open text-4xl mb-3 text-gray-300"></i><p class="font-bold mb-1">No projects found</p><p class="text-sm">Switch to "All Projects" to browse open projects.</p></div>';
}

async function claimGuide(id) {
    try {
        const res = await fetch(`${API_BASE}/api/projects/${id}/guide`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const data = await res.json();
        if (res.ok) {
            showToast('You are now the guide for this project!', 'success');
            loadGuidedProjects();
        } else {
            showToast(data.message || 'Failed to claim', 'error');
        }
    } catch (err) { console.error(err); }
}

function openGuideDetail(id) {
    currentGuideProjectId = id;
    document.getElementById('guides').classList.add('hidden');
    document.getElementById('guideDetail').classList.remove('hidden');
    renderGuideDetail(id);
}

function closeGuideDetail() {
    currentGuideProjectId = null;
    document.getElementById('guideDetail').classList.add('hidden');
    document.getElementById('guides').classList.remove('hidden');
    loadGuidedProjects();
}

function fmoMilestoneRow(m) {
    const colors = { pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
    return `
        <div class="flex items-center justify-between p-3 bg-cyan-50/60 rounded-lg">
            <div>
                <p class="text-sm font-bold text-gray-700 ${m.status === 'completed' ? 'line-through text-gray-400' : ''}">${m.title}</p>
                <p class="text-[10px] text-gray-400">${m.due_date ? 'Due: ' + new Date(m.due_date).toLocaleDateString() : 'No due date'}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${colors[m.status] || colors.pending}">${m.status.replace('_', ' ')}</span>
                <div class="flex gap-1">
                    ${m.status !== 'completed' ? `<button onclick="updateGuideMilestone(${m.id}, 'completed')" class="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold hover:bg-green-200 transition"><i class="fas fa-check mr-1"></i>Done</button>` : ''}
                    ${m.status === 'pending' ? `<button onclick="updateGuideMilestone(${m.id}, 'in_progress')" class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-200 transition">Start</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

async function updateGuideMilestone(mid, status) {
    if (!currentGuideProjectId) return;
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentGuideProjectId}/milestones/${mid}`, {
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
            renderGuideDetail(currentGuideProjectId);
        } else {
            showToast(data.message || 'Failed', 'error');
        }
    } catch (err) { console.error(err); }
}

async function renderGuideDetail(id) {
    try {
        const data = await authedGet(`/api/projects/${id}`);
        const p = data.project;
        const main = document.getElementById('guideDetailMain');
        if (!main) return;

        main.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-black text-cyan-950">${p.title}</h2>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${fjStatusColor(p.status)}">${String(p.status).replace(/_/g, ' ')}</span>
            </div>
            <p class="text-sm text-gray-600 mb-4">${p.description || 'No description provided.'}</p>
            <div class="flex flex-wrap gap-3 text-xs text-cyan-800 mb-4">
                <span><i class="fas fa-user-graduate mr-1"></i>Student: ${p.student_name}</span>
                ${p.dept_name ? `<span><i class="fas fa-building mr-1"></i>${p.dept_name}</span>` : ''}
                ${p.guide_name ? `<span><i class="fas fa-user-tie mr-1 text-emerald-600"></i>Guide: ${p.guide_name}</span>` : ''}
                <span><i class="fas fa-calendar-alt mr-1"></i>Started: ${new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-400 font-bold uppercase">Overall Progress</span>
                <span class="font-bold text-cyan-700">${p.progress || 0}%</span>
            </div>
            <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full ${fjBarColor(p.progress || 0)} rounded-full" style="width: ${p.progress || 0}%"></div>
            </div>
        `;

        document.getElementById('guideMilestones').innerHTML = (data.milestones || []).map(fmoMilestoneRow).join('') || '<p class="text-sm text-gray-400 italic">No milestones yet.</p>';
        document.getElementById('guideUpdates').innerHTML = (data.updates || []).map(u => `
            <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-cyan-800">${u.author_name || 'Unknown'}</span>
                    <span class="text-[10px] text-gray-400">${new Date(u.created_at).toLocaleString()}</span>
                </div>
                <p class="text-xs text-gray-600 mb-1">${u.note || 'No note'}</p>
                <span class="text-[10px] font-bold text-emerald-600">${u.progress || 0}%</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 italic">No updates yet.</p>';
        document.getElementById('guideDiscussion').innerHTML = (data.discussion || []).map(msg => `
            <div class="p-3 rounded-lg ${msg.author_type === 'faculty' ? 'bg-cyan-50 border border-cyan-100' : 'bg-gray-50'}">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold ${msg.author_type === 'faculty' ? 'text-cyan-800' : 'text-gray-700'}">
                        ${msg.author_type === 'faculty' ? '<i class="fas fa-user-tie mr-1"></i>' : '<i class="fas fa-user-graduate mr-1"></i>'}${msg.author_name || 'Unknown'}
                    </span>
                    <span class="text-[10px] text-gray-400">${new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p class="text-xs text-gray-600">${msg.message}</p>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 italic text-center py-4">No discussion yet.</p>';
    } catch (err) { console.error(err); }
}

function toggleFacultyMilestoneForm() {
    const form = document.getElementById('facultyMilestoneForm');
    if (form) form.classList.toggle('hidden');
}

async function addMilestoneFromGuide() {
    const title = document.getElementById('facultyMilestoneTitle').value.trim();
    if (!title || !currentGuideProjectId) return showToast('Milestone title is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentGuideProjectId}/milestones`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, due_date: document.getElementById('facultyMilestoneDue').value || null })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Milestone added!', 'success');
            document.getElementById('facultyMilestoneTitle').value = '';
            document.getElementById('facultyMilestoneDue').value = '';
            document.getElementById('facultyMilestoneForm').classList.add('hidden');
            renderGuideDetail(currentGuideProjectId);
        } else {
            showToast(data.message || 'Failed', 'error');
        }
    } catch (err) { console.error(err); }
}

async function postProgressFromGuide() {
    const progress = parseInt(document.getElementById('guideProgressValue').value, 10);
    if (isNaN(progress)) return showToast('Enter a progress percentage (0-100)', 'error');
    const note = document.getElementById('guideProgressNote').value.trim();
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentGuideProjectId}/progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progress: progress, note: note })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Feedback posted!', 'success');
            document.getElementById('guideProgressValue').value = '';
            document.getElementById('guideProgressNote').value = '';
            renderGuideDetail(currentGuideProjectId);
        } else {
            showToast(data.message || 'Failed to post', 'error');
        }
    } catch (err) { console.error(err); }
}

async function postDiscussionFromGuide() {
    const message = document.getElementById('guideDiscussionMessage').value.trim();
    if (!message || !currentGuideProjectId) return showToast('Message is required', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/projects/${currentGuideProjectId}/discussion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Message sent!', 'success');
            document.getElementById('guideDiscussionMessage').value = '';
            renderGuideDetail(currentGuideProjectId);
        } else {
            showToast(data.message || 'Failed to send', 'error');
        }
    } catch (err) { console.error(err); }
}

// ============ OBSERVATION REPORTS ============
async function loadObservationForm() {
    try {
        const data = await authedGet('/api/observations/student-options');
        const select = document.getElementById('observationStudent');
        if (!select) return;
        select.innerHTML = '<option value="">Select student</option>' + (data.items || []).map(s =>
            `<option value="${s.id}">${s.name}${s.dept_name ? ' (' + s.dept_name + ')' : ''}</option>`
        ).join('');
    } catch (err) { console.error(err); }
}

async function submitObservation() {
    const payload = {
        student_id: document.getElementById('observationStudent').value,
        week_label: document.getElementById('observationWeekLabel').value.trim(),
        week_start: document.getElementById('observationWeekStart').value || null,
        observation: document.getElementById('observationText').value.trim(),
        strengths: document.getElementById('observationStrengths').value.trim(),
        areas_to_improve: document.getElementById('observationAreas').value.trim(),
        rating: document.getElementById('observationRating').value || null
    };
    if (!payload.student_id) return showToast('Select a student', 'error');

    try {
        const res = await fetch(`${API_BASE}/api/observations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Observation saved!', 'success');
            ['observationStudent', 'observationWeekLabel', 'observationWeekStart', 'observationText', 'observationStrengths', 'observationAreas', 'observationRating']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            loadObservations();
        } else {
            showToast(data.message || 'Failed to save', 'error');
        }
    } catch (err) { console.error(err); }
}

async function loadObservations() {
    try {
        const data = await authedGet('/api/observations');
        const tbody = document.getElementById('observationsList');
        if (!tbody) return;
        const ratingColor = r => r >= 4 ? 'text-green-600' : (r >= 3 ? 'text-amber-600' : 'text-rose-600');
        tbody.innerHTML = (data.items || []).map(o => `
            <tr class="hover:bg-cyan-50/50">
                <td class="p-3 font-bold text-cyan-900">${o.student_name} <span class="text-[10px] font-normal text-gray-400">${o.dept_name || ''}</span></td>
                <td class="p-3 text-gray-600">${o.week_label || o.week_start || '-'}</td>
                <td class="p-3"><span class="font-black ${ratingColor(o.rating)}">${o.rating ? o.rating + ' / 5' : '-'}</span></td>
                <td class="p-3 text-gray-600 max-w-xs">${o.observation || '-'}</td>
                <td class="p-3 text-[10px] text-gray-400">${new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="p-8 text-center text-gray-500 italic">No observation reports yet.</td></tr>';
    } catch (err) { console.error(err); }
}
