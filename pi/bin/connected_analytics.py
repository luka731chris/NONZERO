"""Recorder-backed live analytics and longitudinal comparisons.
No browser-derived samples, cloud reads, or inferred physiological measurements.
"""

import json, threading, time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from metrics import analyze, profile, num

_LOCK = threading.RLock()
TZ = ZoneInfo("America/New_York")


def machine_key(value):
    v = str(value or "").lower()
    if "bike" in v:
        return "bike"
    if "ski" in v:
        return "ski"
    if "row" in v:
        return "row"
    return v


def valid(r):
    a = r["analytics"]
    return (
        a.get("observedSeconds", 0) >= 300
        and a.get("coveragePercent", 0) >= 90
        and (a.get("avgWatts") or 0) > 20
    )


def bests(rides):
    out = {}
    for r in rides:
        if not valid(r):
            continue
        for seconds, value in r["analytics"].get("bestPowerWatts", {}).items():
            if num(value, 1, 3000) is not None and value > out.get(seconds, {}).get(
                "watts", 0
            ):
                out[seconds] = {"watts": value, "rideId": r["id"], "at": r["start"]}
    return out


def compare(current, history):
    a = current["analytics"]
    seconds = a.get("observedSeconds", 0)
    candidates = [
        r
        for r in history
        if r["id"] != current["id"]
        and r["start"] < current["start"]
        and machine_key(r["machine"]) == machine_key(current["machine"])
        and valid(r)
        and abs(r["analytics"]["observedSeconds"] - seconds) <= seconds * 0.2
        and (
            current.get("workoutType") is None
            or r.get("workoutType") is None
            or current["workoutType"] == r["workoutType"]
        )
    ]
    if not valid(current) or not candidates:
        return None
    r = max(candidates, key=lambda r: r["start"])
    prev = r["analytics"]["avgWatts"]
    value = a["avgWatts"]
    return {
        "rideId": r["id"],
        "at": r["start"],
        "minutes": r["analytics"]["observedSeconds"] / 60,
        "avgWatts": prev,
        "deltaWatts": value - prev,
        "deltaPercent": (value / prev - 1) * 100,
        "basis": "Same machine, duration within 20%; workout type matched where supplied. Effort and conditions may differ.",
    }


def summary(c, row, now):
    p = profile(c)
    prof = json.dumps(p, sort_keys=True)
    latest = (
        c.execute("SELECT MAX(at) FROM samples WHERE ride=?", (row["id"],)).fetchone()[
            0
        ]
        or row["start"]
    )
    signature = json.dumps(
        [latest, row["status"], row["end"], row["last_motion"], prof]
    )
    cached = c.execute(
        "SELECT signature,payload,computed_at FROM connected_cache WHERE ride=?",
        (row["id"],),
    ).fetchone()
    # Reuse finished calculations, and bound live full-history recomputation to 5 seconds.
    if cached and (
        cached[0] == signature
        or (
            row["status"] == "recording"
            and now - cached[2] < 5000
            and json.loads(cached[0])[-1] == prof
        )
    ):
        result = json.loads(cached[1])
        result["sampleAt"] = latest
        return result
    rows = [
        json.loads(r[0])
        for r in c.execute(
            "SELECT payload FROM samples WHERE ride=? AND at<=? ORDER BY at",
            (row["id"], row["end"] or row["last_motion"]),
        )
    ]
    result = dict(row)
    result["analytics"] = analyze(rows, p)
    result["sampleAt"] = latest
    result["computedAt"] = now
    result["workoutType"] = next(
        (
            r.get("workoutType")
            for r in reversed(rows)
            if r.get("workoutType") is not None
        ),
        None,
    )
    c.execute(
        "INSERT OR REPLACE INTO connected_cache VALUES(?,?,?,?)",
        (row["id"], signature, json.dumps(result, allow_nan=False), now),
    )
    c.commit()
    return result


def snapshot(c, now=None):
    now = int(time.time() * 1000) if now is None else now
    with _LOCK:
        c.execute(
            "CREATE TABLE IF NOT EXISTS connected_cache(ride TEXT PRIMARY KEY,signature TEXT,payload TEXT,computed_at REAL)"
        )
        # All rides contribute to weekly progress; archived completed calculations are cached.
        rows = c.execute(
            "SELECT * FROM rides WHERE start<=? ORDER BY start DESC", (now,)
        ).fetchall()
        rides = [summary(c, r, now) for r in rows]
        local = datetime.fromtimestamp(now / 1000, TZ)
        today = local.date()
        week = today - timedelta(days=(today.weekday() + 1) % 7)
        prior = week - timedelta(days=7)

        def day(r):
            return datetime.fromtimestamp(r["start"] / 1000, TZ).date()

        def week_stats(lo, hi):
            rr = [r for r in rides if lo <= day(r) < hi]
            return {
                "movingMinutes": sum(r["analytics"].get("movingSeconds", 0) for r in rr)
                / 60,
                "distanceKm": sum(
                    r["analytics"].get("distanceMetersObserved", 0) for r in rr
                )
                / 1000,
                "workKj": sum(r["analytics"].get("workKj", 0) for r in rr),
                "rideDays": len(
                    {day(r) for r in rr if r["analytics"].get("movingSeconds", 0) > 0}
                ),
            }

        weekly = week_stats(week, week + timedelta(days=7))
        weekly["weekStart"] = str(week)
        weekly["prior"] = week_stats(prior, week)
        selected = rides[0] if rides else None
        live = None
        if selected:
            live = dict(selected)
            a = live["analytics"]
            live["fresh"] = (
                selected["status"] == "recording"
                and -1000 <= now - selected["sampleAt"] < 2500
            )
            trace = []
            for r in c.execute(
                "SELECT payload FROM samples WHERE ride=? AND at>=? ORDER BY at",
                (selected["id"], now - 60000),
            ):
                p = json.loads(r[0])
                trace.append(
                    {
                        "at": p["updatedAt"],
                        "watts": num(p.get("watts"), 0, 3000),
                        "rpm": num(p.get("cadence"), 0, 250),
                        "hr": num(p.get("heartRate"), 25, 240),
                    }
                )
            live["trace"] = trace
            history = [
                r
                for r in rides
                if r["id"] != selected["id"]
                and r["start"] < selected["start"]
                and r["status"] == "complete"
                and machine_key(r["machine"]) == machine_key(selected["machine"])
            ]
            live["comparison"] = compare(selected, history)
            prior_bests = bests(history)
            live["priorBests"] = prior_bests
            live["records"] = [
                {
                    "seconds": int(k),
                    "watts": v,
                    "previousWatts": prior_bests[k]["watts"],
                }
                for k, v in a.get("bestPowerWatts", {}).items()
                if valid(selected)
                and k in prior_bests
                and v is not None
                and v > prior_bests[k]["watts"] + 0.5
            ]
            live["intervals"] = [
                {"index": k, **v} for k, v in a.get("intervals", {}).items()
            ]
            live["quality"] = {
                "samples": a["sampleCount"],
                "coverage": a["coveragePercent"],
                "gaps": a["gaps"],
                "hrCoverage": a["hrCoveragePercent"],
                "analysisAt": selected["computedAt"],
                "lastSampleAt": selected["sampleAt"],
            }
        # Separate machine histories avoid comparing BikeErg power records with rowing power.
        progress = {}
        for key in sorted({machine_key(r["machine"]) for r in rides}):
            rr = [
                r
                for r in rides
                if machine_key(r["machine"]) == key
                and r["status"] == "complete"
                and valid(r)
            ]
            latest = rr[0] if rr else None
            previous = bests(rr[1:])
            records = [
                {"seconds": int(k), "watts": v, "previousWatts": previous[k]["watts"]}
                for k, v in (
                    latest["analytics"].get("bestPowerWatts", {}) if latest else {}
                ).items()
                if k in previous and v is not None and v > previous[k]["watts"] + 0.5
            ]
            progress[key] = {
                "bests": bests(rr),
                "recent": [
                    {
                        "id": r["id"],
                        "at": r["start"],
                        "avgWatts": r["analytics"]["avgWatts"],
                        "minutes": r["analytics"]["observedSeconds"] / 60,
                        "coverage": r["analytics"]["coveragePercent"],
                    }
                    for r in rr[:12]
                ][::-1],
                "latest": (
                    {
                        "id": latest["id"],
                        "at": latest["start"],
                        "comparison": compare(latest, rr[1:]),
                        "records": records,
                        "analytics": latest["analytics"],
                    }
                    if latest
                    else None
                ),
            }
        return {
            "schemaVersion": 1,
            "profile": profile(c),
            "generatedAt": now,
            "live": live,
            "weekly": weekly,
            "progress": progress,
            "historyCount": len(rides),
            "activities": [
                {
                    "id": r["id"],
                    "date": str(day(r)),
                    "start": r["start"],
                    "end": r["end"] or r["last_motion"],
                    "status": r["status"],
                    "machine": r["machine"],
                    "movingMinutes": r["analytics"].get("movingSeconds", 0) / 60,
                }
                for r in rides
            ],
            "processing": "All recorded core workout samples; optional archived-only packet types remain available for export.",
        }
