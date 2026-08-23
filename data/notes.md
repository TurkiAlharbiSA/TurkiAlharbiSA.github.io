# Turki Alharbi — source notes

Everything below is scraped from public sources. Nothing invented.

## Sources
- LinkedIn: https://www.linkedin.com/in/turki-alharbi-653b35259/
- Al Majalla author archive: https://www.majalla.com/taxonomy/term/249281

## Facts from LinkedIn top card
- Name: Turki Alharbi / تركي الحربي
- Headline: "Journalist at Al Majalla | Public Relations | content writer"
- Location: Riyadh Region / منطقة الرياض
- Current: المجلة (Al Majalla, SRMG)
- Education: جامعة الإمام محمد بن سعود الإسلامية
- Linked website on profile: the Al Majalla author archive above

## Credential (from his own LinkedIn post, quoted verbatim)
Completed برنامج مهارات الصحفي في عصر الذكاء الاصطناعي والميتافيرس.
Selected among 100 media professionals out of 1000 applicants.
Delivered by هيئة الصحفيين السعوديين in partnership with جامعة ميزوري الأميركية,
organised by معهد اليوم للتدريب.
Honoured by صاحب السمو الملكي الأمير سعود بن نايف بن عبد العزيز، أمير المنطقة الشرقية.
NOTE: no year stated in the post. Do not guess one.

## How new pieces get onto the site
The original 26 came from the public author archive, same field rules:
- Beat from the URL path segment, not judgement
- Interview if the headline contains لـ"المجلة or لـ«المجلة
- Date from the article page
- Headlines are never translated

Turki can add more from `desk.html`:
1. Paste a link. The desk reads the page with those same rules and fills the form.
2. Fill the form by hand (for a piece that is not on Majalla, or not online yet).
3. Pull only the new rows from the Majalla archive.

Saves write `data/articles.json` and `assets/data.js` when `python3 server.py` is running.
Without the server, saves stay in this browser (localStorage) and he can download `data.js`.

## Deliberate omissions
- No invented dates.
- Headlines stay in the language they were published in.
- Contact email/phone was not taken from LinkedIn.
