# Smart Campus — Student Portal Feature Refinement & Cleanup Plan

> **Branch:** `feat/student-portal-refinements`
> **Base Commit:** `7d49e02`
> **Visual Identity:** Charcoal Grey `#2A2A2A`, Moonlit Silver `#C0C0C0`, Signal Red `#E10600`
> **Database:** SQLite (`data/campus.db`) backed up to `data/campus.db.bak`

---

## 1. Objectives & Task Breakdown

### A. Core Feature Additions & Enhancements
- [x] **M1: Attendance Calendar in Attendance Hub**
  - Integrated interactive monthly calendar into `#attendance-hub`.
  - Displays overall %, subject summary, eligibility criteria, and daily status (Present, Absent, Holiday, Future/No Record).
  - Added month navigation (Prev, Next, Today).
  - Backed by real authenticated student attendance from database (`/api/attendance/calendar`).

- [x] **M2: Academic Year-Based Personalisation**
  - Derived academic year (Year 1 to 4) directly from canonical student database attributes (`year` / `semester`).
  - Filtered curriculum subjects, study materials, timetable, and notices at both API (`/api/academics/subjects`, `/api/materials`) and frontend layers.
  - Enforced server-side RBAC: students cannot spoof year query parameters to access higher-year materials.

- [x] **M3: Admin Study Materials Management**
  - Added "Study Materials" management subsystem to `public/admin.html` (`#digital-library`).
  - Cascading upload form: Department -> Academic Year (1-4) -> Semester (1-8) -> Subject -> Type -> File.
  - Endpoints: `POST /api/admin/materials`, `DELETE /api/admin/materials/:id`, `GET /api/materials`.
  - Student portal: Dedicated "Study Materials" view (`#learning`) with subject grouping, preview, and download.

- [x] **M4: Student Profile Page**
  - Added dedicated `#profile` section and header/avatar route.
  - Displays basic details (Name, Roll No, Email, Department, Academic Year, Semester).
  - Academic snapshot (enrolled subjects, overall attendance %, CGPA).
  - Editable personal fields (phone, contact email) with server-side validation.
  - Logout and session controls.

- [x] **M5: Safe Deterministic Demo Data & Demo Student "Gaurav"**
  - Seeded realistic demo student: Display name **Gaurav**, roll number `2024CS0042`.
  - Enrolled in Year 2 (Sem 4) Computer Science & Engineering.
  - Plausible attendance history across 45 days, marks, timetable, study tasks.
  - **No developer claims**: Gaurav is strictly a sample student.
  - Idempotent upserts in `server/seed.js`.

- [x] **M6: Fix AI Study Planner API, Bot & Contrast**
  - Provider selection: Google Gemini first when active/valid; offline planner bot fallback when unavailable.
  - Input validation, task persistence to `planner_tasks` table.
  - Fixed task-name contrast in `.planner-white-dashboard` and dark cards to ensure high legibility (`.planner-task-title`).

- [x] **M7: Left Sidebar Scrolling & Navigation Cleanup**
  - Set independent vertical scrolling on middle navigation area (`flex: 1 1 auto; overflow-y: auto`).
  - Fixed brand header and user footer (`height: 100vh; overflow: hidden`).
  - Renamed sidebar label “AI Campus Helpdesk” to “Campus Helpdesk” only.

- [x] **M8: Improve Smart Parking, Placements & Faculty Directory**
  - Smart Parking: Clear overview, slot grid with honest simulation indicator, student vehicle registration scoped to authenticated user (`/api/parking/overview`, `/api/parking/vehicle`).
  - Placements: Clean job cards, application tracking, server-side duplicate prevention.
  - Faculty Directory: Search by name, department filter, cabin/office hours, official contact only.

### B. Feature & Header Removals (Strict Student Scope)
- [x] **M9: Remove Deprecated Features & Top Bar Clutter**
  - Removed from student navigation & UI:
    - Smart Exam Schedule (`#exam-schedule`)
    - Certificates (`#certificates`) & Hall Ticket
    - AI Engine Kernel Core / Kernel Commander (`#kernelCommanderModal`, `Ctrl+K` button)
    - Health & Medical Records (`#health`)
    - Campus Wallet / Finance (`#finance`)
    - Hostel & Campus Help (`#campus`)
    - Resume Builder (`#resume`)
    - CGPA Predictor (`#cgpa`)
    - Discussion Forum (`#forum`)
    - Campus Buzz / Social Feed (`#social-feed`)
    - Webinars / Live Events / Streaming (`#streaming`)
    - Project Blueprint (header button, modal `#projectBlueprintModal`)
  - Removed header action controls:
    - Project Blueprint button
    - "STUDENT" role switcher dropdown (`#roleSwitcherBtn`, `#roleSwitcherDropdown`)
    - "AI Engine Kernel" button and Ctrl+K key listener

---

## 2. Verification & Acceptance Criteria
- [x] All 50 automated tests pass with 100% success rate (`npm test`).
- [x] DOM integrity: 0 duplicate IDs, all 25 canonical retained sections 100% reachable.
- [x] Build assets compile cleanly (`npm run build:css` in 1.7s).
- [x] Visual consistency with Charcoal Grey `#2A2A2A`, Moonlit Silver `#C0C0C0`, Signal Red `#E10600`.
- [x] Comprehensive documentation in `repair-notes/`.
