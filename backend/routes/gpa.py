# Credit & GPA Management API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

gpa_bp = Blueprint('gpa', __name__)

@gpa_bp.route('/gpa/<int:student_id>', methods=['GET'])
def get_gpa(student_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_gpa WHERE student_id=? ORDER BY semester", (student_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {'id': r['id'], 'semester': r['semester'], 'gpa': r['gpa'],
         'credits_earned': r['credits_earned'], 'backlogs': r['backlogs']} for r in rows
    ])

@gpa_bp.route('/gpa', methods=['POST'])
def add_gpa():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO student_gpa (student_id, semester, gpa, credits_earned, backlogs) VALUES (?, ?, ?, ?, ?)",
        (data['student_id'], data['semester'], data['gpa'],
         data['credits_earned'], data.get('backlogs', 0))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
