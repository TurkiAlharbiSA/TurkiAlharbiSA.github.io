#!/usr/bin/env python3
"""Local newsroom server: static files plus ingest/save for the desk.

    python3 server.py            # 127.0.0.1:8788
    python3 server.py 8790
"""
from __future__ import annotations

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "data"))
from articlelib import (  # noqa: E402
    download_cover,
    ingest_url,
    load_articles,
    upsert,
    write_articles,
    crawl_archive,
)


HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8788


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code: int, payload) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 2_000_000:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8"))

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._json(200, {"ok": True, "desk": True})
        if path == "/api/articles":
            return self._json(200, load_articles())
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json()
        except Exception as e:
            return self._json(400, {"ok": False, "error": f"bad json: {e}"})

        if path == "/api/ingest":
            url = (body.get("url") or "").strip()
            if not url.startswith("http"):
                return self._json(400, {"ok": False, "error": "أدخل رابطا يبدأ بـ http"})
            try:
                art = ingest_url(url)
                download_cover(art)
                return self._json(200, {"ok": True, "article": art})
            except Exception as e:
                return self._json(502, {"ok": False, "error": str(e)})

        if path == "/api/save":
            art = body.get("article") or body
            if not art.get("title"):
                return self._json(400, {"ok": False, "error": "العنوان مطلوب"})
            art.setdefault("source", "desk")
            arts = upsert(load_articles(), art)
            write_articles(arts)
            return self._json(200, {"ok": True, "article": art, "total": len(arts)})

        if path == "/api/refresh":
            listed = crawl_archive()
            existing = load_articles()
            known = {a.get("url") for a in existing}
            added = []
            for item in listed:
                if item["url"] in known:
                    continue
                try:
                    art = ingest_url(item["url"])
                    art["source"] = "archive"
                    download_cover(art)
                    existing = upsert(existing, art)
                    added.append(art)
                except Exception as e:
                    return self._json(502, {"ok": False, "error": str(e)})
            write_articles(existing)
            return self._json(200, {"ok": True, "added": len(added), "total": len(existing),
                                    "articles": added})

        if path == "/api/delete":
            key = body.get("id")
            url = body.get("url")
            arts = [
                a for a in load_articles()
                if not ((key and a.get("id") == key) or (url and a.get("url") == url))
            ]
            write_articles(arts)
            return self._json(200, {"ok": True, "total": len(arts)})

        return self._json(404, {"ok": False, "error": "not found"})


def main():
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Turki desk at http://{HOST}:{PORT}/  (ctrl+c to stop)", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye", flush=True)


if __name__ == "__main__":
    main()
