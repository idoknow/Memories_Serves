#!/usr/bin/env python3
import hashlib
import hmac
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer


HOST = os.environ.get("WEBHOOK_HOST", "127.0.0.1")
PORT = int(os.environ.get("WEBHOOK_PORT", "9090"))
SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
INSTALL_SCRIPT = os.environ.get("INSTALL_SCRIPT", "/opt/memories-serves/install-release.sh")
SERVICE_NAME = os.environ.get("SERVICE_NAME", "memories-serves")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/github-release":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(length)

        if not verify_signature(body, self.headers.get("x-hub-signature-256", "")):
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b"invalid signature\n")
            return

        event = self.headers.get("x-github-event", "")
        payload = json.loads(body.decode("utf-8"))
        action = payload.get("action", "")
        tag_name = payload.get("release", {}).get("tag_name", "")

        if event != "release" or action != "published" or not tag_name:
            self.send_response(202)
            self.end_headers()
            self.wfile.write(b"ignored\n")
            return

        subprocess.run([INSTALL_SCRIPT, tag_name], check=True)
        subprocess.run(["systemctl", "restart", SERVICE_NAME], check=True)

        self.send_response(200)
        self.end_headers()
        self.wfile.write(f"deployed {tag_name}\n".encode("utf-8"))

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


def verify_signature(body, signature_header):
    if not SECRET or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    actual = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, actual)


if __name__ == "__main__":
    HTTPServer((HOST, PORT), Handler).serve_forever()