# AI operations: grievance auto-classification & routing, and natural-language
# analytics for management ("which department's attendance dropped this month?").
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify

from db import get_db_connection
from config import Config

ai_ops_bp = Blueprint('ai_ops', __name__)

CATEGORY_MAP = [
    ('finance', ('fee', 'fees', 'payment', 'receipt', 'scholarship', 'due', 'dues', 'transact')),
    ('hostel', ('hostel', 'room', 'mess', 'food', 'canteen')),
    ('transport', ('transport', 'bus', 'conveyance')),
    ('library', ('library', 'book', 'librar')),
    ('academic', ('exam', 'exams', 'marks', 'attendance', 'class', 'subject', 'grade', 'result')),
    ('placement', ('placement', 'internship', 'job', 'interview')),
    ('technical', ('wifi', 'internet', 'login', 'app', 'portal', 'technical', 'system')),
    ('general', ()),
]
CATEGORY_ROLE = {
    'finance': 'accounts',
    'hostel': 'warden',
    'transport': 'warden',
    'library': 'librarian',
    'academic': 'hod',
    'placement': 'hod',
    'technical': 'admin',
    'general': 'admin',
}
URGENT_WORDS = ('urgent', 'urgently', 'immediate', 'asap', 'critical', 'emergency', 'delayed', 'blocked', 'can\'t attend')

STATUSES = ('open', 'in_progress', 'resolved')


def _ensure_ai_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS grievances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT NOT NULL,
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'high')),
            assigned_role TEXT DEFAULT 'admin',
            status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


_ensure_ai_tables()


def require_auth(allowed_roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            auth = request.headers.get('Authorization', '')
            token = auth.split(' ')[1] if auth.startswith('Bearer ') else None
            if not token:
                return jsonify({'message': 'Token is missing!'}), 401
            try:
                payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            except Exception:
                return jsonify({'message': 'Token is invalid!'}), 401
            if allowed_roles and payload.get('role') not in allowed_roles:
                return jsonify({'message': 'Unauthorized'}), 403
            request.user = payload
            return fn(*args, **kwargs)
        return wrapped
    return decorator


def _classify(title, description):
    text = f"{title} {description}".lower()
    category = 'general'
    for cat, words in CATEGORY_MAP:
        if any(w in text for w in words):
            category = cat
            break
    priority = 'high' if (any(w in text for w in URGENT_WORDS) or category == 'finance') else 'normal'
    return category, CATEGORY_ROLE.get(category, 'admin'), priority


@ai_ops_bp.route('/grievances', methods=['POST'])
@require_auth(['student'])
def create_grievance():
    user = request.user
    data = request.get_json(silent=True) or {}
    title = str(data.get('title') or '').strip()
    description = str(data.get('description') or '').strip()
    if not title:
        return jsonify({'message': 'Title is required!'}), 400
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400

    category, assigned_role, priority = _classify(title, description)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO grievances (student_id, title, description, category, priority, assigned_role)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (student_id, title, description, category, priority, assigned_role),
    )
    g_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': g_id, 'category': category, 'priority': priority, 'assigned_role': assigned_role,
                    'message': 'Grievance submitted and auto-routed!'}), 201


@ai_ops_bp.route('/grievances', methods=['GET'])
@require_auth()
def list_grievances():
    user = request.user
    role = user.get('role')
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = (
        "SELECT g.*, s.name AS student_name, COALESCE(d.name, '') AS dept_name "
        "FROM grievances g "
        "JOIN students s ON s.id = g.student_id "
        "LEFT JOIN departments_master d ON d.id = s.department_id "
    )
    clauses = []
    params = []
    if role == 'student':
        clauses.append("g.student_id = ?")
        params.append(user.get('student_id'))
    elif role == 'hod':
        clauses.append("g.assigned_role IN ('hod', 'admin')")
    elif role in ('warden', 'librarian', 'accounts'):
        clauses.append("g.assigned_role = ?")
        params.append(role)
    elif role not in ('admin', 'super_admin', 'principal'):
        return jsonify({'message': 'Unauthorized'}), 403
    if clauses:
        sql += "WHERE " + " AND ".join(clauses)
    if request.args.get('status'):
        if clauses:
            sql += " AND "
        else:
            sql += "WHERE "
        sql += "g.status = ? "
        params.append(request.args.get('status'))
    sql += " ORDER BY (g.priority = 'high') DESC, g.created_at DESC"

    cursor.execute(sql, params)
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@ai_ops_bp.route('/grievances/<int:grievance_id>/status', methods=['POST'])
@require_auth()
def update_grievance(grievance_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in STATUSES:
        return jsonify({'message': 'Invalid status!'}), 400

    role = user.get('role')
    if role not in ('admin', 'super_admin', 'principal', 'hod', 'warden', 'librarian', 'accounts'):
        return jsonify({'message': 'Unauthorized'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM grievances WHERE id = ?", (grievance_id,))
    g = cursor.fetchone()
    if not g:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Grievance not found!'}), 404
    g = dict(g)
    if role not in ('admin', 'super_admin', 'principal') and g['assigned_role'] != role:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Not assigned to you!'}), 403

    cursor.execute(
        "UPDATE grievances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status, grievance_id),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Grievance updated!'}), 200


# ---------- Natural-language analytics ----------

def _dept_attendance(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COALESCE(d.name, 'Unassigned') AS department,
               ROUND(AVG(attendance), 1) AS avg_attendance, COUNT(*) AS student_count
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        GROUP BY d.name ORDER BY avg_attendance ASC
        """
    )
    rows = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    return rows


def _dept_fee_defaulters(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id FROM students s WHERE s.department_id IS NOT NULL
        """
    )
    student_ids = [r['id'] for r in cursor.fetchall()]
    cursor.close()
    result = []
    for sid in student_ids:
        cursor = conn.cursor()
        cursor.execute("SELECT department_id FROM students WHERE id = ?", (sid,))
        row = cursor.fetchone()
        cursor.close()
        if not row:
            continue
        dept_id = row[0]
        cursor = conn.cursor()
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM fee_structures WHERE department_id = ?", (dept_id,))
        assessed = cursor.fetchone()[0] or 0.0
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND status = 'completed'", (sid,))
        paid = cursor.fetchone()[0] or 0.0
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM scholarships WHERE student_id = ? AND status = 'approved'", (sid,))
        paid += cursor.fetchone()[0] or 0.0
        cursor.close()
        if assessed and assessed - paid > 0:
            result.append({'student_id': sid, 'dues': round(assessed - paid, 2)})
    if result:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COALESCE(d.name, 'Unassigned') AS department
            FROM students s LEFT JOIN departments_master d ON d.id = s.department_id
            WHERE s.id = ?
            """,
            (result[0]['student_id'],),
        )
        top_dept = cursor.fetchone()
        cursor.close()
    else:
        top_dept = None
    return len(result), top_dept['department'] if top_dept else None


def _dept_risk(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COALESCE(d.name, 'Unassigned') AS department, COUNT(*) AS at_risk
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        WHERE s.attendance < 75 OR s.study_hours < 2
        GROUP BY d.name ORDER BY at_risk DESC
        """
    )
    rows = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    return rows


def _nl_analytics(query):
    q = (query or '').lower()

    if any(w in q for w in ('attendance', 'absent', 'shortage', 'marked')):
        conn = get_db_connection()
        depts = _dept_attendance(conn)
        conn.close()
        lowest = depts[0] if depts else None
        if lowest and lowest['student_count']:
            summary = (f"The department with the lowest attendance is {lowest['department']} at "
                       f"{lowest['avg_attendance']}% across {lowest['student_count']} students.")
        else:
            summary = "No department attendance data is available yet."
        return {'intent': 'attendance', 'summary': summary, 'data': depts}

    if any(w in q for w in ('fee', 'fees', 'due', 'dues', 'defaulter', 'scholarship', 'payment')):
        conn = get_db_connection()
        count, top_dept = _dept_fee_defaulters(conn)
        conn.close()
        summary = (f"{count} student(s) have outstanding fee dues"
                   + (f", concentrated in {top_dept}." if top_dept else "."))
        return {'intent': 'fees', 'summary': summary, 'data': {'defaulters': count, 'top_department': top_dept}}

    if any(w in q for w in ('at-risk', 'at risk', 'risk', 'danger', 'struggling', 'weak')):
        rows = _dept_risk(get_db_connection())
        total = sum(r['at_risk'] for r in rows)
        summary = f"{total} at-risk student(s) identified (attendance below 75% or low study hours)."
        return {'intent': 'at_risk', 'summary': summary, 'data': rows}

    if any(w in q for w in ('placement', 'job', 'intern')):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS c FROM placement_jobs")
        jobs = cursor.fetchone()['c']
        cursor.execute("SELECT COUNT(*) AS c FROM placement_applications")
        apps = cursor.fetchone()['c'] if jobs else 0
        cursor.close()
        conn.close()
        summary = f"There are {jobs} active job openings and {apps} student applications so far."
        return {'intent': 'placement', 'summary': summary, 'data': {'jobs': jobs, 'applications': apps}}

    return {
        'intent': 'general',
        'summary': 'I can analyze attendance, fee dues, at-risk students and placements. Try asking: '
                   '"which department\'s attendance dropped this month?" or "how many fee defaulters?"',
        'data': None,
    }


@ai_ops_bp.route('/analytics/nl-query', methods=['POST'])
@require_auth(['admin', 'super_admin', 'principal', 'hod'])
def nl_analytics():
    data = request.get_json(silent=True) or {}
    query = str(data.get('query') or '').strip()
    if not query:
        return jsonify({'message': 'Query is required!'}), 400
    return jsonify({'query': query, **_nl_analytics(query)}), 200


@ai_ops_bp.route('/analytics/nl/suggestions', methods=['GET'])
@require_auth(['admin', 'super_admin', 'principal', 'hod'])
def nl_suggestions():
    return jsonify({'items': [
        "Which department's attendance dropped this month?",
        "How many students have fee dues?",
        "Which departments have at-risk students?",
        "What is the placement status?",
    ]}), 200