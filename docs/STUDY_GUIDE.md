# CornerStone ERP — Study Guide

Everything used to build this project, organized by layer. Read top to bottom for the
full picture, or jump to a section when you need a specific answer.

---

## 1. The big picture

A full **College ERP** that runs 100% offline on your machine — three moving pieces:

```
start.bat
 ├─ Backend    Flask API + Socket.IO        → http://localhost:5000
 ├─ Frontend   static file server           → http://localhost:3000
 └─ Database   single SQLite file           → backend/student_system.db
```

- **Backend**: Python 3.13. One large `app.py` (~10,000 lines) plus 16 feature modules in
  `backend/routes/` registered as Flask **Blueprints** under the `/api` prefix.
  ~203 route handlers in total.
- **Frontend**: plain HTML/CSS/JS — no build step, no bundler, no npm. Each portal is a
  single HTML file with a vanilla-JS controller in `frontend/js/`.
- **Database**: one SQLite file (`backend/student_system.db`) with **116 tables**, seeded
  with demo data (`seed_data.py`).
- **7 demo accounts** across **4 portals**, plus the shared **Campus Connect** page.

---

## 2. Backend stack — what each piece is for

Declared in `backend/requirements.txt`, imported in `backend/app.py`:

| Library | What it does here |
|---|---|
| **Flask** (`>=3.0`) | The web framework: `@app.route()` endpoints, `request`, `jsonify`, blueprint registration. |
| **Flask-CORS** (`>=4.0`) | Lets the frontend on port 3000 call the API on port 5000 (`Access-Control-Allow-Origin: *`). |
| **PyJWT** (`>=2.8`) | Login tokens: `jwt.encode()` on login, `@token_required` decorator verifies the `Bearer` token on every protected route. |
| **Flask-SocketIO** (`>=5.3`) | Real-time push events (`dashboard_update`, `campus_update`, `notification_push`, `message_push`...) to open pages. Client side uses `vendor/socket.io.min.js`. |
| **Flask-Mail** (`>=0.9.1`) | SMTP scaffolding for email notifications (Gmail SMTP config in `config.py`; not actually sending in offline mode). |
| **SQLite** (stdlib `sqlite3`) | The entire database. **Raw `sqlite3` is used everywhere** — SQLAlchemy is installed but not used for queries. |
| **ReportLab** (`>=4.2`) | PDF generation — certificates, fee receipts, reports (`SimpleDocTemplate`, `Paragraph`, `Table`). |
| **openpyxl** (`>=3.1.5`) | Excel export (`.xlsx`) for attendance / fee / roster spreadsheets. |
| **numpy** + **scikit-learn** | `models.py::predict_marks()` — the CGPA / marks predictor (Random Forest regressor). |
| **python-dotenv** (`>=1.0`) | `config.py` loads `SECRET_KEY`, DB and mail credentials from `.env`, with dev defaults. |
| **python-multipart** | File uploads (leave documents, certificates). |
| **Werkzeug** | WSGI toolkit Flask sits on (dev server, password hashing helpers). |
| **pytest** (`>=8.2`) | Backend unit/API tests in `backend/tests/test_api.py`. |
| **mysql-connector-python** | Listed in requirements but the app runs on SQLite — MySQL is not used. |

### Backend file map

| File | Responsibility |
|---|---|
| `app.py` | App creation, CORS, SocketIO, table bootstrap, most core routes, `__main__` entry point. |
| `config.py` | `Config` class: secret key, DB host, SMTP, Razorpay key (env-driven). |
| `db.py` | `get_db_connection()` — the single place every DB connection comes from. |
| `setup_db.py` / `seed_data.py` / `migrate.py` | Schema creation, demo data, migrations. |
| `model.py` | ML mark prediction (sklearn). |
| `routes/*.py` | 16 Blueprints, each owning one feature domain (finance, ops, curriculum, ...). |
| `tests/test_api.py` | pytest API tests. |

### The 16 Blueprints (registered in `app.py`)

All registered with `url_prefix="/api"`:

| Blueprint file | Owns |
|---|---|
| `curriculum.py` | Syllabus / curriculum / OBE subject mapping |
| `gpa.py` | GPA + CGPA prediction endpoints |
| `obe.py` | Outcome-based education (program outcomes, rubrics) |
| `timetable.py` | Class timetable (dept/semester, day ordering) |
| `topic_recommend.py` | Topic recommendations / analytics |
| `faculty_research.py` | Publications, research projects |
| `faculty_performance.py` | Faculty evaluation / feedback |
| `ai_assistant.py` | AI advisor / doubt solver endpoints |
| `engagement.py` | Student engagement metrics |
| `projects.py` | Student projects, milestones, guides, discussion |
| `observations.py` | Observation reports |
| `staff.py` | Staff profiles / staff-facing APIs |
| `finance.py` | Fees, payments, semester-wise fee logic |
| `certificates.py` | Certificate generation + verification |
| `ai_ops.py` | AI operations (alerts, smart notices) |
| `ops.py` | Attendance completion rule, leave applications, staff attendance, **Campus Connect status API** |

---

## 3. The database (116 tables)

One SQLite file, grouped by domain:

- **Identity**: `users`, `students`, `parents`, `faculty_profiles`, `student_user_links`.
- **Academics**: `curriculum*`, `timetables`, `attendance`, `assignments`,
  `assignment_submissions`, `exam_schedules`, `student_subject_grades`, `quizzes`,
  `quiz_questions`, `study_*`, `flashcards`, `notes`.
- **Campus life**: `cafeteria_*`, `library_*`, `hostel_*`, `transport_*`, `parking_slots`,
  `wellness_logs`, `health_records`, `campus_events`, `campus_social_feed`,
  `community_posts`, `forum_*`, `store_*`.
- **Admin ops**: `staff_attendance`, `leave_applications`, `grievances`, `payments`,
  `fee_structures`, `scholarships`, `audit_logs`, `workflow_*`, `notifications`,
  `messages`, `login_history`.

### Key facts earned during development (study these)

1. **No direct `user_id` on `students`** — the link lives in `student_user_links`
   (student_id ↔ user_id). Queries that need a user id must join through it.
2. **Autocommit + WAL**: `db.py` now connects with
   `isolation_level=None`, plus `PRAGMA journal_mode=WAL` and `busy_timeout=30000`.
   This stopped cascading `database is locked` errors (one failed handler used to leak a
   connection holding an open write transaction, which blocked every later write for 30s+).
3. **SQLite can't ALTER a CHECK constraint** — widening the `messages` table's
   `sender_role`/`recipient_role` whitelist required a startup migration that rebuilds
   the table (rename → create new → copy rows → drop old). See `_ensure_history_tables`
   in `app.py`.
4. **Single process**: `socketio.run(app, debug=False)` — the debug reloader ran a
   parent + child process that both wrote the same DB at import time and caused
   contention. `.py` edits now need a manual backend restart.

---

## 4. Frontend stack

No frameworks — vanilla JS controllers per portal, vendored libraries in `frontend/vendor/`:

| Asset | What it is / what it's for |
|---|---|
| `vendor/tailwind.js` | Tailwind CSS **Play CDN build** — runtime utility classes, no build step. |
| `vendor/font-awesome/` | Icons (`<i class="fas fa-user"></i>`). |
| `vendor/chart.umd.min.js` | **Chart.js** — dashboard / analytics graphs. |
| `vendor/gsap.min.js` + `Draggable.min.js` | GSAP animations (page transitions, drag interactions). |
| `vendor/qrcode.min.js` | QR codes (student IDs, certificates). |
| `vendor/socket.io.min.js` | Client for Flask-SocketIO push events. |
| `frontend/service-worker.js` + `manifest.json` | PWA shell — offline caching, installable app. |

### JS controllers (`frontend/js/`)

| File | Used by | Notes |
|---|---|---|
| `login.js` | `login.html` | Auth entry point — stores token, redirects by role. |
| `student.js` | `student.html` | Largest (~2,100 lines): dashboard, curriculum, fees, planner, library, quizzes... |
| `faculty.js` | `faculty.html` | Attendance, grading, research, projects, lesson plans. |
| `admin.js` | `admin.html` | Global dashboard, notifications panel, staff/fee/leave oversight. |
| `staff.js` + `staff_attendance.js` | `staff.html` | Grievances, certificates, finance, staff attendance check-in. |
| `campus.js` | `campus.html` | **Campus Connect** — presence boards, activity feed, leave queue, DMs. |
| `community.js` | all portals | Shared community/social feed (`/campus/social-feed`). |
| `engagement.js` | engagement page | Engagement analytics. |

### The auth pattern (memorize this — it's behind ~95% of the code)

1. `login.js` POSTs `{mobile, password}` to `/login`.
2. On success the server returns a **JWT** + user object.
3. `login.js` stores `localStorage.token` and `localStorage.user`, then redirects to
   the page matching `user.role`.
4. Every controller reads the token and sends `Authorization: Bearer <token>` with
   each `fetch()`.
5. On the server, `@token_required` decodes the JWT and passes `current_user`
   into the route; role-gating decorators (`@require_auth(STAFF_ROLES)`) decide
   whether the call is allowed.

---

## 5. Architecture & design patterns

1. **Blueprints** — 16 route files each own one feature domain (finance ≠ ops ≠
   curriculum), registered under `/api`. ~203 handlers total.
2. **Role gate constants** — e.g.
   `STAFF_ROLES = ("faculty","hod","principal","accounts","librarian","warden","super_admin","admin")`
   reused by `@require_auth(...)` decorators and inline checks.
3. **Realtime** — server `socketio.emit("event_name")` → pages `socket.on("event", render)`.
   ⚠️ **Known caveat**: with Flask-SocketIO in `threading` mode + long-polling,
   broadcasts reach the browser only up to ~the client's ping interval (~25s) late.
   Pages therefore also poll on a timer (`setInterval(loadCampus, 10000)` in `campus.js`)
   as a reliable fallback. The socket listeners stay in place in case eventlet is enabled.
4. **Escaping** — user-supplied content is HTML-escaped before injection (the `esc()`
   helper) to avoid XSS.
5. **Toasts** — a shared `showToast()` pattern gives feedback after actions.
6. **REST + JSON** — everything is `fetch()` + `jsonify()`; no GraphQL, no SSR.

---

## 6. Roles → portals → flagship features

| Role | Logs into | Flagship features |
|---|---|---|
| Student | `student.html` | Curriculum, routine, semester-wise fees, planner/flashcards, Campus Connect |
| Faculty | `faculty.html` | Attendance marking, grading, projects, lesson plans, research |
| Admin | `admin.html` | Global dashboard, notification panel, fee/leave/staff oversight |
| Accounts | `staff.html` | Fees & finance, payments |
| HOD | `staff.html` | Grievance queue, faculty oversight |
| Warden | `staff.html` | Hostel / complaints |
| Librarian | `staff.html` | Library books / borrows |
| **All 7** | `campus.html` | **Campus Connect** — live presence, activity feed, leave queue, cross-role DMs |

### Demo credentials

| Role | Mobile | Password |
|---|---|---|
| Admin | `1234567890` | `admin123` |
| Student | `9999999999` | `password123` |
| Faculty | `9876543210` | `password123` |
| Accounts | `7020001001` | `staff123` |
| HOD | `7020001002` | `staff123` |
| Warden | `7020001003` | `staff123` |
| Librarian | `7020001004` | `staff123` |

---

## 7. Campus Connect — how it works end to end

The feature that "links all 7 accounts together":

1. **Backend API** — `GET /api/campus/status` (`routes/ops.py`) returns, for any
   authenticated role:
   - `students` — each student with `marked_today` (from `attendance`) and linked
     `user_id` (via `student_user_links` → `users`).
   - `presence` — today's `staff_attendance` rows for all staff roles.
   - `leaves` — the 10 most recent leave applications.
   - `activity` — a merged feed (attendance marks, leave events, social posts), newest first.
   - `summary` — `students_marked / students_total`, `staff_marked / staff_total`,
     `pending_leaves`.
2. **Push events** — leave submit/review, staff attendance marks, and social posts all
   call `socketio.emit('campus_update')` (plus domain events like
   `staff_attendance_update`).
3. **Frontend** — `campus.html` + `js/campus.js`:
   - Renders the two presence boards, activity feed, and leave queue.
   - Admin sees **Approve / Reject** buttons on pending leaves →
     `POST /api/leaves/<id>/review`.
   - **Message** buttons on every row → `openDM(userId, role)` → modal →
     `POST /messages/send`.
   - Listens on the socket for `campus_update` / `attendance_update` /
     `staff_attendance_update`, **and** polls every 10s as a fallback, with a per-second
     "Updated 12:44:16 · 0s ago" clock so it always feels live.
4. **Cross-role DMs** — `/messages/send` accepts all 10 roles (whitelisted in
   `app.py`), and the `messages` table's role CHECK constraint was widened by migration
   so staff roles can actually insert rows (previously `sender_role` only allowed
   `student/faculty/parent/admin`).

---

## 8. Testing

- **Backend**: `pytest backend/tests/test_api.py`.
- **E2E (offline)**: Playwright harness in the session temp dir (`...\opencode\pw\`).
  Scripts like `smoke_all.js` (logs in all 7 accounts, opens portals + Campus page) and
  `e2e_campus.js` assert **0 page errors** and abort every non-localhost request to
  prove nothing depends on the internet.
- The only intentionally blocked externals in tests: codepen's MorphSVG plugin and a
  sound file — both decorative.

---

## 9. Operating it

- `start.bat` → checks deps, launches backend (5000) + frontend (3000), opens a browser.
- Backend runs `debug=False` (single process = stable). **Editing a `.py` file requires
  restarting the backend** — there is no auto-reload.
- Restart recipe:
  ```
  netstat -ano | findstr ':5000'     # find the PID
  taskkill /PID <pid> /F
  cd backend && python app.py
  ```
- Logs: `backend/app.log` (request log + tracebacks).

---

## 10. Suggested study path

1. Run `start.bat`, log in as all 7 accounts, click every portal — build a mental map.
2. Trace **one login** end-to-end: `login.js` → `/login` → JWT → `localStorage` →
   `@token_required` on a protected route.
3. Read `db.py`, then one Blueprint (`routes/finance.py` is a good size) to see the
   REST + role-gate pattern repeated everywhere.
4. Follow Campus Connect: `campus.html` → `js/campus.js` → `/api/campus/status`
   → where `campus_update` is emitted in `routes/ops.py`.
5. Skim the 116 tables in `student_system.db` (browser: DB Browser for SQLite, or
   `sqlite3` CLI) against the domain groups in section 3.
6. Run the Playwright smoke test to see how the app is verified offline.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **JWT / Bearer token** | Signed token proving who is calling; stored in `localStorage`. |
| **Blueprint** | Flask's way of splitting routes into separate modules. |
| **CORS** | Browser policy letting port 3000 call port 5000. |
| **WAL mode** | SQLite write-ahead logging — readers don't block writers. |
| **Long-polling** | Socket.IO's fallback transport; cause of the ~25s broadcast latency. |
| **Autocommit** (`isolation_level=None`) | Each statement commits itself — no lingering open transactions to leak locks. |
| **PWA / service worker** | Makes the app installable and cacheable offline. |
| **OBE** | Outcome-based education (program outcomes, rubrics) — `routes/obe.py`. |
| **CGPA prediction** | ML-based mark forecast — `model.py` + `routes/gpa.py`. |
| **CRUD + auth + role gate** | The pattern behind ~95% of the ~203 endpoints. |
