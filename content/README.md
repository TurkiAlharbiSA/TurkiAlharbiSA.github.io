# Content for TurkiAlharbi2

This folder is the written side of the site. The public page reads
`assets/data.js`. That file is generated from `data/articles.json`.

## What is in each piece

Taken from the published page, never invented:

- title
- kicker
- dek / dek_long
- lead (first three body paragraphs, as a teaser)
- date
- beat (from the URL path)
- interview / guest (from the headline)
- cover image

The full article stays on majalla.com. This site keeps the opening, then sends the reader to the source.

## How Turki adds or edits

1. Open http://127.0.0.1:8788/desk.html
2. Paste a link, or type the fields, including the opening paragraphs
3. Save

Or from the terminal:

```bash
python3 data/ingest.py 'https://www.majalla.com/node/…'
```
