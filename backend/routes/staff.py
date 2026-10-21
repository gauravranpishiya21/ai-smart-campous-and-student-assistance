# Role-based access support: new staff roles (Super Admin, Principal, HOD,
# Accounts, Librarian, Warden) + staff account management.
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash

from db import get_db_connection
from config import Config

staff_bp = Blueprint('staff', __name__)

STAFF_ROLES = ('super_admin', 'principal', 'hod', 'accounts', 'librarian', 'warden')
ADMIN_ROLES = ('admin', 'super_admin')


def _ensure_role_support() -> None:
    """Rebuild users table if it still carries the restrictive role CHECK so
    that the new staff roles can be stored. Idempotent."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
    row = cursor.fetchone()
    sql = row[0] if row else ''
    if 'CHECK(role' in sql.replace(' ', ''):
        cursor.execute("ALTER TABLE users RENAME TO users_legacy")
        cursor.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                mobile TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                theme TEXT DEFAULT 'light'
            )
            """
        )
        cursor.execute(
            "INSERT INTO users (id, name, role, mobile, password, created_at, theme) "
            "SELECT id, name, role, mobile, password, created_at, COALESCE(theme, 'light') FROM users_legacy"
        )
        cursor.execute("DROP TABLE users_legacy")
        conn.commit()
    cursor.close()
    conn.close()


_ensure_role_support()


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


@staff_bp.route('/staff/create', methods=['POST'])
@require_auth(['admin', 'super_admin'])
def create_staff():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name') or '').strip()
    role = str(data.get('role') or '').strip()
    mobile = str(data.get('mobile') or '').strip()
    password = str(data.get('password') or '')

    if not all([name, role, mobile, password]):
        return jsonify({'message': 'All fields required!'}), 400
    if role not in STAFF_ROLES:
        return jsonify({'message': f'Role must be one of: {", ".join(STAFF_ROLES)}'}), 400
    if len(name) < 2 or len(name) > 80:
        return jsonify({'message': 'Invalid name'}), 400
    if len(mobile) < 8 or len(mobile) > 20:
        return jsonify({'message': 'Invalid mobile'}), 400
    if len(password) < 4 or len(password) > 128:
        return jsonify({'message': 'Invalid password'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE mobile = ?", (mobile,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({'message': 'Mobile already registered!'}), 409
    cursor.execute(
        "INSERT INTO users (name, role, mobile, password) VALUES (?, ?, ?, ?)",
        (name, role, mobile, generate_password_hash(password)),
    )
    user_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': user_id, 'message': f'{role.replace("_", " ").title()} account created!'}), 201


@staff_bp.route('/staff/list', methods=['GET'])
@require_auth(['admin', 'super_admin', 'principal', 'hod', 'accounts', 'librarian', 'warden'])
def list_staff():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, role, mobile, created_at FROM users WHERE role IN ('super_admin','principal','hod','accounts','librarian','warden') ORDER BY id"
    )
    items = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify({'items': items}), 200


@staff_bp.route('/staff/me', methods=['GET'])
@require_auth()
def staff_me():
    user = request.user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, mobile, created_at FROM users WHERE id = ?", (user.get('id'),))
    row = cursor.fetchone()
    profile = dict(row) if row else None
    cursor.close()
    conn.close()
    if not profile:
        return jsonify({'message': 'User not found!'}), 404
    return jsonify({'user': profile}), 200