"""BlockLink MVP: same-machine HTTP relay, Python 3.9+, no pip dependencies."""
import argparse
import json
import math
import re
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
LOCK = threading.Lock()
STATE = {"frame": None, "seq": 0, "browser_at": 0, "ue_at": 0,
         "ue": {"applied_seq": 0, "parts": 0, "error": ""}}


def vector(value, length, limit=100000):
    if not isinstance(value, list) or len(value) != length:
        raise ValueError("Invalid vector length")
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or
           not math.isfinite(x) or abs(x) > limit for x in value):
        raise ValueError("Invalid vector value")


def validate_frame(frame):
    if not isinstance(frame, dict) or frame.get("version") != 1:
        raise ValueError("Expected protocol version 1")
    vector([frame.get("time")], 1)
    if not isinstance(frame.get("animation"), str) or len(frame["animation"]) > 32:
        raise ValueError("Invalid animation")
    parts = frame.get("parts")
    if not isinstance(parts, list) or not 1 <= len(parts) <= 64:
        raise ValueError("Expected 1..64 parts")
    names = set()
    for p in parts:
        if not isinstance(p, dict):
            raise ValueError("Invalid part")
        name = p.get("id", "")
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_]{1,40}", name) or name in names:
            raise ValueError("Invalid or duplicate part id")
        names.add(name)
        vector(p.get("p"), 3)
        vector(p.get("q"), 4, 1.01)
        if abs(sum(x*x for x in p["q"]) - 1) > 0.02:
            raise ValueError("Quaternion must be normalized")
        vector(p.get("s"), 3, 100)
        if min(p["s"]) <= 0:
            raise ValueError("Part dimensions must be positive")
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(p.get("color", ""))):
            raise ValueError("Invalid color")
        if not isinstance(p.get("visible"), bool):
            raise ValueError("Expected visible boolean")
    return frame


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if args and str(args[0]).startswith(('POST /api', 'GET /api')):
            return
        super().log_message(fmt, *args)

    def allowed(self):
        port = self.server.server_port
        if self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
            return False
        origin = self.headers.get("Origin")
        return not origin or origin in (f"http://127.0.0.1:{port}", f"http://localhost:{port}")

    def reply(self, obj, status=200):
        b = json.dumps(obj, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if not self.allowed():
            return self.reply({"error": "Only localhost is allowed"}, 403)
        path = urlsplit(self.path).path
        if path == "/api/frame":
            with LOCK:
                data = {"seq": STATE["seq"], "frame": STATE["frame"],
                        "browser_age": time.monotonic() - STATE["browser_at"]}
            return self.reply(data)
        if path == "/api/status":
            with LOCK:
                now = time.monotonic()
                data = {"bridge": True, "seq": STATE["seq"],
                        "browser_live": now - STATE["browser_at"] < 3,
                        "unreal_live": now - STATE["ue_at"] < 3, **STATE["ue"]}
            return self.reply(data)
        if path == "/api/setup":
            # Absolute path is returned only to this local browser to make setup copy/paste safe.
            script = str(ROOT / "unreal" / "blocklink_unreal.py").replace("\\", "/")
            command = "exec(compile(open(" + repr(script) + ", encoding='utf-8').read(), " + repr(script) + ", 'exec'))"
            return self.reply({"command": command})
        if path.startswith('/api/'):
            return self.reply({"error": "Not found"}, 404)
        if path not in ("/", "/index.html", "/app.js", "/style.css", "/favicon.ico",
                        "/vendor/three.module.js", "/vendor/THREE-LICENSE.txt"):
            return self.reply({"error": "Not found"}, 404)
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        if not self.allowed():
            return self.reply({"error": "Only localhost is allowed"}, 403)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 131072:
                return self.reply({"error": "Invalid payload size"}, 413)
            data = json.loads(self.rfile.read(size))
            path = urlsplit(self.path).path
            if path == "/api/frame":
                validate_frame(data)
                with LOCK:
                    STATE["frame"] = data
                    STATE["seq"] += 1
                    STATE["browser_at"] = time.monotonic()
                    seq = STATE["seq"]
                return self.reply({"seq": seq})
            if path == "/api/ue-status":
                if not isinstance(data, dict):
                    raise ValueError("Invalid status")
                with LOCK:
                    STATE["ue"] = {"applied_seq": int(data.get("applied_seq", 0)),
                                   "parts": int(data.get("parts", 0)),
                                   "error": str(data.get("error", ""))[:500]}
                    STATE["ue_at"] = time.monotonic()
                return self.reply({"ok": True})
            return self.reply({"error": "Not found"}, 404)
        except (ValueError, TypeError, KeyError) as exc:
            return self.reply({"error": str(exc)}, 400)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 8765), partial(Handler, directory=str(ROOT / "web")))
    except OSError as exc:
        raise SystemExit(f"Cannot start port 8765: {exc}. Close any previous BlockLink window.")
    print("BlockLink MVP: http://127.0.0.1:8765\nKeep this window open. Ctrl+C to stop.", flush=True)
    if not args.no_browser:
        webbrowser.open("http://127.0.0.1:8765")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
