# AI-Based Topic Recommendation API
from flask import Blueprint, request, jsonify
from db import get_db_connection

topic_recommend_bp = Blueprint('topic_recommend', __name__)

@topic_recommend_bp.route('/recommend/topic/<int:student_id>/<int:subject_id>', methods=['GET'])
def recommend_topic(student_id, subject_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM topic_progress WHERE student_id=? AND subject_id=? ORDER BY progress_pct ASC LIMIT 1",
        (student_id, subject_id)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return jsonify({'topic': row['topic_name'], 'progress_pct': row['progress_pct']})
    return jsonify({'message': 'No topics found for this student/subject.'}), 404

@topic_recommend_bp.route('/recommend/topic', methods=['POST'])
def add_topic_progress():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO topic_progress (student_id, subject_id, topic_name, progress_pct, last_reviewed) VALUES (?, ?, ?, ?, ?)",
        (data['student_id'], data['subject_id'], data['topic_name'],
         data.get('progress_pct', 0.0), data.get('last_reviewed', ''))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
