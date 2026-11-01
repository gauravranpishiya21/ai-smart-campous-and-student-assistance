# AI-Powered Smart Campus Management & Student Assistance System

A production-grade, secure, full-stack Smart Campus Management SaaS platform featuring **Google Gemini AI integration**, strict role-based access control (RBAC), multi-modal attendance intelligence, predictive academic early-warning systems, and event-driven automation.

---

## 🌟 Key Capabilities

- **Google Gemini AI Integration**: Conversational campus advisor, AI doubt solver, dynamic 6-day study routine generator, and ATS resume scoring powered by the official `@google/genai` SDK with automatic offline fallback when unconfigured.
- **Enterprise Security Architecture**: Strict JWT token authentication, server-verified role-based authorization (Students, Faculty, System Administrators), IDOR prevention across all records, and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
- **Multimodal Smart Attendance**: Biometric 3D face liveness verification, dynamic 20-second expiring rolling QR codes, contactless RFID/NFC tap simulation, and automated low-attendance parent SMS dispatch.
- **Academic & Operational Command Desk**: Constraint satisfaction problem (CSP) conflict-free timetable engine, AI rubric submission grading, 75% attendance bunk planner, and UGC-compliant official grade card issuance.
- **Campus IoT & Living Services**: Simulated resource optimization telemetry, smart hostel/mess portal, live transport route tracking, safety SOS geo-dispatch, and visitor gate pass management.
- **Executive Admin Console**: Live KPI metrics, student directory, attendance deficit scanner, CIA marks management, financial fee ledgers, and audit logs (`/admin.html`).

---

## 🏗️ Architecture Overview

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    Client Layer                        │
                               │  - Student Portal UI (public/index.html)               │
                               │  - Executive Admin Console (public/admin.html)        │
                               │  - Chart.js & Tailwind CSS Local Bundles               │
                               └─────────────────────────┬──────────────────────────────┘
                                                         │ HTTPS REST / WSS Socket.IO
                                                         ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                 Express API & Security                 │
                               │  - Security Headers (nosniff, SAMEORIGIN, XSS)         │
                               │  - Brute-Force Rate Limiting Middleware                │
                               │  - JWT Bearer Authentication Guard                     │
                               │  - Role Verification & Access Control (RBAC)           │
                               └───────────────┬────────────────────────┬───────────────┘
                                               │                        │
                   ┌───────────────────────────┴───┐      ┌─────────────┴───────────────┐
                   │       Google Gemini AI        │      │   Central Core Execution    │
                   │  - @google/genai Node SDK     │      │         Kernel Engine       │
                   │  - Rate Limiter (20 req/min)  │      │  - Privilege Interception   │
                   │  - 30s Deduplication Cache    │      │  - Domain Classifier        │
                   │  - Resilient Offline Fallback │      │  - Parameter Extractor      │
                   └───────────────────────────────┘      └─────────────┬───────────────┘
                                                                        │
                               ┌────────────────────────────────────────┴───────────────┐
                               │             Data & Persistence Layer                   │
                               │  - Built-in SQLite 3.45 via node:sqlite (zero native)  │
                               │  - Write-Ahead Logging (WAL) & Foreign Keys ON         │
                               │  - Auto-seeding with realistic academic data           │
                               │  - Flexible document store for student services        │
                               └────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Fixes & Hardening

### Addressed Vulnerabilities (including GitHub Issue #1):
1. **Unauthenticated `/api/ai-engine` Vulnerability Fixed**:
   - Removed the unauthenticated fallback route that previously trusted client-supplied `user_id` and `role` parameters.
   - All AI engine endpoints (`/api/ai-engine` and `/api/ai/kernel-execute`) are now registered behind the verified `auth` middleware.
   - User identity and role permissions are derived exclusively from verified database records (`req.user`), completely ignoring client-supplied identity fields in request bodies.
2. **Insecure Direct Object Reference (IDOR) Protections**:
   - `POST /api/library/return/:id`: Verified that borrow records belong strictly to `req.user.id`.
   - `POST /api/projects/:id/milestones/:mid/toggle`: Verified that project milestones belong to the authenticated student's project.
   - Planner task modifications (`/api/planner/tasks/:id/toggle` and `DELETE /api/planner/tasks/:id`) enforce ownership checks.
3. **Role-Based Privilege Escalation Guard**:
   - The Central AI Kernel Core intercepts any student attempts to alter grades, attendance, or fees, returning an `AUTHORIZATION_BREACH` payload with telemetry recording.
   - Admin routes (`/api/admin/*`) strictly verify `role === 'admin' || role === 'super_admin'` from verified database records.
4. **Socket.IO Security**:
   - Socket.IO connections authenticate incoming JWT tokens during handshake, assigning verified users to secure rooms.
5. **Rate Limiting & Security Headers**:
   - Implemented IP-based brute force protection on authentication routes.
   - Added standard security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 🤖 Google Gemini AI Setup

The system uses the official Google Gen AI SDK (`@google/genai`) for conversational intelligence, academic advice, and doubt solving.

### Getting an API Key
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and create a new key.
4. Copy your API key.

### Configuration
Create a `.env` file in the project root (copied from `.env.example`):

```bash
PORT=3000
JWT_SECRET=your-secure-random-secret-key-at-least-32-characters

# Google Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

> **Note on Offline Resilience**: If `GEMINI_API_KEY` is not provided, or if the API quota is exhausted, or if an API timeout occurs, the system automatically and seamlessly falls back to its built-in offline rules and knowledge base. The application never crashes due to AI provider unavailability.

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js**: v22.5.0 or newer (uses the native `node:sqlite` module without native C++ compilation dependencies).
- **Web Browser**: Chrome, Edge, Firefox, or Safari.

### 1. Clone & Install
```bash
git clone https://github.com/gauravranpishiya21/ai-smart-campous-and-student-assistance.git
cd ai-smart-campous-and-student-assistance
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env to set JWT_SECRET and optionally GEMINI_API_KEY
```

### 3. Run Automated Tests
```bash
npm test
```
The test suite executes 45 automated tests across:
- Authentication & JWT handling (valid, missing, invalid, expired).
- Security & authorization (unauthenticated AI route rejection, role spoofing prevention, IDOR protection, admin guards).
- Gemini API integration with mocked provider, timeout handling, quota exhaustion, rate limiting, and offline fallback.
- Full application regression checks across all student, academic, and administrative modules.
- DOM integrity & client contract: 0 duplicate IDs, 100% reachability across 34 student sections and 15 admin subsystems, 0 deprecated 404 script references.

### 4. Build Stylesheets
```bash
npm run build:css
```

### 5. Start the Application
```bash
npm start
```
The application will launch at **`http://localhost:3000`**.

### Demo Credentials
| Role | Portal URL | Identifier | Password |
|---|---|---|---|
| **Student** | `http://localhost:3000` | `2024CS0042` (or `test@smartcampus.edu`) | `student123` |
| **Administrator** | `http://localhost:3000/admin.html` | `ADMIN001` | `student123` |

---

## 🧭 Navigation Architecture

### Student Portal (`/index.html`)
Unified sidebar-first hierarchy exposing all 34 campus modules:
- **Overview**: Dashboard
- **Academics & Learning**: Academic Overview, Attendance Hub, Class Timetable, Smart Exam Schedule, Syllabus Roadmap, Curriculum Structure, Academic Calendar, Digital Library, Study Materials, Certificates & Hall Ticket
- **AI Intelligence**: AI Kernel Core Commander (Ctrl+K), AI Doubt Solver, AI Study Planner, AI Campus Helpdesk
- **Student Services**: Fee Status & Ledger, Counselling & Wellness, Cafeteria & Store, Health & Medical, Student Wallet & Finance, Hostel & Campus Help, Virtual Campus Map, Smart Parking, Campus Security
- **Career & Development**: Manage Projects, Career Placements, Resume Builder, CGPA Predictor
- **Campus Community**: Community Hub, Discussion Forum, Campus Social Feed, Faculty Directory, Student Leaderboard, Webinars & Live Streams, Notice Board

### Admin Portal (`/admin.html`)
Dedicated enterprise console wired directly to database APIs:
- **Executive Pulse**: Campus KPIs, Attendance Health Radar, Department Breakdown, Daemon Feed
- **Academic Control**: Student Directory, Attendance Deficit Scanner & Exemption Overrides, Marks & CIA Grading, Syllabus PDF Uploader, Digital Library Ebook Repository, Department Registry, Teacher Workspaces
- **Institutional Finance**: Fee Ledgers, Outstanding Dues Tracker, Offline Payment Receipt Ledger
- **Campus Operations**: Bulletin Notice Publisher with AI Summaries, Helpdesk Ticket Triage, Leave Approval Queue, Forum Moderation
- **Security & Automation**: Cron Automation Runner & Live Daemon Log, Security Login Audit Trail

---

## 📡 API Reference Summary

### Authentication
- `POST /api/auth/login` – Authenticate with roll number/email and password (rate limited).
- `POST /api/auth/register` – Register a new student account (rate limited).
- `GET /api/auth/me` – Retrieve profile of authenticated user.

### AI & Central Kernel Engine
- `GET /api/ai/status` – Check AI engine status and active Gemini model.
- `POST /api/ai/chat` – Conversational campus advisor (Gemini + offline fallback).
- `POST /api/ai/doubt` – Subject doubt solver with syllabus mapping.
- `POST /api/ai/planner-chat` – Dynamic study routine builder.
- `POST /api/ai-engine` – Central Kernel Core execution engine (strict JWT auth).
- `POST /api/ai/kernel-execute` – Direct kernel command dispatcher.

### Academic Operations
- `GET /api/attendance` – Attendance analytics, subject breakdown, and bunk planner.
- `POST /api/attendance/mark` – Daily attendance self-check-in.
- `GET /api/results` – Grade reports, SGPA/CGPA standing.
- `GET /api/calendar/annual?year=2` – Annual working mechanism and event schedule.
- `GET /api/calendar/ics?year=2` – RFC 5545 downloadable iCalendar (.ics) export.
- `POST /api/academic/timetable-conflict-check` – Detect faculty/room booking collisions.
- `POST /api/academic/generate-timetable` – Generate conflict-free semester timetable.

### Administration Console (`/api/admin/*`, Admin Only)
- `GET /api/admin/overview` – Campus KPI stats, attendance averages, and dues telemetry.
- `GET /api/admin/students` – Complete student directory with risk ratings.
- `POST /api/admin/students` – Provision new student/faculty/admin records.
- `PUT /api/admin/students/:id` – Modify user attributes and roles.
- `DELETE /api/admin/students/:id` – Remove student and cascading records.
- `POST /api/admin/attendance/override` – Administrative attendance ledger adjustments.
- `POST /api/admin/marks` – CIA internal and end-semester grading.

---

## 🛠️ Production Deployment Guidelines

1. **Environment Variables**:
   - Set `NODE_ENV=production`.
   - Configure a cryptographically strong `JWT_SECRET` (at least 32 characters, e.g. `openssl rand -hex 32`).
   - Securely inject `GEMINI_API_KEY` via production secrets management (e.g. AWS Secrets Manager, GCP Secret Manager, or environment variables).
2. **Reverse Proxy & SSL**:
   - Deploy behind Nginx, Caddy, or Cloudflare with TLS 1.3 encryption.
   - Configure `proxy_set_header X-Forwarded-For $remote_addr;` and WebSocket proxy headers (`Upgrade $http_upgrade; Connection "upgrade";`).
3. **Database Maintenance**:
   - The SQLite database (`data/campus.db`) operates in WAL mode.
   - Schedule periodic database backups using SQLite's online backup API or file copies during low-traffic windows.

---

## 📄 License
MIT License.
