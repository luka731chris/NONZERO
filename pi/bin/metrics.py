"""NONZERO durable recorder. All PM5 samples retained; derived metrics are versioned."""

import json, math, os, sqlite3, time, uuid
from pathlib import Path
from collections import deque

DEFAULT_DB = Path(
    os.environ.get(
        "NONZERO_METRICS_DB",
        str(Path.home() / ".local/share/nonzero-wall/metrics.sqlite3"),
    )
)


def num(x, low=0, high=10000000):
    return (
        float(x)
        if isinstance(x, (int, float))
        and not isinstance(x, bool)
        and math.isfinite(x)
        and low <= x <= high
        else None
    )


def connection(path=DEFAULT_DB):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(path, timeout=10)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=FULL")
    c.executescript(
        """CREATE TABLE IF NOT EXISTS rides(id TEXT PRIMARY KEY, start REAL, end REAL, last_motion REAL, status TEXT, machine TEXT, reason TEXT);
    CREATE TABLE IF NOT EXISTS samples(ride TEXT, at REAL, payload TEXT, PRIMARY KEY(ride,at));
    CREATE INDEX IF NOT EXISTS sample_ride ON samples(ride,at);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
    CREATE TABLE IF NOT EXISTS metrics_summary_cache(ride TEXT PRIMARY KEY,signature TEXT,payload TEXT);"""
    )
    return c


def profile(c):
    r = c.execute("SELECT value FROM settings WHERE key='profile'").fetchone()
    return json.loads(r[0]) if r else {}


def set_profile(c, p):
    clean = {}
    for k, lo, hi in [
        ("weightKg", 25, 350),
        ("ftpWatts", 20, 1000),
        ("restingHr", 25, 120),
        ("maxHr", 80, 240),
        ("cadenceMin", 10, 200),
        ("cadenceMax", 10, 220),
    ]:
        if p.get(k) is not None:
            v = num(p[k], lo, hi)
            if v is None:
                raise ValueError("Invalid " + k)
            clean[k] = v
    if clean.get("maxHr", 241) <= clean.get("restingHr", 0):
        raise ValueError("Maximum HR must exceed resting HR")
    if clean.get("cadenceMax", 221) < clean.get("cadenceMin", 0):
        raise ValueError("Cadence maximum must exceed minimum")
    with c:
        c.execute(
            "INSERT OR REPLACE INTO settings VALUES('profile',?)", (json.dumps(clean),)
        )
    return clean


class Recorder:
    def __init__(self, path=DEFAULT_DB):
        self.c = connection(path)
        row = self.c.execute(
            "SELECT * FROM rides WHERE status='recording' ORDER BY start DESC LIMIT 1"
        ).fetchone()
        self.id = row["id"] if row else None
        self.last = (
            json.loads(
                self.c.execute(
                    "SELECT payload FROM samples WHERE ride=? ORDER BY at DESC LIMIT 1",
                    (self.id,),
                ).fetchone()[0]
            )
            if self.id
            else None
        )

    def finish(self, reason="idle"):
        if self.id:
            with self.c:
                self.c.execute(
                    "UPDATE rides SET status='complete',end=last_motion,reason=? WHERE id=?",
                    (reason, self.id),
                )
        self.id = None
        self.last = None

    def idle(self, now=None):
        if self.id:
            last = self.c.execute(
                "SELECT last_motion FROM rides WHERE id=?", (self.id,)
            ).fetchone()[0]
            if (now if now is not None else time.time() * 1000) - last > 300000:
                self.finish("five-minute inactivity")

    def observe(self, p):
        at = num(p.get("updatedAt"), 0, 1e16)
        if (
            not at
            or not p.get("connected")
            or p.get("fresh") is False
            or p.get("recovering")
        ):
            return
        if self.last and at <= self.last["updatedAt"]:
            return
        moving = (num(p.get("watts"), 0, 3000) or 0) >= 5 or (
            num(p.get("cadence"), 0, 250) or 0
        ) >= 3
        self.idle(at)
        # A counter reset is a new monitor workout, even during the inactivity grace period.
        if (
            self.id
            and self.last
            and moving
            and (
                p.get("elapsedSeconds", 0) + 2 < self.last.get("elapsedSeconds", 0)
                or p.get("distanceMeters", 0) + 5 < self.last.get("distanceMeters", 0)
            )
        ):
            self.finish("monitor reset")
        if not self.id:
            if not moving:
                return
            self.id = "pm5-" + uuid.uuid4().hex
            with self.c:
                self.c.execute(
                    "INSERT INTO rides VALUES(?,?,?,?,?,?,?)",
                    (
                        self.id,
                        at,
                        None,
                        at,
                        "recording",
                        p.get("machine", "Concept2"),
                        None,
                    ),
                )
        with self.c:
            self.c.execute(
                "INSERT OR IGNORE INTO samples VALUES(?,?,?)",
                (self.id, at, json.dumps(p, allow_nan=False, separators=(",", ":"))),
            )
            if moving:
                self.c.execute(
                    "UPDATE rides SET last_motion=? WHERE id=?", (at, self.id)
                )
        self.last = dict(p)
        return self.id


def samples(c, id):
    return [
        json.loads(r[0])
        for r in c.execute(
            "SELECT payload FROM samples WHERE ride=? ORDER BY at", (id,)
        )
    ]


def analyze(rows, p=None):
    p = p or {}
    totals = {
        k: 0.0
        for k in [
            "seconds",
            "work",
            "power",
            "power2",
            "cad",
            "cad2",
            "cadSeconds",
            "hr",
            "hrSeconds",
            "moving",
            "cadTarget",
        ]
    }
    maxp = maxcad = maxhr = 0
    windows = {n: deque() for n in [5, 30, 60, 300, 1200]}
    best = {str(n): None for n in windows}
    zones = [0.0] * 5
    powerzones = [0.0] * 7
    gaps = 0
    intervals = {}
    npq = deque()
    fourth = 0
    npseconds = 0
    hrpairs = []
    lengths = {n: 0.0 for n in windows}
    sums = {n: 0.0 for n in windows}
    last = None
    for r in rows:
        w = num(r.get("watts"), 0, 3000)
        cad = num(r.get("cadence"), 0, 250)
        hr = num(r.get("heartRate"), 25, 240)
        maxp = max(maxp, w or 0)
        maxcad = max(maxcad, cad or 0)
        maxhr = max(maxhr, hr or 0)
        dt = (r["updatedAt"] - last["updatedAt"]) / 1000 if last else 0
        prevw = num(last.get("watts"), 0, 3000) if last else None
        prevcad = num(last.get("cadence"), 0, 250) if last else None
        prevhr = num(last.get("heartRate"), 25, 240) if last else None
        if dt > 2.5 or dt < 0 or prevw is None:
            if dt > 2.5:
                gaps += 1
            for n, q in windows.items():
                q.clear()
                lengths[n] = 0
                sums[n] = 0
            npq.clear()
            dt = 0
        if dt:
            # Left-hold integration: no invented readings across transport gaps.
            totals["seconds"] += dt
            totals["work"] += prevw * dt
            totals["power"] += prevw * dt
            totals["power2"] += prevw**2 * dt
            if prevcad is not None:
                totals["cad"] += prevcad * dt
                totals["cad2"] += prevcad**2 * dt
                totals["cadSeconds"] += dt
                if (
                    p.get("cadenceMin") is not None
                    and p.get("cadenceMax") is not None
                    and p["cadenceMin"] <= prevcad <= p["cadenceMax"]
                ):
                    totals["cadTarget"] += dt
            if prevw >= 5 or (prevcad or 0) >= 3:
                totals["moving"] += dt
            if prevhr:
                totals["hr"] += prevhr * dt
                totals["hrSeconds"] += dt
                hrpairs.append((prevw, prevhr, dt))
                if p.get("maxHr") and p.get("restingHr"):
                    reserve = (prevhr - p["restingHr"]) / (p["maxHr"] - p["restingHr"])
                    zone = sum(reserve >= v for v in [0.6, 0.7, 0.8, 0.9])
                    zones[zone] += dt
            if p.get("ftpWatts"):
                ratio = prevw / p["ftpWatts"]
                powerzones[
                    sum(ratio > v for v in [0.55, 0.75, 0.9, 1.05, 1.2, 1.5])
                ] += dt
            key = str(last.get("intervalCount", 0))
            iv = intervals.setdefault(key, {"seconds": 0, "workKj": 0, "avgWatts": 0})
            iv["seconds"] += dt
            iv["workKj"] += prevw * dt / 1000
            for n, q in windows.items():
                q.append([prevw, dt])
                lengths[n] += dt
                sums[n] += prevw * dt
                while lengths[n] - q[0][1] >= n:
                    old = q.popleft()
                    lengths[n] -= old[1]
                    sums[n] -= old[0] * old[1]
                if lengths[n] >= n:
                    excess = lengths[n] - n
                    value = (sums[n] - q[0][0] * excess) / n
                    best[str(n)] = max(best[str(n)] or 0, value)
                    if n == 30:
                        fourth += value**4 * dt
                        npseconds += dt
        last = r
    for iv in intervals.values():
        iv["avgWatts"] = iv["workKj"] * 1000 / iv["seconds"] if iv["seconds"] else None
    seconds = totals["seconds"]
    avg = totals["power"] / seconds if seconds else None
    cad = totals["cad"] / totals["cadSeconds"] if totals["cadSeconds"] else None
    hr = totals["hr"] / totals["hrSeconds"] if totals["hrSeconds"] else None
    elapsed = (
        (rows[-1]["updatedAt"] - rows[0]["updatedAt"]) / 1000 if len(rows) > 1 else 0
    )
    distance = sum(
        max(0, b.get("distanceMeters", 0) - a.get("distanceMeters", 0))
        for a, b in zip(rows, rows[1:])
        if 0 < (b["updatedAt"] - a["updatedAt"]) <= 2500
    )
    calories = sum(
        max(0, b.get("calories", 0) - a.get("calories", 0))
        for a, b in zip(rows, rows[1:])
    )
    npower = fourth**0.25 / npseconds**0.25 if npseconds >= 30 else None
    ftp = p.get("ftpWatts")
    kg = p.get("weightKg")
    drags = [
        x.get("dragFactor")
        for x in rows
        if num(x.get("dragFactor"), 1, 250) is not None
    ]
    efficiency = (
        sum(w * d for w, h, d in hrpairs) / sum(h * d for w, h, d in hrpairs)
        if hrpairs and totals["hrSeconds"] / max(seconds, 1) >= 0.8
        else None
    )
    drift = None
    if (
        len(hrpairs) > 1
        and totals["hrSeconds"] >= 1200
        and totals["hrSeconds"] / max(seconds, 1) >= 0.9
    ):
        half = totals["hrSeconds"] / 2
        parts = [[0, 0, 0], [0, 0, 0]]
        seen = 0
        for w, h, d in hrpairs:
            first = min(d, max(0, half - seen))
            second = d - first
            for i, t in enumerate([first, second]):
                parts[i][0] += w * t
                parts[i][1] += h * t
                parts[i][2] += t
            seen += d
        ratios = [a / b if b else 0 for a, b, _ in parts]
        powers = [a / d if d else 0 for a, _, d in parts]
        if ratios[0] and min(powers) > 0 and abs(powers[1] / powers[0] - 1) <= 0.1:
            drift = (1 - ratios[1] / ratios[0]) * 100
    result = {
        "schemaVersion": 1,
        "calculationVersion": "1.0",
        "sampleCount": len(rows),
        "observedSeconds": seconds,
        "elapsedSeconds": elapsed,
        "movingSeconds": totals["moving"],
        "coveragePercent": min(100, 100 * seconds / elapsed) if elapsed else 0,
        "gaps": gaps,
        "distanceMetersObserved": distance,
        "monitorCalories": calories,
        "workKj": totals["work"] / 1000,
        "avgWatts": avg,
        "maxWatts": maxp if rows else None,
        "avgCadence": cad,
        "maxCadence": maxcad if rows else None,
        "avgHr": hr,
        "maxHr": maxhr or None,
        "hrCoveragePercent": 100 * totals["hrSeconds"] / seconds if seconds else 0,
        "powerCVPercent": (
            100 * math.sqrt(max(0, totals["power2"] / seconds - avg**2)) / avg
            if avg
            else None
        ),
        "cadenceCVPercent": (
            100
            * math.sqrt(max(0, totals["cad2"] / totals["cadSeconds"] - cad**2))
            / cad
            if cad
            else None
        ),
        "bestPowerWatts": best,
        "rollingPower30sFourthMeanWatts": npower,
        "intensityFactorEstimate": npower / ftp if npower and ftp else None,
        "powerLoadEstimate": (
            seconds / 3600 * (npower / ftp) ** 2 * 100 if npower and ftp else None
        ),
        "wattsPerKg": avg / kg if avg is not None and kg else None,
        "wattsPerBeatPerMinute": efficiency,
        "aerobicDecouplingPercent": drift,
        "hrZoneSeconds": zones if p.get("maxHr") and p.get("restingHr") else None,
        "powerZoneSeconds": powerzones if ftp else None,
        "cadenceTargetPercent": (
            100 * totals["cadTarget"] / totals["cadSeconds"]
            if p.get("cadenceMin") is not None
            and p.get("cadenceMax") is not None
            and totals["cadSeconds"]
            else None
        ),
        "avgSpeedKmhObserved": distance / seconds * 3.6 if seconds else None,
        "paceSecondsPer1000mObserved": seconds / distance * 1000 if distance else None,
        "meanDragFactor": sum(drags) / len(drags) if drags else None,
        "intervals": intervals,
        "profileUsed": p,
        "vo2Max": None,
        "vo2MaxStatus": "Not measured by PM5; import an external estimate or laboratory result.",
        "energyClassification": "PM5 calorie estimate; not an Apple active-energy measurement",
        "provenance": {
            "measured": [
                "watts",
                "cadence",
                "distanceMeters",
                "elapsedSeconds",
                "calories",
                "heartRate",
                "monitorStatus",
                "intervalCount",
                "dragFactor",
                "workoutType",
                "workoutState",
                "intervalType",
            ],
            "derived": [
                "workKj",
                "bestPowerWatts",
                "wattsPerKg",
                "zones",
                "coverage",
                "powerLoadEstimate",
            ],
            "rawPreserved": True,
        },
    }
    return result


def ride(c, id, with_samples=False):
    row = c.execute("SELECT * FROM rides WHERE id=?", (id,)).fetchone()
    if not row:
        return None
    signature = None
    if row["status"] == "complete" and not with_samples:
        latest = c.execute(
            "SELECT MAX(at) FROM samples WHERE ride=?", (id,)
        ).fetchone()[0]
        signature = json.dumps(
            [latest, row["end"], row["last_motion"], profile(c), "1.0"], sort_keys=True
        )
        cached = c.execute(
            "SELECT signature,payload FROM metrics_summary_cache WHERE ride=?", (id,)
        ).fetchone()
        if cached and cached[0] == signature:
            return json.loads(cached[1])
    out = dict(row)
    allrows = samples(c, id)
    end = row["end"] or row["last_motion"]
    active = [x for x in allrows if x["updatedAt"] <= end]
    out["analytics"] = analyze(active, profile(c))
    out["updatedAt"] = allrows[-1]["updatedAt"] if allrows else row["start"]
    # Snapshot 60 seconds after the last motion, only with uninterrupted valid HR near both endpoints.
    if row["status"] == "complete":
        start = [
            x
            for x in allrows
            if abs(x["updatedAt"] - end) <= 1500 and num(x.get("heartRate"), 25, 240)
        ]
        later = [
            x
            for x in allrows
            if abs(x["updatedAt"] - (end + 60000)) <= 1500
            and num(x.get("heartRate"), 25, 240)
        ]
        recovery = [x for x in allrows if end <= x["updatedAt"] <= end + 61500]
        continuous = recovery and all(
            b["updatedAt"] - a["updatedAt"] <= 2500 and num(a.get("heartRate"), 25, 240)
            for a, b in zip(recovery, recovery[1:])
        )
        out["analytics"]["hrRecovery60sBpm"] = (
            start[-1]["heartRate"] - later[0]["heartRate"]
            if start
            and later
            and continuous
            and not any(x.get("moving") for x in recovery if x["updatedAt"] > end)
            else None
        )
    if with_samples:
        out["samples"] = allrows
    if signature:
        with c:
            c.execute(
                "INSERT OR REPLACE INTO metrics_summary_cache VALUES(?,?,?)",
                (id, signature, json.dumps(out, allow_nan=False)),
            )
    return out


def listing(c, limit=50, offset=0):
    ids = c.execute(
        "SELECT id FROM rides ORDER BY start DESC LIMIT ? OFFSET ?",
        (min(200, max(1, limit)), max(0, offset)),
    ).fetchall()
    return {
        "schemaVersion": 1,
        "rides": [ride(c, r[0]) for r in ids],
        "total": c.execute("SELECT COUNT(*) FROM rides").fetchone()[0],
        "profile": profile(c),
    }
