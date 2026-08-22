#!/usr/bin/env python3
"""
Local development server.

Why this exists rather than plain `python -m http.server`:

    The built-in server answers conditional requests with 304 Not Modified
    and sets no cache directives, so browsers happily reuse a cached
    js/config.js for the rest of the session. You edit a value, reload, and
    see the old site — with nothing obviously wrong to point at. That wastes
    a genuinely surprising amount of time.

This subclass sends no-store on everything, so a plain reload always fetches
the current file. It is a development convenience only; the deployed site on
GitHub Pages is unaffected by anything here.

Usage:
    python serve.py            # http://localhost:8080
    python serve.py 3000       # a different port
"""

import sys
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = Path(__file__).resolve().parent

# tools/build_moments.py turns assets/moments/ into the manifest the page reads.
# Imported rather than shelled out to, so a request costs no process spawn.
sys.path.insert(0, str(ROOT / "tools"))
try:
    import build_moments
except ImportError:      # tools/ missing — the rest of the site still serves
    build_moments = None

# On Windows the console defaults to cp1252, which cannot encode characters
# outside Latin-1. Printing anything fancier then raises UnicodeEncodeError
# and takes the whole server down before it serves a single request — so
# force UTF-8 and degrade gracefully rather than crash. The banner below
# sticks to ASCII regardless; this only guards against future edits.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass  # not a real stream (piped, redirected, embedded) — fine


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Serves the site with caching disabled."""

    def do_GET(self):
        # Rebuild the moments manifest the instant the page asks for it, so
        # dropping a photo into assets/moments/ and hitting reload is enough —
        # no restarting the server, no build step to remember. In production
        # the same script runs in CI instead (see .github/workflows/moments.yml).
        if build_moments and self.path.split("?")[0].endswith(
            "/assets/moments/manifest.json"
        ):
            try:
                build_moments.main()
            except Exception as exc:   # never let a bad photo 500 the page
                print("  moments: build failed - %s" % exc)
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Drop the validator that would otherwise let the browser send
        # If-Modified-Since and get a 304 back.
        if keyword.lower() == "last-modified":
            return
        super().send_header(keyword, value)

    def log_message(self, fmt, *args):
        # Quieter: only surface failures, not every 200.
        status = str(args[1]) if len(args) > 1 else ""
        if status.startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("", PORT), handler) as httpd:
        print(f"  Serving {ROOT.name}/ with caching disabled")
        print(f"  ->  http://localhost:{PORT}/")
        print(f"  ->  http://localhost:{PORT}/?preview=1   (full site, skips the gate)")
        print(f"  ->  http://localhost:{PORT}/?gate=1      (force the lock screen)")
        print("  Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Stopped.")


if __name__ == "__main__":
    main()
