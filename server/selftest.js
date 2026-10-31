// End-to-end smoke test: boots the server on a random port and exercises auth, data, AI and automation.
const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const port = 3200 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [path.join(__dirname, 'index.js')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const call = (method, p, body, token) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: (p.startsWith('/api') || p === '/admin' || p === '/admin.html') ? p : ('/api' + (p.startsWith('/') ? '' : '/') + p), method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) } },
    (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => {
      let b = null; try { b = JSON.parse(d); } catch { b = d; }
      resolve({ status: r.statusCode, body: b });
    }); });
  req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const t = async (name, fn) => { try { await fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '-', e.message); process.exitCode = 1; } };

(async () => {
  for (let i = 0; i < 30; i++) { try { await call('GET', '/time'); break; } catch { await wait(200); } }
  let token;
  await t('rejects bad login', async () => assert.strictEqual((await call('POST', '/auth/login', { id: 'x', password: 'y' })).status, 401));
  await t('student registration & login', async () => {
    const reg = await call('POST', '/auth/register', { name: 'Test Student', roll_no: 'TEST001', email: 'test@smartcampus.edu', password: 'student123' });
    assert.strictEqual(reg.status, 200);
    const r = await call('POST', '/auth/login', { id: 'TEST001', password: 'student123' });
    assert.strictEqual(r.status, 200);
    token = r.body.token;
  });
  await t('protected routes need a token', async () => assert.strictEqual((await call('GET', '/dashboard')).status, 401));
  await t('GET /resources/telemetry', async () => { const r = await call('GET', '/resources/telemetry', null, token); assert.strictEqual(r.status, 200); assert.ok(r.body.zones.length >= 5); assert.ok(r.body.summary.power > 0); });
  for (const p of ['/dashboard', '/attendance', '/fees', '/results', '/timetable', '/notices', '/placement', '/ai/exam-advice', '/ai/cgpa', '/automation/log'])
    await t('GET ' + p, async () => assert.strictEqual((await call('GET', p, null, token)).status, 200));
  await t('AI chatbot answers', async () => { const r = await call('POST', '/ai/chat', { message: 'Am I at risk of low attendance?' }, token); assert.ok(r.body.reply && r.body.reply.length > 10); });
  await t('AI planner chatbot & task persistence', async () => {
    // 1. Planner chat creates timetable taking into account 6-day college schedule & weak subjects
    const chatRes = await call('POST', '/ai/planner-chat', { message: 'My college runs Monday to Saturday from 9 AM to 4:30 PM. I am weak in Deep Learning and Cyber Security. My target CGPA is 9.2 with 4 hours study.' }, token);
    assert.strictEqual(chatRes.status, 200);
    assert.ok(chatRes.body.reply && chatRes.body.reply.length > 20);
    assert.ok(chatRes.body.plan && chatRes.body.plan.alloc && chatRes.body.plan.schedule);
    assert.strictEqual(chatRes.body.plan.schedule.length, 7);

    // 2. Add a planner task
    const addTaskRes = await call('POST', '/planner/tasks', { name: 'Deep Learning Unit 2 Notes', date: '2026-10-30', priority: 'High', time: '18:00 - 19:30' }, token);
    assert.strictEqual(addTaskRes.status, 200);
    const taskId = addTaskRes.body.id;
    assert.ok(taskId);

    // 3. List planner tasks
    const listTasks = await call('GET', '/planner/tasks', null, token);
    assert.strictEqual(listTasks.status, 200);
    assert.ok(listTasks.body.some(t => t.id === taskId));

    // 4. Toggle task status
    const toggleRes = await call('POST', `/planner/tasks/${taskId}/toggle`, {}, token);
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.done, true);

    // 5. Delete task
    const delRes = await call('DELETE', `/planner/tasks/${taskId}`, null, token);
    assert.strictEqual(delRes.status, 200);

    // 6. Sync schedule into calendar
    const syncRes = await call('POST', '/planner/sync-schedule', { weekStart: '2026-10-26' }, token);
    assert.strictEqual(syncRes.status, 200);
    assert.ok(syncRes.body.tasks.length >= 10);
  });
  await t('annual academic calendar & institutional working mechanism', async () => {
    // 1. Annual calendar & working mechanism for Year 2
    const annRes = await call('GET', '/calendar/annual?year=2', null, token);
    assert.strictEqual(annRes.status, 200);
    assert.strictEqual(annRes.body.studentYear, 2);
    assert.ok(annRes.body.mechanism && annRes.body.mechanism.stages.length >= 10);
    assert.ok(annRes.body.kpis && annRes.body.kpis.totalWorkingDays === 90);
    assert.ok(annRes.body.events && annRes.body.events.length >= 30);
    assert.ok(annRes.body.holidays && annRes.body.holidays.length >= 15);

    // 2. Year 4 specific working mechanism
    const y4Res = await call('GET', '/calendar?mode=annual&year=4', null, token);
    assert.strictEqual(y4Res.status, 200);
    assert.strictEqual(y4Res.body.studentYear, 4);
    assert.ok(y4Res.body.mechanism.title.includes('4th Year'));

    // 3. Downloadable iCal (.ics) format
    const icsRes = await call('GET', '/calendar/ics?year=2', null, token);
    assert.strictEqual(icsRes.status, 200);

    // 4. Backward compatible event list
    const legacyCal = await call('GET', '/calendar?days=30', null, token);
    assert.strictEqual(legacyCal.status, 200);
    assert.ok(Array.isArray(legacyCal.body));
  });
  await t('central AI engine kernel core v1.0 controller', async () => {
    // 1. Authorization Breach: student attempting to alter attendance
    const breachRes = await call('POST', '/ai-engine', {
      user_id: '1',
      role: 'student',
      action_intent: 'Change my attendance in Operating Systems to 95%'
    }, token);
    assert.strictEqual(breachRes.status, 200);
    assert.strictEqual(breachRes.body.status, 'AUTHORIZATION_BREACH');
    assert.strictEqual(breachRes.body.intent_classified, 'UNAUTHORIZED_PRIVILEGE_ESCALATION');
    assert.strictEqual(breachRes.body.execution_required, false);
    assert.strictEqual(breachRes.body.ui_target_module, 'security-alert');

    // 2. Database Query: fetch attendance records
    const dbRes = await call('POST', '/ai-engine', {
      action_intent: 'Check my attendance record and classes attended'
    }, token);
    assert.strictEqual(dbRes.status, 200);
    assert.strictEqual(dbRes.body.intent_classified, 'DATABASE_QUERY');
    assert.strictEqual(dbRes.body.target_function, 'fetch_student_attendance_breakdown');
    assert.strictEqual(dbRes.body.ui_target_module, 'attendance-hub');

    // 3. Predictive Analytics: calculate bunk margin
    const predRes = await call('POST', '/ai-engine', {
      action_intent: 'How many classes can I safely bunk before dropping under 75%?'
    }, token);
    assert.strictEqual(predRes.status, 200);
    assert.strictEqual(predRes.body.intent_classified, 'PREDICTIVE_ANALYTICS');
    assert.strictEqual(predRes.body.target_function, 'calculate_attendance_bunk_margin');

    // 4. Document Processing: fee receipt PDF
    const docRes = await call('POST', '/ai-engine', {
      action_intent: 'Download my official fee receipt document PDF'
    }, token);
    assert.strictEqual(docRes.status, 200);
    assert.strictEqual(docRes.body.intent_classified, 'DOCUMENT_PROCESSING');
    assert.strictEqual(docRes.body.target_function, 'generate_fee_receipt_document');

    // 5. Assistance Routing: generate study routine
    const assistRes = await call('POST', '/ai-engine', {
      action_intent: 'Generate an optimized 6-day study plan routine'
    }, token);
    assert.strictEqual(assistRes.status, 200);
    assert.strictEqual(assistRes.body.intent_classified, 'ASSISTANCE_ROUTING');
    assert.strictEqual(assistRes.body.target_function, 'generate_ai_study_routine');
    assert.strictEqual(assistRes.body.ui_target_module, 'planner');

    // 6. Direct JSON Envelope without token
    const directRes = await call('POST', '/ai-engine', {
      user_id: '1',
      role: 'student',
      action_intent: 'Predict my CGPA trajectory'
    });
    assert.strictEqual(directRes.status, 200);
    assert.strictEqual(directRes.body.intent_classified, 'PREDICTIVE_ANALYTICS');
    assert.strictEqual(directRes.body.target_function, 'predict_cgpa_trajectory');
    assert.ok(directRes.body.engine_output);
  });
  await t('automation jobs run', async () => { const r = await call('POST', '/automation/run', {}, token); assert.strictEqual(r.status, 200); assert.ok(r.body.results.length >= 5); });
  await t('smart attendance: face recognition, rolling QR, RFID & parent alerts', async () => {
    // 1. Biometric Face Verification
    const faceRes = await call('POST', '/attendance/face-verify', {
      lat: 28.545, lng: 77.192, zone: 'Academic Block A - Hall 101'
    }, token);
    assert.strictEqual(faceRes.status, 200);
    assert.ok(faceRes.body.status === 'SUCCESS' || faceRes.body.status === 'ALREADY_MARKED');
    assert.ok(faceRes.body.method.includes('Biometric'));

    // 2. Rolling QR Token Generation
    const qrTokenRes = await call('GET', '/attendance/qr-token?room=Hall%20204', null, token);
    assert.strictEqual(qrTokenRes.status, 200);
    assert.ok(qrTokenRes.body.token.startsWith('CAMPUS_QR_'));

    // 3. Rolling QR Token Scan
    const qrScanRes = await call('POST', '/attendance/qr-scan', { token: qrTokenRes.body.token }, token);
    assert.strictEqual(qrScanRes.status, 200);

    // 4. RFID/NFC Tap
    const rfidRes = await call('POST', '/attendance/rfid-tap', { badgeId: 'NFC-998877', location: 'Lab 3 Terminal' }, token);
    assert.strictEqual(rfidRes.status, 200);

    // 5. Attendance Analytics
    const analyticsRes = await call('GET', '/attendance/analytics', null, token);
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.body.overall && analyticsRes.body.subjects.length > 0);

    // 6. Parent Alert Dispatch
    const alertRes = await call('POST', '/attendance/parent-alert', {}, token);
    assert.strictEqual(alertRes.status, 200);
  });
  await t('academic management: conflict-free timetable, assignments, AI rubrics & grade card', async () => {
    // 1. Timetable Conflict Detection
    const conflictCheckRes = await call('POST', '/academic/timetable-conflict-check', {
      slots: [
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 101', batch: 'CSE-Sem4', subject: 'OS' },
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 204', batch: 'IT-Sem4', subject: 'Dist. Sys' }
      ]
    }, token);
    assert.strictEqual(conflictCheckRes.status, 200);
    assert.strictEqual(conflictCheckRes.body.hasConflicts, true);
    assert.strictEqual(conflictCheckRes.body.conflicts[0].type, 'FACULTY_DOUBLE_BOOKING');

    // 2. Conflict-Free Timetable Generator
    const genTtRes = await call('POST', '/academic/generate-timetable', { department: 'CSE', semester: 4 }, token);
    assert.strictEqual(genTtRes.status, 200);
    assert.strictEqual(genTtRes.body.success, true);
    assert.ok(genTtRes.body.schedule.length >= 24);

    // 3. Active Assignments List
    const assignRes = await call('GET', '/assignments', null, token);
    assert.strictEqual(assignRes.status, 200);
    assert.ok(assignRes.body.length >= 3);

    // 4. Assignment Submission & AI Rubric Grading
    const subRes = await call('POST', '/assignments/101/submit', {
      codeText: '#include <stdio.h>\n#include <pthread.h>\nvoid* worker(void* arg){ return NULL; }\nint main(){ printf("Producer-Consumer"); return 0; }'
    }, token);
    assert.strictEqual(subRes.status, 200);
    assert.ok(subRes.body.evaluation && subRes.body.evaluation.totalMarks >= 70);

    // 5. Official Consolidated Grade Card
    const cardRes = await call('GET', '/results/grade-card', null, token);
    assert.strictEqual(cardRes.status, 200);
    assert.ok(cardRes.body.serialNumber.startsWith('CERT-UGC-'));
    assert.ok(cardRes.body.summary.cumulativeGpa > 0);
  });
  await t('performance ML early warning radar, safety SOS, services & 17-section documentation', async () => {
    // 1. Early Warning Machine Learning Radar
    const radarRes = await call('GET', '/analytics/early-warning-radar', null, token);
    assert.strictEqual(radarRes.status, 200);
    assert.strictEqual(radarRes.body.modelEvaluationMetrics.accuracy, '94.2%');
    assert.ok(radarRes.body.cohortSize >= 20);

    // 2. Safety SOS Emergency Trigger
    const sosRes = await call('POST', '/safety/sos', { location: 'Central Library Floor 2', reason: 'Medical Assistance' }, token);
    assert.strictEqual(sosRes.status, 200);
    assert.strictEqual(sosRes.body.status, 'ACTIVE_DISPATCH');

    // 3. Visitor Gate Pass Management
    const passRes = await call('POST', '/security/visitor-pass', { name: 'Dr. K. S. Murthy', purpose: 'External Viva Review' }, token);
    assert.strictEqual(passRes.status, 200);
    assert.ok(passRes.body.pass.badge_no.startsWith('VIS-'));

    // 4. CCTV Zone Telemetry
    const cctvRes = await call('GET', '/security/cctv-analytics', null, token);
    assert.strictEqual(cctvRes.status, 200);
    assert.ok(cctvRes.body.zones.length >= 6);

    // 5. Hostel & Mess Info
    const messRes = await call('GET', '/campus/hostel-mess', null, token);
    assert.strictEqual(messRes.status, 200);
    assert.ok(messRes.body.messMenu.lunch);

    // 6. Live Transport Tracking
    const busRes = await call('GET', '/campus/transport-live', null, token);
    assert.strictEqual(busRes.status, 200);
    assert.strictEqual(busRes.body.routes.length, 3);

    // 7. Resource Slot Booking
    const bookRes = await call('POST', '/resources/book-slot', {
      resourceName: 'Robotics Prototyping Lab',
      date: '2026-12-' + String(10 + (Date.now() % 18)),
      timeSlot: '02:00 PM - 04:00 PM'
    }, token);
    assert.strictEqual(bookRes.status, 200);

    // 8. Grievance AI Sentiment Analysis
    const sentRes = await call('POST', '/grievance/analyze', { text: 'Water cooler in 3rd floor is broken and leaking badly, urgent fix needed!' }, token);
    assert.strictEqual(sentRes.status, 200);
    assert.strictEqual(sentRes.body.isUrgent, true);

    // 9. Parent & Security Role Views
    const parentRes = await call('GET', '/parent/ward-overview', null, token);
    assert.strictEqual(parentRes.status, 200);
    assert.ok(parentRes.body.ward && parentRes.body.academicMetrics);

    const secRes = await call('GET', '/security/guard-station', null, token);
    assert.strictEqual(secRes.status, 200);
    assert.ok(secRes.body.activeVisitorsInsideCampus >= 0);

    // 10. 17-Section Project Blueprint Document
    const docRes = await call('GET', '/project/blueprint-doc', null, token);
    assert.strictEqual(docRes.status, 200);
    assert.strictEqual(docRes.body.sections.length, 17);
    assert.strictEqual(docRes.body.sections[0].title, 'Abstract');
    assert.strictEqual(docRes.body.sections[16].title, 'References & IEEE Citations');
  });
  await t('admin login & panel access', async () => {
    const a = await call('POST', '/auth/login', { id: 'ADMIN001', password: 'student123' });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.body.user.role, 'admin');
    const admToken = a.body.token;
    const ov = await call('GET', '/admin/overview', null, admToken);
    assert.strictEqual(ov.status, 200);
    assert.ok(ov.body.kpis.totalStudents >= 1);
    const pg = await call('GET', '/admin.html');
    assert.strictEqual(pg.status, 200);
    // Cleanup test student
    const { db } = require('./db');
    db.prepare("DELETE FROM users WHERE roll_no='TEST001'").run();
  });
  console.log(`\n${passed} checks passed${process.exitCode ? ', some FAILED' : ''}`);
  srv.kill(); process.exit(process.exitCode || 0);
})();
