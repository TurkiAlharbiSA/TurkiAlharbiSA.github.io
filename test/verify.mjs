/* Behaviour checks. Server on http://127.0.0.1:8788 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

const SITE = process.env.SITE || 'http://127.0.0.1:8788/index.html';
const DESK = SITE.replace(/index\.html$/, 'desk.html');
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const data = JSON.parse(readFileSync(new URL('../data/articles.json', import.meta.url), 'utf8'));
const EXPECT = { total: data.length, interview: data.filter(a => a.interview).length };

const FOREIGN = [
  'حرب إيران و"روح شنغهاي"',
  'انتخابات إسرائيل 2026',
  'الذكاء الاصطناعي يعيد تشكيل قواعد الحرب',
  'اختراقات الذكاء الاصطناعي تهدد البنوك',
  'روسيا وأوكرانيا تعطلان الملاحة',
  'رجل الإجراءات الصعبة',
  'ما بعد "اليونيفيل"',
  'كردستان العراق في عين العاصفة',
];

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' :: ' + detail : ''}`); }
};

const HOME = process.env.HOME;
const CHROMES = [
  HOME + '/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  HOME + '/Library/Caches/ms-playwright/chromium-1155/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
];
const CHROME = CHROMES.find(p => existsSync(p));
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

await page.goto(SITE, { waitUntil: 'networkidle' });

console.log('\n[1] Arabic default + rendering');
ok('html lang=ar', await page.getAttribute('html', 'lang') === 'ar');
ok('html dir=rtl', await page.getAttribute('html', 'dir') === 'rtl');
const items = await page.locator('.work-item').count();
ok(`all ${EXPECT.total} articles in archive`, items === EXPECT.total, `got ${items}`);
ok('cover headline is the latest title',
  (await page.textContent('.cover-title')) === data[0].title);

console.log('\n[2] No other authors\' work');
const bodyText = await page.textContent('#year-root');
const leaked = FOREIGN.filter(t => bodyText.includes(t));
ok('zero Editor\'s-Picks headlines', leaked.length === 0, leaked.join(' | '));

console.log('\n[3] Links and ids');
const hrefs = await page.locator('a.work-link').evaluateAll(a => a.map(x => x.href));
ok('unique hrefs', new Set(hrefs).size === EXPECT.total, `${new Set(hrefs).size}`);
const dataIds = data.map(d => String(d.id)).sort();
const domIds = hrefs.map(h => (h.match(/\/node\/(\d+)/) || [])[1]).sort();
ok('every href carries its node id', domIds.every(Boolean));
ok('DOM node ids match dataset', JSON.stringify(dataIds) === JSON.stringify(domIds));
ok('noopener blanks',
  await page.locator('a.work-link[target="_blank"][rel="noopener"]').count() === EXPECT.total);

console.log('\n[4] Stats derived');
ok('total matches data', await page.textContent('#stat-total') === String(EXPECT.total));
ok('interviews match data', await page.textContent('#stat-int') === String(EXPECT.interview));
const lede = await page.textContent('#hero-lede');
ok('lede is computed, not the old hardcoded 26-only sentence unless 26',
  lede.includes('منشورة') && lede.includes('المجلة'));

console.log('\n[5] Search + filter');
await page.fill('#archive-search', 'موانئ');
await page.waitForTimeout(80);
const afterSearch = await page.locator('.work-item:visible').count();
ok('search موانئ narrows the list', afterSearch >= 1 && afterSearch < EXPECT.total, `got ${afterSearch}`);
await page.fill('#archive-search', '');
await page.click('.chip[data-filter="interview"]');
ok('interview filter',
  await page.locator('.work-item:visible').count() === EXPECT.interview);
await page.click('.chip[data-filter="all"]');

console.log('\n[6] Language: chrome flips, bylines do not');
const arTitles = await page.locator('.work-title').evaluateAll(n => n.map(x => x.textContent));
const arNav = await page.textContent('.nav a');
const arLede = await page.textContent('#hero-lede');
await page.click('#lang-btn');
await page.waitForTimeout(150);
ok('html lang=en', await page.getAttribute('html', 'lang') === 'en');
ok('html dir=ltr', await page.getAttribute('html', 'dir') === 'ltr');
ok('nav translated', await page.textContent('.nav a') !== arNav);
ok('lede translated', await page.textContent('#hero-lede') !== arLede);
ok('about title translated', (await page.textContent('#about .sec-title')).includes('reporter'));
const enTitles = await page.locator('.work-title').evaluateAll(n => n.map(x => x.textContent));
ok('headlines NOT translated', JSON.stringify(arTitles) === JSON.stringify(enTitles));
ok('headlines still dir=rtl',
  await page.locator('.work-title[dir="rtl"][lang="ar"]').count() === EXPECT.total);
ok('dates localised to EN', /[A-Za-z]{3}/.test(await page.textContent('.work-date')));
await page.screenshot({ path: SHOTS + 'desktop-en.png', fullPage: false });
await page.click('#lang-btn');
await page.waitForTimeout(150);
ok('back to Arabic', await page.getAttribute('html', 'dir') === 'rtl');

console.log('\n[7] Theme + drawer');
const t0 = await page.getAttribute('html', 'data-theme');
await page.click('#theme-btn');
ok('theme changes', (await page.getAttribute('html', 'data-theme')) !== t0);
await page.click('#theme-btn');
await page.locator('.cover-title').click({ force: false }).catch(() => {});
await page.locator('.cover-actions .btn-solid').click();
await page.waitForTimeout(200);
ok('reader opens', await page.locator('#reader.is-open').count() === 1);
ok('reader shows the cover title',
  (await page.textContent('#reader-title')) === data[0].title);
const leadText = await page.textContent('.reader-lead');
ok('reader shows opening paragraphs from the published piece',
  !!(leadText && leadText.includes('الأمن المائي')), leadText ? leadText.slice(0, 80) : 'empty');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
ok('reader closes on Escape', await page.locator('#reader.is-open').count() === 0);

console.log('\n[8] Layout');
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('no horizontal overflow at 1440', overflow <= 0, `${overflow}px`);
await page.screenshot({ path: SHOTS + 'desktop-full.png', fullPage: true });
await page.screenshot({ path: SHOTS + 's-hero.png', fullPage: false });

console.log('\n[9] Mobile');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
const mOverflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('no horizontal overflow at 390', mOverflow <= 0, `${mOverflow}px`);
ok('burger visible', await page.locator('#burger').isVisible());
await page.click('#burger');
await page.waitForTimeout(200);
ok('menu opens', await page.locator('#nav a').first().isVisible());
await page.click('#nav a[href="#cover"]');
await page.waitForTimeout(300);
ok('menu closes after nav', !(await page.locator('#nav a').first().isVisible()));
await page.screenshot({ path: SHOTS + 'mobile-full.png', fullPage: true });

console.log('\n[10] Desk ingest + save');
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(DESK, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const status = await page.textContent('#desk-status');
ok('desk sees the local server', /متصل|Server is up/.test(status), status);
const sample = 'https://www.majalla.com/node/332326';
await page.fill('#url-input', sample);
await page.click('#ingest-btn');
try {
  await page.waitForFunction(
    () => document.getElementById('f-title').value.includes('الأمن المائي'),
    null, { timeout: 25000 });
} catch (e) { /* asserted below */ }
const filled = await page.inputValue('#f-title');
ok('ingest fills the known water-security headline',
  filled.includes('سباق الخليج إلى الأمن المائي'), filled);
ok('ingest fills date', await page.inputValue('#f-date') === '2026-08-02');
ok('ingest fills beat', await page.inputValue('#f-beat') === 'economy');

await page.click('#new-btn');
await page.fill('#f-title', 'مادة تجريبية من المكتب');
await page.fill('#f-dek', 'متن تجريبي للتأكد من الحفظ.');
await page.fill('#f-url', 'https://example.com/desk-test');
await page.fill('#f-date', '2026-08-13');
await page.selectOption('#f-beat', 'other');
await page.click('#save-btn');
await page.waitForTimeout(600);
ok('save ack', /حُفظت|Saved/.test(await page.textContent('#form-ok')));

await page.goto(SITE, { waitUntil: 'networkidle' });
const added = await page.locator('.work-title').evaluateAll(n => n.map(x => x.textContent));
ok('saved piece appears on the public site', added.includes('مادة تجريبية من المكتب'));

// clean the test piece so the archive stays honest
await page.goto(DESK, { waitUntil: 'networkidle' });
await page.waitForTimeout(200);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.rail-item')];
  const hit = btns.find(b => b.textContent.includes('مادة تجريبية من المكتب'));
  if (hit) hit.click();
});
await page.waitForTimeout(150);
page.once('dialog', d => d.accept());
await page.click('#delete-btn');
await page.waitForTimeout(400);

console.log('\n[11] Console');
ok('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
