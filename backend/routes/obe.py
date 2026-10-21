# OBE (Outcome-Based Education) API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

obe_bp = Blueprint('obe', __name__)

@obe_bp.route('/obe/<int:subject_id>', methods=['GET'])
def get_outcomes(subject_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM obe_outcomes WHERE subject_id=? ORDER BY id", (subject_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {'id': r['id'], 'type': r['outcome_type'], 'code': r['outcome_code'],
         'description': r['description']} for r in rows
    ])

@obe_bp.route('/obe', methods=['POST'])
def add_outcome():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO obe_outcomes (subject_id, outcome_type, outcome_code, description) VALUES (?, ?, ?, ?)",
        (data['subject_id'], data['outcome_type'], data['outcome_code'], data['description'])
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
