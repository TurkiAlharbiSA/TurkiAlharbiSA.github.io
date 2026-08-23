# تركي الحربي

Personal broadsheet for Turki Alharbi, journalist at Al Majalla.
No build step. Static files, plus an optional local desk server so he can add work.

## Run it

```bash
cd /Users/bakr/Documents/TurkiAlharbi2
python3 server.py
```

Open http://127.0.0.1:8788

The public site is `index.html`. The desk is `desk.html`.

A plain static server works for reading the site. Adding a piece from a link needs `server.py`, because the browser cannot fetch majalla.com on its own.

## Add a piece

On http://127.0.0.1:8788/desk.html

1. Paste an article URL and press «اقرأ الرابط».
   The desk uses the same rules as the existing 26: beat from the URL path, date from the page, interview if the headline addresses المجلة.
2. Or fill the form by hand.
3. Check the preview. Press «حفظ في الموقع».

The piece shows on the public page immediately.

Refresh only the new Majalla rows with «اسحب الجديد من أرشيف المجلة», or from the terminal:

```bash
python3 data/ingest.py 'https://www.majalla.com/node/…'
python3 data/scrape.py
```

## Files

| Path | What it is |
|---|---|
| `index.html` | Public broadsheet |
| `desk.html` | Add or edit a piece |
| `styles.css` | Shared styling. Logical properties, so RTL and LTR share one sheet |
| `lib.js` | Merge, dates, Arabic counts, search fold |
| `script.js` | Public page |
| `desk.js` | Desk |
| `server.py` | Static files + `/api/ingest` + `/api/save` |
| `assets/data.js` | Generated article list |
| `assets/covers/` | Local cover images from each article page |
| `data/articlelib.py` | Shared parser |
| `data/ingest.py` | One URL on the command line |
| `data/scrape.py` | Full archive refresh, keeps desk-added pieces |
| `data/notes.md` | Where every fact came from |

## GitHub Pages

The public site is static, so Pages can serve it from `main` at `/`.
`.nojekyll` is in the repo so Jekyll does not eat files.

GitHub Pages cannot run `server.py`. Opening `desk.html` on `*.github.io`
saves only in that browser. It does not change what other people see.

To change the live site after it is on GitHub, use one of these:

1. **Local desk, then push** (best for editing fields by hand)

   ```bash
   python3 server.py
   # add or edit on http://127.0.0.1:8788/desk.html
   git add data/articles.json assets/data.js assets/covers
   git commit -m "Publish a piece"
   git push
   ```

2. **Actions, no laptop** (best for a new Majalla link)

   Repo → Actions → **Publish a piece** → Run workflow.
   Paste the article URL. Optionally turn on archive refresh.
   The workflow runs `data/ingest.py` / `data/scrape.py` and pushes
   the updated list. Pages rebuilds on its own.

I have not created the GitHub repo or turned Pages on. That needs
the account you want the site under.

## Content rules

1. Headlines are never translated. EN mode switches chrome and biography only.
2. No invented dates.
3. No published personal email.
4. Stat numbers and the lede count are computed from the live list, so they cannot drift.
