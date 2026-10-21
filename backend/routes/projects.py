# Academic Projects API - manage student projects, milestones, progress and
# student-faculty collaboration.
from functools import wraps
from datetime import datetime, timedelta

import jwt
from flask import Blueprint, request, jsonify

from db import get_db_connection
from config import Config

projects_bp = Blueprint('projects', __name__)

MILESTONE_WEIGHT = {'completed': 100, 'in_progress': 50, 'pending': 0}


def _ensure_project_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            student_id INTEGER NOT NULL,
            guide_user_id INTEGER,
            status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'on_track', 'review', 'completed')),
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (guide_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS project_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            due_date TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS project_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            author_type TEXT NOT NULL CHECK(author_type IN ('student', 'faculty')),
            author_user_id INTEGER,
            progress INTEGER,
            note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS project_discussion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            author_type TEXT NOT NULL CHECK(author_type IN ('student', 'faculty')),
            author_user_id INTEGER,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


# Run table creation whenever this module is imported (import-time, safe/guarded).
_ensure_project_tables()


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


def _recompute_progress(conn, project_id):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM project_milestones WHERE project_id = ?", (project_id,))
    rows = cursor.fetchall()
    cursor.close()
    if not rows:
        return None
    avg = int(round(sum(MILESTONE_WEIGHT[r["status"]] for r in rows) / len(rows)))
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE projects SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (avg, project_id),
    )
    if avg == 100:
        cursor.execute(
            "UPDATE projects SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'completed'",
            (project_id,),
        )
    conn.commit()
    cursor.close()
    return avg


def _fetch_project(conn, project_id):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.*, st.name AS student_name, COALESCE(d.name, '') AS dept_name,
               gu.name AS guide_name
        FROM projects p
        JOIN students st ON st.id = p.student_id
        LEFT JOIN departments_master d ON d.id = st.department_id
        LEFT JOIN users gu ON gu.id = p.guide_user_id
        WHERE p.id = ?
        """,
        (project_id,),
    )
    project = _row_to_dict(cursor.fetchone())
    cursor.close()
    return project


def _author_type(role):
    return 'faculty' if role == 'faculty' else 'student'


def _can_work_on(user, project):
    if user.get('role') == 'admin':
        return True
    if user.get('role') == 'student':
        return user.get('student_id') == project['student_id']
    # Faculty: guide assigned to this project.
    return project['guide_user_id'] == user.get('id')


def _authorize_view(user, project):
    if user.get('role') in ('admin', 'faculty'):
        return True
    return user.get('student_id') == project['student_id']


def _touch(conn, project_id):
    cursor = conn.cursor()
    cursor.execute("UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
    conn.commit()
    cursor.close()


@projects_bp.route('/projects', methods=['GET'])
@require_auth()
def list_projects():
    user = request.user
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = (
        "SELECT p.*, st.name AS student_name, COALESCE(d.name, '') AS dept_name, gu.name AS guide_name, "
        "(SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id) AS milestones_count, "
        "(SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'completed') AS completed_milestones, "
        "(SELECT note FROM project_updates pu WHERE pu.project_id = p.id ORDER BY pu.created_at DESC LIMIT 1) AS last_update "
        "FROM projects p "
        "JOIN students st ON st.id = p.student_id "
        "LEFT JOIN departments_master d ON d.id = st.department_id "
        "LEFT JOIN users gu ON gu.id = p.guide_user_id "
    )
    params = []
    role = user.get('role')
    if role == 'student':
        sql += "WHERE p.student_id = ? "
        params.append(user.get('student_id'))
    elif role == 'faculty' and request.args.get('scope') != 'all':
        sql += "WHERE p.guide_user_id = ? "
        params.append(user.get('id'))
    sql += "ORDER BY p.updated_at DESC"

    cursor.execute(sql, params)
    projects = [_row_to_dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': projects}), 200


@projects_bp.route('/projects', methods=['POST'])
@require_auth(['student', 'admin'])
def create_project():
    user = request.user
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'message': 'Project title is required!'}), 400
    student_id = user.get('student_id') if user.get('role') == 'student' else data.get('student_id')
    if not student_id:
        return jsonify({'message': 'A student must own the project.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO projects (title, description, student_id, guide_user_id, status, progress)
        VALUES (?, ?, ?, ?, 'not_started', 0)
        """,
        (title, (data.get('description') or '').strip(), student_id, data.get('guide_user_id')),
    )
    project_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': project_id}), 201


@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
@require_auth()
def get_project(project_id):
    user = request.user
    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _authorize_view(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT * FROM project_milestones
        WHERE project_id = ? ORDER BY due_date IS NULL, due_date ASC, id ASC
        """,
        (project_id,),
    )
    milestones = [_row_to_dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT pu.*, u.name AS author_name FROM project_updates pu
        LEFT JOIN users u ON u.id = pu.author_user_id
        WHERE pu.project_id = ? ORDER BY pu.created_at DESC LIMIT 50
        """,
        (project_id,),
    )
    updates = [_row_to_dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT pd.*, u.name AS author_name FROM project_discussion pd
        LEFT JOIN users u ON u.id = pd.author_user_id
        WHERE pd.project_id = ? ORDER BY pd.created_at ASC
        """,
        (project_id,),
    )
    discussion = [_row_to_dict(r) for r in cursor.fetchall()]

    cursor.close()
    conn.close()
    return jsonify({
        'project': project,
        'milestones': milestones,
        'updates': updates,
        'discussion': discussion,
    }), 200


@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
@require_auth()
def update_project(project_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _can_work_on(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    fields = []
    params = []
    for col in ('title', 'description', 'status', 'progress'):
        if col in data:
            fields.append(f"{col} = ?")
            params.append(data[col])
    if not fields:
        conn.close()
        return jsonify({'message': 'Nothing to update.'}), 400
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(project_id)

    cursor = conn.cursor()
    cursor.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Project updated!'}), 200


@projects_bp.route('/projects/<int:project_id>/guide', methods=['POST'])
@require_auth()
def assign_guide(project_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404

    role = user.get('role')
    guide_user_id = project['guide_user_id']
    if role == 'admin' and data.get('guide_user_id'):
        guide_user_id = data['guide_user_id']
    elif role == 'faculty':
        guide_user_id = user.get('id')
    else:
        conn.close()
        return jsonify({'message': 'Students cannot assign guides.'}), 403

    cursor = conn.cursor()
    cursor.execute(
        "UPDATE projects SET guide_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (guide_user_id, project_id),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Guide assigned!', 'guide_user_id': guide_user_id}), 200


@projects_bp.route('/projects/<int:project_id>/milestones', methods=['POST'])
@require_auth()
def add_milestone(project_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'message': 'Milestone title is required!'}), 400

    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _can_work_on(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO project_milestones (project_id, title, due_date, status) VALUES (?, ?, ?, 'pending')",
        (project_id, title, data.get('due_date')),
    )
    milestone_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    _touch(conn, project_id)
    conn.close()
    return jsonify({'id': milestone_id}), 201


@projects_bp.route('/projects/<int:project_id>/milestones/<int:milestone_id>', methods=['PUT'])
@require_auth()
def update_milestone(project_id, milestone_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in MILESTONE_WEIGHT:
        return jsonify({'message': 'Invalid milestone status!'}), 400

    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _can_work_on(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    cursor = conn.cursor()
    cursor.execute(
        "UPDATE project_milestones SET status = ? WHERE id = ? AND project_id = ?",
        (status, milestone_id, project_id),
    )
    conn.commit()
    cursor.close()

    _recompute_progress(conn, project_id)
    _touch(conn, project_id)
    conn.close()
    return jsonify({'message': 'Milestone updated!'}), 200


@projects_bp.route('/projects/<int:project_id>/progress', methods=['POST'])
@require_auth()
def add_progress(project_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    try:
        progress = int(data.get('progress'))
    except (TypeError, ValueError):
        return jsonify({'message': 'Valid progress is required (0-100)!'}), 400
    progress = max(0, min(100, progress))
    note = (data.get('note') or '').strip()

    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _can_work_on(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    author_type = _author_type(user.get('role'))
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO project_updates (project_id, author_type, author_user_id, progress, note)
        VALUES (?, ?, ?, ?, ?)
        """,
        (project_id, author_type, user.get('id'), progress, note),
    )
    cursor.execute("UPDATE projects SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (progress, project_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Progress updated!'}), 201


@projects_bp.route('/projects/<int:project_id>/discussion', methods=['POST'])
@require_auth()
def post_discussion(project_id):
    user = request.user
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'message': 'Message is required!'}), 400

    conn = get_db_connection()
    project = _fetch_project(conn, project_id)
    if not project:
        conn.close()
        return jsonify({'message': 'Project not found!'}), 404
    if not _can_work_on(user, project):
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    author_type = _author_type(user.get('role'))
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO project_discussion (project_id, author_type, author_user_id, message)
        VALUES (?, ?, ?, ?)
        """,
        (project_id, author_type, user.get('id'), message),
    )
    conn.commit()
    _touch(conn, project_id)
    cursor.close()
    conn.close()
    return jsonify({'message': 'Message posted!'}), 201


@projects_bp.route('/admin/project-analytics', methods=['GET'])
@require_auth(['admin', 'super_admin', 'principal'])
def project_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS c FROM projects")
    total = cursor.fetchone()['c']

    cursor.execute("SELECT COUNT(DISTINCT student_id) AS c FROM projects")
    students_involved = cursor.fetchone()['c']

    cursor.execute("SELECT COALESCE(AVG(progress), 0) AS a FROM projects")
    avg_progress = round(cursor.fetchone()['a'] or 0)

    cursor.execute(
        "SELECT status, COUNT(*) AS c FROM projects GROUP BY status ORDER BY c DESC"
    )
    by_status = {r['status']: r['c'] for r in cursor.fetchall()}

    cursor.execute(
        """
        SELECT COALESCE(d.name, 'Unassigned') AS department, COUNT(p.id) AS project_count,
               COALESCE(AVG(p.progress), 0) AS avg_progress
        FROM projects p
        LEFT JOIN students st ON st.id = p.student_id
        LEFT JOIN departments_master d ON d.id = st.department_id
        GROUP BY d.name ORDER BY project_count DESC
        """
    )
    per_department = [_row_to_dict(r) for r in cursor.fetchall()]
    for row in per_department:
        row['avg_progress'] = round(row['avg_progress'] or 0)

    cursor.execute(
        """
        SELECT pu.project_id, p.title AS project_title, pu.progress, pu.note,
               u.name AS author_name, pu.author_type, pu.created_at
        FROM project_updates pu
        JOIN projects p ON p.id = pu.project_id
        LEFT JOIN users u ON u.id = pu.author_user_id
        ORDER BY pu.created_at DESC LIMIT 6
        """
    )
    recent_updates = [_row_to_dict(r) for r in cursor.fetchall()]

    weekly = []
    today = datetime.now()
    for week_offset in range(7, -1, -1):
        start = (today - timedelta(days=week_offset)).strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) AS c FROM projects WHERE date(created_at) = ?", (start,))
        weekly.append({'label': start, 'count': cursor.fetchone()['c']})

    cursor.close()
    conn.close()
    return jsonify({
        'total_projects': total,
        'students_involved': students_involved,
        'avg_progress': avg_progress,
        'by_status': by_status,
        'per_department': per_department,
        'recent_updates': recent_updates,
        'weekly_created': weekly,
    }), 200