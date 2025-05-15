import sqlite3
import time
import multiprocessing
import pytest
from pathlib import Path


def open_conn(path: str, *, readonly: bool = False) -> sqlite3.Connection:
    con = sqlite3.connect(path, autocommit=True)  # start in AC mode
    con.execute("PRAGMA journal_mode=WAL")  # allowed now
    con.execute("PRAGMA busy_timeout = 30000")  # 30 s
    if readonly:
        con.execute("PRAGMA query_only = 1")
    con.autocommit = False  # manual-txn mode
    return con


def make_db(tmp_path: Path) -> str:
    return str(tmp_path / "demo.db")


def nrows(conn):
    return conn.execute("SELECT COUNT(*) FROM t").fetchone()[0]


# ---------------------------------------------------------------------
# 1. writer commit makes row visible ----------------------------------
# ---------------------------------------------------------------------
def test_commit_makes_row_visible(tmp_path):
    db = make_db(tmp_path)
    w = open_conn(db)
    w.execute("CREATE TABLE t(id INT PRIMARY KEY)")
    w.commit()

    r = open_conn(db, readonly=True)
    assert nrows(r) == 0
    r.close()

    w.execute("INSERT INTO t VALUES (1)")
    w.commit()
    r = open_conn(db, readonly=True)
    assert nrows(r) == 1
    r.close()


# ---------------------------------------------------------------------
# 2. reader snapshot while writer uncommitted -------------------------
# ---------------------------------------------------------------------
def test_reader_snapshot(tmp_path):
    db = make_db(tmp_path)
    w = open_conn(db)
    w.execute("CREATE TABLE t(x INT)")
    w.commit()
    r = open_conn(db, readonly=True)

    w.execute("INSERT INTO t VALUES (1)")  # <-- txn open, uncommitted
    assert nrows(r) == 0  # snapshot
    w.commit()
    assert nrows(r) == 0  # snapshot still
    r.close()
    r = open_conn(db, readonly=True)
    assert nrows(r) == 1  # new row after commit


# ---------------------------------------------------------------------
# 3. second writer blocked until timeout ------------------------------
# ---------------------------------------------------------------------
def test_write_conflict_raises_after_timeout(tmp_path):
    db = make_db(tmp_path)
    w1 = open_conn(db)
    w1.execute("CREATE TABLE t(x INT)")
    w1.commit()

    w2 = open_conn(db)
    w1.execute("INSERT INTO t VALUES (1)")  # keep txn open

    start = time.time()
    with pytest.raises(sqlite3.OperationalError):
        w2.execute("INSERT INTO t VALUES (2)")  # waits 30 s → raises
    assert 25 <= time.time() - start <= 35  # busy_timeout respected

    w1.rollback()  # clean up


# ---------------------------------------------------------------------
# 4. rollback discards writes -----------------------------------------
# ---------------------------------------------------------------------
def test_rollback_discards(tmp_path):
    db = make_db(tmp_path)
    c = open_conn(db)
    c.execute("CREATE TABLE t(x INT)")
    c.commit()

    try:
        c.execute("INSERT INTO t VALUES (1)")
        raise RuntimeError("something exploded")
    except RuntimeError:
        c.rollback()

    assert nrows(c) == 0


# ---------------------------------------------------------------------
# 5. context-manager auto-commit on success, rollback on error --------
# ---------------------------------------------------------------------
def test_with_block_atomic(tmp_path):
    db = make_db(tmp_path)
    c = open_conn(db)
    c.execute("CREATE TABLE t(x INT)")
    c.commit()

    with pytest.raises(ValueError):
        with c:  # BEGIN
            c.execute("INSERT INTO t VALUES (1)")
            raise ValueError  # forces rollback

    assert nrows(c) == 0  # row rolled back

    with c:  # new txn
        c.execute("INSERT INTO t VALUES (1)")  # commit on exit
    assert nrows(c) == 1


# ---------------------------------------------------------------------
# 6. UNIQUE key as atomic “claim” -------------------------------------
# ---------------------------------------------------------------------
def _claim(db, q):
    c = open_conn(db)
    try:
        with c:
            c.execute("INSERT INTO runs(id) VALUES (1)")
        q.put("winner")
    except sqlite3.IntegrityError:
        q.put("dup")  # lost the race


def test_atomic_claim_one_winner(tmp_path):
    db = make_db(tmp_path)
    c = open_conn(db)
    c.execute("CREATE TABLE runs(id INT PRIMARY KEY)")
    c.commit()

    q = multiprocessing.Queue()
    p1 = multiprocessing.Process(target=_claim, args=(db, q))
    p2 = multiprocessing.Process(target=_claim, args=(db, q))
    p1.start()
    p2.start()
    p1.join()
    p2.join()

    # Grab exactly two results; get() blocks until each arrives
    results = [q.get(timeout=10), q.get(timeout=10)]
    assert results.count("winner") == 1
    assert results.count("dup") == 1
