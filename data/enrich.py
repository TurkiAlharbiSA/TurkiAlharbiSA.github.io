#!/usr/bin/env python3
"""Enrich the existing 26 records with kicker, long dek, and local cover image."""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from articlelib import download_cover, ingest_url, load_articles, upsert, write_articles


def pull(old):
    try:
        art = ingest_url(old["url"])
        # Keep verified archive fields if the live page is thinner.
        for k in ("title", "date", "date_ar", "beat", "beat_ar", "beat_en", "interview"):
            if old.get(k) and not art.get(k):
                art[k] = old[k]
        if not art.get("dek") and old.get("dek"):
            art["dek"] = old["dek"]
        art["source"] = old.get("source") or "archive"
        art["id"] = old.get("id") or art.get("id")
        download_cover(art)
        print(f"  ok {art['id']} cover={bool(art.get('cover'))} kicker={bool(art.get('kicker'))}",
              file=sys.stderr)
        return art
    except Exception as e:
        print(f"  fail {old.get('id')}: {e}", file=sys.stderr)
        return old


def main():
    existing = load_articles()
    with ThreadPoolExecutor(max_workers=6) as ex:
        fresh = list(ex.map(pull, existing))
    out = []
    for art in fresh:
        out = upsert(out, art)
    write_articles(out)
    print(f"enriched {len(out)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
