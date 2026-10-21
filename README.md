# Smart Education ERP — Smart Campus Student Management System

An end-to-end college administration system: a Flask/SQLite REST API with role-based
access, a Socket.IO realtime layer, and a static multi-portal frontend built with
Tailwind, Font Awesome and Chart.js.

## Portals & Roles

| Role | Portal | Capabilities |
| --- | --- | --- |
| Student | `student.html` | Academics, projects, fees & receipts, certificates & hall ticket, AI helpdesk, placements, library, campus services |
| Faculty | `faculty.html` | Attendance, grading, project guidance, weekly observation reports |
| Admin / Super Admin / Principal | `admin.html` | Institution, departments, users, payments, reports, advanced analytics, project analytics |
| HOD / Accounts / Librarian / Warden | `staff.html` | Role-scoped grievance queue, certificate & revaluation review (HOD), fees/finance desk (Accounts), AI analytics (HOD) |

### Default logins (demo)

| Role | Mobile | Password |
| --- | --- | --- |
| Student | `9999999999` | `password123` |
| Student (Medical) | `8888888888` | `password123` |
| Faculty | `9876543210` | `password123` |
| Admin | `1234567890` | `admin123` |
| HOD / Accounts / Librarian / Warden | `7020001002` / `7020001001` / `7020001004` / `7020001003` | `staff123` |

New staff accounts (principal, HOD, accounts, librarian, warden, super admin) are created
by an admin via `POST /api/staff/create` — there is **no public self-registration** for
staff. `/register` accepts students only.

## Feature highlights

- **Role-based access control** — JWT auth with role-checked guarded endpoints and
  role-specific portals (`_is_management` + per-route `require_auth`).
- **Finance suite** — fee structures, per-student dues with receipts, defaulter report,
  scholarships.
- **Certificates & exam documents** — bonafide / transfer certificate / QR ID card
  request-and-issue workflow, hall tickets, revaluation requests.
- **AI operations** — grievance auto-classification and routing to the correct desk
  with priority detection; natural-language analytics
  (`POST /api/analytics/nl-query`) for attendance, dues, at-risk students, placements.
- **Projects & observations** — student projects with milestones, progress, faculty
  guides and discussion; weekly faculty observation reports with student-facing ratings.
- **Realtime** — Socket.IO for attendance, dashboard and notification updates.

## Getting started

### Local (Windows)

```bat
cd backend
python -m pip install -r requirements.txt
python migrate.py      REM idempotent schema migrations on an existing DB
python app.py          REM http://localhost:5000
```

Open the frontend from `frontend/index.html` in a browser (served by `http-server`,
`python -m http.server 8000 -d frontend`, or use `start.bat`).

### Docker

```bash
docker compose up --build
#  - API + Socket.IO on http://localhost:5000
#  - Frontend on http://localhost:80  (nginx, proxies /api and /socket.io)
```

## Project structure

```
backend/
  app.py            Flask + Socket.IO entrypoint, core routes, bootstrap
  config.py         JWT secret, DB config
  db.py             SQLite + SQLAlchemy helpers
  migrate.py        Idempotent schema runner
  routes/
    staff.py        Role support + staff management
    finance.py      Fee structures, dues, defaulters, scholarships
    certificates.py Document requests, hall tickets, revaluations
    ai_ops.py       Grievances + NL analytics
    projects.py     Student projects & milestones
    observations.py Weekly observation reports
  tests/            pytest suite
frontend/
  index.html login.html student.html faculty.html staff.html admin.html parent.html ...
  js/               per-portal logic
```

See `docs/ER.md` for the entity-relationship map and `backend/API_DOCS.md` for API reference.

## Security notes

- JWT `SECRET_KEY` defaults to a development value in `config.py`; set the
  `SECRET_KEY` environment variable in production.
- Use HTTPS behind a reverse proxy in production; the bundled `nginx.conf` is a
  starting point.