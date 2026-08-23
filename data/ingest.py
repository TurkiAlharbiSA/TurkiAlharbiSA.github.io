#!/usr/bin/env python3
"""Ingest one article URL into the site data, using the same rules as the archive.

    python3 data/ingest.py https://www.majalla.com/node/332326/...
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from articlelib import download_cover, ingest_url, load_articles, upsert, write_articles


def main():
    if len(sys.argv) < 2:
        print("usage: python3 data/ingest.py <article-url>", file=sys.stderr)
        return 2
    url = sys.argv[1].strip()
    art = ingest_url(url)
    download_cover(art)
    arts = upsert(load_articles(), art)
    write_articles(arts)
    print(json.dumps(
        {k: art.get(k) for k in
         ("id", "title", "date", "beat", "interview", "guest", "cover")},
        ensure_ascii=False, indent=2,
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
