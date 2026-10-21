# Schema migration runner for the Smart Campus system.
#
# The codebase applies schema in a lazy, idempotent way: each feature module
# persists its own tables at import time (CREATE TABLE IF NOT EXISTS plus
# guarded ALTERs). This script imports every module whose ensure-functions are
# import-time safe so a pre-existing database is brought up to the latest
# schema without reloading the full app.
#
# Usage:  python migrate.py
# Safe to run repeatedly - all steps are idempotent.
import time

from db import get_db_connection, DB_PATH

START = time.time()


def _run(step, fn, *args):
    try:
        fn(*args)
        print(f'  [ok] {step}')
        return True
    except Exception as exc:  # pragma: no cover - failure path only
        print(f'  [!!] {step} -> {exc}')
        return False


def main():
    print(f'Applying migrations on: {DB_PATH}')
    print()

    # Core history tables guarded by app bootstrap.
    import app as _app
    _run('student history / alerts / audit tables', _app._ensure_history_tables)

    # Feature modules apply their own schema at import; importing them is enough.
    import routes.staff
    import routes.finance
    import routes.certificates
    import routes.ai_ops
    import routes.projects
    import routes.observations
    _run('role support (users rebuild, new roles)', routes.staff._ensure_role_support)
    _run('finance tables (fee_structures, scholarships, receipts)', routes.finance._ensure_finance_tables)
    _run('certificates tables (documents, revaluations)', routes.certificates._ensure_certificate_tables)
    _run('ai ops tables (grievances)', routes.ai_ops._ensure_ai_tables)
    _run('projects tables', routes.projects._ensure_project_tables)
    _run('observation reports tables', routes.observations._ensure_observation_tables)

    # Final integrity check over known-good tables.
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r['name'] for r in cursor.fetchall()]
    required = ('users', 'students', 'projects', 'observation_reports', 'fee_structures',
                'student_documents', 'grievances', 'payments')
    missing = [t for t in required if t not in tables]
    cursor.close()
    conn.close()

    if missing:
        print(f'\nMissing expected tables: {missing}')
        raise SystemExit(1)
    print(f'\nAll migrations applied in {time.time() - START:.2f}s. Expected tables present.')


if __name__ == '__main__':
    main()