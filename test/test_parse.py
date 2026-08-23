#!/usr/bin/env python3
"""Parser checks against a saved Majalla page and the interview title rule."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))
from articlelib import guest_of, is_interview, parse_article_html

html = (ROOT / "test" / "fixtures" / "332326.html").read_text(encoding="utf-8")
url = "https://www.majalla.com/node/332326/%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF-%D9%88%D8%A3%D8%B9%D9%85%D8%A7%D9%84/x"
art = parse_article_html(html, url)

fail = 0

def ok(name, cond, detail=""):
    global fail
    if cond:
        print("  PASS ", name)
    else:
        fail += 1
        print("  FAIL ", name, detail)

ok("title", art["title"].startswith("سباق الخليج إلى الأمن المائي"))
ok("date iso", art["date"] == "2026-08-02")
ok("date ar", "أغسطس" in art["date_ar"] and "2026" in art["date_ar"])
ok("beat economy", art["beat"] == "economy")
ok("not interview", art["interview"] is False)
ok("guest empty", art["guest"] == "")

title = 'أسامة الواصلي لـ"المجلة": المعارك الأدبية ظاهرة عميقة'
ok("interview detect", is_interview(title))
ok("guest extract", guest_of(title) == "أسامة الواصلي")
ok("broken quote still extracts",
   guest_of('سعد الراشد لـ"المجلة: "درب زبيدة"') == "سعد الراشد")

print("failed" if fail else "ok", fail)
sys.exit(1 if fail else 0)
