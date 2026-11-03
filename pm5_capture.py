"""Lossless received-packet archive, independent of workout and UI state."""

import json, os, sqlite3, time, uuid, zlib
from pathlib import Path
from metrics import DEFAULT_DB


class Capture:
    def __init__(self, path=DEFAULT_DB):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.c = None
        self.retry_at = 0
        self.last_ns = 0
        self.count = 0
        self.spool = self.path.with_name(
            "pm5-pending-" + str(os.getpid()) + "-" + uuid.uuid4().hex + ".jsonl"
        )

    def connect(self):
        if self.c is not None:
            return
        self.c = sqlite3.connect(self.path, timeout=1)
        self.c.execute("PRAGMA journal_mode=WAL")
        self.c.execute("PRAGMA synchronous=FULL")
        self.c.execute(
            "CREATE TABLE IF NOT EXISTS capture_packets(id TEXT PRIMARY KEY, received_ns INTEGER, transport TEXT, kind TEXT, payload BLOB)"
        )
        self.c.execute(
            "CREATE INDEX IF NOT EXISTS capture_received ON capture_packets(received_ns)"
        )
        self.c.execute(
            "CREATE INDEX IF NOT EXISTS capture_transport_received ON capture_packets(transport,received_ns)"
        )
        self.c.commit()
        # Replay durable fallbacks after a previous recorder failure or restart.
        for spool in self.path.parent.glob("pm5-pending-*.jsonl"):
            if spool.stat().st_size == 0:
                continue
            # Read a snapshot; other bridge processes may still append to their files.
            # Never truncate/unlink another writer's spool. INSERT OR IGNORE is idempotent.
            with spool.open() as f:
                for line in f:
                    try:
                        self.insert(json.loads(line))
                    except (ValueError, KeyError):
                        continue
            self.c.commit()

    def insert(self, row):
        self.c.execute(
            "INSERT OR IGNORE INTO capture_packets VALUES(?,?,?,?,?)",
            (
                row["id"],
                row["ns"],
                row["transport"],
                row["kind"],
                zlib.compress(
                    json.dumps(
                        row["payload"], allow_nan=False, separators=(",", ":")
                    ).encode()
                ),
            ),
        )

    def record(self, transport, kind, payload):
        ns = max(time.time_ns(), self.last_ns + 1)
        self.last_ns = ns
        row = {
            "id": uuid.uuid4().hex,
            "ns": ns,
            "transport": transport,
            "kind": kind,
            "payload": payload,
        }
        try:
            if time.monotonic() < self.retry_at:
                raise RuntimeError("archive retry pending")
            self.connect()
            with self.c:
                self.insert(row)
            # Our own spool has been replayed; other writers' spools remain untouched.
            if self.spool.exists():
                self.spool.unlink()
            self.count += 1
            return {
                "captureStored": True,
                "capturePacketsThisProcess": self.count,
                "captureError": None,
            }
        except Exception as exc:
            if self.c is not None:
                try:
                    self.c.close()
                except Exception:
                    pass
            self.c = None
            self.retry_at = time.monotonic() + 5
            # A database failure must not silently discard a packet.
            try:
                with self.spool.open("a") as f:
                    f.write(
                        json.dumps(row, allow_nan=False, separators=(",", ":")) + "\n"
                    )
                    f.flush()
                    os.fsync(f.fileno())
                return {
                    "captureStored": True,
                    "captureFallback": True,
                    "captureError": str(exc)[:180],
                }
            except Exception as fallback:
                return {
                    "captureStored": False,
                    "captureError": str(exc)[:100]
                    + "; fallback: "
                    + str(fallback)[:100],
                }
