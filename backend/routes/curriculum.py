# Curriculum Management System API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

curriculum_bp = Blueprint('curriculum', __name__)

@curriculum_bp.route('/curriculums', methods=['GET'])
def get_curriculums():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM curriculums ORDER BY id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([{'id': r['id'], 'name': r['name'], 'description': r['description']} for r in rows])

@curriculum_bp.route('/curriculums', methods=['POST'])
def add_curriculum():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO curriculums (name, description) VALUES (?, ?)",
        (data['name'], data.get('description', ''))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

@curriculum_bp.route('/curriculums/<int:curriculum_id>/semesters', methods=['POST'])
def add_semester(curriculum_id):
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO curriculum_semesters (curriculum_id, number) VALUES (?, ?)",
        (curriculum_id, data['number'])
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

@curriculum_bp.route('/semesters/<int:semester_id>/subjects', methods=['POST'])
def add_subject(semester_id):
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO curriculum_subjects (semester_id, code, name, credits, syllabus) VALUES (?, ?, ?, ?, ?)",
        (semester_id, data['code'], data['name'], data['credits'], data.get('syllabus', ''))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

@curriculum_bp.route('/semesters/<int:semester_id>/subjects', methods=['GET'])
def get_subjects(semester_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM curriculum_subjects WHERE semester_id=?", (semester_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {'id': r['id'], 'code': r['code'], 'name': r['name'],
         'credits': r['credits'], 'syllabus': r['syllabus']} for r in rows
    ])
