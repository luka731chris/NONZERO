"""Small indexed recorder queries and bounded, credential-free transition history."""

import json, time, threading
from metrics import connection

_lock = threading.RLock()
_previous = {}
_last_signature = None


def acknowledge(value):
    if not isinstance(value, dict):
        raise ValueError("Invalid acknowledgement")
    sid = value.get("sessionId")
    at = value.get("at")
    if (
        not isinstance(sid, str)
        or len(sid) > 120
        or not isinstance(at, (int, float))
        or not 0 < at <= time.time() * 1000 + 1000
    ):
        raise ValueError("Invalid acknowledgement")
    c = connection()
    try:
        with c:
            c.execute(
                "INSERT OR REPLACE INTO settings VALUES('connection_phone_ack',?)",
                (json.dumps({"sessionId": sid, "at": at}),),
            )
    finally:
        c.close()


def snapshot(telemetry, heartbeat, version, now=None):
    global _last_signature
    now = now or int(time.time() * 1000)
    t = telemetry or {}
    h = heartbeat or {}
    c = connection()
    try:
        c.execute(
            "CREATE TABLE IF NOT EXISTS connection_events(id INTEGER PRIMARY KEY, at INTEGER, payload TEXT)"
        )
        # Ride/time and transport/time indexes avoid full-history scans per poll.
        recording = t.get("recordingId")
        last = (
            c.execute(
                "SELECT MAX(at) FROM samples WHERE ride=?", (recording,)
            ).fetchone()[0]
            if recording
            else None
        )
        recent = (
            c.execute(
                "SELECT COUNT(*) FROM samples WHERE ride=? AND at>?",
                (recording, now - 10000),
            ).fetchone()[0]
            if recording
            else 0
        )
        transport = (
            "ble"
            if "bluetooth" in str(t.get("source", "")).lower()
            or "ble" in str(t.get("source", "")).lower()
            else "usb"
        )
        raw_exists = c.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='capture_packets'"
        ).fetchone()
        raw_value = (
            c.execute(
                "SELECT MAX(received_ns) FROM capture_packets WHERE transport=?",
                (transport,),
            ).fetchone()[0]
            if raw_exists
            else None
        )
        raw_last = raw_value / 1e6 if raw_value else None
        fresh = bool(
            t.get("connected")
            and not t.get("recovering")
            and -1000 <= now - float(t.get("updatedAt") or 0) < 3000
        )
        wall_fresh = bool(
            h.get("serverReceivedAt")
            and 0 <= now - float(h["serverReceivedAt"]) < 15000
        )
        counters = {
            k: t[k]
            for k in ["distanceMeters", "strokeCount", "elapsedSeconds"]
            if isinstance(t.get(k), (int, float))
        }
        source = str(t.get("source", "PM5"))
        with _lock:
            prior = _previous.get(source, {"counters": {}, "at": 0})
            shared = [k for k in counters if k in prior["counters"]]
            changed = bool(shared) and any(
                counters[k] != prior["counters"][k] for k in shared
            )
            last_motion = now if changed else prior["at"]
            motion = (
                fresh
                and 0 <= now - last_motion < 3000
                and (
                    float(t.get("watts") or 0) >= 5
                    or float(t.get("cadence") or t.get("rpm") or 0) >= 3
                )
            )
            _previous[source] = {"counters": counters, "at": last_motion}
        stored = bool(
            fresh
            and (
                (last and -1000 <= now - last < 3000)
                or (raw_last and -1000 <= now - raw_last < 3000)
            )
        )
        session = h.get("activeSessionId")
        ackrow = c.execute(
            "SELECT value FROM settings WHERE key='connection_phone_ack'"
        ).fetchone()
        ack = json.loads(ackrow[0]) if ackrow else {}
        if not fresh:
            status = (
                "No fresh PM5 signal. Check power, USB/Bluetooth and bridge status."
            )
        elif motion and not stored:
            status = "PM5 is moving, but durable samples are not confirmed."
        elif motion and (not wall_fresh or h.get("mode") != "performance"):
            status = "PM5 is moving; Wall Performance is not confirmed."
        elif not motion:
            status = (
                "Workout held; PM5 is not moving now."
                if session
                else "Ready; awaiting a workout."
            )
        else:
            status = "Movement, recorder and Wall confirmed."
        chain = {}
        if session:
            rows = c.execute(
                "SELECT payload FROM connection_events ORDER BY id DESC LIMIT 500"
            ).fetchall()
            for row in reversed(rows):
                x = json.loads(row[0])
                if x.get("sessionId") == session:
                    chain.update({k: v for k, v in x.get("chain", {}).items() if v})
            if motion:
                chain.setdefault("motionAt", now)
            if stored:
                chain.setdefault("storedAt", int(last or raw_last))
            if wall_fresh and h.get("mode") == "performance":
                chain.setdefault("wallAt", int(h["serverReceivedAt"]))
            if ack.get("sessionId") == session:
                chain["phoneAt"] = ack["at"]
        steps = [
            {"name": label, "ok": bool(chain.get(key)), "at": chain.get(key)}
            for label, key in [
                ("PM5 movement", "motionAt"),
                ("Durable recorder", "storedAt"),
                ("Wall Performance", "wallAt"),
                ("Phone acknowledgement", "phoneAt"),
            ]
        ]
        result = {
            "generatedAt": now,
            "version": version,
            "sessionId": session,
            "fresh": fresh,
            "motion": motion,
            "stored": stored,
            "sampleAt": t.get("updatedAt"),
            "storedAt": last or raw_last,
            "observedHz": recent / 10,
            "sampleCount": recent,
            "recordingId": recording,
            "transport": transport,
            "rawPacketAt": raw_last,
            "coreSampleAt": last,
            "mode": h.get("mode", "unknown"),
            "wallFresh": wall_fresh,
            "bridgeState": str(t.get("bridgeState", "unknown"))[:120],
            "error": str(
                t.get("captureError") or t.get("metricsError") or t.get("error") or ""
            )[:160],
            "status": status,
            "steps": steps,
            "chain": chain,
            "note": "Observed stored core samples/s over the last 10 seconds. A held strength workout can legitimately have no current PM5 motion.",
        }
        signature = json.dumps(
            [
                session,
                fresh,
                motion,
                stored,
                h.get("mode"),
                wall_fresh,
                result["error"],
                bool(chain.get("phoneAt")),
            ]
        )
        with _lock:
            if signature != _last_signature:
                with c:
                    c.execute(
                        "INSERT INTO connection_events(at,payload) VALUES(?,?)",
                        (now, json.dumps(result)),
                    )
                    c.execute(
                        "DELETE FROM connection_events WHERE id NOT IN (SELECT id FROM connection_events ORDER BY id DESC LIMIT 500)"
                    )
                _last_signature = signature
        return result
    finally:
        c.close()


def history():
    c = connection()
    try:
        exists = c.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='connection_events'"
        ).fetchone()
        return (
            [
                json.loads(r[0])
                for r in c.execute(
                    "SELECT payload FROM connection_events ORDER BY id DESC LIMIT 200"
                )
            ]
            if exists
            else []
        )
    finally:
        c.close()
