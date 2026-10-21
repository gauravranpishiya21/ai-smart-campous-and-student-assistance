
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'student_system.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        conn.execute("PRAGMA synchronous=NORMAL")
    except sqlite3.Error:
        pass
    return conn

from sqlalchemy.orm import declarative_base
Base = declarative_base()
