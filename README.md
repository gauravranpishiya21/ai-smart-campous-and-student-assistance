# AI-Powered Smart Campus Management and Student Assistance System

Your `student.html` portal, turned into a working full-stack system with a backend, database, AI and automation.

## Run on Windows
1. Install Node.js 22.5 or newer.
2. Double-click `start.bat` from the extracted project folder.
3. Open `http://localhost:3000` in Chrome and keep the terminal window open.

Do not open `public/index.html` directly: the frontend requires the Express API server.

## Run from a terminal
```bash
npm install
npm start                 # http://localhost:3000
npm test                  # run the smoke tests
```
Requires Node 22.5+ (uses the built-in `node:sqlite`).
**Demo student login:** `2024CS0042` / `student123`
**Demo admin login:** `ADMIN001` / `student123` (Admin Panel: `http://localhost:3000/admin.html`)

## Architecture
| Layer | What | Where |
|---|---|---|
| Student Frontend | Portal UI (all 30+ sections) wired to live APIs | `public/index.html`, `public/js/` |
| Admin Console | Executive Administration Panel with KPI telemetry, student directory, 75% deficit scanner, CIA grading, finance ledgers, bulletins & leave approvals | `public/admin.html`, `public/js/admin.js`, `server/admin.js` |
| API | Express REST + Socket.IO (live chat), JWT auth | `server/index.js`, `server/admin.js` |
| Database | SQLite (students, attendance, fees, results, projects, tickets…) | `server/db.js`, `data/campus.db` |
| AI | Attendance forecast + 75% bunk planner, backlog risk, CGPA prediction, exam advice, study planner, ATS resume score, chatbot, doubt solver. Uses Claude when `ANTHROPIC_API_KEY` is set, otherwise an offline engine | `server/ai.js` |
| Automation | Scheduled jobs (node-cron), run on demand from the Automation tab | `server/automation.js` |

## Automation jobs
- **attendanceGuardian** – warns students under 75% per subject, with classes needed to recover
- **feeReminder** – dues reminders
- **examCountdown** – upcoming exam alerts
- **deadlineNudge** – project/task deadline nudges
- **xpRewards** – gamification XP
- **riskScan** – flags at-risk students for mentoring
- **wellnessWatch** – watches wellness logs
- **ticketTriage** – auto-categorises helpdesk tickets
- **leaveAutoReview** – auto-reviews leave requests
- **noticeDigest** – digests notices

Schedules: every 5 min (triage, leave review, digest), 08:00 daily (alerts/reminders), 22:00 daily (risk and wellness scans).

## Notes
- Set a strong `JWT_SECRET` before deploying anywhere public.
- The seeded data is fictional demo data.


## Resource Optimization Map

The Resource Optimization Map is available from the sidebar. It displays lab equipment utilization, classroom occupancy, building-level power usage, zone details and optimization recommendations. The current `/api/resources/telemetry` endpoint intentionally generates **simulated demo telemetry** with 30-second refreshes. For production deployment, replace the sample values in `server/index.js` with authenticated feeds from room occupancy sensors, equipment booking/inventory systems and electricity meters; do not present the demo readings as physical measurements.

## Strategic Frontend Enhancements

This build adds two frontend views to the existing application:

- **Enterprise Analytics** (`#strategic-analytics`): responsive Chart.js charts for attendance actual-vs-predicted trends, department performance, resource utilization and at-risk student trends. Includes a time-range selector and refresh action.
- **AI Agent War Room** (`#war-room`): Security, Analytics and Scheduling agent status cards, coordination protocol, and a rolling inter-agent message stream with a manual coordination-cycle action.

Both views are linked from the sidebar. The new frontend code is in `public/js/strategic-enhancements.js`; Chart.js is already bundled locally at `public/vendor/chart.umd.min.js`.

**Data note:** These new analytics values and agent messages are illustrative demo data. The existing resource map retains its own telemetry integration. To make the new views production-live, connect them to authenticated analytics endpoints and server-side Socket.IO events, enforce admin/faculty role permissions, and persist an audit trail. Do not treat the demo events as actual campus security or operational alerts.

### Validation

The new JavaScript passes `node --check`. `npm test` was attempted but the repository's self-test suite reported failures across its API checks in this environment; install the project's dependencies and configure the test database/environment before relying on those checks.
