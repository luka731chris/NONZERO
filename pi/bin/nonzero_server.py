#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import json, math, os, time, tempfile, re

# Resolve once at process startup. An old process must not report the version
# of a newly switched symlink before the service has actually restarted.
RELEASE_ROOT = Path(__file__).resolve().parents[1]
try:
    _release = re.fullmatch(
        r"NONZERO Pi Wall v(\d+\.\d+\.\d+)\s*",
        (RELEASE_ROOT / "VERSION.txt").read_text(),
    )
    SERVER_VERSION = _release.group(1) if _release else None
except (OSError, UnicodeError):
    SERVER_VERSION = None
ROOT = RELEASE_ROOT / "wall"
RUNTIME = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "nonzero-wall"
RUNTIME.mkdir(parents=True, exist_ok=True)
HEARTBEAT = RUNTIME / "heartbeat.json"
LAST_EXIT = RUNTIME / "last-exit.json"
ERG_ARM = RUNTIME / "erg-arm.json"
ERG_DATA = RUNTIME / "erg-telemetry.json"
CONNECTION_RETRY = RUNTIME / "connection-retry.json"


def telemetry_stamp(data):
    try:
        value = float(data.get("updatedAt") or 0)
        return value if math.isfinite(value) and value > 0 else 0
    except (TypeError, ValueError, AttributeError):
        return 0


def telemetry_fresh(data):
    stamp = telemetry_stamp(data)
    return bool(
        isinstance(data, dict)
        and data.get("connected")
        and not data.get("recovering")
        and stamp
        and -1000 <= time.time() * 1000 - stamp < 2500
    )


def selected_telemetry():
    candidates = []
    for path in [ERG_DATA, RUNTIME / "erg-ble-telemetry.json"]:
        try:
            d = json.loads(path.read_text())
            if isinstance(d, dict):
                candidates.append(d)
        except Exception:
            pass
    fresh = [d for d in candidates if telemetry_fresh(d)]

    def moving(d):
        try:
            return float(d.get("cadence") or 0) >= 3 or float(d.get("watts") or 0) >= 5
        except Exception:
            return False

    if fresh:
        return max(
            fresh, key=lambda d: (moving(d), not ("Bluetooth" in str(d.get("source"))))
        )
    return (
        candidates[0]
        if candidates
        else {"connected": False, "source": "PM5", "updatedAt": 0}
    )


class H(SimpleHTTPRequestHandler):
    def json_reply(self, data, status=200):
        body = json.dumps(data, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def translate_path(self, path):
        p = urlparse(path).path
        rel = p.lstrip("/") or "index.html"
        candidate = (ROOT / rel).resolve()
        if candidate != ROOT and ROOT not in candidate.parents:
            return str(ROOT / "__not_found__")
        return str(candidate)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def do_POST(self):
        route = urlparse(self.path).path
        if route == "/api/wall-control/ack":
            if self.headers.get("Origin") not in (
                None,
                "http://" + self.headers.get("Host", ""),
            ):
                return self.json_reply({"error": "Local page required"}, 403)
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if (
                    n < 1
                    or n > 2048
                    or "application/json" not in self.headers.get("Content-Type", "")
                ):
                    raise ValueError("Small JSON required")
                from wall_remote import CONTROL

                data = json.loads(self.rfile.read(n))
                if not isinstance(data, dict):
                    raise ValueError("Object required")
                CONTROL.ack(data)
                return self.json_reply({"ok": True})
            except (ValueError, TypeError):
                return self.json_reply({"error": "Invalid acknowledgement"}, 400)
        if route in ["/api/connection/retry", "/api/connection/ack"]:
            try:
                origin = self.headers.get("Origin")
                if origin and origin != "http://" + self.headers.get("Host", ""):
                    self.json_reply({"error": "Use the local page"}, 403)
                    return
                if "application/json" not in self.headers.get("Content-Type", ""):
                    self.json_reply({"error": "JSON required"}, 415)
                    return
                n = int(self.headers.get("Content-Length", "0"))
                if n < 1 or n > 4096:
                    raise ValueError("Invalid request size")
                body = json.loads(self.rfile.read(n))
                if route.endswith("/ack"):
                    from connection_monitor import acknowledge

                    acknowledge(body)
                else:
                    CONNECTION_RETRY.write_text(
                        json.dumps({"nonce": str(time.time_ns())})
                    )
                self.json_reply({"ok": True})
            except (ValueError, TypeError) as e:
                self.json_reply({"error": str(e)}, 400)
            return
        if route == "/api/coaching":
            try:
                origin = self.headers.get("Origin")
                if origin and origin != "http://" + self.headers.get("Host", ""):
                    self.json_reply({"error": "Use the local coach page"}, 403)
                    return
                if "application/json" not in self.headers.get("Content-Type", ""):
                    self.json_reply({"error": "JSON required"}, 415)
                    return
                n = int(self.headers.get("Content-Length", "0"))
                if n < 1 or n > 512000:
                    raise ValueError("Invalid request size")
                from goal_coach_store import save

                self.json_reply(save(json.loads(self.rfile.read(n))))
            except (ValueError, TypeError) as e:
                from coach_protocol import Conflict

                self.json_reply(
                    {
                        "error": str(e),
                        "fields": getattr(e, "fields", []),
                        "snapshot": __import__("goal_coach_store").read(),
                    },
                    409 if isinstance(e, Conflict) else 400,
                )
            except Exception:
                self.json_reply(
                    {
                        "error": "Pi storage is unavailable. Changes have not been acknowledged."
                    },
                    503,
                )
            return
        if route == "/api/metrics/profile":
            try:
                n = int(self.headers.get("content-length", "0"))
                if n < 1 or n > 8192:
                    raise ValueError("Invalid profile size")
                from metrics import connection, set_profile

                c = connection()
                try:
                    result = set_profile(c, json.loads(self.rfile.read(n)))
                finally:
                    c.close()
                self.json_reply(result)
            except (ValueError, TypeError, AttributeError) as e:
                self.json_reply({"error": str(e)}, 400)
            return
        if route not in ("/api/heartbeat", "/api/erg/arm"):
            self.send_error(404)
            return
        try:
            n = min(int(self.headers.get("content-length", "0")), 65536)
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            data = {}
        if not isinstance(data, dict):
            self.send_error(400, "Expected a JSON object")
            return
        data["serverReceivedAt"] = int(time.time() * 1000)
        target = ERG_ARM if route == "/api/erg/arm" else HEARTBEAT
        data["at"] = int(time.time() * 1000)
        with tempfile.NamedTemporaryFile(
            mode="w", dir=target.parent, prefix=target.name + ".", delete=False
        ) as f:
            json.dump(data, f)
            tmp = Path(f.name)
        tmp.replace(target)
        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlparse(self.path).path
        if route in ("/api/wall-control", "/api/wall-control/qr.svg"):
            from wall_remote import CONTROL, link_info, qr_bytes

            if route.endswith("qr.svg"):
                try:
                    body = qr_bytes(RELEASE_ROOT)
                    self.send_response(200)
                    self.send_header("Content-Type", "image/svg+xml")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                except Exception:
                    self.json_reply({"error": "Use the displayed access code"}, 503)
                return
            info = link_info()
            info.pop("key")
            return self.json_reply(
                {
                    **info,
                    "command": CONTROL.poll(),
                    "showAccess": time.time() < CONTROL.display_until,
                }
            )
        if route in ["/api/connection", "/api/connection/export"]:
            from connection_monitor import snapshot, history

            try:
                heartbeat = (
                    json.loads(HEARTBEAT.read_text()) if HEARTBEAT.exists() else {}
                )
                data = snapshot(selected_telemetry(), heartbeat, SERVER_VERSION)
                if route.endswith("/export"):
                    self.json_reply(
                        {"schemaVersion": 1, "current": data, "events": history()}
                    )
                else:
                    self.json_reply(data)
            except Exception:
                self.json_reply(
                    {
                        "error": "Recorder diagnostics unavailable; no storage proof is inferred."
                    },
                    503,
                )
            return
        if route == "/api/coaching":
            from goal_coach_store import read

            self.json_reply(read())
            return
        if route in ["/api/coaching/link", "/api/coaching/qr.svg"]:
            import sys
            from urllib.parse import urlsplit, urlunsplit

            # The kiosk API intentionally listens on loopback. Send phones to
            # their HTTPS app instead of advertising an unreachable private port.
            from goal_coach_store import read
            mirror = read().get("mirror") or {}
            preferences = mirror.get("suitePreferences") if isinstance(mirror, dict) else {}
            configured = preferences.get("phoneURL", "") if isinstance(preferences, dict) else ""
            default = "https://luka731chris.github.io/NONZERO/"
            try:
                target = urlsplit(str(configured).strip())
                if target.scheme != "https" or not target.hostname or target.username or target.password:
                    target = urlsplit(default)
                target.port  # Reject malformed configured ports.
            except ValueError:
                target = urlsplit(default)
            link = urlunsplit((target.scheme, target.netloc, target.path or "/", "", "check-in"))
            if route.endswith("/link"):
                self.json_reply({"url": link})
                return
            if not link:
                self.json_reply({"error": "LAN address unavailable"}, 503)
                return
            try:
                sys.path.insert(0, str(RELEASE_ROOT / "vendor"))
                import qrcode, qrcode.image.svg, io

                qr = qrcode.QRCode(box_size=6, border=4)
                qr.add_data(link)
                qr.make(fit=True)
                buf = io.BytesIO()
                qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(buf)
                body = buf.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "image/svg+xml")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception:
                self.json_reply({"error": "Use the displayed local coach link"}, 503)
            return
        if route == "/api/metrics/capture/export":
            import zlib
            from metrics import connection

            c = connection()
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/x-ndjson")
                self.send_header(
                    "Content-Disposition",
                    'attachment; filename="NONZERO-PM5-Raw.ndjson"',
                )
                self.end_headers()
                if c.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='capture_packets'"
                ).fetchone():
                    for row in c.execute(
                        "SELECT received_ns,transport,kind,payload FROM capture_packets ORDER BY received_ns"
                    ):
                        data = {
                            "receivedNs": row[0],
                            "transport": row[1],
                            "kind": row[2],
                            "payload": json.loads(zlib.decompress(row[3])),
                        }
                        self.wfile.write(
                            (json.dumps(data, separators=(",", ":")) + "\n").encode()
                        )
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                c.close()
            return
        if route.startswith("/api/metrics/"):
            from metrics import connection, listing, ride

            c = connection()
            try:
                query = parse_qs(urlparse(self.path).query)
                if route == "/api/metrics/cockpit":
                    from connected_analytics import snapshot

                    data = snapshot(c)
                elif route == "/api/metrics/capture":
                    exists = c.execute(
                        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='capture_packets'"
                    ).fetchone()
                    count, last = (
                        c.execute(
                            "SELECT COUNT(*),MAX(received_ns) FROM capture_packets"
                        ).fetchone()
                        if exists
                        else (0, None)
                    )
                    rate = (
                        c.execute(
                            "SELECT COUNT(*) FROM capture_packets WHERE kind='monitor' AND received_ns>?",
                            (time.time_ns() - 10000000000,),
                        ).fetchone()[0]
                        / 10
                        if exists
                        else 0
                    )
                    t = selected_telemetry()
                    data = {
                        "observedUsbHzLast10s": rate,
                        "packetCount": count,
                        "lastPacketAt": last / 1000000 if last else None,
                        "live": telemetry_fresh(t),
                        "captureStored": t.get("captureStored", False),
                        "error": t.get("captureError"),
                        "targetHz": t.get("captureTargetHz"),
                        "localOnly": True,
                    }
                elif route == "/api/metrics/rides":
                    data = listing(
                        c,
                        int(query.get("limit", ["50"])[0]),
                        int(query.get("offset", ["0"])[0]),
                    )
                    try:
                        t = selected_telemetry()
                        data["recorder"] = {
                            "live": telemetry_fresh(t),
                            "recording": t.get("metricsRecording", False),
                            "heartRate": (
                                t.get("heartRate") if telemetry_fresh(t) else None
                            ),
                            "error": t.get("metricsError"),
                            "captureStored": t.get("captureStored", False),
                            "captureError": t.get("captureError"),
                            "targetHz": t.get("captureTargetHz"),
                        }
                    except Exception:
                        data["recorder"] = {"live": False, "recording": False}
                elif route == "/api/metrics/ride":
                    data = ride(c, query.get("id", [""])[0], True)
                    if data is None:
                        self.json_reply({"error": "Ride not found"}, 404)
                        return
                elif route == "/api/metrics/backup":
                    count = c.execute("SELECT COUNT(*) FROM rides").fetchone()[0]
                    data = {
                        "schemaVersion": 1,
                        "exportedAt": int(time.time() * 1000),
                        "profile": __import__("metrics").profile(c),
                        "rides": [
                            ride(c, r[0], True)
                            for r in c.execute("SELECT id FROM rides ORDER BY start")
                        ],
                    }
                else:
                    self.json_reply({"error": "Not found"}, 404)
                    return
                self.json_reply(data)
            except (ValueError, TypeError) as e:
                self.json_reply({"error": str(e)}, 400)
            finally:
                c.close()
            return
        if urlparse(self.path).path == "/api/erg/telemetry":
            data = selected_telemetry()
            if not isinstance(data, dict):
                data = {"connected": False, "updatedAt": 0}
            data["fresh"] = telemetry_fresh(data)
            if CONNECTION_RETRY.exists():
                try:
                    data["connectionRetry"] = json.loads(
                        CONNECTION_RETRY.read_text()
                    ).get("nonce")
                except:
                    pass
            data["ageMs"] = (
                max(0, int(time.time() * 1000 - telemetry_stamp(data)))
                if telemetry_stamp(data)
                else None
            )
            body = json.dumps(data).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if urlparse(self.path).path == "/api/health":
            data = {
                "ok": SERVER_VERSION is not None,
                "serverTime": int(time.time() * 1000),
                "version": SERVER_VERSION,
                "versionSource": "VERSION.txt",
            }
            if HEARTBEAT.exists():
                try:
                    data["wall"] = json.loads(HEARTBEAT.read_text())
                except:
                    pass
            if LAST_EXIT.exists():
                try:
                    data["lastBrowserRecovery"] = json.loads(LAST_EXIT.read_text())
                except:
                    pass
            if ERG_DATA.exists() or (RUNTIME / "erg-ble-telemetry.json").exists():
                try:
                    pm5 = selected_telemetry()
                    pm5["fresh"] = telemetry_fresh(pm5)
                    data["pm5"] = pm5
                except:
                    pass
            if ERG_ARM.exists():
                try:
                    arm = json.loads(ERG_ARM.read_text())
                    arm["fresh"] = bool(
                        arm.get("at")
                        and int(time.time() * 1000) - int(arm["at"]) < 7000
                    )
                    data["pm5Arm"] = arm
                except:
                    pass
            body = json.dumps(data).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        print(time.strftime("%Y-%m-%d %H:%M:%S"), fmt % args, flush=True)


if __name__ == "__main__":
    from wall_remote import start

    try:
        remote_server = start(RELEASE_ROOT)
        print("NONZERO phone controls on local network port 8788", flush=True)
    except OSError as e:
        print("Phone controls unavailable: " + str(e), flush=True)
    os.chdir(ROOT)
    print("NONZERO server http://127.0.0.1:8787", flush=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8787), H)
    server.daemon_threads = True
    server.serve_forever()
