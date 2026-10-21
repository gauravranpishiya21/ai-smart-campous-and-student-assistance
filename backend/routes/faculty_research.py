# Faculty Research Portal API Endpoints
from flask import Blueprint, request, jsonify
from db import get_db_connection

faculty_research_bp = Blueprint('faculty_research', __name__)

@faculty_research_bp.route('/faculty/research/<int:faculty_id>', methods=['GET'])
def get_research(faculty_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty_research WHERE faculty_id=? ORDER BY year DESC", (faculty_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {'id': r['id'], 'title': r['title'], 'type': r['research_type'],
         'description': r['description'], 'url': r['url'], 'year': r['year']} for r in rows
    ])

@faculty_research_bp.route('/faculty/research', methods=['POST'])
def add_research():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO faculty_research (faculty_id, title, research_type, description, url, year) VALUES (?, ?, ?, ?, ?, ?)",
        (data['faculty_id'], data['title'], data['research_type'],
         data.get('description', ''), data.get('url', ''), data.get('year'))
    )
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
