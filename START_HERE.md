# START HERE — EduWeb Campus ERP (CornerStone)

An offline-first college management system: one Flask API (SQLite), a legacy multi-portal
static frontend, and a brand-new React student portal. No cloud, no paid APIs —
everything runs on your machine.

---

## 1. What runs where

| Piece | Path | URL | Notes |
|---|---|---|---|
| Flask API + Socket.IO | `backend/app.py` | http://localhost:5000 | The only server that touches the DB |
| Legacy portals (admin/faculty/student/parent/staff) | `frontend/` | http://localhost:3000 | Plain HTML/JS served by `python -m http.server` |
| React student portal (new) | `webapp/` | http://localhost:5173 | Vite dev server; fetches the :5000 API |
| Database | `backend/student_system.db` | — | SQLite, WAL mode, 118 tables, fully seeded |

## 2. Starting everything

### Option A — legacy portals (double-click)
```
start.bat        # starts API :5000 + static :3000, seeds DB if missing, opens browser
stop.bat         # stops both
```

### Option B — the new React portal
```
# terminal 1 (or via start.bat)
cd backend  &&  python app.py

# terminal 2
cd webapp    &&  npm install     (first time only)
npm run dev
```
Open http://localhost:5173 — login page has one-click demo account fillers.

### Demo credentials
| Role | Mobile | Password |
|---|---|---|
| Student | 9999999999 | password123 |
| Faculty | 9876543210 | password123 |
| Admin | 1234567890 | admin123 |
| Librarian | 7020001004 | staff123 |
| (Medical) | 8888888888 | password123 |

## 3. Database helpers
```
python backend/seed_demo.py          # idempotent seeder — fills any EMPTY tables (safe to rerun)
python backend/backup_db.py          # backup to backend/backups/ (keeps last 20)
schtasks /run /tn "CornerStone DB Backup"   # trigger the hourly auto-backup manually
```
If the DB ever becomes unusable: delete `backend/student_system.db*` and rerun
`backend/setup_db.py`, `backend/seed_data.py`, `backend/seed_demo.py`.

## 4. Troubleshooting

**API won't come up / changes don't appear.** A stale python process can hold port 5000.
```
netstat -ano | findstr :5000 | findstr LISTENING     # note the PID
taskkill /PID <pid> /F
cd backend && python app.py
```
The API can take 30–60 s before the port binds — poll the netstat line until `LISTENING`.

**Where are errors logged?** `backend/app.log` (werkzeug stdout goes nowhere when launched
detached). Every 4xx/5xx and full tracebacks are appended there.

**React page blank.** Check the browser console; if you edited pages, `npm run build`
should pass. Dev server hot-reloads on save.

**Login says expired/401.** Tokens are JWTs (24 h) signed with `Config.SECRET_KEY`
(`backend/config.py`; override via `.env`).

## 5. Project layout
```
backend/        Flask app (app.py), blueprints in routes/, models.py, db.py,
                seeders (setup_db.py, seed_data.py, seed_demo.py), backup_db.py
frontend/       legacy static portals (student.html, admin.html, ...)
webapp/         React + Vite + Tailwind student portal (src/pages/*)
docs/           older docs
pytest.ini      python test entry point
```

## 6. Known gaps (nice-to-haves)
- Real-time chat updates use polling (socket.io channel exists but React page refetches on send)
- Production mode for the React app (serve `webapp/dist` through Flask) is not wired yet
- Faculty/parent/admin React portals are on the roadmap; legacy portals cover them for now
