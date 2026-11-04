"""Durable local counterpart of coach-protocol.js; parity-tested with shared fixtures."""

import copy, datetime, math, re, uuid

FIELDS = {
    "preferences": [
        "maintenanceCalories",
        "weeklyRate",
        "nutritionCleared",
        "trainingCleared",
        "maintenanceForRecovery",
        "clearanceDate",
        "strengthStatus",
    ],
    "day": [
        "date",
        "mealPlanned",
        "proteinMeals",
        "movement",
        "intakeCalories",
        "intakeSource",
        "intakeComplete",
        "barrier",
        "feedback",
        "focusDone",
    ],
    "behavior": ["mealTracker", "focus", "anchor", "why", "fallback", "reward"],
    "strength": [
        "date",
        "movement",
        "variation",
        "mode",
        "loadLb",
        "reps",
        "rpe",
        "pain",
        "notes",
        "deleted",
    ],
    "review": ["date", "proposalId", "maintenanceCalories", "decision"],
}


def empty():
    return {
        "schemaVersion": 2,
        "revision": 0,
        "records": {},
        "applied": [],
        "updatedAt": 0,
    }


def document(d):
    return (
        copy.deepcopy(d)
        if isinstance(d, dict)
        and d.get("schemaVersion") == 2
        and isinstance(d.get("records"), dict)
        else empty()
    )


def iso(s):
    try:
        return (
            isinstance(s, str)
            and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", s))
            and datetime.date.fromisoformat(s).isoformat() == s
        )
    except (TypeError, ValueError):
        return False


def date(now):
    from zoneinfo import ZoneInfo

    return (
        datetime.datetime.fromtimestamp(now / 1000, ZoneInfo("America/New_York"))
        .date()
        .isoformat()
    )


class Conflict(ValueError):
    def __init__(self, fields):
        super().__init__("Changes conflict. Review pending changes.")
        self.fields = fields


def validate(op, now):
    if (
        not isinstance(op, dict)
        or op.get("kind") not in FIELDS
        or not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", str(op.get("id", "")))
        or not isinstance(op.get("patch"), dict)
        or not isinstance(op.get("bases"), dict)
        or not 1 <= len(op["patch"]) <= 15
    ):
        raise ValueError("Invalid coaching change")
    kind = op["kind"]
    patch = op["patch"]
    key = op.get("key", "")
    expected = (
        kind
        if kind in ["preferences", "behavior"]
        else kind
        + ":"
        + (
            str(patch.get("date"))
            if kind in ["day", "review"]
            else ":".join(key.split(":")[1:])
        )
    )
    if kind == "strength" and not re.fullmatch(r"strength:[A-Za-z0-9_-]{1,100}", key):
        raise ValueError("Invalid strength record key")
    if key != expected or not re.fullmatch(r"[A-Za-z0-9:_-]{1,120}", key):
        raise ValueError("Invalid record key")
    for k, v in patch.items():
        b = op["bases"].get(k)
        if (
            k not in FIELDS[kind]
            or not isinstance(b, int)
            or isinstance(b, bool)
            or not 0 <= b <= 9007199254740991
        ):
            raise ValueError("Invalid field version")
        if k in [
            "nutritionCleared",
            "trainingCleared",
            "maintenanceForRecovery",
            "mealPlanned",
            "proteinMeals",
            "movement",
            "intakeComplete",
            "focusDone",
            "deleted",
        ] and not (k == "movement" and kind == "strength"):
            if not isinstance(v, bool):
                raise ValueError("Expected a checkmark")
        elif k in ["date", "clearanceDate"]:
            if k == "clearanceDate" and v is None:
                continue
            if not iso(v) or v > date(now):
                raise ValueError("Choose a valid date on or before today")
        elif k in [
            "maintenanceCalories",
            "intakeCalories",
            "weeklyRate",
            "loadLb",
            "reps",
            "rpe",
            "pain",
        ]:
            if v is None and k in ["maintenanceCalories", "intakeCalories"]:
                continue
            lo, hi = {
                "maintenanceCalories": (1800, 5000),
                "intakeCalories": (0, 6000),
                "weeklyRate": (0.5, 1.5),
                "loadLb": (0, 1000),
                "reps": (1, 30),
                "rpe": (1, 10),
                "pain": (0, 10),
            }[k]
            if (
                not isinstance(v, (int, float))
                or isinstance(v, bool)
                or not math.isfinite(v)
                or not lo <= v <= hi
                or k == "reps"
                and int(v) != v
            ):
                raise ValueError("Check " + k)
        else:
            enums = {
                "intakeSource": ["noom", "manual", "other"],
                "mealTracker": ["noom", "other", "none"],
                "strengthStatus": ["unknown", "stable", "improving", "declining"],
                "focus": ["meal", "protein", "movement"],
                "anchor": ["breakfast", "lunch", "dinner", "calendar"],
                "barrier": ["none", "time", "pain", "forgot"],
                "feedback": ["useful", "too_much", "change_cue"],
                "mode": ["external", "bodyweight"],
                "decision": ["accepted", "dismissed"],
            }
            if k in enums:
                if v not in enums[k]:
                    raise ValueError("Invalid " + k)
            elif (
                not isinstance(v, str)
                or len(v) > (240 if k == "notes" else 160)
                or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", v)
            ):
                raise ValueError("Check " + k)
    if kind in ["day", "strength", "review"] and not iso(patch.get("date")):
        raise ValueError("A dated record is required")
    if kind == "strength" and (
        not all(patch.get(k) for k in ["movement", "variation", "mode"])
        or not all(k in patch for k in ["loadLb", "reps", "rpe", "pain"])
    ):
        raise ValueError("Complete the strength set")
    return op


def apply(d, ops, now, optimistic=False):
    d = document(d)
    if not isinstance(ops, list) or len(ops) > 100:
        raise ValueError("Too many changes")
    for op in ops:
        validate(op, now)
        if op["id"] in d["applied"]:
            continue
        prior = d["records"].get(
            op["key"], {"value": {}, "versions": {}, "updatedAt": 0}
        )
        conflicts = [
            op["key"] + "." + k
            for k, v in op["patch"].items()
            if prior["versions"].get(k, 0) != op["bases"][k]
            and prior["value"].get(k, object()) != v
        ]
        if conflicts and not optimistic:
            raise Conflict(conflicts)
        rec = copy.deepcopy(prior)
        for k, v in op["patch"].items():
            if rec["value"].get(k, object()) != v:
                rec["value"][k] = v
                rec["versions"][k] = rec["versions"].get(k, 0) + 1
        if (
            op["kind"] == "preferences"
            and (
                rec["value"].get("nutritionCleared")
                or rec["value"].get("trainingCleared")
            )
            and not rec["value"].get("clearanceDate")
        ):
            raise ValueError("Record the date of care-team clearance")
        rec["updatedAt"] = now
        d["records"][op["key"]] = rec
        d["applied"] = (d["applied"] + [op["id"]])[-512:]
        d["revision"] += 1
        d["updatedAt"] = now

    return d


def operation(doc, kind, key, patch):
    prior = doc["records"].get(key, {"value": {}, "versions": {}})
    clean = {
        k: v
        for k, v in patch.items()
        if prior["value"].get(k, object()) != v or k == "date" or kind == "strength"
    }
    return {
        "id": "op_" + uuid.uuid4().hex,
        "kind": kind,
        "key": key,
        "patch": clean,
        "bases": {k: prior["versions"].get(k, 0) for k in clean},
    }
