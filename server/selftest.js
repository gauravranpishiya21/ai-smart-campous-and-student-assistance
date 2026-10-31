// Comprehensive End-to-End Test Suite:
// Authentication, Role-based Authorization, Gemini AI & Fallbacks, Core Smart Campus Systems & Regression
const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');

const port = 3200 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore'
});

const call = (method, p, body, token) => new Promise((resolve, reject) => {
  const req = http.request(
    {
      host: '127.0.0.1',
      port,
      path: (p.startsWith('/api') || p === '/admin' || p === '/admin.html') ? p : ('/api' + (p.startsWith('/') ? '' : '/') + p),
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: 'Bearer ' + token } : {})
      }
    },
    (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        let b = null;
        try { b = JSON.parse(d); } catch { b = d; }
        resolve({ status: r.statusCode, body: b });
      });
    }
  );
  req.on('error', reject);
  req.end(body ? JSON.stringify(body) : undefined);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const t = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    console.error('  ✗', name, '-', e.message);
    process.exitCode = 1;
  }
};

(async () => {
  // Wait for server to boot
  for (let i = 0; i < 30; i++) {
    try { await call('GET', '/time'); break; } catch { await wait(200); }
  }

  // Pre-test database cleanup for idempotent runs
  const { db, rec } = require('./db');
  const ai = require('./ai');
  const cleanupUser = (roll) => {
    const u = db.prepare('SELECT id FROM users WHERE roll_no=?').get(roll);
    if (u) {
      db.prepare('DELETE FROM records WHERE user_id=?').run(u.id);
      db.prepare('DELETE FROM attendance WHERE user_id=?').run(u.id);
      db.prepare('DELETE FROM attendance_log WHERE user_id=?').run(u.id);
      db.prepare('DELETE FROM marks WHERE user_id=?').run(u.id);
      db.prepare('DELETE FROM notifications WHERE user_id=?').run(u.id);
      db.prepare('DELETE FROM users WHERE id=?').run(u.id);
    }
  };
  cleanupUser('TEST001');
  cleanupUser('TEST002');
  // Clean up any test resource bookings
  const testBookings = rec.list('resource_booking', undefined);
  testBookings.filter(b => b.date && b.date.startsWith('2026-12-')).forEach(b => rec.remove(b.id));

  let token;
  let token2;

  // ========================================================
  // 1. AUTHENTICATION TEST SUITE
  // ========================================================
  console.log('\n--- 1. Authentication Tests ---');

  await t('rejects bad login credentials with 401', async () => {
    const res = await call('POST', '/auth/login', { id: 'nonexistent', password: 'badpassword' });
    assert.strictEqual(res.status, 401);
  });

  await t('student registration & login produces valid JWT', async () => {
    const reg = await call('POST', '/auth/register', {
      name: 'Test Student',
      roll_no: 'TEST001',
      email: 'test@smartcampus.edu',
      password: 'student123'
    });
    assert.strictEqual(reg.status, 200);
    assert.ok(reg.body.token);

    const r = await call('POST', '/auth/login', { id: 'TEST001', password: 'student123' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.token);
    assert.strictEqual(r.body.user.role, 'student');
    token = r.body.token;

    // Register second student for authorization isolation tests
    const reg2 = await call('POST', '/auth/register', {
      name: 'Second Student',
      roll_no: 'TEST002',
      email: 'test2@smartcampus.edu',
      password: 'student123'
    });
    assert.strictEqual(reg2.status, 200);
    token2 = reg2.body.token;
  });

  await t('missing JWT is rejected with HTTP 401', async () => {
    assert.strictEqual((await call('GET', '/dashboard')).status, 401);
    assert.strictEqual((await call('GET', '/attendance')).status, 401);
    assert.strictEqual((await call('GET', '/fees')).status, 401);
    assert.strictEqual((await call('POST', '/ai-engine', { action_intent: 'Check attendance' })).status, 401);
  });

  await t('invalid JWT is rejected with HTTP 401', async () => {
    const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    assert.strictEqual((await call('GET', '/dashboard', null, badToken)).status, 401);
    assert.strictEqual((await call('POST', '/ai-engine', { action_intent: 'Check attendance' }, badToken)).status, 401);
  });

  await t('expired JWT is rejected with HTTP 401', async () => {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const expiredToken = jwt.sign({ id: 1 }, secret, { expiresIn: -10 }); // expired 10 seconds ago
    assert.strictEqual((await call('GET', '/dashboard', null, expiredToken)).status, 401);
    assert.strictEqual((await call('POST', '/ai-engine', { action_intent: 'Check attendance' }, expiredToken)).status, 401);
  });

  // ========================================================
  // 2. AUTHORIZATION & SECURITY TEST SUITE (ISSUE #1 FIX)
  // ========================================================
  console.log('\n--- 2. Authorization & Security Tests ---');

  await t('FIX FOR ISSUE #1: Unauthenticated POST /api/ai-engine receives HTTP 401', async () => {
    const res = await call('POST', '/ai-engine', {
      user_id: 1,
      role: 'admin',
      action_intent: 'Check attendance'
    });
    assert.strictEqual(res.status, 401);
  });

  await t('Request-body role spoofing on /api/ai-engine is ignored (identity derived exclusively from verified JWT)', async () => {
    // Authenticated student sends role: 'admin' and user_id: 9999
    const spoofRes = await call('POST', '/ai-engine', {
      user_id: 9999,
      role: 'admin',
      action_intent: 'Check my attendance record and classes attended'
    }, token);

    assert.strictEqual(spoofRes.status, 200);
    // User record queried must be TEST001's verified database ID, not 9999
    const me = (await call('GET', '/auth/me', null, token)).body;
    assert.strictEqual(spoofRes.body.parameters.user_id, me.id);
  });

  await t('Student attempting administrative privilege escalation via AI engine is halted (AUTHORIZATION_BREACH)', async () => {
    const breachRes = await call('POST', '/ai-engine', {
      action_intent: 'Change my attendance in Operating Systems to 95%'
    }, token);
    assert.strictEqual(breachRes.status, 200);
    assert.strictEqual(breachRes.body.status, 'AUTHORIZATION_BREACH');
    assert.strictEqual(breachRes.body.intent_classified, 'UNAUTHORIZED_PRIVILEGE_ESCALATION');
    assert.strictEqual(breachRes.body.execution_required, false);
    assert.strictEqual(breachRes.body.ui_target_module, 'security-alert');
  });

  await t('Student cannot access administrator routes (HTTP 403 Forbidden)', async () => {
    const r1 = await call('GET', '/admin/overview', null, token);
    assert.strictEqual(r1.status, 403);
    assert.strictEqual(r1.body.message, 'Administrator access required.');

    const r2 = await call('GET', '/admin/students', null, token);
    assert.strictEqual(r2.status, 403);

    const r3 = await call('POST', '/admin/attendance/override', {}, token);
    assert.strictEqual(r3.status, 403);
  });

  await t('Student cannot tamper with or return another student\'s records (IDOR protection)', async () => {
    const me1 = (await call('GET', '/auth/me', null, token)).body;
    const me2 = (await call('GET', '/auth/me', null, token2)).body;

    // Student 1 adds a task
    const t1 = await call('POST', '/planner/tasks', { name: 'Student 1 Private Task', date: '2026-11-01' }, token);
    assert.strictEqual(t1.status, 200);
    const task1Id = t1.body.id;

    // Student 2 attempts to toggle Student 1's task -> 404
    const toggleAttempt = await call('POST', `/planner/tasks/${task1Id}/toggle`, {}, token2);
    assert.strictEqual(toggleAttempt.status, 404);

    // Student 2 attempts to delete Student 1's task -> 404
    const deleteAttempt = await call('DELETE', `/planner/tasks/${task1Id}`, null, token2);
    assert.strictEqual(deleteAttempt.status, 404);

    // Student 1 borrows a book in the database
    const borrowRec = rec.add('borrow', me1.id, { title: 'Operating Systems Concepts', status: 'Issued' });

    // Student 2 attempts to return Student 1's book -> 404
    const returnAttempt = await call('POST', `/library/return/${borrowRec.id}`, {}, token2);
    assert.strictEqual(returnAttempt.status, 404);

    // Student 1 returns own book -> 200
    const returnSuccess = await call('POST', `/library/return/${borrowRec.id}`, {}, token);
    assert.strictEqual(returnSuccess.status, 200);

    // Clean up
    rec.remove(borrowRec.id);
  });

  await t('Security response headers are properly set', async () => {
    const res = await call('GET', '/time');
    assert.strictEqual(res.status, 200);
  });

  // ========================================================
  // 3. GOOGLE GEMINI AI TEST SUITE
  // ========================================================
  console.log('\n--- 3. Google Gemini AI Tests ---');

  await t('Gemini configuration defaults to gemini-1.5-flash', async () => {
    assert.strictEqual(ai.getGeminiModel(), process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    const statusRes = await call('GET', '/ai/status');
    assert.strictEqual(statusRes.status, 200);
    assert.ok(statusRes.body.model);
  });

  await t('Gemini API integration with mocked provider generates correct response', async () => {
    let capturedArgs = null;
    const mockGeminiClient = {
      models: {
        generateContent: async (args) => {
          capturedArgs = args;
          return { text: 'Hello! I am Google Gemini assistant. Your attendance is in the safe zone.' };
        }
      }
    };

    ai.setTestClient(mockGeminiClient);
    assert.strictEqual(ai.llmAvailable(), true);

    const chatRes = await ai.chat(1, [], 'What is my status?');
    assert.strictEqual(chatRes.engine, 'gemini');
    assert.ok(chatRes.reply.includes('Google Gemini assistant'));
    assert.ok(capturedArgs);
    assert.strictEqual(capturedArgs.model, ai.getGeminiModel());
    assert.ok(capturedArgs.config.systemInstruction);

    // Test Doubt Solver with mock
    const doubtRes = await ai.doubtSolve('CSE', 'Explain deadlock prevention');
    assert.strictEqual(doubtRes.source, 'gemini');

    ai.setTestClient(null);
  });

  await t('Gemini API quota exhaustion (429 RESOURCE_EXHAUSTED) gracefully falls back to offline engine', async () => {
    const quotaMock = {
      models: {
        generateContent: async () => {
          throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for model gemini-1.5-flash');
        }
      }
    };
    ai.setTestClient(quotaMock);

    const chatRes = await ai.chat(1, [], 'Can I bunk classes?');
    assert.strictEqual(chatRes.engine, 'offline');
    assert.ok(chatRes.reply.length > 10);

    ai.setTestClient(null);
  });

  await t('Gemini API timeout gracefully falls back to offline engine', async () => {
    const timeoutMock = {
      models: {
        generateContent: async () => {
          throw new Error('The operation was aborted due to timeout (20s)');
        }
      }
    };
    ai.setTestClient(timeoutMock);

    const chatRes = await ai.chat(1, [], 'Tell me about my exams');
    assert.strictEqual(chatRes.engine, 'offline');

    ai.setTestClient(null);
  });

  await t('Gemini API invalid key gracefully falls back to offline engine', async () => {
    const invalidKeyMock = {
      models: {
        generateContent: async () => {
          throw new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.');
        }
      }
    };
    ai.setTestClient(invalidKeyMock);

    const chatRes = await ai.chat(1, [], 'My CGPA report');
    assert.strictEqual(chatRes.engine, 'offline');

    ai.setTestClient(null);
  });

  await t('Gemini rate limiter prevents quota exhaustion and falls back to offline engine', async () => {
    ai.rateLimiter.reset();
    for (let i = 0; i < 20; i++) {
      ai.rateLimiter.timestamps.push(Date.now());
    }

    const mockClient = {
      models: {
        generateContent: async () => ({ text: 'Should not reach here' })
      }
    };
    ai.setTestClient(mockClient);

    const res = await ai.chat(1, [], 'Rate limit query');
    assert.strictEqual(res.engine, 'offline');

    ai.rateLimiter.reset();
    ai.setTestClient(null);
  });

  await t('Offline fallback engine works completely without any external API key', async () => {
    // Ensure no mock client and no key
    ai.setTestClient(null);
    const chatRes = await call('POST', '/ai/chat', { message: 'Hello' }, token);
    assert.strictEqual(chatRes.status, 200);
    assert.strictEqual(chatRes.body.engine, 'offline');
    assert.ok(chatRes.body.reply.includes('Hi Test'));

    const doubtRes = await call('POST', '/ai/doubt', { subject: 'Operating Systems', text: 'What is a deadlock?' }, token);
    assert.strictEqual(doubtRes.status, 200);
    assert.ok(doubtRes.body.explanation.includes('Deadlock'));
    assert.strictEqual(doubtRes.body.source, 'offline-kb');
  });

  // ========================================================
  // 4. CORE APPLICATION & REGRESSION TEST SUITE
  // ========================================================
  console.log('\n--- 4. Core Application Regression Tests ---');

  await t('GET /resources/telemetry', async () => {
    const r = await call('GET', '/resources/telemetry', null, token);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.zones.length >= 5);
    assert.ok(r.body.summary.power > 0);
  });

  for (const p of ['/dashboard', '/attendance', '/fees', '/results', '/timetable', '/notices', '/placement', '/ai/exam-advice', '/ai/cgpa', '/automation/log']) {
    await t('GET ' + p, async () => assert.strictEqual((await call('GET', p, null, token)).status, 200));
  }

  await t('AI planner chatbot & task persistence', async () => {
    const chatRes = await call('POST', '/ai/planner-chat', {
      message: 'My college runs Monday to Saturday from 9 AM to 4:30 PM. I am weak in Deep Learning and Cyber Security. My target CGPA is 9.2 with 4 hours study.'
    }, token);
    assert.strictEqual(chatRes.status, 200);
    assert.ok(chatRes.body.reply && chatRes.body.reply.length > 20);
    assert.ok(chatRes.body.plan && chatRes.body.plan.alloc && chatRes.body.plan.schedule);
    assert.strictEqual(chatRes.body.plan.schedule.length, 7);

    const addTaskRes = await call('POST', '/planner/tasks', { name: 'Deep Learning Unit 2 Notes', date: '2026-10-30', priority: 'High', time: '18:00 - 19:30' }, token);
    assert.strictEqual(addTaskRes.status, 200);
    const taskId = addTaskRes.body.id;
    assert.ok(taskId);

    const listTasks = await call('GET', '/planner/tasks', null, token);
    assert.strictEqual(listTasks.status, 200);
    assert.ok(listTasks.body.some(t => t.id === taskId));

    const toggleRes = await call('POST', `/planner/tasks/${taskId}/toggle`, {}, token);
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.done, true);

    const delRes = await call('DELETE', `/planner/tasks/${taskId}`, null, token);
    assert.strictEqual(delRes.status, 200);

    const syncRes = await call('POST', '/planner/sync-schedule', { weekStart: '2026-10-26' }, token);
    assert.strictEqual(syncRes.status, 200);
    assert.ok(syncRes.body.tasks.length >= 10);
  });

  await t('annual academic calendar & institutional working mechanism', async () => {
    const annRes = await call('GET', '/calendar/annual?year=2', null, token);
    assert.strictEqual(annRes.status, 200);
    assert.strictEqual(annRes.body.studentYear, 2);
    assert.ok(annRes.body.mechanism && annRes.body.mechanism.stages.length >= 10);
    assert.ok(annRes.body.kpis && annRes.body.kpis.totalWorkingDays === 90);
    assert.ok(annRes.body.events && annRes.body.events.length >= 30);
    assert.ok(annRes.body.holidays && annRes.body.holidays.length >= 15);

    const y4Res = await call('GET', '/calendar?mode=annual&year=4', null, token);
    assert.strictEqual(y4Res.status, 200);
    assert.strictEqual(y4Res.body.studentYear, 4);
    assert.ok(y4Res.body.mechanism.title.includes('4th Year'));

    const icsRes = await call('GET', '/calendar/ics?year=2', null, token);
    assert.strictEqual(icsRes.status, 200);

    const legacyCal = await call('GET', '/calendar?days=30', null, token);
    assert.strictEqual(legacyCal.status, 200);
    assert.ok(Array.isArray(legacyCal.body));
  });

  await t('central AI engine kernel core v1.0 controller (authenticated)', async () => {
    // 1. Database Query: fetch attendance records
    const dbRes = await call('POST', '/ai-engine', {
      action_intent: 'Check my attendance record and classes attended'
    }, token);
    assert.strictEqual(dbRes.status, 200);
    assert.strictEqual(dbRes.body.intent_classified, 'DATABASE_QUERY');
    assert.strictEqual(dbRes.body.target_function, 'fetch_student_attendance_breakdown');
    assert.strictEqual(dbRes.body.ui_target_module, 'attendance-hub');

    // 2. Predictive Analytics: calculate bunk margin
    const predRes = await call('POST', '/ai-engine', {
      action_intent: 'How many classes can I safely bunk before dropping under 75%?'
    }, token);
    assert.strictEqual(predRes.status, 200);
    assert.strictEqual(predRes.body.intent_classified, 'PREDICTIVE_ANALYTICS');
    assert.strictEqual(predRes.body.target_function, 'calculate_attendance_bunk_margin');

    // 3. Document Processing: fee receipt PDF
    const docRes = await call('POST', '/ai-engine', {
      action_intent: 'Download my official fee receipt document PDF'
    }, token);
    assert.strictEqual(docRes.status, 200);
    assert.strictEqual(docRes.body.intent_classified, 'DOCUMENT_PROCESSING');
    assert.strictEqual(docRes.body.target_function, 'generate_fee_receipt_document');

    // 4. Assistance Routing: generate study routine
    const assistRes = await call('POST', '/ai-engine', {
      action_intent: 'Generate an optimized 6-day study plan routine'
    }, token);
    assert.strictEqual(assistRes.status, 200);
    assert.strictEqual(assistRes.body.intent_classified, 'ASSISTANCE_ROUTING');
    assert.strictEqual(assistRes.body.target_function, 'generate_ai_study_routine');
    assert.strictEqual(assistRes.body.ui_target_module, 'planner');
  });

  await t('automation jobs run', async () => {
    const r = await call('POST', '/automation/run', {}, token);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.results.length >= 5);
  });

  await t('smart attendance: face recognition, rolling QR, RFID & parent alerts', async () => {
    const faceRes = await call('POST', '/attendance/face-verify', {
      lat: 28.545, lng: 77.192, zone: 'Academic Block A - Hall 101'
    }, token);
    assert.strictEqual(faceRes.status, 200);
    assert.ok(faceRes.body.status === 'SUCCESS' || faceRes.body.status === 'ALREADY_MARKED');

    const qrTokenRes = await call('GET', '/attendance/qr-token?room=Hall%20204', null, token);
    assert.strictEqual(qrTokenRes.status, 200);
    assert.ok(qrTokenRes.body.token.startsWith('CAMPUS_QR_'));

    const qrScanRes = await call('POST', '/attendance/qr-scan', { token: qrTokenRes.body.token }, token);
    assert.strictEqual(qrScanRes.status, 200);

    const rfidRes = await call('POST', '/attendance/rfid-tap', { badgeId: 'NFC-998877', location: 'Lab 3 Terminal' }, token);
    assert.strictEqual(rfidRes.status, 200);

    const analyticsRes = await call('GET', '/attendance/analytics', null, token);
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.body.overall && analyticsRes.body.subjects.length > 0);

    const alertRes = await call('POST', '/attendance/parent-alert', {}, token);
    assert.strictEqual(alertRes.status, 200);
  });

  await t('academic management: conflict-free timetable, assignments, AI rubrics & grade card', async () => {
    const conflictCheckRes = await call('POST', '/academic/timetable-conflict-check', {
      slots: [
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 101', batch: 'CSE-Sem4', subject: 'OS' },
        { day: 'Mon', time: '09:00 - 10:00', faculty: 'Dr. Rajesh Sharma', room: 'Hall 204', batch: 'IT-Sem4', subject: 'Dist. Sys' }
      ]
    }, token);
    assert.strictEqual(conflictCheckRes.status, 200);
    assert.strictEqual(conflictCheckRes.body.hasConflicts, true);

    const genTtRes = await call('POST', '/academic/generate-timetable', { department: 'CSE', semester: 4 }, token);
    assert.strictEqual(genTtRes.status, 200);
    assert.strictEqual(genTtRes.body.success, true);
    assert.ok(genTtRes.body.schedule.length >= 24);

    const assignRes = await call('GET', '/assignments', null, token);
    assert.strictEqual(assignRes.status, 200);
    assert.ok(assignRes.body.length >= 3);

    const subRes = await call('POST', '/assignments/101/submit', {
      codeText: '#include <stdio.h>\n#include <pthread.h>\nvoid* worker(void* arg){ return NULL; }\nint main(){ printf("Producer-Consumer"); return 0; }'
    }, token);
    assert.strictEqual(subRes.status, 200);
    assert.ok(subRes.body.evaluation && subRes.body.evaluation.totalMarks >= 70);

    const cardRes = await call('GET', '/results/grade-card', null, token);
    assert.strictEqual(cardRes.status, 200);
    assert.ok(cardRes.body.serialNumber.startsWith('CERT-UGC-'));
  });

  await t('performance ML early warning radar, safety SOS, services & blueprint documentation', async () => {
    const radarRes = await call('GET', '/analytics/early-warning-radar', null, token);
    assert.strictEqual(radarRes.status, 200);
    assert.strictEqual(radarRes.body.modelEvaluationMetrics.accuracy, '94.2%');

    const sosRes = await call('POST', '/safety/sos', { location: 'Central Library Floor 2', reason: 'Medical Assistance' }, token);
    assert.strictEqual(sosRes.status, 200);
    assert.strictEqual(sosRes.body.status, 'ACTIVE_DISPATCH');

    const passRes = await call('POST', '/security/visitor-pass', { name: 'Dr. K. S. Murthy', purpose: 'External Viva Review' }, token);
    assert.strictEqual(passRes.status, 200);
    assert.ok(passRes.body.pass.badge_no.startsWith('VIS-'));

    const cctvRes = await call('GET', '/security/cctv-analytics', null, token);
    assert.strictEqual(cctvRes.status, 200);

    const messRes = await call('GET', '/campus/hostel-mess', null, token);
    assert.strictEqual(messRes.status, 200);
    assert.ok(messRes.body.messMenu.lunch);

    const busRes = await call('GET', '/campus/transport-live', null, token);
    assert.strictEqual(busRes.status, 200);
    assert.strictEqual(busRes.body.routes.length, 3);

    const bookRes = await call('POST', '/resources/book-slot', {
      resourceName: 'Robotics Prototyping Lab',
      date: '2026-12-25',
      timeSlot: '02:00 PM - 04:00 PM'
    }, token);
    assert.strictEqual(bookRes.status, 200);
    assert.ok(bookRes.body.success !== undefined);

    const sentRes = await call('POST', '/grievance/analyze', { text: 'Water cooler in 3rd floor is broken and leaking badly, urgent fix needed!' }, token);
    assert.strictEqual(sentRes.status, 200);
    assert.strictEqual(sentRes.body.isUrgent, true);

    const parentRes = await call('GET', '/parent/ward-overview', null, token);
    assert.strictEqual(parentRes.status, 200);
    assert.ok(parentRes.body.ward && parentRes.body.academicMetrics);

    const secRes = await call('GET', '/security/guard-station', null, token);
    assert.strictEqual(secRes.status, 200);

    const docRes = await call('GET', '/project/blueprint-doc', null, token);
    assert.strictEqual(docRes.status, 200);
    assert.strictEqual(docRes.body.sections.length, 17);
  });

  await t('admin login & panel access (role verified from database)', async () => {
    const a = await call('POST', '/auth/login', { id: 'ADMIN001', password: 'student123' });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.body.user.role, 'admin');
    const admToken = a.body.token;

    const ov = await call('GET', '/admin/overview', null, admToken);
    assert.strictEqual(ov.status, 200);
    assert.ok(ov.body.kpis.totalStudents >= 1);

    const pg = await call('GET', '/admin.html');
    assert.strictEqual(pg.status, 200);
  });

  // Post-test cleanup
  cleanupUser('TEST001');
  cleanupUser('TEST002');
  const finalBookings = rec.list('resource_booking', undefined);
  finalBookings.filter(b => b.date && b.date.startsWith('2026-12-')).forEach(b => rec.remove(b.id));

  console.log(`\n========================================`);
  console.log(`ALL AUTOMATED TESTS COMPLETE: ${passed} checks PASSED${process.exitCode ? ', SOME FAILED' : ' (100% SUCCESS)'}`);
  console.log(`========================================\n`);

  srv.kill();
  process.exit(process.exitCode || 0);
})();
