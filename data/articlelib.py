#!/usr/bin/env python3
"""Shared article parsing. Same field rules as the original 26 Al Majalla pieces.

Beat comes from the URL path, not from judgement.
Interview is true when the headline contains لـ"المجلة or لـ«المجلة.
Dates come off the article page. Nothing is invented.
"""
from __future__ import annotations

import json
import re
import subprocess
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_PATH = ROOT / "data" / "articles.json"
DATA_JS_PATH = ROOT / "assets" / "data.js"
COVERS_DIR = ROOT / "assets" / "covers"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

AR_MONTHS = {
    "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "إبريل": 4,
    "مايو": 5, "يونيو": 6, "يوليو": 7, "أغسطس": 8, "سبتمبر": 9,
    "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12,
}
MONTH_AR = {v: k for k, v in AR_MONTHS.items() if k != "إبريل"}

BEATS = {
    "اقتصاد-وأعمال": ("اقتصاد وأعمال", "Economy & Business", "economy"),
    "ثقافة-ومجتمع": ("ثقافة ومجتمع", "Culture & Society", "culture"),
    "علوم-وتكنولوجيا": ("علوم وتكنولوجيا", "Science & Technology", "tech"),
    "زاوية": ("زاوية", "Column", "column"),
    "سياسة": ("سياسة", "Politics", "politics"),
    "بروفايل": ("بروفايل", "Profile", "profile"),
}

SLIM_KEYS = (
    "id", "title", "url", "dek", "dek_long", "kicker", "lead", "date", "date_ar",
    "beat", "beat_ar", "beat_en", "interview", "guest", "image", "outlet",
    "outlet_en", "source",
)

INTERVIEW_MARKS = ('لـ"المجلة', "لـ«المجلة", "لـالمجلة", 'لـ "المجلة')


def get(url: str, timeout: int = 30) -> tuple[str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return "000", ""
    r = subprocess.run(
        ["curl", "-sSL", "--max-time", str(timeout), "-A", UA,
         "-w", "\n__HTTP__%{http_code}", url],
        capture_output=True, text=True,
    )
    body = r.stdout
    code = body.rsplit("__HTTP__", 1)[-1].strip() if "__HTTP__" in body else "000"
    return code, body.rsplit("\n__HTTP__", 1)[0]


def strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def meta(html: str, *keys: str) -> str:
    for key in keys:
        m = re.search(
            rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']+)',
            html, re.I,
        )
        if not m:
            m = re.search(
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{re.escape(key)}["\']',
                html, re.I,
            )
        if m:
            return unescape(m.group(1)).strip()
    return ""


def beat_of(url: str) -> dict:
    parts = unquote(url or "").split("/")
    seg = parts[5] if len(parts) > 5 else ""
    if seg in BEATS:
        ar, en, slug = BEATS[seg]
        return {"beat_ar": ar, "beat_en": en, "beat": slug}
    # Breadcrumb / path fallback for non-majalla or short URLs
    for token, (ar, en, slug) in BEATS.items():
        if token in unquote(url or ""):
            return {"beat_ar": ar, "beat_en": en, "beat": slug}
    return {"beat_ar": "أخرى", "beat_en": "Other", "beat": "other"}


def beat_from_label(label: str) -> dict | None:
    label = (label or "").strip()
    for ar, en, slug in BEATS.values():
        if label == ar or label.lower() == en.lower():
            return {"beat_ar": ar, "beat_en": en, "beat": slug}
    return None


def is_interview(title: str) -> bool:
    t = title or ""
    return any(m in t for m in INTERVIEW_MARKS)


def guest_of(title: str) -> str:
    t = title or ""
    m = re.match(r'^[\s«"\']*(.+?)\s*لـ\s*[\"«"]?المجلة', t)
    return m.group(1).strip(" :\"'«»") if m else ""


def date_ar_from_iso(iso: str) -> str:
    try:
        y, m, d = iso.split("-")
        return f"{int(d):02d} {MONTH_AR[int(m)]} {y}"
    except Exception:
        return ""


def parse_arabic_date(text: str) -> tuple[str, str]:
    d = re.search(r"(\d{1,2})\s+(\S+)\s+(\d{4})", text or "")
    if d and d.group(2) in AR_MONTHS:
        day, month, year = int(d.group(1)), d.group(2), d.group(3)
        iso = f"{year}-{AR_MONTHS[month]:02d}-{day:02d}"
        return iso, f"{day:02d} {month} {year}"
    return "", ""


def parse_iso_date(raw: str) -> tuple[str, str]:
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw or "")
    if not m:
        return "", ""
    iso = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return iso, date_ar_from_iso(iso)


def node_id(url: str) -> int:
    m = re.search(r"/node/(\d+)", url or "")
    return int(m.group(1)) if m else 0


def first_paragraphs(html: str, n: int = 2) -> list[str]:
    i = html.find("entry-article__content")
    chunk = html[i:i + 12000] if i >= 0 else html
    out = []
    for p in re.findall(r"<p[^>]*>(.*?)</p>", chunk, re.S):
        t = strip_tags(p)
        if len(t) > 60:
            out.append(t)
        if len(out) >= n:
            break
    return out


def parse_article_html(html: str, url: str) -> dict:
    """Pull the same fields the archive already stores, plus richer extras."""
    title = strip_tags(
        (re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S) or [None, ""])[1]
    ) or meta(html, "og:title", "twitter:title")
    if title.endswith("| مجلة المجلة"):
        title = title[: -len("| مجلة المجلة")].strip()
    title = re.sub(r"\s+\|\s+.*$", "", title).strip()

    kicker = ""
    blk = re.search(r'entry-article__title["\']?[^>]*>(.*?)</div>', html, re.S)
    if blk:
        ps = re.findall(r"<p[^>]*>(.*?)</p>", blk.group(1), re.S)
        if ps:
            kicker = strip_tags(ps[0])

    og_desc = meta(html, "og:description", "description")
    paras = [p for p in first_paragraphs(html, 4) if p and p != kicker]
    lead = [p[:800] for p in paras[:3]]
    dek_long = og_desc or (paras[0] if paras else kicker)
    dek = paras[0] if paras else (og_desc or kicker)
    if dek and len(dek) > 220:
        dek = dek[:217].rstrip() + "…"

    date = date_ar = ""
    time_blk = re.search(r"entry-article__date(.{0,800})", html, re.S)
    if time_blk:
        date, date_ar = parse_arabic_date(strip_tags(time_blk.group(1)))
    if not date:
        date, date_ar = parse_iso_date(
            meta(html, "article:published_time", "og:updated_time", "pubdate")
        )
    if not date:
        t = re.search(r'<time[^>]*datetime=["\']([^"\']+)', html, re.I)
        if t:
            date, date_ar = parse_iso_date(t.group(1))
        if not date and t:
            date, date_ar = parse_arabic_date(strip_tags(t.group(0)))
    if not date:
        date, date_ar = parse_arabic_date(html[:8000])

    beats = beat_of(url)
    crumb = re.search(
        r'"@type"\s*:\s*"ListItem"[^}]*?"name"\s*:\s*"([^"]+)"',
        html, re.S,
    )
    # Prefer URL beat; if URL has no beat segment, try breadcrumb label.
    if beats["beat"] == "other":
        labels = re.findall(r'"@type"\s*:\s*"ListItem".*?"name"\s*:\s*"([^"]+)"', html, re.S)
        for lab in labels:
            hit = beat_from_label(lab)
            if hit:
                beats = hit
                break

    image = meta(html, "og:image", "twitter:image")
    nid = node_id(url)
    outlet = outlet_en = ""
    host = (urlparse(url).hostname or "").lower()
    if "majalla.com" in host:
        outlet, outlet_en = "المجلة", "Al Majalla"
    elif host:
        outlet = outlet_en = host.replace("www.", "")

    art = {
        "id": nid or abs(hash(url)) % 10_000_000,
        "title": title,
        "url": url,
        "dek": dek,
        "dek_long": dek_long,
        "kicker": kicker,
        "lead": lead,
        "date": date,
        "date_ar": date_ar,
        "interview": is_interview(title),
        "guest": guest_of(title),
        "image": image,
        "outlet": outlet,
        "outlet_en": outlet_en,
        "source": "desk",
    }
    art.update(beats)
    return art


def ingest_url(url: str) -> dict:
    code, html = "000", ""
    last_err = "fetch failed"
    for _ in range(3):
        code, html = get(url)
        if code == "200" and html:
            break
        last_err = f"fetch failed HTTP {code}"
    if code != "200" or not html:
        raise RuntimeError(last_err)
    art = parse_article_html(html, url)
    art["http"] = code
    art["url_kept_id"] = bool(node_id(url)) and f"/node/{node_id(url)}" in url
    return art


def download_cover(art: dict) -> str:
    src = art.get("image") or ""
    if not src.startswith("http"):
        return art.get("cover") or ""
    nid = art.get("id") or node_id(art.get("url") or "")
    if not nid:
        return ""
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    dest = COVERS_DIR / f"{nid}.jpg"
    if dest.exists() and dest.stat().st_size > 1000:
        rel = f"assets/covers/{nid}.jpg"
        art["cover"] = rel
        return rel
    r = subprocess.run(
        ["curl", "-sSL", "--max-time", "30", "-A", UA, "-o", str(dest), src],
        capture_output=True,
    )
    if r.returncode == 0 and dest.exists() and dest.stat().st_size > 1000:
        rel = f"assets/covers/{nid}.jpg"
        art["cover"] = rel
        return rel
    if dest.exists() and dest.stat().st_size <= 1000:
        dest.unlink(missing_ok=True)
    return ""


def load_articles() -> list[dict]:
    if not ARTICLES_PATH.exists():
        return []
    return json.loads(ARTICLES_PATH.read_text(encoding="utf-8"))


def write_articles(articles: list[dict]) -> None:
    articles = sorted(articles, key=lambda a: (a.get("date") or "", a.get("id") or 0), reverse=True)
    ARTICLES_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTICLES_PATH.write_text(
        json.dumps(articles, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    slim = []
    for a in articles:
        row = {k: a[k] for k in SLIM_KEYS if k in a and a[k] not in (None, "")}
        # Always keep the core flags even when false.
        row["interview"] = bool(a.get("interview"))
        slim.append(row)
    DATA_JS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS_PATH.write_text(
        "// Generated by data/articlelib.py. Edit via desk.html or data/ingest.py.\n"
        "window.ARTICLES = "
        + json.dumps(slim, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


ARCHIVE = "https://www.majalla.com/taxonomy/term/249281"


def listing_block(html: str) -> str:
    i = html.find("article-list--opinion-writer-list")
    if i < 0:
        return ""
    tail = html[i:]
    for marker in ("اختيارات المحرر", 'id="panel1"', "article-list--tabbed"):
        j = tail.find(marker)
        if j > 0:
            tail = tail[:j]
    return tail


def parse_listing(html: str) -> list[dict]:
    block = listing_block(html)
    items = []
    for chunk in re.split(r'<article[^>]*class="[^"]*article-item', block)[1:]:
        m = re.search(
            r'article-item__title["\'][^>]*>\s*<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
            chunk, re.S,
        )
        if not m:
            m = re.search(
                r'<a[^>]*href="(https://www\.majalla\.com/node/[^"]+)"[^>]*>(.*?)</a>',
                chunk, re.S,
            )
        if not m:
            continue
        href, title = m.group(1), strip_tags(m.group(2))
        dek = ""
        d = re.search(r'article-item__(?:summary|desc|text)[^>]*>(.*?)</', chunk, re.S)
        if d:
            dek = strip_tags(d.group(1))
        if not dek:
            for p in re.findall(r"<p[^>]*>(.*?)</p>", chunk, re.S):
                t = strip_tags(p)
                if len(t) > 40:
                    dek = t
                    break
        if title and "/node/" in href:
            items.append({"title": title, "url": href, "dek": dek})
    return items


def crawl_archive(max_pages: int = 12) -> list[dict]:
    articles, seen = [], set()
    for page in range(0, max_pages):
        url = ARCHIVE if page == 0 else f"{ARCHIVE}?page={page}"
        code, html = get(url)
        if code != "200":
            break
        items = parse_listing(html)
        fresh = [i for i in items if i["url"] not in seen]
        for i in fresh:
            seen.add(i["url"])
        articles += fresh
        if len(items) < 10:
            break
    return articles


def upsert(articles: list[dict], incoming: dict) -> list[dict]:
    url = incoming.get("url") or ""
    nid = incoming.get("id")
    out = []
    replaced = False
    for a in articles:
        same = (url and a.get("url") == url) or (nid and a.get("id") == nid and nid)
        if same:
            merged = dict(a)
            merged.update({k: v for k, v in incoming.items() if v not in (None, "")})
            merged["interview"] = bool(incoming.get("interview", merged.get("interview")))
            out.append(merged)
            replaced = True
        else:
            out.append(a)
    if not replaced:
        out.append(incoming)
    return out
