# Operations: 75% attendance completion rule, leave applications with documents,
# and attendance for teachers / HOD / staff recorded through their own login.
import os
import uuid
from datetime import date
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify, send_file

from db import get_db_connection
from config import Config

ops_bp = Blueprint('ops', __name__)

ADMIN_TEAM = ('admin', 'super_admin', 'principal')
MGMT_ROLES = ADMIN_TEAM + ('hod',)
STAFF_ROLES = ('faculty', 'hod', 'principal', 'accounts', 'librarian', 'warden', 'super_admin', 'admin')
STUDENT_ROLE = ('student',)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
ALLOWED_EXT = {'.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.txt'}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _ensure_ops_tables() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS leave_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_role TEXT NOT NULL,
            user_name TEXT DEFAULT '',
            student_id INTEGER,
            leave_from DATE NOT NULL,
            leave_to DATE NOT NULL,
            reason TEXT NOT NULL,
            document_path TEXT DEFAULT '',
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            reviewed_by INTEGER,
            review_note TEXT DEFAULT '',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS staff_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT DEFAULT '',
            role TEXT DEFAULT '',
            date DATE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'leave', 'half_day')),
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date)
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


_ensure_ops_tables()


def require_auth(allowed_roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            auth = request.headers.get('Authorization', '')
            token = auth.split(' ')[1] if auth.startswith('Bearer ') else None
            if not token:
                return jsonify({'message': 'Token is missing!'}), 401
            try:
                payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            except Exception:
                return jsonify({'message': 'Token is invalid!'}), 401
            if allowed_roles and payload.get('role') not in allowed_roles:
                return jsonify({'message': 'Unauthorized'}), 403
            request.user = payload
            return fn(*args, **kwargs)
        return wrapped
    return decorator


def _notify(role, recipient_id, title, message, category='ops'):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notifications (recipient_role, recipient_id, title, message, category, is_read) "
        "VALUES (?, ?, ?, ?, ?, 0)",
        (role, recipient_id, title, message, category),
    )
    conn.commit()
    cursor.close()
    conn.close()


def _save_document(file_storage, user_id):
    """Persist an uploaded document and return its stored path."""
    if not file_storage or not file_storage.filename:
        return ''
    filename = file_storage.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f'File type not allowed ({ext or "none"}). Use PDF/PNG/JPG/DOC.')
    safe = f'u{user_id}_{uuid.uuid4().hex[:10]}{ext}'
    dest = os.path.join(UPLOAD_DIR, safe)
    file_storage.save(dest)
    return os.path.join('uploads', safe)


# --------------------------------------------------------------------------
# 1. Attendance completion criteria (75% rule)
# --------------------------------------------------------------------------
@ops_bp.route('/attendance/summary/me', methods=['GET'])
@require_auth(STUDENT_ROLE)
def attendance_summary_me():
    user = request.user
    student_id = user.get('student_id')
    if not student_id:
        return jsonify({'message': 'No linked student account.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM attendance WHERE student_id = ?", (student_id,))
    rows = cursor.fetchall()
    total = len(rows)
    present = sum(1 for r in rows if r[0] == 'present')
    absent = total - present

    if total > 0:
        pct = round((present / total) * 100, 1)
    else:
        cursor.execute("SELECT attendance FROM students WHERE id = ?", (student_id,))
        row = cursor.fetchone()
        pct = round(float(row[0] or 0), 1)
        total = 0
        present = 0
        absent = 0

    # Classes still needed so that (present + attend) / (total + attend) >= 75%.
    missing = max(0.0, (0.75 * total - present) / 0.25)
    additional_needed = 0 if pct >= 75 else max(1, -(int(-missing)))  # ceil
    # Classes you can still skip while staying at/above 75%.
    can_miss = max(0, int((0.25 * total) // 1) - absent)

    if pct >= 90:
        status = 'high'
    elif pct >= 75:
        status = 'ok'
    elif pct >= 60:
        status = 'warning'
    else:
        status = 'critical'

    cursor.execute("SELECT COUNT(*) FROM leave_applications WHERE student_id = ? AND status = 'pending'", (student_id,))
    pending_leave = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ? AND date(date) = date('now')", (student_id,))
    marked_today_count = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    return jsonify({
        'present': present,
        'absent': absent,
        'total_classes': total,
        'percentage': pct,
        'status': status,
        'additional_needed': additional_needed,
        'can_miss': can_miss,
        'pending_leave': pending_leave,
        'marked_today': marked_today_count > 0,
        'target': 75,
    }), 200


# --------------------------------------------------------------------------
# 2. Leave applications (reason + supporting document), with approval flow
# --------------------------------------------------------------------------
@ops_bp.route('/leaves', methods=['POST'])
@require_auth(STUDENT_ROLE + STAFF_ROLES)
def create_leave():
    user = request.user
    form = {k: (v[0] if isinstance(v, list) else v) for k, v in (request.form or {}).items()}
    json_body = request.get_json(silent=True) or {}
    def field(name):
        val = form.get(name)
        if val is None:
            val = json_body.get(name)
        return str(val or '').strip()
    leave_from = field('leave_from')
    leave_to = field('leave_to')
    reason = field('reason')
    if not leave_from or not leave_to or not reason:
        return jsonify({'message': 'leave_from, leave_to and reason are required.'}), 400
    if reason and len(reason) > 500:
        return jsonify({'message': 'Reason too long.'}), 400
    if request.content_length and request.content_length > MAX_UPLOAD_BYTES + 1024:
        return jsonify({'message': 'Document too large (max 8 MB).'}), 413

    try:
        document_path = _save_document(request.files.get('document'), user.get('id') or 0)
    except ValueError as e:
        return jsonify({'message': str(e)}), 400

    student_id = user.get('student_id') if user.get('role') == 'student' else None

    display_name = user.get('name') or ''
    if not display_name:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM users WHERE id = ?", (user.get('id'),))
        row = cursor.fetchone()
        display_name = row[0] if row else ''
        cursor.close()
        conn.close()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO leave_applications
            (user_id, user_role, user_name, student_id, leave_from, leave_to, reason, document_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user.get('id') or 0, user.get('role'), display_name, student_id,
         leave_from, leave_to, reason, document_path),
    )
    conn.commit()
    leave_id = cursor.lastrowid
    cursor.close()
    conn.close()

    _notify('admin', None, 'New leave application',
            f'{display_name} ({user.get("role")}) applied for leave '
            f'{leave_from} to {leave_to}. Reason: {reason[:120]}', 'leave')

    _emit_campus()
    return jsonify({'message': 'Leave application submitted.', 'id': leave_id}), 201


@ops_bp.route('/leaves', methods=['GET'])
@require_auth(STUDENT_ROLE + STAFF_ROLES)
def my_leaves():
    user = request.user
    where, params = 'user_role = ? AND user_id = ?', [user.get('role'), user.get('id')]
    if user.get('role') == 'student' and user.get('student_id'):
        where, params = 'student_id = ?', [user.get('student_id')]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM leave_applications WHERE {where} ORDER BY id DESC", params)
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()

    pending = sum(1 for i in items if i['status'] == 'pending')
    return jsonify({'items': items, 'pending': pending}), 200


@ops_bp.route('/leaves/all', methods=['GET'])
@require_auth(MGMT_ROLES)
def all_leaves():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_applications ORDER BY id DESC")
    items = [dict(r) for r in cursor.fetchall()]
    stats = {
        'pending': sum(1 for i in items if i['status'] == 'pending'),
        'approved': sum(1 for i in items if i['status'] == 'approved'),
        'rejected': sum(1 for i in items if i['status'] == 'rejected'),
    }
    cursor.close()
    conn.close()
    return jsonify({'items': items, 'stats': stats}), 200


@ops_bp.route('/leaves/<int:leave_id>/review', methods=['POST'])
@require_auth(MGMT_ROLES)
def review_leave(leave_id):
    user = request.user
    data = request.get_json() or {}
    status = str(data.get('status') or '').strip()
    note = str(data.get('review_note') or '').strip()
    if status not in ('approved', 'rejected'):
        return jsonify({'message': 'status must be approved or rejected.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_applications WHERE id = ?", (leave_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Leave not found.'}), 404
    leave = dict(row)
    cursor.execute(
        "UPDATE leave_applications SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?",
        (status, user.get('id'), note, leave_id),
    )
    conn.commit()
    cursor.close()
    conn.close()

    _notify(leave.get('user_role'), leave.get('user_id'),
            f'Leave {"approved" if status == "approved" else "rejected"}: {leave.get("leave_from")} to {leave.get("leave_to")}',
            f'Your leave application ({leave_id}) was {status}.', 'leave')
    _emit_campus()
    return jsonify({'message': f'Leave {status}.'}), 200


@ops_bp.route('/leaves/<int:leave_id>/document', methods=['GET'])
@require_auth(STUDENT_ROLE + STAFF_ROLES + MGMT_ROLES)
def leave_document(leave_id):
    user = request.user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leave_applications WHERE id = ?", (leave_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return jsonify({'message': 'Leave not found.'}), 404
    leave = dict(row)
    allowed = user.get('role') in MGMT_ROLES or leave.get('user_id') == user.get('id')
    if not allowed:
        return jsonify({'message': 'Unauthorized'}), 403
    if not leave.get('document_path'):
        return jsonify({'message': 'No document attached.'}), 404
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', leave['document_path'])
    if not os.path.exists(path):
        return jsonify({'message': 'Document missing on server.'}), 404
    return send_file(path, mimetype='application/octet-stream', as_attachment=True,
                     download_name=os.path.basename(leave['document_path']))


# --------------------------------------------------------------------------
# 3. Teacher / HOD / staff attendance recorded through their own login
# --------------------------------------------------------------------------
@ops_bp.route('/staff/attendance', methods=['POST'])
@require_auth(STAFF_ROLES)
def mark_staff_attendance():
    user = request.user
    data = request.get_json() or {}
    status = str(data.get('status') or '').strip()
    notes = str(data.get('notes') or '').strip()
    day = str(data.get('date') or str(date.today())).strip()
    if status not in ('present', 'absent', 'leave', 'half_day'):
        return jsonify({'message': 'status must be present/absent/leave/half_day.'}), 400
    if len(notes) > 300:
        return jsonify({'message': 'Notes too long.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (user.get('id'),))
    user_row = cursor.fetchone()
    if not user_row:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Invalid account.'}), 400
    display_name = dict(user_row).get('name') if hasattr(user_row, 'keys') else user_row[1]
    cursor.execute(
        """
        INSERT INTO staff_attendance (user_id, name, role, date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status, notes = excluded.notes
        """,
        (user.get('id'), display_name, user.get('role', ''), day, status, notes),
    )
    conn.commit()
    cursor.close()
    conn.close()

    # Teacher/staff availability notice: absence or leave is broadcast to admin.
    if status in ('absent', 'leave', 'half_day'):
        _notify('admin', None, f'{display_name} is not available',
                f'{display_name} marked {status} on {day}. {notes[:120]}', 'staff_attendance')

    socket = None
    try:
        from app import socketio as _sio
        socket = _sio
    except Exception:
        socket = None
    if socket:
        socket.emit('staff_attendance_update')
        socket.emit('campus_update')

    return jsonify({'message': f'Attendance marked as {status}.'}), 200


@ops_bp.route('/staff/attendance/me', methods=['GET'])
@require_auth(STAFF_ROLES)
def staff_attendance_me():
    user = request.user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM staff_attendance WHERE user_id = ? ORDER BY date DESC", (user.get('id'),))
    items = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT COUNT(*) FROM staff_attendance WHERE user_id = ?", (user.get('id'),))
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM staff_attendance WHERE user_id = ? AND status = 'present'", (user.get('id'),))
    present = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return jsonify({
        'items': items,
        'total': total,
        'present': present,
        'percentage': round((present / total) * 100, 1) if total else 0,
    }), 200


@ops_bp.route('/staff/attendance/all', methods=['GET'])
@require_auth(ADMIN_TEAM)
def staff_attendance_all():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sa.*, u.role AS current_role
        FROM staff_attendance sa
        LEFT JOIN users u ON u.id = sa.user_id
        ORDER BY sa.date DESC, sa.id DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]

    # Roll-call for today.
    today = str(date.today())
    cursor.execute(
        "SELECT user_id, name, role, status, notes FROM staff_attendance WHERE date = ?", (today,)
    )
    today_rows = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT id, name, role FROM users WHERE role IN ('faculty', 'hod', 'principal', 'accounts', 'librarian', 'warden', 'super_admin')")
    staff_list = [dict(r) for r in cursor.fetchall()]

    # Per-person summary percentage.
    per_person = {}
    for r in rows:
        pp = per_person.setdefault(r['user_id'], {'name': r['name'], 'role': r['role'], 'total': 0, 'present': 0})
        pp['total'] += 1
        if r['status'] == 'present':
            pp['present'] += 1
    for k, v in per_person.items():
        v['percentage'] = round((v['present'] / v['total']) * 100, 1) if v['total'] else 0

    cursor.close()
    conn.close()
    return jsonify({
        'records': rows,
        'today': today,
        'roll_call': today_rows,
        'staff_list': staff_list,
        'per_person': per_person,
    }), 200


def _emit_campus():
    try:
        from app import socketio as _sio
        _sio.emit('campus_update')
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Campus Connect: one live command-center snapshot linking every role.
# ---------------------------------------------------------------------------
@ops_bp.route('/campus/status', methods=['GET'])
@require_auth()
def campus_status():
    conn = get_db_connection()
    cursor = conn.cursor()
    today = str(date.today())

    cursor.execute(
        """
        SELECT s.id AS student_id, s.name, s.department_id, s.semester_id,
               d.name AS department_name, u.id AS user_id,
               EXISTS(SELECT 1 FROM attendance a
                      WHERE a.student_id = s.id AND a.date = ? AND a.status = 'present') AS marked_today
        FROM students s
        LEFT JOIN departments_master d ON d.id = s.department_id
        LEFT JOIN student_user_links l ON l.student_id = s.id
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY s.id
        """,
        (today,),
    )
    students = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT u.id AS user_id, u.name, u.role, sa.status AS today_status
        FROM users u
        LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.date = ?
        WHERE u.role IN ('faculty', 'hod', 'principal', 'accounts', 'librarian',
                         'warden', 'super_admin', 'admin')
        ORDER BY
            CASE u.role WHEN 'faculty' THEN 1 WHEN 'hod' THEN 2 WHEN 'principal' THEN 3
                        WHEN 'accounts' THEN 4 WHEN 'librarian' THEN 5 WHEN 'warden' THEN 6
                        WHEN 'super_admin' THEN 7 ELSE 8 END,
            u.name
        """,
        (today,),
    )
    presence = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT id, user_name, user_role, leave_from, leave_to, reason, status, submitted_at
        FROM leave_applications ORDER BY submitted_at DESC LIMIT 10
        """
    )
    leaves = [dict(r) for r in cursor.fetchall()]

    activity = []
    cursor.execute(
        "SELECT name, role, status, created_at FROM staff_attendance WHERE date = ? ORDER BY created_at DESC LIMIT 8",
        (today,),
    )
    for r in cursor.fetchall():
        activity.append({
            'type': 'staff',
            'text': "{} ({}) marked {} today".format(r['name'], r['role'], r['status'].replace('_', ' ')),
            'time': r['created_at'],
        })

    cursor.execute(
        """
        SELECT user_name, user_role, status, leave_from, leave_to, submitted_at
        FROM leave_applications ORDER BY submitted_at DESC LIMIT 5
        """
    )
    leave_verb = {'pending': 'applied for leave', 'approved': 'had leave approved', 'rejected': 'had leave rejected'}
    for r in cursor.fetchall():
        activity.append({
            'type': 'leave',
            'text': "{} {} ({})".format(r['user_name'], leave_verb.get(r['status'], 'submitted a leave'), r['user_role']),
            'time': r['submitted_at'],
        })

    cursor.execute(
        """
        SELECT sf.content, u.name AS display_name, sf.created_at
        FROM campus_social_feed sf
        LEFT JOIN users u ON u.id = sf.author_id
        ORDER BY sf.created_at DESC LIMIT 5
        """
    )
    for r in cursor.fetchall():
        snippet = (r['content'] or '')[:60]
        activity.append({
            'type': 'post',
            'text': "{} posted: {}".format(r['display_name'] or 'Someone', snippet),
            'time': r['created_at'],
        })

    activity.sort(key=lambda a: a['time'] or '', reverse=True)

    cursor.close()
    conn.close()

    return jsonify({
        'today': today,
        'students': students,
        'presence': presence,
        'leaves': leaves,
        'activity': activity[:20],
        'summary': {
            'students_marked': sum(1 for s in students if s['marked_today']),
            'students_total': len(students),
            'staff_marked': sum(1 for p in presence if p['today_status']),
            'staff_total': len(presence),
            'pending_leaves': sum(1 for l in leaves if l['status'] == 'pending'),
        },
    }), 200