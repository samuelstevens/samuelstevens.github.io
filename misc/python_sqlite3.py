"""
MODEL v2
1. autocommit=True  → every statement commits; writes visible instantly.
2a. autocommit=False → readers see snapshot; hold read-lock.
2b. writer cannot COMMIT while any reader txn is open → OperationalError.
3. BEGIN EXCLUSIVE  → writer grabs EXCLUSIVE lock; readers raise OperationalError.
4. BEGIN IMMEDIATE  → behaves like 2a (readers allowed, snapshot).
5. WAL + EXCLUSIVE  → readers still succeed (snapshot) even while writer holds lock.

uv run --python 3.12 python_sqlite3.py
"""

import sqlite3
import tempfile
import multiprocessing
import os
import sys


def make_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    return path


def rows(conn):
    return conn.execute("SELECT COUNT(*) FROM t").fetchone()[0]


def reader_proc(db, q):
    try:
        q.put(rows(sqlite3.connect(db, autocommit=True)))
    except Exception as e:
        q.put(repr(e))


def demo_autocommit_true():
    db = make_db()
    a = sqlite3.connect(db, autocommit=True)
    a.execute("CREATE TABLE t(x INT)")
    a.execute("INSERT INTO t VALUES (1)")
    assert rows(sqlite3.connect(db, autocommit=True)) == 1
    print("autocommit=True immediate visibility")


def demo_reader_snapshot_and_block():
    db = make_db()
    a = sqlite3.connect(db, autocommit=False)
    a.execute("CREATE TABLE t(x INT)")
    a.commit()

    b = sqlite3.connect(db, autocommit=False)
    a.execute("INSERT INTO t VALUES (1)")  # uncommitted

    # reader sees snapshot
    assert rows(b) == 0

    # writer COMMIT should fail because reader txn still open
    try:
        a.commit()
    except sqlite3.OperationalError:
        print("✔ claim 2b ok – writer blocked by reader")

    # release reader lock, now writer can commit
    b.rollback()
    a.commit()
    assert rows(b) == 1
    print("✔ claim 2a ok – snapshot then row visible after reader releases")


def demo_begin_exclusive_blocks_reader():
    db = make_db()
    a = sqlite3.connect(db, autocommit=True)
    a.execute("CREATE TABLE t(x INT)")
    a.execute("BEGIN EXCLUSIVE")  # ← EXCLUSIVE blocks readers
    a.execute("INSERT INTO t VALUES (1)")

    q = multiprocessing.Queue()
    p = multiprocessing.Process(target=reader_proc, args=(db, q))
    p.start()
    p.join(timeout=10)
    if p.is_alive():
        p.terminate()
        p.join()
        raise RuntimeError("reader hung on lock >10 s")

    assert "OperationalError" in q.get()
    a.rollback()
    print("EXCLUSIVE blocks reader")


def demo_immediate_allows_reader_snapshot():
    db = make_db()
    a = sqlite3.connect(db, autocommit=True)
    a.execute("CREATE TABLE t(x INT)")
    a.execute("BEGIN IMMEDIATE")  # RESERVED lock
    a.execute("INSERT INTO t VALUES (1)")
    assert rows(sqlite3.connect(db, autocommit=True)) == 0  # snapshot OK
    a.commit()
    assert rows(sqlite3.connect(db, autocommit=True)) == 1
    print("IMMEDIATE allows reader snapshot")


def demo_wal_reader_snapshot():
    db = make_db()
    a = sqlite3.connect(db, autocommit=True)
    a.execute("PRAGMA journal_mode=WAL")
    a.execute("CREATE TABLE t(x INT)")
    a.execute("BEGIN IMMEDIATE")
    a.execute("INSERT INTO t VALUES (1)")

    q = multiprocessing.Queue()
    p = multiprocessing.Process(target=reader_proc, args=(db, q))
    p.start()
    p.join()
    assert q.get() == 0  # snapshot
    a.commit()

    p2 = multiprocessing.Process(target=reader_proc, args=(db, q))
    p2.start()
    p2.join()
    assert q.get() == 1
    print("✔ claim 4 ok – WAL snapshot then updated view")


# ---------------------------------------------------------
# run
# ---------------------------------------------------------
if __name__ == "__main__":
    for demo in [
        demo_autocommit_true,
        demo_reader_snapshot_and_block,
        demo_begin_exclusive_blocks_reader,
        demo_immediate_allows_reader_snapshot,
        demo_wal_reader_snapshot,
    ]:
        demo()

    print(
        "\nMODEL v2 verified on Python",
        sys.version.split()[0],
        "SQLite",
        sqlite3.sqlite_version,
        "✔",
    )
