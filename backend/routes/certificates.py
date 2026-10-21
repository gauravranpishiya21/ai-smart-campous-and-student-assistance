# Certificates & exam documents: bonafide / TC / QR ID cards, hall tickets and
# revaluation requests.
import uuid
from functools import wraps
from datetime import date

import jwt
from flask import Blueprint, request, jsonify

from db import get_db_connection
from config import Config

certificates_bp = Blueprint('certificates', __name__)

DOC_TYPES = ('bonafide', 'transfer_certificate', 'id_card')
MGMT_ROLES = ('admin', 'super_admin', 'principal', 'hod')


def _ensure_certificate_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS student_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            doc_type TEXT NOT NULL CHECK(doc_type IN ('bonafide', 'transfer_certificate', 'id_card')),
            status TEXT DEFAULT 'requested' CHECK(status IN ('requested', 'issued', 'rejected')),
            details TEXT DEFAULT '',
            qr_token TEXT,
            issued_on DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS revaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_name TEXT NOT NULL,
            exam_name TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'done', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


_ensure_certificate_tables()


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


@certificates_bp.route('/certificates/request', methods=['POST'])
@require_auth(['student'])
def request_document():
    user = request.user
    data = request.get_json(silent=True) or {}
    doc_type = data.get('doc_type')
    if doc_type not in DOC_TYPES:
        return jsonify({'message': f'Type must be one of: {", ".join(DOC_TYPES)}'}), 400
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO student_documents (student_id, doc_type, details) VALUES (?, ?, ?)",
        (student_id, doc_type, (data.get('details') or '')),
    )
    doc_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': doc_id, 'message': 'Certificate request submitted!'}), 201


@certificates_bp.route('/certificates/me', methods=['GET'])
@require_auth(['student'])
def my_documents():
    user = request.user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM student_documents WHERE student_id = ? ORDER BY id DESC",
        (user.get('student_id'),),
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@certificates_bp.route('/certificates', methods=['GET'])
@require_auth(list(MGMT_ROLES))
def review_documents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT d.*, s.name AS student_name, COALESCE(dept.name, '') AS dept_name
        FROM student_documents d
        JOIN students s ON s.id = d.student_id
        LEFT JOIN departments_master dept ON dept.id = s.department_id
        ORDER BY d.id DESC
        """
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@certificates_bp.route('/certificates/<int:doc_id>', methods=['POST'])
@require_auth(list(MGMT_ROLES))
def resolve_document(doc_id):
    data = request.get_json(silent=True) or {}
    action = data.get('action')
    if action not in ('issue', 'reject'):
        return jsonify({'message': 'Action must be issue or reject.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    if not doc:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Document request not found!'}), 404
    if action == 'issue':
        cursor.execute(
            "UPDATE student_documents SET status = 'issued', qr_token = ?, issued_on = ? WHERE id = ?",
            (uuid.uuid4().hex, date.today().isoformat(), doc_id),
        )
    else:
        cursor.execute("UPDATE student_documents SET status = 'rejected' WHERE id = ?", (doc_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Document request updated!'}), 200


@certificates_bp.route('/exams/hall-ticket/me', methods=['GET'])
@require_auth(['student'])
def my_hall_ticket():
    user = request.user
    student_id = user.get('student_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id, s.name, COALESCE(d.name, '') AS dept_name,
               COALESCE(sem.name, '') AS semester_name
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        LEFT JOIN semesters_master sem ON sem.id = s.semester_id
        WHERE s.id = ?
        """,
        (student_id,),
    )
    row = cursor.fetchone()
    student = dict(row) if row else None
    if not student:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Student not found!'}), 404

    cursor.execute(
        """
        SELECT es.*, COALESCE(cs.subject_name, 'Subject ' || es.subject_id) AS subject_name
        FROM exam_schedules es
        LEFT JOIN curriculum_subjects cs ON cs.id = es.subject_id
        ORDER BY es.exam_date
        """
    )
    exams = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()

    student['hall_ticket_no'] = f"HT-{student['id']:05d}-{date.today().year}"
    return jsonify({'student': student, 'exams': exams}), 200


@certificates_bp.route('/exams/revaluation', methods=['POST'])
@require_auth(['student'])
def request_revaluation():
    user = request.user
    data = request.get_json(silent=True) or {}
    subject_name = str(data.get('subject_name') or '').strip()
    if not subject_name:
        return jsonify({'message': 'Subject name is required!'}), 400
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO revaluations (student_id, subject_name, exam_name, reason)
        VALUES (?, ?, ?, ?)
        """,
        (student_id, subject_name, (data.get('exam_name') or ''), (data.get('reason') or '')),
    )
    rv_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': rv_id, 'message': 'Revaluation request submitted!'}), 201


@certificates_bp.route('/exams/revaluations', methods=['GET', 'POST'])
@require_auth()
def revaluations():
    user = request.user
    if request.method == 'POST':
        return request_revaluation()

    if user.get('role') not in MGMT_ROLES:
        return jsonify({'message': 'Unauthorized'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT r.*, s.name AS student_name, COALESCE(d.name, '') AS dept_name
        FROM revaluations r
        JOIN students s ON s.id = r.student_id
        LEFT JOIN departments_master d ON d.id = s.department_id
        ORDER BY r.id DESC
        """
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200