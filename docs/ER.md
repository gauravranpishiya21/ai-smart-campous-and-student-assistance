# Entity-Relationship Map

Core tables and the feature tables added by the admin/operations package.
All tables live in a single SQLite database (`backend/student_system.db`) and are
created idempotently via `backend/migrate.py` / module import.

```mermaid
erDiagram
    USERS ||--o| STUDENTS : "student_user_links"
    USERS {
        int id PK
        string name
        string role "admin|super_admin|principal|hod|accounts|librarian|warden|faculty|parent|student"
        string mobile UK
        string password_hash
    }

    STUDENTS ||--|| USERS : login
    STUDENTS {
        int id PK
        string name
        int department_id FK
        int semester_id FK
        int attendance
        float study_hours
        string mobile
    }
    DEPARTMENTS_MASTER ||--o{ STUDENTS : groups
    SEMESTERS_MASTER ||--o{ STUDENTS : contains

    STUDENTS ||--o{ PAYMENTS : pays
    PAYMENTS {
        int id PK
        int student_id FK
        float amount
        string status
        string receipt_number UK
    }
    DEPARTMENTS_MASTER ||--o{ FEE_STRUCTURES : defines
    SEMESTERS_MASTER ||--o{ FEE_STRUCTURES : billed_for
    FEE_STRUCTURES {
        int id PK
        int department_id FK
        int semester_id FK
        string head
        float amount
    }
    STUDENTS ||--o{ SCHOLARSHIPS : receives
    SCHOLARSHIPS {
        int id PK
        int student_id FK
        string name
        float amount
        string status
    }

    STUDENTS ||--o{ STUDENT_DOCUMENTS : requests
    STUDENT_DOCUMENTS {
        int id PK
        int student_id FK
        string doc_type "bonafide|transfer_certificate|id_card"
        string status "requested|issued|rejected"
        string qr_token
        date issued_on
    }
    STUDENTS ||--o{ REVALUATIONS : files
    REVALUATIONS {
        int id PK
        int student_id FK
        string subject_name
        string exam_name
        string reason
        string status
    }
    CURRICULUM_SUBJECTS ||--o{ EXAM_SCHEDULES : assessed
    EXAM_SCHEDULES {
        int id PK
        int subject_id FK
        date exam_date
        string start_time
        string end_time
        string room_number
    }

    STUDENTS ||--o{ GRIEVANCES : opens
    GRIEVANCES {
        int id PK
        int student_id FK
        string title
        string description
        string category "auto-classified"
        string priority "normal|high"
        string assigned_role "routing target"
        string status "open|in_progress|resolved"
    }

    STUDENTS ||--o{ PROJECTS : owns
    FACULTY ||--o{ PROJECTS : guides OPTIONAL
    PROJECTS {
        int id PK
        int student_id FK
        int guide_user_id FK
        string title
        string description
        int progress_pct
    }
    PROJECTS ||--o{ PROJECT_MILESTONES : tracks
    PROJECTS ||--o{ PROJECT_UPDATES : logs
    PROJECTS ||--o{ PROJECT_DISCUSSION : hosts

    FACULTY ||--o{ OBSERVATION_REPORTS : writes
    STUDENTS ||--o{ OBSERVATION_REPORTS : rated
    OBSERVATION_REPORTS {
        int id PK
        int student_id FK
        int faculty_id FK
        string week_label
        int rating
        string observation
    }
```

## Relationship notes

- **finance**: a student's *assessed* amount = `SUM(fee_structures.amount)` for their
  department/semester; *paid* = completed `payments` + approved `scholarships`;
  *dues* = assessed − paid. `payments.receipt_number` is generated
  (`printf('RC%05d', id)`).
- **certificates**: `qr_token` (uuid hex) is set on issue and rendered on the student
  portal via `qrcodejs`.
- **grievances**: `category`, `priority` and `assigned_role` are produced by the
  keyword classifier in `routes/ai_ops.py`; each role's portal shows only its queue.
- **users.role** was widened beyond the original `('admin','student','faculty')`
  CHECK constraint during the role-support migration (see `routes/staff.py`).