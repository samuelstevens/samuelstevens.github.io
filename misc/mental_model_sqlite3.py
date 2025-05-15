

import marimo

__generated_with = "0.13.2"
app = marimo.App(width="full")


@app.cell
def _(mo):
    mo.md(
        r"""
        Run this notebook with

        ```
        uv run --with marimo ruff --python 3.12 python -m marimo edit understanding_sqlite3.py
        ```
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        MODEL v1

        1. autocommit=True  → every statement commits; writes visible instantly.
        2. autocommit=False, reader opens txn  → sees snapshot, but holds a read-lock.
        3. writer cannot COMMIT while any reader txn is open → OperationalError.
        4. BEGIN IMMEDIATE  → writer grabs lock immediately; readers raise OperationalError.
        5. WAL + IMMEDIATE  → readers succeed (snapshot) even while writer holds lock.

        """
    )
    return


@app.cell
def _():
    import marimo as mo
    import sqlite3
    import tempfile
    import multiprocessing
    import os
    import sys
    return mo, multiprocessing, os, sqlite3, sys, tempfile


@app.cell
def _(multiprocessing, os, sqlite3, sys, tempfile):

    def make_db():
        fd, path = tempfile.mkstemp(suffix=".db"); os.close(fd)
        return path

    def rows(conn):
        return conn.execute("SELECT COUNT(*) FROM t").fetchone()[0]

    def reader_proc(db, q):
        try:
            q.put(rows(sqlite3.connect(db, autocommit=True)))
        except Exception as e:
            q.put(repr(e))

    # ---------------------------------------------------------
    # 1. autocommit TRUE
    # ---------------------------------------------------------
    def demo_autocommit_true():
        db = make_db()
        a = sqlite3.connect(db, autocommit=True)
        a.execute("CREATE TABLE t(x INT)")
        a.execute("INSERT INTO t VALUES (1)")
        assert rows(sqlite3.connect(db, autocommit=True)) == 1
        print("✔ claim 1 ok – autocommit=True immediate visibility")

    # ---------------------------------------------------------
    # 2a. snapshot + 2b. writer blocked until reader releases
    # ---------------------------------------------------------
    def demo_reader_snapshot_and_block():
        db = make_db()
        a = sqlite3.connect(db, autocommit=False)
        a.execute("CREATE TABLE t(x INT)"); a.commit()

        b = sqlite3.connect(db, autocommit=False)
        a.execute("INSERT INTO t VALUES (1)")          # uncommitted

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

    # ---------------------------------------------------------
    # 3. BEGIN IMMEDIATE blocks reader
    # ---------------------------------------------------------
    def demo_begin_immediate_blocks_reader():
        db = make_db()
        a = sqlite3.connect(db, autocommit=True)
        a.execute("CREATE TABLE t(x INT)")
        a.execute("BEGIN IMMEDIATE")
        a.execute("INSERT INTO t VALUES (1)")

        q = multiprocessing.Queue()
        p = multiprocessing.Process(target=reader_proc, args=(db, q))
        p.start()
        p.join(timeout=2)
        assert "OperationalError" in q.get()
        a.rollback()
        print("✔ claim 3 ok – IMMEDIATE blocks reader")

    # ---------------------------------------------------------
    # 4. WAL lets reader proceed
    # ---------------------------------------------------------
    def demo_wal_reader_snapshot():
        db = make_db()
        a = sqlite3.connect(db, autocommit=True)
        a.execute("PRAGMA journal_mode=WAL")
        a.execute("CREATE TABLE t(x INT)")
        a.execute("BEGIN IMMEDIATE"); a.execute("INSERT INTO t VALUES (1)")

        q = multiprocessing.Queue()
        p = multiprocessing.Process(target=reader_proc, args=(db, q))
        p.start(); p.join(); assert q.get() == 0        # snapshot
        a.commit()

        p2 = multiprocessing.Process(target=reader_proc, args=(db, q))
        p2.start(); p2.join(); assert q.get() == 1
        print("✔ claim 4 ok – WAL snapshot then updated view")

    # ---------------------------------------------------------
    # run
    # ---------------------------------------------------------
    for demo in [
        demo_autocommit_true,
        demo_reader_snapshot_and_block,
        demo_begin_immediate_blocks_reader,
        demo_wal_reader_snapshot,
    ]:
        demo()

    print("\nMODEL v1 verified on Python", sys.version.split()[0],
          "SQLite", sqlite3.sqlite_version, "✔")

    return


if __name__ == "__main__":
    app.run()
