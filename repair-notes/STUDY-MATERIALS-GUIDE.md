# Smart Campus — Study Materials Management & Cohort Personalisation Guide

> **Branch:** `feat/student-portal-refinements`
> **Endpoints:** `/api/materials`, `/api/admin/materials`

---

## 1. Overview & Architecture

Smart Campus enforces strict **Academic Year & Semester cohort isolation** for study materials. When a student logs in, they only receive materials published for their actual academic year and enrolled semester.

### Security Guarantees
1. **Server-Side Authorization**: Student identity is derived exclusively from verified JWT (`req.user.id`, `req.user.year`, `req.user.semester`).
2. **Tamper Prevention**: Query parameter tampering (e.g. `GET /api/materials?year=4`) is completely ignored by the server. The database query strictly binds `WHERE sm.year = ? AND sm.semester = ?` using the authenticated user's database values.
3. **Secure Downloads**: `GET /api/materials/:id/download` verifies that the requested resource matches the student's cohort. If a student attempts to download a Year 4 final paper while enrolled in Year 2, the server halts with `HTTP 403 Forbidden`.

---

## 2. Admin Cascading Upload Workflow

The Admin Console (`public/admin.html`, `#digital-library`) provides an intuitive, step-by-step cascading upload interface:

1. **Step 1 — Department Selection**:
   - Computer Science & Engineering
   - Information Technology
   - Electronics & Communication
   - Mechanical Engineering
2. **Step 2 — Academic Year Selection**:
   - Year 1, Year 2, Year 3, or Year 4.
3. **Step 3 — Semester Selection**:
   - Automatically filters available semesters based on the selected year (e.g. Year 2 provides Semester 3 & 4).
4. **Step 4 — Subject Selection**:
   - Dynamically loads official syllabus subjects matching the chosen Department and Semester.
5. **Step 5 — Material Type Selection**:
   - Lecture Notes
   - Previous Question Paper
   - Assignment / Problem Set
   - Reference Guide / Textbook
   - Lab Manual
6. **Step 6 — Document Details & File Upload**:
   - Document Title (required)
   - Description / Summary (optional)
   - PDF/Doc upload (enforced 20MB limit with MIME check)
7. **Step 7 — Instant Publication**:
   - Form posts via `multipart/form-data` to `POST /api/admin/materials`.
   - File metadata is persisted in `study_materials` table and immediately available in the Admin Repository view and student portal.

---

## 3. Student Portal Experience (`#learning`)

The student view (`public/index.html`, `#learning`):
- Displays the student's current cohort header: `Year 2 · Semester 4 · Computer Science & Engineering (Enrolled Cohort)`.
- Dynamic Subject Filter Pills: Enables one-click filtering by subject (e.g. *Design & Analysis of Algorithms*, *Operating Systems*).
- Live Search: Instant client-side search across title, subject, and description.
- Direct Download: Clickable download button routing through authenticated PDF generator.
- Clean Empty State: Clear visual feedback when a subject currently has no uploaded materials.
- Read-Only Security: Students never see administrative upload, edit, or delete actions.
