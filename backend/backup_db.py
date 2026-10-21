"""One-shot SQLite backup for the campus ERP.

Usage:
    python backend/backup_db.py            # create one backup, keep newest 20
    python backend/backup_db.py --keep 10  # custom retention
"""
import sqlite3
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = ROOT / 'student_system.db'
DEST_DIR = ROOT / 'backups'


def backup(keep: int = 20) -> Path:
    if not DB.exists():
        print(f"Database not found: {DB}")
        sys.exit(1)
    DEST_DIR.mkdir(exist_ok=True)

    # Flush WAL so the main db file is a complete, consistent snapshot.
    try:
        src = sqlite3.connect(DB)
        src.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        src.close()
    except sqlite3.Error as exc:
        print(f"WAL checkpoint skipped ({exc}); copying file as-is.")

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dest = DEST_DIR / f'student_system_{stamp}.db'
    shutil.copy2(DB, dest)

    # Retention: delete oldest beyond `keep`
    backups = sorted(DEST_DIR.glob('student_system_*.db'))
    for old in backups[:-keep]:
        old.unlink()

    size_kb = dest.stat().st_size / 1024
    print(f"Backup OK: {dest} ({size_kb:,.0f} KB) — {len(backups)} file(s) kept")
    return dest


if __name__ == '__main__':
    keep = 20
    if '--keep' in sys.argv:
        keep = int(sys.argv[sys.argv.index('--keep') + 1])
    backup(keep)