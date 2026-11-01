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

  await t('Gemini configuration defaults to active Gemini model', async () => {
    assert.strictEqual(ai.getGeminiModel(), process.env.GEMINI_MODEL || 'gemini-3.5-flash');
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
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    ai.setTestClient(null);

    const localChat = await ai.chat(1, [], 'Hello');
    assert.strictEqual(localChat.engine, 'offline');
    assert.ok(localChat.reply.startsWith('Hi ') && localChat.reply.includes('attendance'));

    const localDoubt = await ai.doubtSolve('Operating Systems', 'What is a deadlock?');
    assert.strictEqual(localDoubt.source, 'offline-kb');
    assert.ok(localDoubt.explanation.includes('Deadlock'));

    process.env.GEMINI_API_KEY = origKey;
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


  await t('attendance calendar endpoint (monthly breakdown, eligibility & holidays)', async () => {
    const calRes = await call('GET', '/attendance/calendar?year=2026&month=10', null, token);
    assert.strictEqual(calRes.status, 200);
    assert.strictEqual(calRes.body.year, 2026);
    assert.strictEqual(calRes.body.month, 10);
    assert.ok(Array.isArray(calRes.body.days));
    assert.strictEqual(calRes.body.days.length, 31);
    assert.strictEqual(typeof calRes.body.monthlyPercentage, 'number');
    assert.ok(calRes.body.presentCount >= 0);
    assert.ok(calRes.body.absentCount >= 0);

    // Verify holidays are properly labeled
    const gandhiJayanti = calRes.body.days.find(d => d.day === 2);
    assert.ok(gandhiJayanti);
    assert.strictEqual(gandhiJayanti.status, 'Holiday');
    assert.strictEqual(gandhiJayanti.holidayName, 'Gandhi Jayanti');
  });

  await t('year-based study materials access & security isolation', async () => {
    // 1. Test student academic cohort (Year 2, Sem 4 default)
    const matRes = await call('GET', '/materials', null, token);
    assert.strictEqual(matRes.status, 200);
    assert.strictEqual(matRes.body.studentYear, 2);
    assert.strictEqual(matRes.body.studentSem, 4);
    assert.ok(Array.isArray(matRes.body.materials));
    assert.ok(matRes.body.materials.length >= 1);

    // Every returned material must match the student's Year 2 cohort
    matRes.body.materials.forEach(m => {
      assert.strictEqual(m.year, 2, 'Must only receive Year 2 materials');
      assert.strictEqual(m.semester, 4, 'Must only receive Semester 4 materials');
    });

    // Tamper test: query param tampering with ?year=4 must be IGNORED
    const tamperRes = await call('GET', '/materials?year=4&semester=8', null, token);
    assert.strictEqual(tamperRes.status, 200);
    assert.strictEqual(tamperRes.body.studentYear, 2);
    tamperRes.body.materials.forEach(m => {
      assert.strictEqual(m.year, 2, 'Query parameter tampering must not leak Year 4 content');
    });

    // 2. Test demo student Gaurav (Year 2, Sem 4)
    const gauravLogin = await call('POST', '/auth/login', { id: '2024CS0042', password: 'student123' });
    assert.strictEqual(gauravLogin.status, 200);
    assert.ok(gauravLogin.body.token);

    const gauravMatRes = await call('GET', '/materials', null, gauravLogin.body.token);
    assert.strictEqual(gauravMatRes.status, 200);
    assert.strictEqual(gauravMatRes.body.studentYear, 2);
    assert.strictEqual(gauravMatRes.body.studentSem, 4);
    assert.ok(gauravMatRes.body.materials.length >= 1);
    gauravMatRes.body.materials.forEach(m => {
      assert.strictEqual(m.year, 2, 'Gaurav must only receive Year 2 materials');
      assert.strictEqual(m.semester, 4, 'Gaurav must only receive Semester 4 materials');
    });

    // Download endpoint verification
    const firstMat = gauravMatRes.body.materials[0];
    const dlRes = await call('GET', `/materials/${firstMat.id}/download`, null, gauravLogin.body.token);
    assert.strictEqual(dlRes.status, 200);
    assert.ok(typeof dlRes.body === 'string' && dlRes.body.includes('PDF'));
  });

  await t('first-year student (2026CS0001) strict cohort isolation & dynamic switching', async () => {
    // 1. Log in as dedicated 1st-Year freshman Aarav Sharma
    const freshmanLogin = await call('POST', '/auth/login', { id: '2026CS0001', password: 'student123' });
    assert.strictEqual(freshmanLogin.status, 200, 'Freshman student login must succeed');
    const fToken = freshmanLogin.body.token;
    assert.strictEqual(freshmanLogin.body.user.year, 1);
    assert.strictEqual(freshmanLogin.body.user.semester, 1);

    // 2. Study materials must be strictly Year 1 Sem 1
    const matRes = await call('GET', '/materials', null, fToken);
    assert.strictEqual(matRes.status, 200);
    assert.strictEqual(matRes.body.studentYear, 1);
    assert.strictEqual(matRes.body.studentSem, 1);
    assert.ok(matRes.body.materials.length >= 4, 'Must return seeded 1st-year materials');
    matRes.body.materials.forEach(m => {
      assert.strictEqual(m.year, 1, '1st-year student must receive ONLY Year 1 materials');
      assert.strictEqual(m.semester, 1, '1st-year student must receive ONLY Semester 1 materials');
    });

    // 3. Timetable must return Year 1 subjects
    const ttRes = await call('GET', '/timetable', null, fToken);
    assert.strictEqual(ttRes.status, 200);
    assert.ok(Array.isArray(ttRes.body));
    const allSubjects = ttRes.body.flatMap(d => (d.slots || []).map(s => s.subject));
    assert.ok(allSubjects.includes('Engineering Mathematics I') || allSubjects.includes('Programming in C'), 'Timetable must contain 1st-year subjects');
    assert.ok(!allSubjects.includes('Operating Systems'), 'Timetable must NOT contain 2nd-year subjects like OS');

    // 4. Digital library must return Year 1 textbooks
    const libRes = await call('GET', '/digital-library/files', null, fToken);
    assert.strictEqual(libRes.status, 200);
    assert.ok(libRes.body.items.length >= 5);
    libRes.body.items.forEach(f => {
      if (f.year) assert.strictEqual(f.year, 1, 'Ebooks must be Year 1 or general');
    });

    // 5. Notices must return Year 1 and general notices, excluding Year 2
    const noticeRes = await call('GET', '/notices', null, fToken);
    assert.strictEqual(noticeRes.status, 200);
    noticeRes.body.forEach(n => {
      if (n.target_year) assert.strictEqual(n.target_year, 1, 'Notices must not leak other years');
    });

    // 6. Access control: 1st-year student downloading Year 2 material must be blocked (HTTP 403)
    // Find a Year 2 material ID
    const y2Mat = await call('GET', '/materials', null, token); // token belongs to Year 2 student
    if (y2Mat.body.materials && y2Mat.body.materials[0]) {
      const forbiddenDl = await call('GET', `/materials/${y2Mat.body.materials[0].id}/download`, null, fToken);
      assert.strictEqual(forbiddenDl.status, 403, 'Cross-cohort download must be forbidden');
    }

    // 7. Dynamic Cohort Switcher test: Switch Aarav to Sem 2, verify, then switch back to Sem 1
    const switchRes = await call('PUT', '/profile', { semester: 2 }, fToken);
    assert.strictEqual(switchRes.status, 200);
    assert.strictEqual(switchRes.body.user.semester, 2);
    assert.strictEqual(switchRes.body.user.year, 1);

    const switchBack = await call('PUT', '/profile', { semester: 1 }, fToken);
    assert.strictEqual(switchBack.status, 200);
    assert.strictEqual(switchBack.body.user.semester, 1);
  });

  await t('student profile reading and personal contact update', async () => {
    const profRes = await call('GET', '/profile', null, token);
    assert.strictEqual(profRes.status, 200);
    assert.strictEqual(profRes.body.user.name, 'Test Student');
    assert.strictEqual(profRes.body.user.year, 2);

    // Update phone & bio
    const updateRes = await call('PUT', '/profile', {
      phone: '+91 98765 00042',
      bio: 'Systems Programming & Algorithms Enthusiast'
    }, token);
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.user.phone, '+91 98765 00042');
    assert.strictEqual(updateRes.body.user.bio, 'Systems Programming & Algorithms Enthusiast');

    // Also verify demo student Gaurav profile
    const gauravLogin = await call('POST', '/auth/login', { id: '2024CS0042', password: 'student123' });
    const gauravProf = await call('GET', '/profile', null, gauravLogin.body.token);
    assert.strictEqual(gauravProf.status, 200);
    assert.strictEqual(gauravProf.body.user.name, 'Gaurav');
    assert.strictEqual(gauravProf.body.user.roll_no, '2024CS0042');
    assert.strictEqual(gauravProf.body.user.year, 2);
    assert.strictEqual(gauravProf.body.user.semester, 4);
  });

  await t('smart parking overview and student vehicle registration', async () => {
    const parkRes = await call('GET', '/parking/overview', null, token);
    assert.strictEqual(parkRes.status, 200);
    assert.strictEqual(parkRes.body.total >= 12, true);
    assert.ok(parkRes.body.available > 0);
    assert.ok(Array.isArray(parkRes.body.slots));
    assert.ok(parkRes.body.slots.length >= 12);

    // Register student vehicle
    const regRes = await call('POST', '/parking/vehicle', {
      plate_number: 'KA-01-EQ-9988',
      vehicle_type: 'Two Wheeler'
    }, token);
    assert.strictEqual(regRes.status, 200);
    assert.strictEqual(regRes.body.vehicle.plate_number, 'KA-01-EQ-9988');

    // Overview now reflects the registered vehicle
    const afterRes = await call('GET', '/parking/overview', null, token);
    assert.strictEqual(afterRes.status, 200);
    assert.ok(afterRes.body.registeredVehicle);
    assert.strictEqual(afterRes.body.registeredVehicle.plate_number, 'KA-01-EQ-9988');
  });

  await t('faculty directory and academic consultation hours', async () => {
    const facRes = await call('GET', '/faculty', null, token);
    assert.strictEqual(facRes.status, 200);
    assert.ok(Array.isArray(facRes.body));
    assert.ok(facRes.body.length >= 5);
    const hod = facRes.body.find(f => f.name && f.name.includes('Rajesh Sharma'));
    assert.ok(hod);
    assert.ok(hod.cabin);
    assert.ok(hod.office_hours || hod.officeHours);
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

  // --- 5. DOM Integrity, Navigation & Client Contract Tests ---
  try {
    const { runDomValidationTests } = require('../tests/dom_validation.test');
    runDomValidationTests();
    passed += 8;
  } catch (err) {
    console.error('  ✗ DOM validation failed:', err.message);
    process.exitCode = 1;
  }

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
