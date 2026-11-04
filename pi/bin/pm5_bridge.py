#!/usr/bin/env python3
"""Always-observing Concept2 PM5 USB telemetry bridge for NONZERO."""

from pathlib import Path
import json, math, os, signal, sys, time

sys.path.insert(0, str(Path(__file__).resolve().parent))

RUNTIME = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "nonzero-wall"
ARM = RUNTIME / "erg-arm.json"
OUT = RUNTIME / "erg-telemetry.json"
RUN = True
RECORDER = None
READS = 0
LAST_GOOD = None
LAST_GOOD_AT = 0.0


def stop(*_):
    global RUN
    RUN = False


def atomic_write(path, payload):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, separators=(",", ":")))
    tmp.replace(path)


def armed():
    try:
        value = json.loads(ARM.read_text())
        return (
            bool(value.get("armed"))
            and time.time() * 1000 - float(value.get("at", 0)) < 7000
        )
    except Exception:
        return False


def number(data, *keys, default=None):
    for key in keys:
        value = data.get(key)
        if (
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
        ):
            return value
    return default


def normalized(data, connected=True, error=None, state="live"):
    global READS
    watts = max(0, round(number(data, "power", "watts", default=0)))
    cadence = max(0, round(number(data, "spm", "cadence", "rpm", default=0)))
    distance = max(0, number(data, "distance", default=0))
    elapsed = max(0, number(data, "time", "elapsed", default=0))
    monitor_status = max(0, round(number(data, "status", default=0)))
    interval_count = max(0, round(number(data, "intervalcount", default=0)))
    # BikeErg pace is expressed per kilometre. The legacy pyrow package derives
    # a rowing /500 m pace from watts, so use authoritative PM5 distance/time.
    pace = (elapsed * 1000 / distance) if distance > 0 and elapsed > 0 else 0
    return {
        "connected": connected,
        "fresh": connected,
        "source": "PM5 · USB",
        "machine": str(
            data.get("type")
            or data.get("machine")
            or os.environ.get("NONZERO_ERG_MACHINE", "Concept2")
        ),
        "watts": watts,
        "cadence": cadence,
        "paceSeconds": round(pace, 1),
        "paceBasis": "average-per-1000m",
        "distanceMeters": round(distance, 1),
        "elapsedSeconds": round(elapsed, 1),
        "calories": max(0, round(number(data, "calories", default=0))),
        "heartRate": max(0, round(number(data, "heartrate", "heart_rate", default=0))),
        "monitorStatus": monitor_status,
        "intervalCount": interval_count,
        "moving": bool(watts >= 5 or cadence >= 3),
        "updatedAt": round(time.time() * 1000),
        "bridgeState": state,
        "readSequence": READS,
        "error": error,
        "rawMonitor": data,
        "dragFactor": number(data, "dragFactor", "dragfactor"),
        "workoutType": data.get("workoutType"),
        "workoutState": data.get("workoutState"),
        "intervalType": data.get("intervalType"),
    }


def connect():
    import pyrow

    devices = list(pyrow.find())
    if not devices:
        raise RuntimeError("PM5 not detected on USB")
    return pyrow.pyrow(devices[0])


def recovering_payload(error, state="recovering"):
    """Hold the last valid sample briefly while USB reconnects instead of flashing blanks."""
    now = time.time()
    if LAST_GOOD is not None and now - LAST_GOOD_AT < 12:
        payload = dict(LAST_GOOD)
        payload.update(
            {
                "connected": True,
                "bridgeState": state,
                "recovering": True,
                "error": error,
                "fresh": False,
                "moving": False,
                "sampleAgeMs": round((now - LAST_GOOD_AT) * 1000),
            }
        )
        return payload
    return normalized({}, connected=False, error=error, state="error")


def main():
    global LAST_GOOD, LAST_GOOD_AT, READS, RECORDER
    RUNTIME.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        from metrics import Recorder

        RECORDER = Recorder()
    except Exception as exc:
        print(
            "Recorder initialization failed: " + str(exc), file=sys.stderr, flush=True
        )
    from pm5_capture import Capture

    capture = Capture()
    recorder_retry = 0
    metadata = {}
    last_metadata = 0
    metadata_retry = 0
    erg = None
    last_error = ""
    reconnects = 0
    consecutive_errors = 0
    while RUN:
        active = armed()
        cycle_start = time.monotonic()
        sample_delay = 0.1 if LAST_GOOD and LAST_GOOD.get("moving") else 0.5
        try:
            if erg is None:
                erg = connect()
                reconnects += 1
                metadata = {}
                last_metadata = 0
                metadata_retry = 0
                # Give USB/PM5 a short settle period after reconnect.
                time.sleep(0.18)
            data = erg.get_monitor()
            data.update(metadata)
            READS += 1
            consecutive_errors = 0
            payload = normalized(data, state="live" if active else "watching")
            payload["reconnects"] = reconnects
            payload["recovering"] = False
            LAST_GOOD = dict(payload)
            LAST_GOOD_AT = time.time()
            payload.update(capture.record("usb", "monitor", payload))
            payload["captureTargetHz"] = 10 if sample_delay == 0.1 else 2
            if RECORDER is None and time.monotonic() >= recorder_retry:
                recorder_retry = time.monotonic() + 5
                try:
                    from metrics import Recorder

                    RECORDER = Recorder()
                except Exception as exc:
                    payload["metricsError"] = str(exc)[:180]
            try:
                if RECORDER:
                    payload["recordingId"] = RECORDER.observe(payload)
                    payload["metricsRecording"] = True
                else:
                    payload["metricsRecording"] = False
            except Exception as exc:
                payload["metricsRecording"] = False
                payload["metricsError"] = str(exc)[:180]
                try:
                    RECORDER.c.close()
                except Exception:
                    pass
                RECORDER = None
            atomic_write(OUT, payload)
            last_error = ""
            # Optional CSAFE metadata cannot block the core stream on unsupported firmware.
            if (
                time.time() >= metadata_retry
                and time.time() - last_metadata >= 5
                and hasattr(erg, "send")
            ):
                try:
                    extra = erg.send(
                        [
                            "CSAFE_PM_GET_DRAGFACTOR",
                            "CSAFE_PM_GET_WORKOUTTYPE",
                            "CSAFE_PM_GET_WORKOUTSTATE",
                            "CSAFE_PM_GET_INTERVALTYPE",
                        ]
                    )
                    for command, key in [
                        ("CSAFE_PM_GET_DRAGFACTOR", "dragFactor"),
                        ("CSAFE_PM_GET_WORKOUTTYPE", "workoutType"),
                        ("CSAFE_PM_GET_WORKOUTSTATE", "workoutState"),
                        ("CSAFE_PM_GET_INTERVALTYPE", "intervalType"),
                    ]:
                        if command in extra:
                            metadata[key] = extra[command][0]
                    metadata["csafeSupplemental"] = extra
                    capture.record(
                        "usb",
                        "supplemental",
                        {"receivedAt": time.time() * 1000, "responses": extra},
                    )
                    last_metadata = time.time()
                except Exception:
                    metadata = {}
                    metadata_retry = time.time() + 60
            time.sleep(max(0, sample_delay - (time.monotonic() - cycle_start)))
        except Exception as exc:
            consecutive_errors += 1
            message = str(exc)[:180]
            if message != last_error:
                print(
                    f"PM5 {'active' if active else 'watch'}: {message}",
                    file=sys.stderr,
                    flush=True,
                )
                last_error = message
            # A single USB read miss is common enough that throwing away the
            # device immediately creates a visible dashboard dropout. Keep the
            # last valid metrics while attempting a clean reconnect.
            capture.record("usb", "gap", {"at": time.time() * 1000, "error": message})
            if RECORDER:
                try:
                    RECORDER.idle()
                except Exception:
                    pass
            atomic_write(OUT, recovering_payload(message))
            if consecutive_errors >= 2:
                if erg is not None:
                    try:
                        import usb.util

                        usb.util.dispose_resources(erg.erg)
                    except Exception:
                        pass
                erg = None
                consecutive_errors = 0
                time.sleep(0.5)
            else:
                time.sleep(0.35)


if __name__ == "__main__":
    main()
