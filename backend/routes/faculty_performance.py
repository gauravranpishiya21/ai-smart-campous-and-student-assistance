# Faculty Performance Evaluation API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

faculty_perf_bp = Blueprint('faculty_perf', __name__)

@faculty_perf_bp.route('/faculty/feedback', methods=['POST'])
def submit_feedback():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO faculty_feedback (faculty_id, student_id, rating, comments, created_at) VALUES (?, ?, ?, ?, ?)",
        (data['faculty_id'], data['student_id'], data['rating'],
         data.get('comments', ''), data.get('created_at', ''))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

@faculty_perf_bp.route('/faculty/performance/<int:faculty_id>', methods=['GET'])
def get_performance(faculty_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty_performance WHERE faculty_id=?", (faculty_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return jsonify({
            'avg_rating': row['avg_rating'],
            'feedback_count': row['feedback_count'],
            'analytics': row['analytics_json']
        })
    return jsonify({'message': 'No performance data found.'}), 404
