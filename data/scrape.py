#!/usr/bin/env python3
"""Refresh the Al Majalla author archive and merge it into the site data.

Desk-added pieces that are not in the archive are kept.
Editor's Picks (other authors) are never included.

    python3 data/scrape.py
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from articlelib import (
    crawl_archive,
    download_cover,
    ingest_url,
    load_articles,
    node_id,
    upsert,
    write_articles,
)


def main():
    listed = crawl_archive()
    print(f"archive listed {len(listed)} pieces", file=sys.stderr)

    def pull(item):
        try:
            art = ingest_url(item["url"])
            if not art.get("dek") and item.get("dek"):
                art["dek"] = item["dek"]
            art["source"] = "archive"
            download_cover(art)
            return art
        except Exception as e:
            print(f"  fail {item.get('url')}: {e}", file=sys.stderr)
            return None

    with ThreadPoolExecutor(max_workers=6) as ex:
        fresh = [a for a in ex.map(pull, listed) if a]

    existing = load_articles()
    archive_ids = {a["id"] for a in fresh if a.get("id")}
    archive_urls = {a["url"] for a in fresh}
    kept = [
        a for a in existing
        if a.get("source") == "desk"
        and a.get("id") not in archive_ids
        and a.get("url") not in archive_urls
    ]
    merged = kept
    for art in fresh:
        merged = upsert(merged, art)

    write_articles(merged)
    print(f"wrote {len(merged)} articles ({len(fresh)} from archive, {len(kept)} desk-kept)",
          file=sys.stderr)
    bad = [a for a in fresh if a.get("http") != "200"]
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
