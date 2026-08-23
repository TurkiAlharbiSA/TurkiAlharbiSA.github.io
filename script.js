/* Public broadsheet. Headlines stay in the language they were published in. */
(function () {
  "use strict";

  var TA = window.TA;
  var el = TA.el;
  var lang = "ar";
  var filter = "all";
  var query = "";
  var articles = [];

  function forceRtl(node) {
    node.setAttribute("lang", "ar");
    node.setAttribute("dir", "rtl");
    node.setAttribute("data-force-rtl", "");
    return node;
  }

  function beatLabel(a) {
    return lang === "ar" ? (a.beat_ar || "") : (a.beat_en || "");
  }

  function imgSrc(a) {
    return a.cover || a.image || "";
  }

  function openReader(article) {
    var root = document.getElementById("reader");
    var body = document.getElementById("reader-body");
    body.innerHTML = "";

    var meta = el("div", "cover-meta");
    meta.appendChild(el("span", "work-beat", beatLabel(article)));
    meta.appendChild(el("span", "work-date", TA.formatDate(article, lang)));
    if (article.interview) {
      meta.appendChild(el("span", "work-tag-int", lang === "ar" ? "مقابلة" : "Interview"));
    }
    body.appendChild(meta);

    var src = imgSrc(article);
    if (src) {
      var fig = el("figure", "reader-art");
      var img = document.createElement("img");
      img.src = src;
      img.alt = "";
      fig.appendChild(img);
      body.appendChild(fig);
    }

    var title = el("h2", "reader-title");
    title.id = "reader-title";
    title.innerHTML = TA.headlineHTML(article.title);
    forceRtl(title);
    body.appendChild(title);

    if (article.guest) {
      body.appendChild(el("p", "talk-label",
        (lang === "ar" ? "حوار مع " : "Interview with ") + article.guest));
    }
    if (article.kicker) body.appendChild(forceRtl(el("p", "cover-kicker-line", article.kicker)));
    var lead = TA.leadOf(article);
    var box = el("div", "reader-lead");
    lead.forEach(function (p) { box.appendChild(forceRtl(el("p", "", p))); });
    if (lead.length) body.appendChild(box);

    if (article.url) {
      var go = el("a", "btn btn-solid");
      go.href = article.url;
      go.target = "_blank";
      go.rel = "noopener";
      go.textContent = lang === "ar" ? "اقرأ المادة في مصدرها" : "Read the piece at its source";
      go.style.marginBlockStart = "20px";
      body.appendChild(go);
    }

    var rel = TA.related(articles, article, 3);
    if (rel.length) {
      var relBox = el("div", "reader-related");
      relBox.appendChild(el("h4", "", lang === "ar" ? "من الباب نفسه" : "From the same beat"));
      rel.forEach(function (r) {
        var b = document.createElement("button");
        b.type = "button";
        forceRtl(b);
        b.textContent = r.title;
        b.addEventListener("click", function () { openReader(r); });
        relBox.appendChild(b);
      });
      body.appendChild(relBox);
    }

    root.hidden = false;
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (article.id) {
      history.replaceState(null, "", "#work/" + article.id);
    }
  }

  function closeReader() {
    var root = document.getElementById("reader");
    root.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (!root.classList.contains("is-open")) root.hidden = true; }, 280);
    if (/#work\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  }

  function byId(id) {
    return articles.filter(function (a) { return String(a.id) === String(id); })[0];
  }

  function renderCover() {
    var frame = document.getElementById("cover-frame");
    var grid = document.getElementById("latest-grid");
    frame.innerHTML = "";
    grid.innerHTML = "";
    if (!articles.length) return;

    var lead = articles[0];
    var art = el("figure", "cover-art");
    if (imgSrc(lead)) {
      var img = document.createElement("img");
      img.src = imgSrc(lead);
      img.alt = "";
      art.appendChild(img);
    }
    var copy = el("div", "cover-copy");
    var meta = el("div", "cover-meta");
    meta.appendChild(el("span", "", lang === "ar" ? "أحدث مادة" : "Latest piece"));
    meta.appendChild(el("span", "", "·"));
    meta.appendChild(el("span", "", beatLabel(lead)));
    meta.appendChild(el("span", "", "·"));
    meta.appendChild(el("span", "", TA.formatDate(lead, lang)));
    copy.appendChild(meta);
    var coverTitle = el("h2", "cover-title");
    coverTitle.innerHTML = TA.headlineHTML(lead.title);
    copy.appendChild(forceRtl(coverTitle));
    if (lead.kicker) copy.appendChild(forceRtl(el("p", "cover-kicker-line", lead.kicker)));
    var dek = lead.dek_long || lead.dek;
    if (dek) copy.appendChild(forceRtl(el("p", "cover-dek", dek)));
    var actions = el("div", "cover-actions");
    var open = el("button", "btn btn-solid", lang === "ar" ? "تفاصيل المادة" : "Piece details");
    open.type = "button";
    open.addEventListener("click", function () { openReader(lead); });
    actions.appendChild(open);
    if (lead.url) {
      var ext = el("a", "btn btn-line", lang === "ar" ? "المصدر" : "Source");
      ext.href = lead.url; ext.target = "_blank"; ext.rel = "noopener";
      actions.appendChild(ext);
    }
    copy.appendChild(actions);
    frame.appendChild(art);
    frame.appendChild(copy);

    articles.slice(1, 4).forEach(function (a, i) {
      var li = el("li", "");
      var btn = el("button", "latest-card");
      btn.type = "button";
      btn.appendChild(el("span", "idx", "0" + (i + 2)));
      btn.appendChild(el("span", "meta", TA.formatDate(a, lang) + " · " + beatLabel(a)));
      btn.appendChild(forceRtl(el("h3", "", a.title)));
      if (a.dek) btn.appendChild(forceRtl(el("p", "", a.dek)));
      btn.addEventListener("click", function () { openReader(a); });
      li.appendChild(btn);
      grid.appendChild(li);
    });
  }

  function renderTalks() {
    var list = document.getElementById("talk-list");
    list.innerHTML = "";
    var talks = articles.filter(function (a) { return a.interview; });
    talks.forEach(function (a) {
      var li = el("li", "");
      var btn = el("button", "talk");
      btn.type = "button";
      if (imgSrc(a)) {
        var fig = el("div", "talk-img");
        var img = document.createElement("img");
        img.src = imgSrc(a);
        img.alt = a.guest || "";
        fig.appendChild(img);
        btn.appendChild(fig);
      }
      var body = el("div", "talk-body");
      body.appendChild(el("span", "talk-label", lang === "ar" ? "حوار" : "Interview"));
      body.appendChild(el("h3", "talk-guest", a.guest || (lang === "ar" ? "مقابلة" : "Interview")));
      if (a.dek) body.appendChild(forceRtl(el("p", "talk-dek", a.dek)));
      btn.appendChild(body);
      btn.addEventListener("click", function () { openReader(a); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function renderBeats() {
    var list = document.getElementById("beat-list");
    list.innerHTML = "";
    var s = TA.stats(articles);
    var order = ["economy", "culture", "tech", "column", "politics", "profile", "other"];
    order.forEach(function (slug) {
      var n = s.beats[slug];
      if (!n) return;
      var meta = TA.BEATS[slug] || { ar: slug, en: slug, blurb_ar: "", blurb_en: "" };
      var li = el("li", "beat");
      li.appendChild(el("span", "beat-count", String(n)));
      li.appendChild(el("h3", "", lang === "ar" ? meta.ar : meta.en));
      var blurb = lang === "ar" ? meta.blurb_ar : meta.blurb_en;
      if (blurb) li.appendChild(el("p", "", blurb));
      li.addEventListener("click", function () {
        filter = slug;
        paintChips();
        renderArchive();
        document.getElementById("work").scrollIntoView({ behavior: "smooth" });
      });
      list.appendChild(li);
    });
  }

  function paintChips() {
    var host = document.getElementById("filters");
    host.innerHTML = "";
    var s = TA.stats(articles);
    var chips = [
      { id: "all", ar: "الكل", en: "All", n: s.total },
      { id: "interview", ar: "مقابلات", en: "Interviews", n: s.interviews }
    ];
    ["economy", "culture", "tech", "column", "politics", "profile", "other"].forEach(function (slug) {
      if (!s.beats[slug]) return;
      var meta = TA.BEATS[slug];
      chips.push({ id: slug, ar: meta.ar, en: meta.en, n: s.beats[slug] });
    });
    chips.forEach(function (c) {
      var b = el("button", "chip" + (filter === c.id ? " is-on" : ""));
      b.type = "button";
      b.setAttribute("data-filter", c.id);
      b.appendChild(document.createTextNode(lang === "ar" ? c.ar : c.en));
      var n = el("span", "n", String(c.n));
      b.appendChild(n);
      host.appendChild(b);
    });
  }

  function visibleSet() {
    return articles.filter(function (a) {
      if (!TA.matchesQuery(a, query)) return false;
      if (filter === "all") return true;
      if (filter === "interview") return !!a.interview;
      return a.beat === filter;
    });
  }

  function renderArchive() {
    var root = document.getElementById("year-root");
    root.innerHTML = "";
    var vis = visibleSet();
    if (!vis.length) {
      root.appendChild(el("p", "empty-note",
        lang === "ar" ? "لا مواد تطابق هذا البحث." : "No pieces match this search."));
      return;
    }
    TA.groupByYear(vis).forEach(function (group) {
      var block = el("div", "year-block");
      var label = el("h3", "year-label", group.year);
      var count = lang === "ar"
        ? TA.arNoun(group.items.length, { one: "مادة واحدة", two: "مادتان", few: "مواد", many: "مادة" })
        : group.items.length + (group.items.length === 1 ? " piece" : " pieces");
      label.appendChild(el("span", "", count));
      block.appendChild(label);
      var note = TA.yearNote(group.items);
      if (note) block.appendChild(forceRtl(el("p", "year-note", note)));

      var ol = el("ol", "work-list");
      group.items.forEach(function (a) {
        var li = el("li", "work-item");
        li.setAttribute("data-beat", a.beat || "");
        if (a.interview) li.setAttribute("data-interview", "1");
        var btn = el("button", "work-open");
        btn.type = "button";
        if (a.url) {
          var ghost = el("a", "work-link");
          ghost.href = a.url;
          ghost.target = "_blank";
          ghost.rel = "noopener";
          ghost.className = "work-link";
          ghost.setAttribute("aria-hidden", "true");
          ghost.tabIndex = -1;
          ghost.style.position = "absolute";
          ghost.style.width = "1px";
          ghost.style.height = "1px";
          ghost.style.overflow = "hidden";
          ghost.style.clip = "rect(0 0 0 0)";
          ghost.textContent = a.title;
          li.appendChild(ghost);
        }
        var meta = el("div", "work-meta");
        var date = el("span", "work-date", TA.formatDate(a, lang));
        date.setAttribute("data-iso", a.date || "");
        date.setAttribute("data-ar-date", a.date_ar || "");
        meta.appendChild(date);
        var beat = el("span", "work-beat", beatLabel(a));
        beat.setAttribute("data-en", a.beat_en || "");
        beat.setAttribute("data-ar", a.beat_ar || "");
        meta.appendChild(beat);
        if (a.interview) {
          var tag = el("span", "work-tag-int", lang === "ar" ? "مقابلة" : "Interview");
          tag.setAttribute("data-en", "Interview");
          tag.setAttribute("data-ar", "مقابلة");
          meta.appendChild(tag);
        }
        var body = el("div", "work-body");
        body.appendChild(forceRtl(el("h3", "work-title", a.title)));
        if (a.dek) body.appendChild(forceRtl(el("p", "work-dek", a.dek)));
        btn.appendChild(meta);
        btn.appendChild(body);
        if (imgSrc(a)) {
          var thumb = document.createElement("img");
          thumb.className = "work-thumb";
          thumb.src = imgSrc(a);
          thumb.alt = "";
          btn.appendChild(thumb);
        }
        btn.addEventListener("click", function () { openReader(a); });
        li.appendChild(btn);
        ol.appendChild(li);
      });
      block.appendChild(ol);
      root.appendChild(block);
    });
  }

  function renderStats() {
    var s = TA.stats(articles);
    document.getElementById("stat-total").textContent = s.total;
    document.getElementById("stat-int").textContent = s.interviews;
    document.getElementById("stat-beats").textContent = s.beatCount;
    document.getElementById("stat-since").textContent = s.since || "2024";
    document.getElementById("hero-lede").textContent = TA.lede(articles, lang);
  }

  function renderAll() {
    articles = TA.allArticles();
    renderStats();
    renderCover();
    renderTalks();
    renderBeats();
    paintChips();
    renderArchive();
  }

  function setLang(next) {
    lang = TA.applyLang(next);
    var btn = document.getElementById("lang-btn");
    btn.textContent = lang === "ar" ? "EN" : "ع";
    btn.setAttribute("aria-label", lang === "ar" ? "Switch to English" : "التبديل إلى العربية");
    renderAll();
  }

  /* boot */
  TA.bootTheme();
  document.getElementById("theme-btn").addEventListener("click", function () {
    var now = document.documentElement.getAttribute("data-theme");
    TA.applyTheme(now === "dark" ? "light" : "dark");
  });
  document.getElementById("lang-btn").addEventListener("click", function () {
    setLang(lang === "ar" ? "en" : "ar");
  });

  document.getElementById("filters").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    filter = chip.getAttribute("data-filter");
    paintChips();
    renderArchive();
  });

  document.getElementById("archive-search").addEventListener("input", function (e) {
    query = e.target.value;
    renderArchive();
  });

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  var reader = document.getElementById("reader");
  reader.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) closeReader();
  });

  /* command palette */
  var cmdk = document.getElementById("cmdk");
  var cmdkInput = document.getElementById("cmdk-input");
  var cmdkList = document.getElementById("cmdk-list");
  var cmdkOn = 0;

  function paintCmdk() {
    var q = cmdkInput.value;
    var hits = articles.filter(function (a) { return TA.matchesQuery(a, q); }).slice(0, 12);
    cmdkList.innerHTML = "";
    hits.forEach(function (a, i) {
      var li = el("li", "");
      var b = document.createElement("button");
      b.type = "button";
      if (i === cmdkOn) b.className = "is-on";
      var t = el("strong", "", a.title);
      forceRtl(t);
      b.appendChild(t);
      b.appendChild(el("span", "", TA.formatDate(a, lang) + " · " + beatLabel(a)));
      b.addEventListener("click", function () { closeCmdk(); openReader(a); });
      li.appendChild(b);
      cmdkList.appendChild(li);
    });
  }

  function openCmdk() {
    cmdk.hidden = false;
    cmdk.classList.add("is-open");
    cmdkInput.value = query;
    cmdkOn = 0;
    paintCmdk();
    cmdkInput.focus();
    cmdkInput.select();
  }
  function closeCmdk() {
    cmdk.classList.remove("is-open");
    cmdk.hidden = true;
  }
  document.getElementById("search-btn").addEventListener("click", openCmdk);
  cmdk.addEventListener("click", function (e) { if (e.target === cmdk) closeCmdk(); });
  cmdkInput.addEventListener("input", function () { cmdkOn = 0; paintCmdk(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (cmdk.classList.contains("is-open")) { closeCmdk(); return; }
      if (reader.classList.contains("is-open")) { closeReader(); return; }
    }
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/INPUT|TEXTAREA/.test(e.target.tagName))) {
      e.preventDefault();
      openCmdk();
      return;
    }
    if (!cmdk.classList.contains("is-open")) return;
    var items = cmdkList.querySelectorAll("button");
    if (e.key === "ArrowDown") { e.preventDefault(); cmdkOn = Math.min(cmdkOn + 1, items.length - 1); paintCmdk(); }
    if (e.key === "ArrowUp") { e.preventDefault(); cmdkOn = Math.max(cmdkOn - 1, 0); paintCmdk(); }
    if (e.key === "Enter" && items[cmdkOn]) { e.preventDefault(); items[cmdkOn].click(); }
  });

  window.addEventListener("hashchange", function () {
    var m = location.hash.match(/^#work\/(.+)$/);
    if (m) {
      var a = byId(m[1]);
      if (a) openReader(a);
    }
  });

  setLang(TA.savedLang());

  var bootHash = location.hash.match(/^#work\/(.+)$/);
  if (bootHash) {
    var hit = byId(bootHash[1]);
    if (hit) openReader(hit);
  }
})();
