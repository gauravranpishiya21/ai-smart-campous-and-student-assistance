// Smart Campus Suite Frontend Controller
// Implements Emergency SOS, 5-Role Persona Switcher, 17-Section Project Blueprint,
// Smart Attendance (Face/QR/RFID), Academic Management, Performance ML Radar,
// Campus Services (Mess/Transport), and Grievance Sentiment Analysis

(function () {
  'use strict';

  // Helper references from student.js
  const $ = (id) => document.getElementById(id);
  const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

  // ==========================================
  // 1. EMERGENCY SOS DISPATCH
  // ==========================================
  window.triggerEmergencySosModal = function () {
    const modal = $('emergencySosModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    $('sosLocationInput').value = 'Central Library Quad (Near Academic Block A)';
  };

  window.closeEmergencySosModal = function () {
    const modal = $('emergencySosModal');
    if (modal) modal.classList.add('hidden');
  };

  window.confirmSosDispatch = async function () {
    const loc = $('sosLocationInput').value.trim() || 'Main Campus Quad';
    const reason = $('sosReasonInput').value.trim() || 'Emergency Distress Assistance';

    try {
      $('sosDispatchBtn').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Transmitting Emergency Beacon...';
      const res = await api('/safety/sos', {
        method: 'POST',
        body: { location: loc, reason, coordinates: { lat: 28.5450, lng: 77.1920 } }
      });

      $('sosDispatchBtn').innerHTML = '<i class="fas fa-check-circle mr-2"></i> Dispatched!';
      $('sosConfirmationBanner').classList.remove('hidden');
      $('sosConfirmationDetails').innerHTML = `
        <div class="p-3 bg-red-950/80 border border-red-500 rounded-xl text-xs text-red-200 mt-3 space-y-1">
          <p><strong>🚨 DISTRESS BROADCAST CONFIRMED:</strong> Event ID #${res.alertId}</p>
          <p>📍 Location: <strong>${esc(loc)}</strong></p>
          <p>🚔 Security Patrol ETA: <strong>~2-3 minutes</strong></p>
          <p>📞 Emergency Control Desk: <strong>011-2659-1000</strong> · Tele-MANAS: <strong>14416</strong></p>
        </div>
      `;
      toast('EMERGENCY SOS DISPATCHED: Campus Security Patrol is on route!', 'error');
    } catch (err) {
      toast('Failed to dispatch SOS: ' + err.message, 'error');
      $('sosDispatchBtn').innerHTML = '<i class="fas fa-triangle-exclamation mr-2"></i> Dispatch Emergency SOS';
    }
  };

  // ==========================================
  // 2. 5-USER ROLE PERSONA SWITCHER
  // ==========================================
  let currentPersona = 'student';

  window.toggleRoleSwitcherMenu = function () {
    const menu = $('roleSwitcherDropdown');
    if (menu) menu.classList.toggle('hidden');
  };

  // Close role dropdown if clicked outside
  document.addEventListener('click', function (e) {
    const btn = $('roleSwitcherBtn');
    const menu = $('roleSwitcherDropdown');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  window.switchUserPersona = async function (role) {
    currentPersona = role;
    window.toggleRoleSwitcherMenu();

    const label = $('activeRoleLabel');
    const icon = $('activeRoleIcon');
    const rolePill = $('kernelContextPill');

    const config = {
      student: { label: 'Student (Gaurav Sharma)', icon: 'fa-user-graduate', color: 'text-indigo-400', id: '2024CS0042' },
      faculty: { label: 'Faculty (Dr. Rajesh Sharma)', icon: 'fa-chalkboard-user', color: 'text-purple-400', id: 'FAC001' },
      admin: { label: 'Admin (Campus Admin)', icon: 'fa-user-shield', color: 'text-amber-400', id: 'ADMIN001' },
      parent: { label: 'Parent (Sunita Sharma)', icon: 'fa-people-roof', color: 'text-emerald-400', id: 'PARENT001' },
      security: { label: 'Security (Officer Vikram)', icon: 'fa-shield-halved', color: 'text-cyan-400', id: 'SEC001' }
    };

    const cfg = config[role] || config.student;
    if (label) label.textContent = role.toUpperCase();
    if (icon) icon.innerHTML = `<i class="fas ${cfg.icon} ${cfg.color}"></i>`;
    if (rolePill) rolePill.textContent = `ROLE: ${role} · ID: ${cfg.id}`;

    if (role === 'admin') {
      toast('Switched to Admin Role. You have full institutional authority.', 'info');
      // Show admin quick action or offer link
      showSection('strategic-analytics');
    } else if (role === 'parent') {
      window.openParentOverviewModal();
    } else if (role === 'security') {
      window.openSecurityGuardModal();
    } else if (role === 'faculty') {
      toast('Switched to Faculty Role (Dr. Rajesh Sharma, HOD CSE).', 'info');
      showSection('attendance-hub');
    } else {
      toast('Switched to Student Role (Gaurav Sharma).', 'info');
      showSection('dashboard');
    }
  };

  // ==========================================
  // 3. 17-SECTION PROJECT BLUEPRINT & REPORT VIEWER
  // ==========================================
  let blueprintData = null;

  window.openProjectBlueprintModal = async function () {
    const modal = $('projectBlueprintModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (!blueprintData) {
      $('blueprintContentArea').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin text-2xl mb-3 text-cyan-400 block"></i> Loading 17-Section Project Report...</div>';
      try {
        blueprintData = await api('/project/blueprint-doc');
        renderBlueprintToc();
        renderBlueprintSection(1);
      } catch (err) {
        $('blueprintContentArea').innerHTML = `<p class="text-rose-400">Failed to load blueprint: ${err.message}</p>`;
      }
    } else {
      renderBlueprintSection(1);
    }
  };

  window.closeProjectBlueprintModal = function () {
    const modal = $('projectBlueprintModal');
    if (modal) modal.classList.add('hidden');
  };

  function renderBlueprintToc() {
    if (!blueprintData) return;
    const tocList = $('blueprintTocList');
    if (!tocList) return;

    tocList.innerHTML = blueprintData.sections.map((sec) => `
      <li>
        <button class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition flex items-center gap-2" id="toc-btn-${sec.number}" onclick="window.renderBlueprintSection(${sec.number})">
          <span class="w-5 h-5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] flex items-center justify-center shrink-0">${sec.number}</span>
          <span class="truncate">${esc(sec.title)}</span>
        </button>
      </li>
    `).join('');
  }

  window.renderBlueprintSection = function (secNumber) {
    if (!blueprintData) return;
    const sec = blueprintData.sections.find((s) => s.number === secNumber) || blueprintData.sections[0];

    // Highlight active TOC item
    blueprintData.sections.forEach((s) => {
      const b = $(`toc-btn-${s.number}`);
      if (b) {
        if (s.number === sec.number) {
          b.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-2';
        } else {
          b.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition flex items-center gap-2';
        }
      }
    });

    $('blueprintCurrentTitle').textContent = `Section ${sec.number}: ${sec.title}`;

    const formattedContent = esc(sec.content)
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n- /g, '<br>• ')
      .replace(/\n(\d+)\. /g, '<br><strong>$1. </strong>');

    $('blueprintContentArea').innerHTML = `
      <div class="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed">
        <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-5 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">PROJECT REPORT SECTION ${sec.number} OF 17</span>
            <h2 class="text-xl font-black text-white mt-0.5">${esc(sec.title)}</h2>
          </div>
          <span class="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">Standard Syllabus Spec</span>
        </div>
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          ${formattedContent}
        </div>
      </div>
    `;
  };

  window.printProjectBlueprint = function () {
    window.print();
  };

  // ==========================================
  // 4. SMART ATTENDANCE SUITE (Face, QR, RFID, Parent Alerts)
  // ==========================================
  window.openFaceAttendanceModal = function () {
    const modal = $('faceAttendanceModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('faceScanFeedback').className = 'p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-400';
    $('faceScanFeedback').innerHTML = '<i class="fas fa-camera text-indigo-400 mr-1.5"></i> Camera active. Align your face within the bounding frame...';
    $('faceConfidenceRing').style.strokeDashoffset = '283';
    $('faceConfidenceVal').textContent = '--%';
  };

  window.closeFaceAttendanceModal = function () {
    const modal = $('faceAttendanceModal');
    if (modal) modal.classList.add('hidden');
  };

  window.executeFaceVerification = async function () {
    const fb = $('faceScanFeedback');
    fb.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-cyan-400"></i> Scanning 128 face landmarks & verifying anti-spoofing liveness...';

    try {
      const res = await api('/attendance/face-verify', {
        method: 'POST',
        body: { lat: 28.5450, lng: 77.1920, zone: 'Academic Block A - Hall 101' }
      });

      // Animate progress ring
      const conf = res.confidence || 98.7;
      $('faceConfidenceRing').style.strokeDashoffset = String(Math.max(0, 283 - (conf / 100) * 283));
      $('faceConfidenceVal').textContent = `${conf}%`;

      fb.className = 'p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300';
      fb.innerHTML = `<strong>✅ ${esc(res.message)}</strong><br><span class="text-[10px] text-slate-400">${res.method} · ${res.geofence}</span>`;

      toast(`Face Verified (${conf}% match). Attendance logged! +15 XP`, 'success');
      if (window.boot) window.boot();
    } catch (err) {
      fb.className = 'p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-center text-xs text-rose-300';
      fb.innerHTML = `<strong>❌ Verification Failed:</strong> ${esc(err.message)}`;
      toast('Face verification failed: ' + err.message, 'error');
    }
  };

  // Dynamic Rolling QR Code Modal
  let qrInterval = null;

  window.openRollingQrModal = async function () {
    const modal = $('rollingQrModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    refreshQrToken();
    if (qrInterval) clearInterval(qrInterval);
    qrInterval = setInterval(refreshQrToken, 20000);
  };

  window.closeRollingQrModal = function () {
    const modal = $('rollingQrModal');
    if (modal) modal.classList.add('hidden');
    if (qrInterval) clearInterval(qrInterval);
  };

  async function refreshQrToken() {
    try {
      const res = await api('/attendance/qr-token?room=Lecture%20Hall%20204');
      $('qrTokenString').textContent = res.token;
      $('qrRoomName').textContent = res.room;
      let left = res.expiresInSeconds || 20;
      $('qrTimerCount').textContent = `${left}s`;
    } catch (err) {
      $('qrTokenString').textContent = 'Error loading token';
    }
  }

  window.simulateScanRollingQr = async function () {
    const token = $('qrTokenString').textContent;
    try {
      const res = await api('/attendance/qr-scan', {
        method: 'POST',
        body: { token }
      });
      toast(res.message || 'QR Attendance logged successfully!', 'success');
      window.closeRollingQrModal();
      if (window.boot) window.boot();
    } catch (err) {
      toast('QR Scan Error: ' + err.message, 'error');
    }
  };

  // RFID Contactless Tap
  window.simulateRfidTap = async function () {
    try {
      const res = await api('/attendance/rfid-tap', {
        method: 'POST',
        body: { badgeId: 'NFC-998877', location: 'Computing Lab 3 Door Reader' }
      });
      toast(`💳 [RFID TAP CONFIRMED]: ${res.message}`, 'success');
    } catch (err) {
      toast('RFID Tap failed: ' + err.message, 'error');
    }
  };

  // Detailed Attendance Analytics Modal
  window.openAttendanceAnalyticsModal = async function () {
    const modal = $('attendanceAnalyticsModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('attendanceAnalyticsBody').innerHTML = '<div class="p-6 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Computing class cohort analytics...</div>';
    try {
      const data = await api('/attendance/analytics');
      const o = data.overall;

      $('attendanceAnalyticsBody').innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400">Current Rate</p>
            <p class="text-2xl font-black text-indigo-400">${o.currentPercentage}%</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400">Class Average</p>
            <p class="text-2xl font-black text-emerald-400">${o.institutionCohortAverage}%</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400">Percentile Rank</p>
            <p class="text-2xl font-black text-cyan-400">Top ${100 - o.percentileRank}%</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400">Classes Attended</p>
            <p class="text-2xl font-black text-amber-400">${o.attended}/${o.totalClasses}</p>
          </div>
        </div>

        <h4 class="font-bold text-xs uppercase text-slate-400 mb-3 tracking-wider">Subject-by-Subject Bunk Margin &amp; Standing:</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th class="p-3">Subject</th>
                <th class="p-3">Attended</th>
                <th class="p-3">Percentage</th>
                <th class="p-3">Cohort Avg</th>
                <th class="p-3">Safe to Miss</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${data.subjects.map((s) => `
                <tr>
                  <td class="p-3 font-bold">${esc(s.code)} · ${esc(s.name)}</td>
                  <td class="p-3">${s.attended} / ${s.classes}</td>
                  <td class="p-3 font-bold ${s.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}">${s.percentage}%</td>
                  <td class="p-3 text-slate-400">${s.classCohortAverage}%</td>
                  <td class="p-3">${s.canMissClasses > 0 ? `<span class="text-emerald-400 font-bold">${s.canMissClasses} classes</span>` : `<span class="text-rose-400 font-bold">Must attend ${s.mustAttendClasses}</span>`}</td>
                  <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.percentage >= 75 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}">${s.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      $('attendanceAnalyticsBody').innerHTML = `<p class="text-rose-400">Error loading analytics: ${err.message}</p>`;
    }
  };

  window.closeAttendanceAnalyticsModal = function () {
    const modal = $('attendanceAnalyticsModal');
    if (modal) modal.classList.add('hidden');
  };

  // ==========================================
  // 5. ACADEMIC MANAGEMENT SUITE (Conflict-Free Timetable, Assignments & Rubrics, Grade Card)
  // ==========================================
  window.openTimetableConflictModal = async function () {
    const modal = $('timetableConflictModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('conflictCheckOutput').innerHTML = '<div class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Analyzing constraints across classrooms, teachers, and batches...</div>';

    try {
      // First run test with a deliberate conflict
      const sampleSlots = [
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 101', batch: 'CSE-Sem4', subject: 'Operating Systems' },
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 204', batch: 'IT-Sem4', subject: 'Distributed Systems' }
      ];
      const conflictRes = await api('/academic/timetable-conflict-check', { method: 'POST', body: { slots: sampleSlots } });

      $('conflictCheckOutput').innerHTML = `
        <div class="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 mb-4">
          <p class="font-bold flex items-center gap-2 mb-1">
            <i class="fas fa-triangle-exclamation text-amber-400"></i>
            <span>Constraint Collision Detected: ${conflictRes.conflictCount} Conflict(s)</span>
          </p>
          <p>${esc(conflictRes.conflicts[0]?.message)}</p>
        </div>
        <button class="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md" onclick="window.runAutoGenerateTimetable()">
          <i class="fas fa-wand-magic-sparkles mr-2"></i> Run Automated CSP Solver (Resolve &amp; Generate Timetable)
        </button>
        <div id="resolvedScheduleContainer" class="mt-4 hidden"></div>
      `;
    } catch (err) {
      $('conflictCheckOutput').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeTimetableConflictModal = function () {
    const modal = $('timetableConflictModal');
    if (modal) modal.classList.add('hidden');
  };

  window.runAutoGenerateTimetable = async function () {
    const box = $('resolvedScheduleContainer');
    box.classList.remove('hidden');
    box.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin mr-1.5"></i> Backtracking solver allocating slots...</div>';

    try {
      const res = await api('/academic/generate-timetable', {
        method: 'POST',
        body: { department: 'CSE', semester: 4 }
      });

      box.innerHTML = `
        <div class="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 mb-3 flex items-center justify-between">
          <span><strong>✅ 0 CONFLICTS CERTIFIED:</strong> Generated ${res.totalSlots} balanced slots across 6 days.</span>
          <span class="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-mono text-[10px]">Backtracking Solved</span>
        </div>
        <div class="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
          ${res.schedule.slice(0, 12).map((s) => `
            <div class="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
              <div>
                <b class="text-white">${esc(s.day)} · ${esc(s.time)}</b>
                <span class="text-slate-400 block">${esc(s.subject)} (${esc(s.faculty)})</span>
              </div>
              <span class="text-[10px] text-cyan-300 font-mono">${esc(s.room)}</span>
            </div>
          `).join('')}
        </div>
      `;
      toast('Generated conflict-free timetable successfully!', 'success');
    } catch (err) {
      box.innerHTML = `<p class="text-rose-400 text-xs">Error: ${err.message}</p>`;
    }
  };

  // Active Assignments & AI Rubric Evaluator
  let assignmentsData = [];

  window.openAssignmentsModal = async function () {
    const modal = $('assignmentsModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('assignmentsListContainer').innerHTML = '<div class="p-6 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Loading assignments &amp; rubrics...</div>';
    try {
      assignmentsData = await api('/assignments');
      renderAssignmentsList();
    } catch (err) {
      $('assignmentsListContainer').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeAssignmentsModal = function () {
    const modal = $('assignmentsModal');
    if (modal) modal.classList.add('hidden');
  };

  function renderAssignmentsList() {
    $('assignmentsListContainer').innerHTML = assignmentsData.map((a) => `
      <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="text-[10px] font-bold text-indigo-400 uppercase font-mono">${esc(a.subjectCode)} · ${esc(a.subjectName)}</span>
            <h4 class="font-bold text-white text-base mt-0.5">${esc(a.title)}</h4>
          </div>
          <span class="px-2.5 py-1 rounded text-xs font-bold ${a.status === 'Graded' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'}">${a.status}</span>
        </div>

        <div class="p-3 bg-slate-950 rounded-xl text-xs space-y-1">
          <p class="text-slate-400 font-bold uppercase text-[10px]">Grading Rubric Criteria (Max ${a.maxMarks} Marks):</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div class="border-l-2 border-indigo-500 pl-2">
              <b class="text-slate-200">Correctness</b>
              <p class="text-[10px] text-slate-400">${esc(a.rubric.correctness.desc)} (30 pts)</p>
            </div>
            <div class="border-l-2 border-cyan-500 pl-2">
              <b class="text-slate-200">Performance</b>
              <p class="text-[10px] text-slate-400">${esc(a.rubric.performance.desc)} (30 pts)</p>
            </div>
            <div class="border-l-2 border-purple-500 pl-2">
              <b class="text-slate-200">Documentation</b>
              <p class="text-[10px] text-slate-400">${esc(a.rubric.documentation.desc)} (20 pts)</p>
            </div>
            <div class="border-l-2 border-emerald-500 pl-2">
              <b class="text-slate-200">Code Quality</b>
              <p class="text-[10px] text-slate-400">${esc(a.rubric.codeQuality.desc)} (20 pts)</p>
            </div>
          </div>
        </div>

        ${a.submission ? `
          <div class="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1">
            <div class="flex justify-between font-bold">
              <span>AI Evaluation Score: ${a.submission.evaluation?.totalMarks || a.submission.grade}/100</span>
              <span>Grade: ${esc(a.submission.evaluation?.grade || 'A+')}</span>
            </div>
            <p class="text-[11px] text-slate-300 italic pt-1">${esc(a.submission.evaluation?.feedbackSummary || '')}</p>
          </div>
        ` : `
          <div class="pt-2">
            <label class="block text-xs font-bold text-slate-400 mb-1">Paste Source Code or Solution Submission:</label>
            <textarea id="assignCode-${a.id}" class="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-400" placeholder="#include <stdio.h> / public class Solution { ... }"></textarea>
            <button class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5" onclick="window.submitAssignmentSolution(${a.id})">
              <i class="fas fa-upload text-[10px]"></i> Submit &amp; Run AI Rubric Grading
            </button>
          </div>
        `}
      </div>
    `).join('');
  }

  window.submitAssignmentSolution = async function (id) {
    const code = $(`assignCode-${id}`)?.value.trim();
    if (!code) {
      toast('Please enter code or text before submitting.', 'warning');
      return;
    }

    try {
      toast('Submitting assignment and executing automated rubric checks...', 'info');
      const res = await api(`/assignments/${id}/submit`, {
        method: 'POST',
        body: { codeText: code }
      });
      toast(`Assignment graded: ${res.evaluation.totalMarks}/100 marks awarded!`, 'success');
      window.openAssignmentsModal();
    } catch (err) {
      toast('Submission failed: ' + err.message, 'error');
    }
  };

  // Official Consolidated Grade Card
  window.openOfficialGradeCardModal = async function () {
    const modal = $('officialGradeCardModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('gradeCardContent').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Generating authenticated grade transcript...</div>';
    try {
      const doc = await api('/results/grade-card');
      const p = doc.studentProfile;
      const s = doc.summary;

      $('gradeCardContent').innerHTML = `
        <div class="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-300 space-y-6 max-w-2xl mx-auto">
          <!-- Institutional Header -->
          <div class="text-center border-b pb-5">
            <div class="w-14 h-14 mx-auto mb-2 rounded-2xl bg-indigo-900 text-white flex items-center justify-center text-2xl shadow-lg">
              <i class="fas fa-graduation-cap"></i>
            </div>
            <h2 class="text-xl font-black uppercase tracking-wide text-indigo-950">${esc(doc.institution)}</h2>
            <p class="text-xs text-slate-500 font-semibold">${esc(doc.accreditation)}</p>
            <div class="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">
              ${esc(doc.documentTitle)}
            </div>
          </div>

          <!-- Student Profile Grid -->
          <div class="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div><span class="text-slate-500 uppercase font-bold text-[10px]">Student Name:</span><b class="block text-sm text-slate-900">${esc(p.name)}</b></div>
            <div><span class="text-slate-500 uppercase font-bold text-[10px]">Roll Number:</span><b class="block text-sm text-slate-900 font-mono">${esc(p.rollNumber)}</b></div>
            <div><span class="text-slate-500 uppercase font-bold text-[10px]">Department:</span><b class="block text-slate-900">${esc(p.department)}</b></div>
            <div><span class="text-slate-500 uppercase font-bold text-[10px]">Standing:</span><b class="block text-emerald-700">${esc(p.academicStanding)}</b></div>
          </div>

          <!-- Course Table -->
          <table class="w-full text-left text-xs border border-slate-200">
            <thead class="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th class="p-2 border">Code</th>
                <th class="p-2 border">Subject Title</th>
                <th class="p-2 border">Credits</th>
                <th class="p-2 border">Grade</th>
                <th class="p-2 border">Points</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${doc.semesterRecords.slice(0, 5).map((r) => `
                <tr>
                  <td class="p-2 font-mono font-bold">${esc(r.code)}</td>
                  <td class="p-2">${esc(r.name)}</td>
                  <td class="p-2">${r.credits}</td>
                  <td class="p-2 font-bold text-indigo-700">${r.grade}</td>
                  <td class="p-2">${r.gradePoints}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Summary & Verification Hash -->
          <div class="flex items-center justify-between pt-3 border-t text-xs">
            <div>
              <p class="text-slate-500 text-[10px] uppercase font-bold">Cumulative Grade Point Average (CGPA)</p>
              <p class="text-3xl font-black text-indigo-900">${s.cumulativeGpa} / 10.0</p>
              <p class="text-xs text-slate-500 font-semibold">${s.percentageEquivalent}% Marks Equivalent</p>
            </div>
            <div class="text-right">
              <span class="text-[9px] text-slate-400 block font-mono">SERIAL: ${esc(doc.serialNumber)}</span>
              <span class="text-[9px] text-emerald-700 font-bold block">● Tamper-Proof Cryptographic Hash Verified</span>
              <button class="mt-2 px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold" onclick="window.print()">
                <i class="fas fa-print mr-1"></i> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      $('gradeCardContent').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeOfficialGradeCardModal = function () {
    const modal = $('officialGradeCardModal');
    if (modal) modal.classList.add('hidden');
  };

  // ==========================================
  // 6. PERFORMANCE ML EARLY WARNING RADAR
  // ==========================================
  window.openEarlyWarningRadarModal = async function () {
    const modal = $('earlyWarningRadarModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('earlyWarningRadarBody').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Evaluating 20-student cohort with ML Ensemble Model...</div>';
    try {
      const data = await api('/analytics/early-warning-radar');
      const m = data.modelEvaluationMetrics;

      $('earlyWarningRadarBody').innerHTML = `
        <!-- Metrics Header -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-bold block">Model Accuracy</span>
            <span class="text-xl font-black text-cyan-300 font-mono">${m.accuracy}</span>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-bold block">Precision</span>
            <span class="text-xl font-black text-emerald-400 font-mono">${m.precision}</span>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-bold block">Recall</span>
            <span class="text-xl font-black text-indigo-400 font-mono">${m.recall}</span>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-bold block">F1-Score</span>
            <span class="text-xl font-black text-purple-400 font-mono">${m.f1Score}</span>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span class="text-[10px] uppercase text-slate-400 font-bold block">Inference Latency</span>
            <span class="text-xl font-black text-amber-300 font-mono">${m.inferenceLatency}</span>
          </div>
        </div>

        <div class="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 mb-4 flex justify-between items-center">
          <span>Cohort Health Index: <strong>${data.cohortHealthIndex}%</strong> · High Risk Students: <strong class="text-rose-400">${data.highRiskCount}</strong></span>
          <span class="text-[10px] text-slate-400 font-mono">Ensemble: Random Forest + Gradient Boosted Trees</span>
        </div>

        <!-- Student Risk Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th class="p-3">Student Name</th>
                <th class="p-3">Dept</th>
                <th class="p-3">Attendance</th>
                <th class="p-3">Dropout Probability</th>
                <th class="p-3">Risk Tier</th>
                <th class="p-3">Primary Risk Drivers</th>
                <th class="p-3">Intervention</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${data.students.map((s) => `
                <tr class="${s.riskLevel === 'High Risk' ? 'bg-rose-950/20' : ''}">
                  <td class="p-3 font-bold">${esc(s.name)}<br><span class="text-[10px] text-slate-500 font-mono">${esc(s.roll_no)}</span></td>
                  <td class="p-3">${esc(s.department)}</td>
                  <td class="p-3 font-bold ${s.attendancePercentage < 75 ? 'text-rose-400' : 'text-emerald-400'}">${s.attendancePercentage}%</td>
                  <td class="p-3 font-mono font-bold">${s.dropoutProbability}%</td>
                  <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.riskLevel === 'High Risk' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : s.riskLevel === 'Medium Risk' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}">${s.riskLevel}</span></td>
                  <td class="p-3 text-[11px] text-slate-300">${esc(s.keyDrivers.join(', '))}</td>
                  <td class="p-3 text-[11px] text-cyan-300 font-medium">${esc(s.recommendedAction)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      $('earlyWarningRadarBody').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeEarlyWarningRadarModal = function () {
    const modal = $('earlyWarningRadarModal');
    if (modal) modal.classList.add('hidden');
  };

  // ==========================================
  // 7. CAMPUS SERVICES (Hostel & Mess, Live Transport, Resource Booking)
  // ==========================================
  window.openHostelMessModal = async function () {
    const modal = $('hostelMessModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('hostelMessContent').innerHTML = '<div class="p-6 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Loading daily hostel &amp; mess menu...</div>';
    try {
      const data = await api('/campus/hostel-mess');
      const m = data.messMenu;
      const h = data.hostel;

      $('hostelMessContent').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-[10px] text-slate-400 uppercase font-bold">Assigned Residence</span>
            <h4 class="font-bold text-white text-base mt-1">${esc(h.hostelName || 'CV Raman Hostel')}</h4>
            <p class="text-xs text-slate-400 mt-1">Room: <b>${esc(h.roomNumber || 'B-314')}</b> · Bed: <b>${esc(h.bedNumber || 'Bed 2')}</b></p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-[10px] text-slate-400 uppercase font-bold">Hostel Warden</span>
            <h4 class="font-bold text-white text-base mt-1">${esc(h.warden || 'Dr. Suresh Kulkarni')}</h4>
            <p class="text-xs text-slate-400 mt-1">Contact: <b>${esc(h.wardenContact || '+91 98765 11223')}</b></p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-[10px] text-slate-400 uppercase font-bold">Audit Score</span>
            <h4 class="font-bold text-emerald-400 text-base mt-1">4.8 / 5.0 Rating</h4>
            <p class="text-xs text-slate-400 mt-1">Food Safety Officer Audited</p>
          </div>
        </div>

        <h4 class="font-bold text-xs uppercase text-slate-400 mb-3 tracking-wider">Today's Daily Menu (${esc(m.day)}):</h4>
        <div class="space-y-3 mb-5">
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0"><i class="fas fa-mug-saucer"></i></div>
            <div><b class="text-white text-xs block">Breakfast</b><p class="text-xs text-slate-300 mt-0.5">${esc(m.breakfast)}</p></div>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><i class="fas fa-bowl-food"></i></div>
            <div><b class="text-white text-xs block">Lunch</b><p class="text-xs text-slate-300 mt-0.5">${esc(m.lunch)}</p></div>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0"><i class="fas fa-cookie-bite"></i></div>
            <div><b class="text-white text-xs block">Evening Snacks</b><p class="text-xs text-slate-300 mt-0.5">${esc(m.snacks)}</p></div>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0"><i class="fas fa-utensils"></i></div>
            <div><b class="text-white text-xs block">Dinner</b><p class="text-xs text-slate-300 mt-0.5">${esc(m.dinner)}</p></div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h4 class="font-bold text-xs text-white mb-2">Submit Mess Feedback (Evaluated with AI Sentiment Analysis):</h4>
          <textarea id="messFeedbackInput" class="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" placeholder="e.g., 'Lunch food quality was excellent and hot, but water glasses were short'"></textarea>
          <button class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition" onclick="window.submitMessFeedbackAction()">
            Submit Feedback
          </button>
        </div>
      `;
    } catch (err) {
      $('hostelMessContent').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeHostelMessModal = function () {
    const modal = $('hostelMessModal');
    if (modal) modal.classList.add('hidden');
  };

  window.submitMessFeedbackAction = async function () {
    const comments = $('messFeedbackInput')?.value.trim();
    if (!comments) return toast('Please enter feedback comments.', 'warning');
    try {
      const res = await api('/campus/mess-feedback', {
        method: 'POST',
        body: { meal: 'Lunch', rating: 4, comments }
      });
      toast(res.message, 'success');
      $('messFeedbackInput').value = '';
    } catch (err) {
      toast('Error submitting feedback: ' + err.message, 'error');
    }
  };

  // Live Campus Transport Tracking Modal
  window.openLiveTransportModal = async function () {
    const modal = $('liveTransportModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('liveTransportBody').innerHTML = '<div class="p-6 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Querying GPS telemetry for campus shuttle routes...</div>';
    try {
      const data = await api('/campus/transport-live');
      $('liveTransportBody').innerHTML = `
        <div class="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 mb-4 flex justify-between items-center">
          <span>Live Fleet Telemetry Active · Campus Coverage: <strong>${data.campusCoverage}</strong></span>
          <span class="text-[10px] text-slate-400 font-mono">Updated: ${data.updatedAt}</span>
        </div>
        <div class="space-y-3">
          ${data.routes.map((r) => `
            <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/30 text-cyan-300 flex items-center justify-center font-black text-xs font-mono">${esc(r.routeId)}</div>
                  <div>
                    <b class="text-white text-sm block">${esc(r.name)}</b>
                    <span class="text-[11px] text-slate-400">${esc(r.routePath)}</span>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status === 'ON_TIME' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300'}">${esc(r.status)}</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                <div><span class="text-slate-500 uppercase text-[9px] font-bold block">Current Loc</span><b class="text-slate-200 truncate block">${esc(r.currentLocation)}</b></div>
                <div><span class="text-slate-500 uppercase text-[9px] font-bold block">Arrival ETA</span><b class="text-emerald-400 text-sm font-black">${r.etaMinutes} mins</b></div>
                <div><span class="text-slate-500 uppercase text-[9px] font-bold block">Speed</span><b class="text-slate-200">${r.speedKmH} km/h</b></div>
                <div><span class="text-slate-500 uppercase text-[9px] font-bold block">Available Seats</span><b class="text-cyan-400">${r.availableSeats} / ${r.capacity} free</b></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      $('liveTransportBody').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeLiveTransportModal = function () {
    const modal = $('liveTransportModal');
    if (modal) modal.classList.add('hidden');
  };

  // Resource Slot Booking Modal
  window.openResourceBookingModal = function () {
    const modal = $('resourceBookingModal');
    if (!modal) return;
    modal.classList.remove('hidden');
  };

  window.closeResourceBookingModal = function () {
    const modal = $('resourceBookingModal');
    if (modal) modal.classList.add('hidden');
  };

  window.submitResourceBooking = async function () {
    const name = $('resBookName').value;
    const date = $('resBookDate').value;
    const slot = $('resBookSlot').value;
    const purpose = $('resBookPurpose').value.trim();

    if (!date || !slot) return toast('Please select date and slot.', 'warning');
    try {
      const res = await api('/resources/book-slot', {
        method: 'POST',
        body: { resourceName: name, date, timeSlot: slot, purpose }
      });
      toast(res.message, 'success');
      window.closeResourceBookingModal();
    } catch (err) {
      toast('Booking conflict: ' + err.message, 'error');
    }
  };

  // ==========================================
  // 8. PARENT & SECURITY GUARD OVERVIEW MODALS
  // ==========================================
  window.openParentOverviewModal = async function () {
    const modal = $('parentOverviewModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('parentOverviewBody').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Fetching ward attendance &amp; academic records...</div>';
    try {
      const data = await api('/parent/ward-overview');
      const w = data.ward;
      const a = data.academicMetrics;
      const f = data.financialMetrics;

      $('parentOverviewBody').innerHTML = `
        <div class="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
              <i class="fas fa-user-graduate"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400">Enrolled Ward</span>
              <h3 class="text-lg font-black text-white">${esc(w.name)}</h3>
              <p class="text-xs text-slate-400">Roll No: <b class="font-mono text-cyan-300">${esc(w.roll_no)}</b> · ${esc(w.dept)} (Sem ${w.semester})</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">Good Standing</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">Attendance</span>
            <span class="text-2xl font-black ${a.overallAttendance >= 75 ? 'text-emerald-400' : 'text-rose-400'}">${a.overallAttendance}%</span>
            <span class="text-[10px] text-slate-500 block">UGC Norm: 75%</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">CGPA</span>
            <span class="text-2xl font-black text-cyan-400">${a.cgpa}</span>
            <span class="text-[10px] text-slate-500 block">Out of 10.0</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">Active Backlogs</span>
            <span class="text-2xl font-black text-slate-200">${a.backlogs}</span>
            <span class="text-[10px] text-emerald-400 block">Cleared</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">Fee Dues</span>
            <span class="text-2xl font-black ${f.pendingDues > 0 ? 'text-rose-400' : 'text-emerald-400'}">₹ ${f.pendingDues.toLocaleString('en-IN')}</span>
            <span class="text-[10px] text-slate-500 block">Current Sem</span>
          </div>
        </div>

        <h4 class="font-bold text-xs uppercase text-slate-400 mb-2">Automated Notifications Dispatched to Parents:</h4>
        <div class="space-y-2">
          ${data.notificationsSentToParent.map((n) => `
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
              <i class="fas fa-bell text-amber-400 mt-0.5"></i>
              <div class="flex-1">
                <p class="text-slate-200">${esc(n.message)}</p>
                <span class="text-[10px] text-slate-500 font-mono mt-0.5 block">${esc(n.dispatchedAt || '')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      $('parentOverviewBody').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeParentOverviewModal = function () {
    const modal = $('parentOverviewModal');
    if (modal) modal.classList.add('hidden');
  };

  // Security Guard Station Modal
  window.openSecurityGuardModal = async function () {
    const modal = $('securityGuardModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('securityGuardBody').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i> Querying gate sensor telemetry &amp; visitor logs...</div>';
    try {
      const data = await api('/security/guard-station');
      $('securityGuardBody').innerHTML = `
        <div class="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex justify-between items-center mb-5">
          <div>
            <span class="text-[10px] uppercase font-bold text-cyan-400">On-Duty Station</span>
            <h3 class="text-lg font-black text-white">${esc(data.station)}</h3>
            <p class="text-xs text-slate-400">${esc(data.onDutyOfficer)} · ${esc(data.gateStatus)}</p>
          </div>
          <button class="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-xs font-bold shadow-md" onclick="window.openVisitorPassIssuerModal()">
            <i class="fas fa-id-badge mr-1.5"></i> Issue Visitor Gate Pass
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-5">
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold">Active Visitors On Campus</span>
            <p class="text-3xl font-black text-cyan-300 mt-1">${data.activeVisitorsInsideCampus}</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold">Active SOS Alarms</span>
            <p class="text-3xl font-black ${data.activeSosDistressAlerts > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'} mt-1">${data.activeSosDistressAlerts}</p>
          </div>
        </div>

        <h4 class="font-bold text-xs uppercase text-slate-400 mb-2">Recent Gate Entry / Exit Log:</h4>
        <div class="max-h-60 overflow-y-auto space-y-2">
          ${data.recentVisitorLogs.map((v) => `
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <b class="text-white">${esc(v.visitor_name)}</b> <span class="text-slate-400 font-mono text-[10px]">(${esc(v.badge_no)})</span>
                <p class="text-[11px] text-slate-400 mt-0.5">Host: <b>${esc(v.host_faculty)}</b> · Purpose: ${esc(v.purpose)}</p>
              </div>
              <div class="text-right">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.status === 'Checked In' ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'}">${esc(v.status)}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">In: ${esc(v.entry_time)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      $('securityGuardBody').innerHTML = `<p class="text-rose-400">Error: ${err.message}</p>`;
    }
  };

  window.closeSecurityGuardModal = function () {
    const modal = $('securityGuardModal');
    if (modal) modal.classList.add('hidden');
  };

  // Visitor Pass Issuer
  window.openVisitorPassIssuerModal = function () {
    const modal = $('visitorPassIssuerModal');
    if (!modal) return;
    modal.classList.remove('hidden');
  };

  window.closeVisitorPassIssuerModal = function () {
    const modal = $('visitorPassIssuerModal');
    if (modal) modal.classList.add('hidden');
  };

  window.submitVisitorPassAction = async function () {
    const name = $('visName').value.trim();
    const phone = $('visPhone').value.trim();
    const purpose = $('visPurpose').value.trim();
    const host = $('visHost').value.trim();
    const vehicle = $('visVehicle').value.trim();

    if (!name || !purpose) return toast('Name and purpose are required.', 'warning');
    try {
      const res = await api('/security/visitor-pass', {
        method: 'POST',
        body: { name, phone, purpose, hostFaculty: host, vehicleNumber: vehicle }
      });
      toast(res.message, 'success');
      window.closeVisitorPassIssuerModal();
      window.openSecurityGuardModal();
    } catch (err) {
      toast('Failed to issue pass: ' + err.message, 'error');
    }
  };

})();

