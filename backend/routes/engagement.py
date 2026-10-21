# Classroom Engagement Analytics API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

engagement_bp = Blueprint('engagement', __name__)

@engagement_bp.route('/engagement/<int:class_id>', methods=['GET'])
def get_engagement(class_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM engagement_analytics WHERE class_id=? ORDER BY date DESC", (class_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {
            'id': r['id'],
            'faculty_id': r['faculty_id'],
            'date': r['date'],
            'quiz_participation': r['quiz_participation'],
            'attendance_interaction': r['attendance_interaction'],
            'notes': r['notes']
        } for r in rows
    ])

@engagement_bp.route('/engagement', methods=['POST'])
def add_engagement():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO engagement_analytics (class_id, faculty_id, date, quiz_participation, attendance_interaction, notes) VALUES (?, ?, ?, ?, ?, ?)",
        (data['class_id'], data['faculty_id'], data['date'],
         data.get('quiz_participation', 0.0), data.get('attendance_interaction', 0.0),
         data.get('notes', ''))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
