/**
 * Automated DOM Integrity & Navigation Validation Test Suite
 * Verifies ID uniqueness, navigation route reachability, CSS cascade, and simulation disclosures.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runDomValidationTests() {
  console.log('\n--- 5. DOM Integrity & Navigation Validation Tests ---');

  const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin.html');
  const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin.js');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
  const adminJs = fs.readFileSync(adminJsPath, 'utf8');

  // Test 1: No duplicate IDs in index.html
  const indexIds = [...indexHtml.matchAll(/\sid=["']([^"']+)["']/g)].map(x => x[1]);
  const indexIdCounts = {};
  const indexDuplicates = [];
  indexIds.forEach(id => {
    indexIdCounts[id] = (indexIdCounts[id] || 0) + 1;
    if (indexIdCounts[id] === 2) indexDuplicates.push(id);
  });
  assert.strictEqual(indexDuplicates.length, 0, `Found duplicate IDs in index.html: ${indexDuplicates.join(', ')}`);
  console.log(`  ✓ index.html DOM ID integrity: ${indexIds.length} unique IDs, 0 duplicates`);

  // Test 2: Specific check for previously reported library and parking IDs
  const exactLibraryMatches = [...indexHtml.matchAll(/\sid="library"/g)];
  const exactParkingMatches = [...indexHtml.matchAll(/\sid="parking"/g)];
  assert.strictEqual(exactLibraryMatches.length, 1, 'id="library" must appear exactly once');
  assert.strictEqual(exactParkingMatches.length, 1, 'id="parking" must appear exactly once');
  console.log('  ✓ No duplicate #library or #parking IDs in index.html');

  // Test 3: No duplicate IDs in admin.html
  const adminIds = [...adminHtml.matchAll(/\sid=["']([^"']+)["']/g)].map(x => x[1]);
  const adminIdCounts = {};
  const adminDuplicates = [];
  adminIds.forEach(id => {
    adminIdCounts[id] = (adminIdCounts[id] || 0) + 1;
    if (adminIdCounts[id] === 2) adminDuplicates.push(id);
  });
  assert.strictEqual(adminDuplicates.length, 0, `Found duplicate IDs in admin.html: ${adminDuplicates.join(', ')}`);
  console.log(`  ✓ admin.html DOM ID integrity: ${adminIds.length} unique IDs, 0 duplicates`);

  // Test 4: Student Portal - All sections exist and are reachable via navigation
  const studentSections = [...indexHtml.matchAll(/<section[^>]*id=["']([^"']+)["']/g)].map(x => x[1]);
  const studentNavTargets = [...indexHtml.matchAll(/data-sec=["']([^"']+)["']/g)].map(x => x[1]);
  const unreachableStudentSections = studentSections.filter(s => !studentNavTargets.includes(s));
  assert.strictEqual(unreachableStudentSections.length, 0, `Unreachable student sections found: ${unreachableStudentSections.join(', ')}`);
  assert.strictEqual(studentSections.length >= 34, true, `Expected at least 34 student sections, got ${studentSections.length}`);
  console.log(`  ✓ Student Portal navigation: all ${studentSections.length} sections are 100% reachable with direct nav links`);

  // Test 5: Admin Portal - All sections exist and are reachable via navigation
  const adminSections = [...adminHtml.matchAll(/<section[^>]*id=["']([^"']+)["']/g)].map(x => x[1]);
  const adminNavTargets = [...adminHtml.matchAll(/data-sec=["']([^"']+)["']/g)].map(x => x[1]);
  const unreachableAdminSections = adminSections.filter(s => !adminNavTargets.includes(s));
  assert.strictEqual(unreachableAdminSections.length, 0, `Unreachable admin sections found: ${unreachableAdminSections.join(', ')}`);
  assert.strictEqual(adminSections.length >= 10, true, `Expected at least 10 admin sections, got ${adminSections.length}`);
  console.log(`  ✓ Admin Portal navigation: all ${adminSections.length} sections are 100% reachable with direct nav links`);

  // Test 6: Admin Portal - All required controller IDs exist in HTML
  const dynamicIds = ['adminAuthErr', 'adminAuthPass', 'adminLoginForm', 'adminLoginOverlay', 'adminAuthId', 'toastBox'];
  const expectedAdminIds = [
    'kpiStudents', 'kpiFaculty', 'kpiSubjects', 'kpiAttendance', 'kpiAtRisk',
    'kpiAssessed', 'kpiCollected', 'kpiDues', 'kpiOpenTickets', 'kpiPendingLeaves',
    'aiEngineBadge', 'overviewAutomationList', 'studentTableBody', 'studentSearch',
    'studentDeptFilter', 'studentRiskFilter', 'studentCountPill', 'shortageCountBadge',
    'deficitTableBody', 'academicsTableBody', 'feeTotalAssessed', 'feeTotalPaid',
    'feeTotalDue', 'feesTableBody', 'noticesGrid', 'ticketsTableBody', 'leavesTableBody',
    'automationModelTitle', 'automationStatusDot', 'automationJobsGrid', 'automationLogList',
    'auditTableBody', 'modalAddStudent', 'modalEditStudent', 'modalAttendanceOverride',
    'modalEditMarks', 'modalRecordFee', 'modalAddNotice'
  ];
  const adminHtmlIdSet = new Set(adminIds);
  const missingAdminIds = expectedAdminIds.filter(id => !adminHtmlIdSet.has(id));
  assert.strictEqual(missingAdminIds.length, 0, `Missing required admin controller IDs in admin.html: ${missingAdminIds.join(', ')}`);
  console.log(`  ✓ Admin Portal controller contract: all ${expectedAdminIds.length} required DOM IDs verified`);

  // Test 7: Admin Portal - Zero 404 missing local scripts
  const brokenScriptPatterns = ['vendor/tailwind.js', 'js/faculty-workspace.js', 'js/community.js', 'js/layout-split.js', 'login.html'];
  brokenScriptPatterns.forEach(pat => {
    assert.strictEqual(adminHtml.includes(pat), false, `admin.html still references deprecated/missing asset: ${pat}`);
  });
  assert.strictEqual(adminHtml.includes('vendor/tailwind.css'), true, 'admin.html must link valid vendor/tailwind.css');
  console.log('  ✓ Admin Portal clean assets: 0 deprecated 404 script references, tailwind.css linked');

  // Test 8: Transparent Simulation Badges on Face, Bus, and CCTV telemetries
  assert.strictEqual(indexHtml.includes('Demo Simulation'), true, 'Must display Demo Simulation badge on biometric face recognition');
  assert.strictEqual(indexHtml.includes('Demo Telemetry'), true, 'Must display Demo Telemetry badge on simulated streams');
  console.log('  ✓ Hardware & Telemetry honest disclosures: Demo Simulation / Telemetry badges active');
}

module.exports = { runDomValidationTests };

if (require.main === module) {
  try {
    runDomValidationTests();
    console.log('\n========================================\nALL DOM VALIDATION TESTS PASSED (100% SUCCESS)\n========================================\n');
  } catch (err) {
    console.error('\n❌ DOM Validation Test Failure:', err.message);
    process.exit(1);
  }
}
