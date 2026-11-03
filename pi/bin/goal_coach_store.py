"""Pi-local coaching journal, authoritative cloud projection, persistent outbox."""

import json, time, copy, re
from metrics import connection
import coach_protocol as P


def now():
    return int(time.time() * 1000)


def _table(c):
    c.execute(
        "CREATE TABLE IF NOT EXISTS goal_coach(key TEXT PRIMARY KEY,payload TEXT)"
    )


def _get(c, k, default=None):
    r = c.execute("SELECT payload FROM goal_coach WHERE key=?", (k,)).fetchone()
    return json.loads(r[0]) if r else copy.deepcopy(default)


def _put(c, k, v):
    c.execute(
        "INSERT OR REPLACE INTO goal_coach VALUES(?,?)",
        (k, json.dumps(v, allow_nan=False)),
    )


def _scope(c):
    return _get(c, "_v2active", "local")


def _key(c, k):
    return "_v2:" + _scope(c) + ":" + k


def _init(c):
    _table(c)
    if _get(c, _key(c, "doc")) is not None:
        return
    doc = P.empty()
    queue = []
    if _scope(c) == "local":
        legacy = []
        prefs = _get(c, "preferences")
        if isinstance(prefs, dict):
            legacy.append(
                (
                    "preferences",
                    "preferences",
                    {k: v for k, v in prefs.items() if k in P.FIELDS["preferences"]},
                )
            )
        for row in c.execute(
            "SELECT payload FROM goal_coach WHERE key LIKE 'day:%' ORDER BY key LIMIT 365"
        ):
            x = json.loads(row[0])
            legacy.append(
                (
                    "day",
                    "day:" + x.get("date", ""),
                    {k: v for k, v in x.items() if k in P.FIELDS["day"]},
                )
            )
        optimistic = doc
        for kind, key, value in legacy:
            op = P.operation(optimistic, kind, key, value)
            op["migration"] = True
            try:
                if op["patch"]:
                    optimistic = P.apply(optimistic, [op], now())
                    queue.append(op)
            except ValueError:
                pass  # Original records stay intact for recovery/export.
    _put(c, _key(c, "doc"), doc)
    _put(c, _key(c, "queue"), queue)


def _read(c):
    _init(c)
    doc = P.document(_get(c, _key(c, "doc"), P.empty()))
    queue = _get(c, _key(c, "queue"), [])
    optimistic = doc
    projection_error = None
    for op in queue:
        try:
            optimistic = P.apply(optimistic, [op], now(), True)
        except ValueError as e:
            projection_error = {"message": str(e), "fields": []}

    def rows(prefix):
        return [
            {**r["value"], "id": key, "updatedAt": r["updatedAt"]}
            for key, r in optimistic["records"].items()
            if key.startswith(prefix)
        ]

    return {
        "preferences": optimistic["records"].get("preferences", {}).get("value", {}),
        "behavior": optimistic["records"].get("behavior", {}).get("value", {}),
        "logs": sorted(rows("day:"), key=lambda r: r["date"], reverse=True),
        "strength": [x for x in rows("strength:") if not x.get("deleted")],
        "reviews": rows("review:"),
        "doc": doc,
        "optimisticDoc": optimistic,
        "pending": queue,
        "conflict": _get(c, _key(c, "conflict")) or projection_error,
        "syncError": _get(c, _key(c, "error")),
        "context": _get(c, "context"),
        "mirror": _get(c, _key(c, "mirror"), {}),
        "scope": _scope(c),
        "backendStatus": _get(c, _key(c, "backendStatus"), "local"),
    }


def read():
    c = connection()
    try:
        with c:
            return _read(c)
    finally:
        c.close()


def save(data):
    if not isinstance(data, dict):
        raise ValueError("Expected an object")
    c = connection()
    try:
        _table(c)
        c.execute("BEGIN IMMEDIATE")
        _init(c)
        kind = data.get("kind")
        p = data.get("value", {})
        if data.get("scope") and kind != "binding" and data["scope"] != _scope(c):
            raise P.Conflict(["account_binding"])
        if kind == "binding":
            if not isinstance(p, str) or not re.fullmatch(r"[a-f0-9]{64}", p):
                raise ValueError("Invalid account binding")
            previous = _scope(c)
            if previous != p:
                if previous == "local" and _get(c, "_v2:" + p + ":doc") is None:
                    for field in ["doc", "queue", "conflict", "error", "mirror"]:
                        value = _get(c, "_v2:local:" + field)
                        if value is not None:
                            _put(c, "_v2:" + p + ":" + field, value)
                _put(c, "_v2active", p)
                _init(c)
        elif kind == "context":
            if not isinstance(p, dict) or len(json.dumps(p)) > 12000:
                raise ValueError("Invalid context")
            out = {
                k: p.get(k)
                for k in [
                    "date",
                    "phase",
                    "surgeryDate",
                    "days",
                    "basis",
                    "confirmed",
                    "next",
                    "remaining",
                    "finalGoal",
                    "plannedDeficit",
                    "intakeTarget",
                    "cue",
                    "identity",
                    "coverage",
                    "fresh",
                    "strength",
                    "avgIntake",
                    "loggedIntakeDays",
                    "estimatedLoggedGap",
                    "generatedAt",
                ]
            }
            out["updatedAt"] = now()
            _put(c, "context", out)
        elif kind == "mirror":
            if not isinstance(p, dict):
                raise ValueError("Invalid wall context")
            weights = [x for x in p.get("bodyMeasurements", []) if isinstance(x, dict)][
                -730:
            ]
            sessions = [
                {k: x.get(k) for k in ["date", "completed", "status", "duration"]}
                for x in p.get("sessions", [])
                if isinstance(x, dict)
            ][-365:]
            health = [
                x
                for x in p.get("pm5Analytics", {}).get("health", [])
                if isinstance(x, dict)
                and x.get("type") == "HKQuantityTypeIdentifierBodyMass"
            ][-730:]
            _put(
                c,
                _key(c, "mirror"),
                {
                    "surgeryPlan": p.get("surgeryPlan", {}),
                    "bodyMeasurements": weights,
                    "sessions": sessions,
                    "pm5Analytics": {"health": health},
                    "autopilotAgenda": p.get("autopilotAgenda", {}),
                },
            )
        elif kind == "accept":
            if (
                not isinstance(p, dict)
                or not isinstance(p.get("doc"), dict)
                or p["doc"].get("schemaVersion") != 2
            ):
                raise ValueError("Invalid shared document")
            current = P.document(_get(c, _key(c, "doc")))
            doc = P.document(p["doc"])
            if doc["revision"] >= current["revision"]:
                queue = _get(c, _key(c, "queue"), [])
                ack = set(p.get("ackIds", [])) | set(doc.get("applied", []))
                queue = [op for op in queue if op["id"] not in ack]
                _put(c, _key(c, "doc"), doc)
                _put(c, _key(c, "queue"), queue)
            if "conflict" in p:
                _put(c, _key(c, "conflict"), p["conflict"])
            elif not _get(c, _key(c, "queue"), []):
                _put(c, _key(c, "conflict"), None)
            if p.get("backendStatus") in ["ready", "setup_required", "unavailable"]:
                _put(c, _key(c, "backendStatus"), p["backendStatus"])
            if "error" in p:
                _put(c, _key(c, "error"), p["error"])
            elif not _get(c, _key(c, "queue"), []):
                _put(c, _key(c, "error"), None)
        elif kind == "resolve":
            if p not in ["mine", "remote"]:
                raise ValueError("Choose which pending changes to keep")
            queue = _get(c, _key(c, "queue"), [])
            doc = P.document(_get(c, _key(c, "doc")))
            out = []
            if p == "mine":
                for op in queue:
                    next = P.operation(doc, op["kind"], op["key"], op["patch"])
                    if next["patch"]:
                        out.append(next)
                        doc = P.apply(doc, [next], now(), True)
            _put(c, _key(c, "queue"), out)
            _put(c, _key(c, "conflict"), None)
            _put(c, _key(c, "error"), None)
        else:
            snapshot = _read(c)
            queue = snapshot["pending"]
            doc = snapshot["optimisticDoc"]
            if kind == "operations":
                ops = data.get("operations")
            elif kind in ["preferences", "day", "behavior", "strength", "review"]:
                if _scope(c) != "local":
                    raise ValueError(
                        "Reload the updated Coach page before editing shared records"
                    )
                if not isinstance(p, dict):
                    raise ValueError("Invalid record")
                patch = {k: v for k, v in p.items() if k in P.FIELDS[kind]}
                if kind == "preferences":
                    patch = {
                        "maintenanceCalories": None,
                        "weeklyRate": 1,
                        "nutritionCleared": False,
                        "trainingCleared": False,
                        "maintenanceForRecovery": False,
                        "clearanceDate": None,
                        "strengthStatus": "unknown",
                        **patch,
                    }
                key = (
                    kind
                    if kind in ["preferences", "behavior"]
                    else kind
                    + ":"
                    + str(
                        p.get("date") if kind in ["day", "review"] else p.get("id", "")
                    )
                )
                op = P.operation(doc, kind, key, patch)
                ops = [op] if op["patch"] else []
            else:
                raise ValueError("Unknown action")
            if (
                not isinstance(ops, list)
                or len([x for x in queue if not x.get("migration")]) + len(ops) > 100
            ):
                raise ValueError("Sync pending changes before adding more")
            try:
                P.apply(doc, ops, now())
            except P.Conflict as e:
                P.apply(doc, ops, now(), True)
                _put(c, _key(c, "conflict"), {"fields": e.fields, "message": str(e)})
            known = {op["id"] for op in queue}
            _put(
                c,
                _key(c, "queue"),
                queue
                + [
                    op
                    for op in ops
                    if op["id"] not in known and op["id"] not in doc["applied"]
                ],
            )
        c.commit()
        return _read(c)
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()
