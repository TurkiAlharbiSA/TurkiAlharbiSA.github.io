/* Shared site + desk helpers. No framework. */
(function (global) {
  "use strict";

  var STORE = "ta-desk-articles";
  var HIDDEN = "ta-desk-hidden";
  var THEME_KEY = "ta-theme";
  var LANG_KEY = "ta-lang";

  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                   "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  var BEATS = {
    economy: { ar: "اقتصاد وأعمال", en: "Economy & Business",
      blurb_ar: "من العناوين نفسها: موانئ الحرب وطرق التجارة، والأمن المائي الخليجي، والصناعات العسكرية، والعقار بعد التشريعات، وأشباه الموصلات، وشركة «آلات»، وعُمان، والاستثمار في الرياض.",
      blurb_en: "From the bylines themselves: ports in war and on trade routes, Gulf water security, defence industry, property after the new laws, semiconductors, Alat, Oman, and investment into Riyadh." },
    culture: { ar: "ثقافة ومجتمع", en: "Culture & Society",
      blurb_ar: "من العناوين نفسها: فيلم «سوار»، و«الخلاط+»، وهيئة الترفيه، ووثائقي الدوري، ودرب زبيدة، وحوارات مع أسامة الواصلي وسعد الراشد وإبراهيم إستنبولي وفهد العودة.",
      blurb_en: "From the bylines themselves: the film Swar, Khalat+, the Entertainment Authority, the league documentary, Darb Zubaydah, and interviews with Osama Alwasili, Saad Alrashid, Ibrahim Istambuli, and Fahd Alouda." },
    tech: { ar: "علوم وتكنولوجيا", en: "Science & Technology",
      blurb_ar: "من العناوين نفسها: الرياض عاصمة للذكاء الاصطناعي، وموسم هجرة شركات التقنية الكبرى إلى السعودية.",
      blurb_en: "From the bylines themselves: Riyadh as an AI capital, and the season the big technology firms moved into Saudi Arabia." },
    column: { ar: "زاوية", en: "Column",
      blurb_ar: "زاوية واحدة حتى الآن: «كرة القدم التي أصبحت العالم».",
      blurb_en: "One column so far: football as a language the whole world now speaks." },
    politics: { ar: "سياسة", en: "Politics", blurb_ar: "", blurb_en: "" },
    profile: { ar: "بروفايل", en: "Profile", blurb_ar: "", blurb_en: "" },
    other: { ar: "أخرى", en: "Other", blurb_ar: "", blurb_en: "" }
  };

  var ONES_SOLO = ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع", "عشر"];
  var ONES_COMP = ["", "إحدى", "اثنتا", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع"];
  var TENS = { 20: "عشرون", 30: "ثلاثون", 40: "أربعون", 50: "خمسون",
               60: "ستون", 70: "سبعون", 80: "ثمانون", 90: "تسعون" };

  function arCardinal(n) {
    n = Math.floor(Number(n) || 0);
    if (n <= 10) return ONES_SOLO[n] || String(n);
    if (n < 20) return ONES_COMP[n - 10] + " عشرة";
    var tens = Math.floor(n / 10) * 10;
    var one = n % 10;
    if (!TENS[tens]) return String(n);
    if (!one) return TENS[tens];
    return ONES_COMP[one] + " و" + TENS[tens];
  }

  function arNoun(n, words) {
    n = Math.floor(Number(n) || 0);
    if (n === 0) return "لا " + words.few;
    if (n === 1) return words.one;
    if (n === 2) return words.two;
    if (n >= 3 && n <= 10) return arCardinal(n) + " " + words.few;
    return arCardinal(n) + " " + words.many;
  }

  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  function seedArticles() {
    return (global.ARTICLES || []).map(function (a) {
      var copy = {};
      Object.keys(a).forEach(function (k) { copy[k] = a[k]; });
      if (!copy.source) copy.source = "archive";
      if (!copy.guest && copy.interview) copy.guest = guestOf(copy.title);
      if (copy.beat && BEATS[copy.beat]) {
        copy.beat_ar = copy.beat_ar || BEATS[copy.beat].ar;
        copy.beat_en = copy.beat_en || BEATS[copy.beat].en;
      }
      return copy;
    });
  }

  function deskArticles() { return lsGet(STORE, []); }
  function hiddenIds() { return lsGet(HIDDEN, []); }

  function saveDeskArticles(list) { lsSet(STORE, list); }
  function saveHidden(ids) { lsSet(HIDDEN, ids); }

  function sameArticle(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id) === String(b.id)) return true;
    if (a.url && b.url && a.url === b.url) return true;
    return false;
  }

  function allArticles() {
    var seed = seedArticles();
    var extra = deskArticles();
    var hidden = hiddenIds().map(String);
    var out = [];
    seed.forEach(function (a) {
      if (hidden.indexOf(String(a.id)) >= 0) return;
      var override = extra.filter(function (x) { return sameArticle(x, a); })[0];
      out.push(override || a);
    });
    extra.forEach(function (a) {
      var already = out.some(function (x) { return sameArticle(x, a); });
      if (!already && hidden.indexOf(String(a.id)) < 0) out.push(a);
    });
    out.sort(function (a, b) {
      var da = a.date || "";
      var db = b.date || "";
      if (da !== db) return da < db ? 1 : -1;
      return (b.id || 0) - (a.id || 0);
    });
    return out;
  }

  function upsertDesk(article) {
    var list = deskArticles();
    var found = false;
    var next = list.map(function (a) {
      if (sameArticle(a, article)) { found = true; return article; }
      return a;
    });
    if (!found) next.unshift(article);
    saveDeskArticles(next);
    return next;
  }

  function removeDesk(article) {
    saveDeskArticles(deskArticles().filter(function (a) { return !sameArticle(a, article); }));
    if (article && article.id) {
      var h = hiddenIds();
      if (h.indexOf(article.id) < 0 && (article.source || "archive") === "archive") {
        h.push(article.id);
        saveHidden(h);
      }
    }
  }

  function guestOf(title) {
    var m = String(title || "").match(/^[\s«"']*(.+?)\s*لـ\s*["«"]?المجلة/);
    return m ? m[1].replace(/[:\s"«»]+$/, "").trim() : "";
  }

  function isInterview(title) {
    var t = title || "";
    return t.indexOf('لـ"المجلة') >= 0 || t.indexOf("لـ«المجلة") >= 0 || t.indexOf("لـالمجلة") >= 0;
  }

  function yearOf(a) {
    return (a && a.date) ? a.date.slice(0, 4) : "";
  }

  function formatDate(a, lang) {
    if (lang === "ar") return a.date_ar || a.date || "";
    if (!a.date) return a.date_ar || "";
    var p = a.date.split("-");
    if (p.length < 3) return a.date;
    return parseInt(p[2], 10) + " " + MONTHS_EN[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  function foldAr(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ؤئ]/g, "ء")
      .replace(/[^\u0600-\u06FFa-z0-9]+/g, " ")
      .trim();
  }

  function matchesQuery(a, q) {
    if (!q) return true;
    var hay = foldAr([a.title, a.dek, a.dek_long, a.kicker, a.guest, a.beat_ar, a.beat_en].join(" "));
    return foldAr(q).split(/\s+/).every(function (w) { return !w || hay.indexOf(w) >= 0; });
  }

  function yearNote(items) {
    return items.slice(0, 5).map(function (a) {
      if (a.guest) return a.guest;
      return String(a.title || "").split(/[.…:：]/)[0].replace(/^["«»'\s]+/, "").trim();
    }).filter(Boolean).join(" · ");
  }

  function leadOf(a) {
    if (a && Array.isArray(a.lead) && a.lead.length) return a.lead;
    var text = (a && (a.dek_long || a.dek)) || "";
    return text ? [text] : [];
  }

  function groupByYear(list) {
    var years = [];
    var map = {};
    list.forEach(function (a) {
      var y = yearOf(a) || "—";
      if (!map[y]) { map[y] = []; years.push(y); }
      map[y].push(a);
    });
    return years.map(function (y) { return { year: y, items: map[y] }; });
  }

  function stats(list) {
    var beats = {};
    var interviews = 0;
    var years = {};
    list.forEach(function (a) {
      if (a.beat) beats[a.beat] = (beats[a.beat] || 0) + 1;
      if (a.interview) interviews++;
      var y = yearOf(a);
      if (y) years[y] = true;
    });
    var ys = Object.keys(years).sort();
    return {
      total: list.length,
      interviews: interviews,
      beatCount: Object.keys(beats).length,
      beats: beats,
      since: ys[0] || "",
      latestYear: ys[ys.length - 1] || ""
    };
  }

  function related(list, article, n) {
    n = n || 3;
    return list.filter(function (a) {
      return a !== article && !sameArticle(a, article) && a.beat === article.beat;
    }).slice(0, n);
  }

  function lede(list, lang) {
    var s = stats(list);
    var oldest = list.slice().sort(function (a, b) {
      return (a.date || "") < (b.date || "") ? -1 : 1;
    })[0];
    var monthAr = "";
    var monthEn = "";
    var year = s.since || "2024";
    if (oldest && oldest.date) {
      var m = parseInt(oldest.date.split("-")[1], 10);
      monthAr = MONTHS_AR[m - 1] || "";
      monthEn = MONTHS_EN[m - 1] || "";
    }
    var pieces = arNoun(s.total, { one: "مادة واحدة", two: "مادتان", few: "مواد", many: "مادة" });
    var talks = arNoun(s.interviews, {
      one: "مقابلة مطوّلة واحدة",
      two: "مقابلتان مطوّلتان",
      few: "مقابلات مطوّلة",
      many: "مقابلة مطوّلة"
    });
    if (lang === "en") {
      var pieceWord = s.total === 1 ? "piece" : "pieces";
      var intWord = s.interviews === 1 ? "long-form interview" : "long-form interviews";
      return "I report on the Saudi and Gulf economy, on culture and society, and on the technology reshaping both. "
        + s.total + " " + pieceWord + " published in Al Majalla since " + monthEn + " " + year
        + ", including " + s.interviews + " " + intWord + " with writers and researchers.";
    }
    return "أكتب عن الاقتصاد السعودي والخليجي، وعن الثقافة والمجتمع، وعن التقنية التي تعيد تشكيلهما. "
      + pieces + " منشورة في «المجلة» منذ " + monthAr + " " + year
      + "، بينها " + talks + " مع كتّاب وباحثين.";
  }

  function applyTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    try { localStorage.setItem(THEME_KEY, name); } catch (e) { /* ignore */ }
  }

  function bootTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (dark ? "dark" : "light"));
  }

  function savedLang() {
    try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar"; } catch (e) { return "ar"; }
  }

  function applyLang(lang) {
    var root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    var nodes = document.querySelectorAll("[data-en]");
    Array.prototype.forEach.call(nodes, function (el) {
      if (!el.hasAttribute("data-ar")) {
        if (el.tagName === "META" || el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.setAttribute("data-ar", el.getAttribute("placeholder") || el.getAttribute("content") || el.textContent.trim());
        } else {
          el.setAttribute("data-ar", el.textContent.trim());
        }
      }
      var text = lang === "ar" ? el.getAttribute("data-ar") : el.getAttribute("data-en");
      if (text == null) return;
      if (el.tagName === "META") el.setAttribute("content", text);
      else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.setAttribute("placeholder", text);
      else el.textContent = text;
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    return lang;
  }

  function headlineHTML(s) {
    var t = String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\.{3}/g, "…");
    var i = t.indexOf("…");
    if (i < 0) return t;
    return '<span class="headline-a">' + t.slice(0, i + 1) + "</span><br>" + t.slice(i + 1).trim();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function newId() {
    return Date.now() % 100000000;
  }

  function downloadDataJs(list) {
    var payload = "window.ARTICLES = " + JSON.stringify(list, null, 2) + ";\n";
    var blob = new Blob([payload], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function api(path, body) {
    return fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.ok === false) throw new Error(j.error || r.statusText);
        return j;
      });
    });
  }

  global.TA = {
    BEATS: BEATS,
    arCardinal: arCardinal,
    arNoun: arNoun,
    allArticles: allArticles,
    deskArticles: deskArticles,
    upsertDesk: upsertDesk,
    removeDesk: removeDesk,
    guestOf: guestOf,
    isInterview: isInterview,
    yearOf: yearOf,
    formatDate: formatDate,
    foldAr: foldAr,
    matchesQuery: matchesQuery,
    groupByYear: groupByYear,
    yearNote: yearNote,
    leadOf: leadOf,
    stats: stats,
    related: related,
    lede: lede,
    applyTheme: applyTheme,
    bootTheme: bootTheme,
    savedLang: savedLang,
    applyLang: applyLang,
    el: el,
    headlineHTML: headlineHTML,
    newId: newId,
    downloadDataJs: downloadDataJs,
    api: api,
    sameArticle: sameArticle
  };
})(window);
