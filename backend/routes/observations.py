# Observation Reports API - weekly observation and tracking insights recorded by faculty.
from functools import wraps
from datetime import date

import jwt
from flask import Blueprint, request, jsonify

from db import get_db_connection
from config import Config

observations_bp = Blueprint('observations', __name__)


def _ensure_observation_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS observation_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faculty_user_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            week_start TEXT,
            week_label TEXT,
            observation TEXT DEFAULT '',
            strengths TEXT DEFAULT '',
            areas_to_improve TEXT DEFAULT '',
            rating INTEGER CHECK(rating BETWEEN 1 AND 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (faculty_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


_ensure_observation_tables()


def _row_to_dict(row):
    if row is None:
        return None
    return dict(row)


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


@observations_bp.route('/observations/student-options', methods=['GET'])
@require_auth(['faculty', 'admin'])
def student_options():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id, s.name, COALESCE(d.name, '') AS dept_name, s.attendance
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        ORDER BY s.name
        """
    )
    students = [_row_to_dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': students}), 200


@observations_bp.route('/observations', methods=['POST'])
@require_auth(['faculty', 'admin'])
def create_observation():
    user = request.user
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    if not student_id:
        return jsonify({'message': 'Student is required!'}), 400

    rating = data.get('rating')
    if rating is not None:
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({'message': 'Rating must be 1-5!'}), 400
        if not (1 <= rating <= 5):
            return jsonify({'message': 'Rating must be 1-5!'}), 400

    week_start = data.get('week_start') or date.today().isoformat()
    week_label = data.get('week_label') or f"Week of {week_start}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO observation_reports
            (faculty_user_id, student_id, week_start, week_label, observation, strengths, areas_to_improve, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user.get('id'),
            student_id,
            week_start,
            week_label,
            (data.get('observation') or ''),
            (data.get('strengths') or ''),
            (data.get('areas_to_improve') or ''),
            rating,
        ),
    )
    report_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': report_id}), 201


@observations_bp.route('/observations', methods=['GET'])
@require_auth()
def list_observations():
    user = request.user
    role = user.get('role')
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = (
        "SELECT o.*, s.name AS student_name, COALESCE(d.name, '') AS dept_name, u.name AS faculty_name "
        "FROM observation_reports o "
        "JOIN students s ON s.id = o.student_id "
        "LEFT JOIN departments_master d ON d.id = s.department_id "
        "JOIN users u ON u.id = o.faculty_user_id "
    )
    clauses = []
    params = []
    if role == 'faculty':
        clauses.append("o.faculty_user_id = ?")
        params.append(user.get('id'))
    if request.args.get('student_id'):
        clauses.append("o.student_id = ?")
        params.append(request.args.get('student_id', type=int))
    if request.args.get('week'):
        clauses.append("o.week_start >= ?")
        params.append(request.args.get('week'))
    if clauses:
        sql += "WHERE " + " AND ".join(clauses)
    sql += " ORDER BY o.created_at DESC"

    cursor.execute(sql, params)
    reports = [_row_to_dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': reports}), 200


@observations_bp.route('/observations/<int:report_id>', methods=['PUT'])
@require_auth(['faculty', 'admin'])
def update_observation(report_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM observation_reports WHERE id = ?", (report_id,))
    report = _row_to_dict(cursor.fetchone())
    if not report:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Observation not found!'}), 404
    if user.get('role') != 'admin' and report['faculty_user_id'] != user.get('id'):
        cursor.close()
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    fields = []
    params = []
    for col in ('week_start', 'week_label', 'observation', 'strengths', 'areas_to_improve', 'rating', 'student_id'):
        if col in data:
            fields.append(f"{col} = ?")
            params.append(data[col])
    if not fields:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Nothing to update.'}), 400
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(report_id)

    cursor.execute(f"UPDATE observation_reports SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Observation updated!'}), 200


@observations_bp.route('/observations/students/me', methods=['GET'])
@require_auth(['student'])
def my_observations():
    user = request.user
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT o.*, u.name AS faculty_name FROM observation_reports o
        JOIN users u ON u.id = o.faculty_user_id
        WHERE o.student_id = ? ORDER BY o.created_at DESC
        """,
        (student_id,),
    )
    reports = [_row_to_dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': reports}), 200