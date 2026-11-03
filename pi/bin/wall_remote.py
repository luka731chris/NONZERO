"""Capability-protected LAN controls; never serves the Pi's data APIs."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import hmac, io, json, secrets, socket, subprocess, sys, threading, time


class Controls:
    def __init__(self):
        self.key = secrets.token_urlsafe(32)
        self.code = secrets.token_hex(8).upper()
        self.lock = threading.Lock()
        self.command = None
        self.receipt = None
        self.status = {}
        self.seen = 0
        self.attempts = []
        self.display_until = 0
        self.last_display_request = 0

    def authorize(self, value):
        try:
            value = str(value)
            value.encode("ascii")
        except (UnicodeError, ValueError):
            return False
        now = time.monotonic()
        with self.lock:
            self.attempts = [x for x in self.attempts if now - x < 60]
            if len(self.attempts) >= 20:
                return False
            if hmac.compare_digest(str(value), self.key) or hmac.compare_digest(
                str(value).upper(), self.code
            ):
                return True
            self.attempts.append(now)
            return False

    def show_access(self):
        with self.lock:
            now = time.time()
            if now - self.last_display_request < 5:
                return
            self.last_display_request = now
            self.display_until = now + 120

    def snapshot(self):
        with self.lock:
            if self.command and time.time() - self.command["at"] > 30:
                self.receipt = {
                    "id": self.command["id"],
                    "ok": False,
                    "message": "Wall did not acknowledge within 30 seconds.",
                }
                self.command = None
            return {
                "status": dict(self.status),
                "wallOnline": time.time() - self.seen < 6,
                "pending": self.command["id"] if self.command else None,
                "receipt": self.receipt,
            }

    def submit(self, body):
        if not isinstance(body, dict):
            raise ValueError("Expected an object")
        action = body.get("action")
        if action not in (
            "ambient",
            "performance",
            "night",
            "deep",
            "schedule",
            "quote-next",
            "ride-on", "ride-off", "ride-left", "ride-right", "ride-up", "ride-down", "ride-center", "ride-next",
            "setup",
            "health",
            "close",
            "pair",
            "retry",
        ):
            raise ValueError("Unknown control")
        payload = {"action": action}
        if action == "pair":
            code = str(body.get("code", ""))
            if len(code) != 6 or not code.isascii() or not code.isdigit():
                raise ValueError("Enter the six-digit code from the Nonzero phone app.")
            payload["code"] = code
        self.snapshot()
        with self.lock:
            if self.command:
                raise RuntimeError("Wait for the current control to finish.")
            payload.update(id=secrets.token_hex(12), at=time.time())
            self.command = payload
            if action == "close":
                self.display_until = 0
        return {"id": payload["id"]}

    def poll(self):
        self.snapshot()
        with self.lock:
            self.seen = time.time()
            return self.command

    def ack(self, body):
        with self.lock:
            if self.command and body.get("id") == self.command["id"]:
                self.receipt = {
                    "id": self.command["id"],
                    "ok": body.get("ok") is True,
                    "message": str(body.get("message", ""))[:240],
                }
                self.command = None
            self.status = {
                k: body[k]
                for k in ("mode", "version", "paired", "cloud")
                if k in body and isinstance(body[k], (str, bool))
            }
            self.seen = time.time()


CONTROL = Controls()

_address_cache = (0, [])


def addresses():
    global _address_cache
    if time.monotonic() - _address_cache[0] < 30:
        return _address_cache[1]
    try:
        result = subprocess.check_output(
            ["hostname", "-I"], text=True, timeout=2, stderr=subprocess.DEVNULL
        ).split()
    except (OSError, subprocess.SubprocessError):
        result = []
    import ipaddress

    found = [
        x
        for x in result
        if ":" not in x
        and ipaddress.ip_address(x).is_private
        and not ipaddress.ip_address(x).is_loopback
    ]
    _address_cache = (time.monotonic(), found)
    return found


def link_info():
    host = next(iter(addresses()), socket.gethostname() + ".local")
    return {"url": f"http://{host}:8788/", "key": CONTROL.key, "code": CONTROL.code}


def qr_bytes(root):
    sys.path.insert(0, str(root / "vendor"))
    import qrcode, qrcode.image.svg

    info = link_info()
    qr = qrcode.QRCode(box_size=6, border=4)
    qr.add_data(info["url"] + "#" + info["key"])
    qr.make(fit=True)
    out = io.BytesIO()
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(out)
    return out.getvalue()


class RemoteHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log access credentials or pairing codes.

    def reply(self, body, status=200, content_type="application/json"):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(status)
        for k, v in {
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        }.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def valid_host(self):
        host = self.headers.get("Host", "")
        allowed = {
            "nonzero-pi.local",
            socket.gethostname(),
            socket.gethostname() + ".local",
            "localhost",
            "127.0.0.1",
            self.connection.getsockname()[0],
        }
        return host in {x + ":" + str(self.server.server_port) for x in allowed}

    def do_GET(self):
        if not self.valid_host():
            return self.reply({"error": "Unrecognized Pi address"}, 403)
        path = urlparse(self.path).path
        if path in ("/", "/remote.js", "/remote.css"):
            file = {
                "/": "remote.html",
                "/remote.js": "remote.js",
                "/remote.css": "remote.css",
            }[path]
            mime = {
                "/": "text/html; charset=utf-8",
                "/remote.js": "text/javascript",
                "/remote.css": "text/css",
            }[path]
            return self.reply(
                (self.server.root / "wall" / file).read_bytes(), content_type=mime
            )
        if path != "/status":
            return self.reply({"error": "Not found"}, 404)
        if not CONTROL.authorize(self.headers.get("X-NONZERO-Remote", "")):
            return self.reply(
                {"error": "Scan the TV code or enter its access code."}, 401
            )
        self.reply(CONTROL.snapshot())

    def do_POST(self):
        if not self.valid_host():
            return self.reply({"error": "Unrecognized Pi address"}, 403)
        path = urlparse(self.path).path
        if path not in ("/control", "/show-access", "/connected"):
            return self.reply({"error": "Not found"}, 404)
        if self.headers.get("Origin") != "http://" + self.headers.get("Host", ""):
            return self.reply({"error": "Open the Pi control page directly."}, 403)
        if path == "/show-access":
            CONTROL.show_access()
            return self.reply(
                {
                    "ok": True,
                    "message": "Scan the QR on your TV. It hides after two minutes or when you connect.",
                }
            )
        if not CONTROL.authorize(self.headers.get("X-NONZERO-Remote", "")):
            return self.reply({"error": "Access code required"}, 401)
        if path == "/connected":
            with CONTROL.lock:
                CONTROL.display_until = 0
            return self.reply({"ok": True})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if (
                n < 1
                or n > 1024
                or self.headers.get("Content-Type") != "application/json"
            ):
                raise ValueError("Small JSON request required")
            self.reply(CONTROL.submit(json.loads(self.rfile.read(n))))
        except RuntimeError as e:
            self.reply({"error": str(e)}, 409)
        except (ValueError, TypeError) as e:
            self.reply({"error": str(e)}, 400)


def start(root):
    server = ThreadingHTTPServer(("0.0.0.0", 8788), RemoteHandler)
    server.daemon_threads = True
    server.root = Path(root)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
