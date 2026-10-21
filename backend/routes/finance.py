# Finance suite: fee structures, dues tracking, scholarships, receipts and
# defaulter reports.
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify

from db import get_db_connection
from config import Config

finance_bp = Blueprint('finance', __name__)

FINANCE_ROLES = ('admin', 'super_admin', 'principal', 'accounts')


def _ensure_finance_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS fee_structures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER,
            semester_id INTEGER,
            head TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments_master(id),
            FOREIGN KEY (semester_id) REFERENCES semesters_master(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholarships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """
    )
    try:
        cursor.execute("ALTER TABLE payments ADD COLUMN receipt_number TEXT")
    except Exception:
        pass
    conn.commit()
    cursor.close()
    conn.close()


_ensure_finance_tables()


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


def _assessed_amount(conn, student_id):
    cursor = conn.cursor()
    cursor.execute("SELECT department_id, semester_id FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    cursor.close()
    if not row:
        return 0.0
    dept_id, sem_id = row[0], row[1]
    if not dept_id and not sem_id:
        return 0.0
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COALESCE(SUM(amount), 0) FROM fee_structures
        WHERE (department_id = ? OR ? IS NULL) AND (semester_id = ? OR ? IS NULL)
        """,
        (dept_id, dept_id, sem_id, sem_id),
    )
    amount = cursor.fetchone()[0] or 0.0
    cursor.close()
    return float(amount)


def _paid_amount(conn, student_id):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND status = 'completed'",
        (student_id,),
    )
    amt = cursor.fetchone()[0] or 0.0
    cursor.close()
    return float(amt)


def _scholarship_amount(conn, student_id):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM scholarships WHERE student_id = ? AND status = 'approved'",
        (student_id,),
    )
    amt = cursor.fetchone()[0] or 0.0
    cursor.close()
    return float(amt)


@finance_bp.route('/fees/structures', methods=['GET'])
@require_auth(list(FINANCE_ROLES))
def list_fee_structures():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT fs.*, COALESCE(d.name, '') AS department_name, COALESCE(s.name, '') AS semester_name
        FROM fee_structures fs
        LEFT JOIN departments_master d ON d.id = fs.department_id
        LEFT JOIN semesters_master s ON s.id = fs.semester_id
        ORDER BY fs.id DESC
        """
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@finance_bp.route('/fees/structures', methods=['POST'])
@require_auth(list(FINANCE_ROLES))
def create_fee_structure():
    data = request.get_json(silent=True) or {}
    head = str(data.get('head') or '').strip()
    try:
        amount = float(data.get('amount') or 0)
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid amount!'}), 400
    if not head or amount <= 0:
        return jsonify({'message': 'Head and amount (>0) are required!'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO fee_structures (department_id, semester_id, head, amount) VALUES (?, ?, ?, ?)",
        (data.get('department_id'), data.get('semester_id'), head, amount),
    )
    fee_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': fee_id}), 201


@finance_bp.route('/fees/dues', methods=['GET'])
@require_auth(list(FINANCE_ROLES))
def fee_dues_report():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id, s.name, COALESCE(d.name, '') AS dept_name,
               COALESCE(sem.name, '') AS semester_name, s.attendance
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        LEFT JOIN semesters_master sem ON sem.id = s.semester_id
        ORDER BY s.id
        """
    )
    rows = cursor.fetchall()
    cursor.close()

    items = []
    for r in rows:
        sid = r['id']
        assessed = _assessed_amount(conn, sid)
        paid = _paid_amount(conn, sid)
        paid += _scholarship_amount(conn, sid)
        dues = round(assessed - paid, 2)
        if assessed:
            items.append({
                'student_id': sid,
                'student_name': r['name'],
                'dept_name': r['dept_name'] or '',
                'semester_name': r['semester_name'] or '',
                'attendance': r['attendance'],
                'assessed': round(assessed, 2),
                'paid': round(paid, 2),
                'dues': max(dues, 0),
                'paid_pct': round((paid / assessed) * 100, 1),
            })
    conn.close()
    return jsonify({'items': items}), 200


@finance_bp.route('/fees/defaulter-report', methods=['GET'])
@require_auth(list(FINANCE_ROLES))
def defaulter_report():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id, s.name, COALESCE(d.name, '') AS dept_name, s.attendance
        FROM students s LEFT JOIN departments_master d ON d.id = s.department_id
        """
    )
    rows = cursor.fetchall()
    cursor.close()

    defaulters = []
    for r in rows:
        assessed = _assessed_amount(conn, r['id'])
        paid = _paid_amount(conn, r['id']) + _scholarship_amount(conn, r['id'])
        dues = round(assessed - paid, 2)
        if assessed and dues > 0:
            defaulters.append({
                'student_id': r['id'],
                'student_name': r['name'],
                'dept_name': r['dept_name'] or '',
                'attendance': r['attendance'],
                'dues': dues,
                'paid_pct': round((paid / assessed) * 100, 1),
            })
    defaulters.sort(key=lambda x: x['dues'], reverse=True)
    conn.close()
    return jsonify({'items': defaulters}), 200


@finance_bp.route('/fees/student/me', methods=['GET'])
@require_auth(['student'])
def my_fees():
    user = request.user
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT department_id, semester_id FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    dept_id = row[0] if row else None
    cur_sem = row[1] if row else None

    # Semester-wise assessment across the whole programme.
    cursor.execute(
        """
        SELECT semester_id, COALESCE(SUM(amount), 0)
        FROM fee_structures
        WHERE department_id = ? AND semester_id IS NOT NULL
        GROUP BY semester_id
        """,
        (dept_id,),
    )
    per_sem_assessed = {r[0]: float(r[1]) for r in cursor.fetchall()}
    if len(per_sem_assessed) == 0 and cur_sem:
        cursor.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM fee_structures WHERE department_id = ? AND semester_id IS NULL",
            (dept_id,),
        )
        per_sem_assessed[cur_sem or 1] = float(cursor.fetchone()[0] or 0.0)

    assessed = round(sum(per_sem_assessed.values()), 2)

    cursor.close()

    paid = _paid_amount(conn, student_id)
    scholarship = _scholarship_amount(conn, student_id)
    dues = round(assessed - paid - scholarship, 2)

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.id, p.amount, p.status, p.payment_id, p.created_at,
               COALESCE(p.receipt_number, printf('RC%05d', p.id)) AS receipt_number
        FROM payments p WHERE p.student_id = ? ORDER BY p.created_at DESC
        """,
        (student_id,),
    )
    receipts = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT name, amount, status, created_at FROM scholarships WHERE student_id = ? ORDER BY id DESC", (student_id,))
    scholarships = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()

    # Allocate the completed payments to semesters oldest-first.
    credits = [r['amount'] for r in receipts if r.get('status') == 'completed']
    semesters = []
    remaining = float(sum(credits))
    if cur_sem:
        for sem in range(1, cur_sem + 1):
            sem_assessed = float(per_sem_assessed.get(sem, 0.0))
            sem_paid = round(min(remaining, sem_assessed), 2) if sem_assessed else 0.0
            remaining = round(remaining - sem_paid, 2)
            sem_status = 'paid' if sem_assessed and sem_paid >= sem_assessed else ('partial' if sem_paid > 0 else 'unpaid')
            semesters.append({
                'semester': sem,
                'assessed': sem_assessed,
                'paid': sem_paid,
                'dues': round(sem_assessed - sem_paid, 2),
                'status': sem_status if sem_assessed else 'not-assessed',
            })

    return jsonify({
        'assessed': assessed,
        'paid': round(paid, 2),
        'scholarship': round(scholarship, 2),
        'dues': max(dues, 0),
        'current_semester': cur_sem or 1,
        'semesters': semesters,
        'paid_pct': round((paid / assessed) * 100, 1) if assessed else 0,
        'receipts': receipts,
        'scholarships': scholarships,
    }), 200


@finance_bp.route('/fees/scholarships', methods=['GET'])
@require_auth(list(FINANCE_ROLES))
def list_scholarships():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sch.*, s.name AS student_name, COALESCE(d.name, '') AS dept_name
        FROM scholarships sch
        JOIN students s ON s.id = sch.student_id
        LEFT JOIN departments_master d ON d.id = s.department_id
        ORDER BY sch.id DESC
        """
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@finance_bp.route('/fees/scholarships', methods=['POST'])
@require_auth(list(FINANCE_ROLES))
def create_scholarship():
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    name = str(data.get('name') or '').strip()
    try:
        amount = float(data.get('amount') or 0)
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid amount!'}), 400
    if not student_id or not name or amount <= 0:
        return jsonify({'message': 'Student, name and amount are required!'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scholarships (student_id, name, amount, status) VALUES (?, ?, ?, ?)",
        (student_id, name, amount, data.get('status') or 'pending'),
    )
    sch_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': sch_id}), 201