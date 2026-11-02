# AI Smart Campus — Comprehensive Repair Implementation Plan

**Branch:** `fix/security-gemini-professional-upgrade`  
**Starting Commit:** `e925206`  
**Date:** 2026-10-31  

---

## Milestone 1: Admin Entry, Login Flow & Missing Asset Cleanup
- **Findings Addressed:** BUG-001 (404 redirect to nonexistent `login.html`), BUG-002 (Missing local scripts `vendor/tailwind.js`, `js/faculty-workspace.js`, `js/community.js`, `js/layout-split.js`).
- **Files Affected:** `public/admin.html`.
- **Planned Work:**
  1. In `public/admin.html`, replace unauthenticated redirect (`window.location.href = 'login.html'`) with in-page admin login modal display (`showAdminLoginModal()`).
  2. Remove 404 `<script>` tags for nonexistent files. Verify `public/vendor/tailwind.css` is cleanly linked in the `<head>`.
  3. Ensure token verification happens securely via `/api/admin/verify` or `/api/dashboard`, clearing localStorage and showing login prompt if invalid or role is not admin/faculty.
- **Completion Criteria:** Visiting `/admin` or `/admin.html` in an unauthenticated or expired state presents the clean admin login modal with zero 404 asset network errors in the browser console.

---

## Milestone 2: Admin Portal DOM Reconstruction & Controller Reconnection
- **Findings Addressed:** BUG-003 (`public/js/admin.js` controller disconnected from DOM; 70 missing IDs; conflicting inline `showSection`), BUG-004 (18 broken inline click handlers).
- **Files Affected:** `public/admin.html`, `public/js/admin.js`.
- **Planned Work:**
  1. Remove conflicting inline `showSection` in `admin.html` and route navigation through the authoritative `public/js/admin.js`.
  2. Structure admin sections matching administrative departments:
     - **Overview:** Executive KPIs (`#kpiStudents`, `#kpiAttendance`, `#kpiDues`, `#kpiTickets`), Quick Actions, System Status.
     - **Academic Administration:** Students Directory, Attendance Records & Overrides (`#attendanceRecordsTable`), Marks & Exam Management (`#marksGrid`), Timetable & Syllabus.
     - **Institutional Finance:** Fee Ledger & Dues (`#feesLedgerTable`), Offline Collections, Receipts.
     - **Operations & Support:** Campus Notices Publisher (`#adminNoticesList`), Helpdesk Tickets Triage (`#ticketsTable`), Staff & Student Leave Review (`#leaveRequestsTable`).
     - **System & Security:** Background Automation Runner (`#automationJobHistory`), System Audit Trail (`#auditLogTable`), Security Monitor.
  3. Reconnect all 18 broken click handlers (`openFacultyWorkspacePicker`, `resetFilters`, `toggleChatbot`, etc.) to working modal/filter actions or safely remove dead inline handlers.
- **Completion Criteria:** All admin sections load live backend data, support record actions (overrides, marks, fees, leaves, tickets, notices), and display loading, empty, and success states.

---

## Milestone 3: Student Portal Unified Navigation & Exposure of 11 Stranded Features
- **Findings Addressed:** BUG-005 (11 stranded features in DOM with 0 navigation links), BUG-006 (Dual navigation rail conflict and active highlight failure).
- **Files Affected:** `public/index.html`, `public/js/student.js`.
- **Planned Work:**
  1. Unify topbar and sidebar into a single cohesive sidebar navigation with clear categories:
     - **Overview:** Dashboard.
     - **Academics & Learning:** Attendance Hub, Marks & CIA, Timetable, Exam Schedule, Syllabus, Academic Calendar, Digital Library, Study Materials, Certificates.
     - **AI Assistance:** AI Campus Advisor, AI Doubt Solver, AI Study Planner.
     - **Student Services:** Fee Status & Ledger, Health & Wellness, Cafeteria & Store, Finance / Wallet, Hostel & Mess, Campus Map, Parking, Safety SOS.
     - **Career & Development:** Projects & Milestones, Placements, Resume Builder, CGPA Predictor.
     - **Campus Community:** Discussion Forum, Social Feed, Faculty Directory, Leaderboard, Webinars & Streaming.
     - **Account:** Profile, Settings, Logout.
  2. Add explicit navigation links for the 11 stranded sections (`#leaderboard`, `#faculty`, `#social-feed`, `#forum`, `#cgpa`, `#resume`, `#cafeteria`, `#health`, `#finance`, `#streaming`, `#exam-schedule`).
  3. Fix `student.js:152` selector so `.sidebar-item` active classes update reliably on desktop, tablet, and mobile drawers.
  4. Ensure mobile drawer closes automatically upon selecting a link.
- **Completion Criteria:** Every single student feature in the system is directly reachable via the unified navigation menu, with correct active state highlighting.

---

## Milestone 4: DOM Integrity, Duplicate ID Elimination & Controller Target Alignment
- **Findings Addressed:** BUG-007 (Duplicate IDs `#library`, `#parking`), BUG-009 (Dead selector references in `features.js`).
- **Files Affected:** `public/index.html`, `public/js/features.js`.
- **Planned Work:**
  1. Rename navigation anchor IDs: `#library` -> `#nav-library`, `#parking` -> `#nav-parking`.
  2. In `public/js/features.js`, update AI Assistant feature loader to bind directly to the active AI modal (`#kernelCommanderModal` or `#ai-assistant`), avoiding query errors on nonexistent `#aiChatMessages` / `#aiChatInput`.
  3. Validate all Chart.js canvas targets (`#attendanceChart`, `#gpaChart`, `#kpiAttendanceChart`, etc.).
- **Completion Criteria:** 0 duplicate IDs in the DOM; 0 console errors when executing feature loaders.

---

## Milestone 5: Visual Polish, Responsive Ordering & Accessibility Standards
- **Findings Addressed:** BUG-008 (Inverted media query order in `index.html`), UI consistency.
- **Files Affected:** `public/index.html`, `public/admin.html`, `public/vendor/tailwind.css`.
- **Planned Work:**
  1. Correct CSS media query declaration order (largest breakpoint first: 1024px before 900px).
  2. Add `aria-label` to all icon-only buttons, search inputs, and modal controls.
  3. Add `role="dialog"` and `aria-modal="true"` to modals with focus management and Escape key close.
  4. Build Tailwind CSS and verify clean presentation across mobile, tablet, and desktop viewports.
- **Completion Criteria:** Seamless responsive layouts at 390px, 768px, 1024px, and 1440px viewports without horizontal clipping or broken layouts.

---

## Milestone 6: Honest Integration Disclosure (Simulation Badges) & AI Boundaries
- **Findings Addressed:** BUG-010 (Simulation transparency).
- **Files Affected:** `public/index.html`, `public/admin.html`, `public/js/`.
- **Planned Work:**
  1. Add visible, styled "Demo Simulation" pill badges to Face Recognition, CCTV crowd monitoring, Bus GPS tracking, and IoT Resource Map.
  2. Clearly distinguish simulated telemetry from actual SQLite database persistence.
  3. Verify Google Gemini API active model and offline tutor fallback indicators.
- **Completion Criteria:** All simulated sensors and demo hardware workflows are explicitly labelled in the UI.

---

## Milestone 7: Automated Tests, DOM Validation & Full Regression Verification
- **Findings Addressed:** Comprehensive QA and security verification.
- **Files Affected:** `tests/dom_validation.test.js`, `server/selftest.js`.
- **Planned Work:**
  1. Create an automated DOM validation test script verifying:
     - No duplicate element IDs.
     - All navigation links resolve to existing DOM sections.
     - Required DOM containers exist for all controller scripts.
  2. Run `npm test` and verify all 37+ tests pass.
- **Completion Criteria:** All automated tests pass with 100% success rate.

---

## Milestone 8: Documentation, Change Control & Self-Review Loop
- **Findings Addressed:** Complete documentation, release readiness, and git hygiene.
- **Files Affected:** `README.md`, `repair-notes/FEATURE_TEST_MATRIX.md`, `repair-notes/REPAIR_LOG.md`, `repair-notes/FINAL_VERIFICATION.md`.
- **Planned Work:**
  1. Update `README.md` with repaired architecture, navigation map, and setup guides.
  2. Compile `FEATURE_TEST_MATRIX.md`, `REPAIR_LOG.md`, and `FINAL_VERIFICATION.md`.
  3. Review full `git diff`, commit semantic changes, push to branch, and update PR #2.
