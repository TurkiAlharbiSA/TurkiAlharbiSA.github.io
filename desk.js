/* Desk: paste a link (same rules as the archive) or fill the form. */
(function () {
  "use strict";

  var TA = window.TA;
  var el = TA.el;
  var lang = "ar";
  var serverLive = false;
  var current = emptyArticle();

  function emptyArticle() {
    return {
      id: TA.newId(),
      title: "",
      kicker: "",
      dek: "",
      dek_long: "",
      url: "",
      date: "",
      date_ar: "",
      beat: "economy",
      beat_ar: TA.BEATS.economy.ar,
      beat_en: TA.BEATS.economy.en,
      interview: false,
      guest: "",
      image: "",
      cover: "",
      lead: [],
      outlet: "المجلة",
      outlet_en: "Al Majalla",
      source: "desk"
    };
  }

  function $(id) { return document.getElementById(id); }

  function setMsg(err, ok) {
    $("form-err").textContent = err || "";
    $("form-ok").textContent = ok || "";
  }

  function beatMeta(slug) {
    return TA.BEATS[slug] || TA.BEATS.other;
  }

  function readForm() {
    var beat = $("f-beat").value;
    var meta = beatMeta(beat);
    var date = $("f-date").value;
    var title = $("f-title").value.trim();
    var interview = $("f-interview").checked || TA.isInterview(title);
    var guest = $("f-guest").value.trim() || (interview ? TA.guestOf(title) : "");
    var url = $("f-url").value.trim();
    var id = Number($("f-id").value) || TA.newId();
    var node = (url.match(/\/node\/(\d+)/) || [])[1];
    if (node) {
      id = Number(node);
    } else {
      var existing = TA.allArticles().filter(function (x) { return String(x.id) === String(id); })[0];
      if (existing && existing.url && url && existing.url !== url) id = TA.newId();
    }
    return {
      id: id,
      title: title,
      kicker: $("f-kicker").value.trim(),
      dek: $("f-dek").value.trim(),
      dek_long: $("f-dek-long").value.trim() || $("f-dek").value.trim(),
      lead: $("f-lead").value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean),
      url: url,
      date: date,
      date_ar: $("f-date-ar").value || dateToAr(date),
      beat: beat,
      beat_ar: meta.ar,
      beat_en: meta.en,
      interview: interview,
      guest: guest,
      image: $("f-image").value.trim(),
      cover: $("f-cover").value.trim(),
      outlet: $("f-outlet").value.trim() || "المجلة",
      outlet_en: ($("f-outlet").value.trim() === "المجلة") ? "Al Majalla" : $("f-outlet").value.trim(),
      source: $("f-source").value || "desk"
    };
  }

  function dateToAr(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    if (p.length < 3) return iso;
    return parseInt(p[2], 10).toString().padStart(2, "0") + " " + months[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  function fillForm(a) {
    current = a;
    $("f-id").value = a.id || "";
    $("f-title").value = a.title || "";
    $("f-kicker").value = a.kicker || "";
    $("f-dek").value = a.dek || "";
    $("f-dek-long").value = a.dek_long || "";
    $("f-lead").value = (a.lead && a.lead.length) ? a.lead.join("\n\n") : "";
    $("f-url").value = a.url || "";
    $("f-date").value = a.date || "";
    $("f-date-ar").value = a.date_ar || "";
    $("f-beat").value = a.beat && TA.BEATS[a.beat] ? a.beat : "other";
    $("f-outlet").value = a.outlet || "المجلة";
    $("f-guest").value = a.guest || "";
    $("f-image").value = a.image || "";
    $("f-cover").value = a.cover || "";
    $("f-source").value = a.source || "desk";
    $("f-interview").checked = !!a.interview;
    paintPreview();
    paintRail();
  }

  function paintPreview() {
    var a = readForm();
    var box = $("live-preview");
    box.innerHTML = "";
    var art = el("figure", "cover-art");
    var src = a.cover || a.image;
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "";
      art.appendChild(img);
    }
    var copy = el("div", "cover-copy");
    var meta = el("div", "cover-meta");
    meta.appendChild(el("span", "", a.beat_ar || ""));
    if (a.date_ar || a.date) meta.appendChild(el("span", "", a.date_ar || a.date));
    copy.appendChild(meta);
    var title = el("h2", "cover-title", a.title || (lang === "ar" ? "بلا عنوان بعد" : "No headline yet"));
    title.setAttribute("lang", "ar");
    title.setAttribute("dir", "rtl");
    copy.appendChild(title);
    if (a.kicker) copy.appendChild(el("p", "cover-kicker-line", a.kicker));
    if (a.dek) copy.appendChild(el("p", "cover-dek", a.dek));
    box.appendChild(art);
    box.appendChild(copy);
  }

  function paintRail() {
    var list = $("rail-list");
    list.innerHTML = "";
    TA.allArticles().forEach(function (a) {
      var li = el("li", "");
      var b = el("button", "rail-item" + (TA.sameArticle(a, current) ? " is-on" : ""));
      b.type = "button";
      b.appendChild(el("b", "", a.title || "—"));
      b.appendChild(el("span", "", (a.date_ar || a.date || "") + " · " + (a.beat_ar || "")));
      b.addEventListener("click", function () { fillForm(a); setMsg("", ""); });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function setLang(next) {
    lang = TA.applyLang(next);
    var btn = $("lang-btn");
    btn.textContent = lang === "ar" ? "EN" : "ع";
    paintPreview();
  }

  function refreshSeed() {
    if (!serverLive) return Promise.resolve();
    return TA.api("/api/articles").then(function (rows) {
      if (Array.isArray(rows)) window.ARTICLES = rows;
    }).catch(function () { /* keep in-memory seed */ });
  }

  function checkServer() {
    return TA.api("/api/health").then(function () {
      serverLive = true;
      var s = $("desk-status");
      s.textContent = lang === "ar"
        ? "الخادم متصل. الحفظ يكتب في ملفات الموقع."
        : "Server is up. Save writes into the site files.";
      s.className = "desk-status is-live";
      s.removeAttribute("data-en");
    }).catch(function () {
      serverLive = false;
      var s = $("desk-status");
      var hosted = /github\.io$/.test(location.hostname);
      if (hosted) {
        s.textContent = lang === "ar"
          ? "هذه نسخة GitHub Pages. الحفظ هنا يبقى في هذا المتصفح فقط. لنشر مادة على الموقع الحي: Actions ثم Publish a piece، أو ادفع الملفات بعد الحفظ المحلي."
          : "This is the GitHub Pages copy. Save here stays in this browser only. To publish on the live site: Actions → Publish a piece, or push the files after a local save.";
      } else {
        s.textContent = lang === "ar"
          ? "حفظ محلي في هذا المتصفح. شغّل python3 server.py ليُكتب في الملفات."
          : "Saving in this browser only. Run python3 server.py to write the files.";
      }
      s.className = "desk-status";
    });
  }

  function ingest() {
    var url = $("url-input").value.trim() || $("f-url").value.trim();
    if (!url) { setMsg(lang === "ar" ? "ألصق الرابط أولا." : "Paste a link first."); return; }
    $("f-url").value = url;
    setMsg("", lang === "ar" ? "يقرأ الصفحة…" : "Reading the page…");
    if (!serverLive) {
      setMsg(
        lang === "ar"
          ? "قراءة الرابط تحتاج الخادم المحلي. شغّل python3 server.py في مجلد الموقع، أو املأ الحقول يدويا."
          : "Reading a link needs the local server. Run python3 server.py in this folder, or fill the fields by hand.",
        ""
      );
      return;
    }
    TA.api("/api/ingest", { url: url }).then(function (res) {
      var a = res.article;
      a.source = "desk";
      if (!a.guest && a.interview) a.guest = TA.guestOf(a.title);
      fillForm(a);
      $("url-input").value = url;
      setMsg("", lang === "ar" ? "امتلأت الحقول من الرابط. راجعها ثم احفظ." : "Fields filled from the link. Check them, then save.");
    }).catch(function (err) {
      setMsg(err.message || String(err), "");
    });
  }

  function save(ev) {
    if (ev) ev.preventDefault();
    var a = readForm();
    if (!a.title) { setMsg(lang === "ar" ? "العنوان مطلوب." : "A headline is required."); return; }
    if (a.interview && !a.guest) a.guest = TA.guestOf(a.title);
    TA.upsertDesk(a);
    var after = function () {
      fillForm(a);
      setMsg("", lang === "ar" ? "حُفظت المادة، وستظهر في الموقع فورا." : "Saved. It now shows on the site.");
    };
    if (serverLive) {
      TA.api("/api/save", { article: a }).then(function () {
        return refreshSeed();
      }).then(after).catch(function (err) {
        after();
        setMsg((lang === "ar" ? "حُفظت محليا. الخادم: " : "Saved locally. Server: ") + err.message, "");
      });
    } else {
      after();
    }
  }

  function remove() {
    var a = readForm();
    if (!a.title && !a.url) return;
    var ok = confirm(lang === "ar" ? "حذف هذه المادة من الموقع؟" : "Remove this piece from the site?");
    if (!ok) return;
    TA.removeDesk(a);
    var done = function () {
      fillForm(emptyArticle());
      setMsg("", lang === "ar" ? "حُذفت." : "Removed.");
    };
    if (serverLive && a.id) {
      TA.api("/api/delete", { id: a.id, url: a.url }).then(refreshSeed).then(done).catch(done);
    } else {
      done();
    }
  }

  function refreshArchive() {
    if (!serverLive) {
      setMsg(lang === "ar"
        ? "تحديث الأرشيف يحتاج python3 server.py"
        : "Refreshing the archive needs python3 server.py", "");
      return;
    }
    setMsg("", lang === "ar" ? "يسحب الأرشيف…" : "Pulling the archive…");
    TA.api("/api/refresh", {}).then(function (res) {
      paintRail();
      setMsg("", (lang === "ar" ? "أُضيفت " : "Added ") + res.added + (lang === "ar" ? " مادة جديدة." : " new pieces."));
    }).catch(function (err) { setMsg(err.message, ""); });
  }

  TA.bootTheme();
  $("theme-btn").addEventListener("click", function () {
    var now = document.documentElement.getAttribute("data-theme");
    TA.applyTheme(now === "dark" ? "light" : "dark");
  });
  $("lang-btn").addEventListener("click", function () { setLang(lang === "ar" ? "en" : "ar"); });
  $("ingest-btn").addEventListener("click", ingest);
  $("url-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); ingest(); }
  });
  $("article-form").addEventListener("submit", save);
  $("article-form").addEventListener("input", paintPreview);
  $("f-title").addEventListener("input", function () {
    var t = $("f-title").value;
    if (TA.isInterview(t)) {
      $("f-interview").checked = true;
      if (!$("f-guest").value) $("f-guest").value = TA.guestOf(t);
    }
  });
  $("new-btn").addEventListener("click", function () { fillForm(emptyArticle()); setMsg("", ""); });
  $("delete-btn").addEventListener("click", remove);
  $("refresh-btn").addEventListener("click", refreshArchive);
  $("download-btn").addEventListener("click", function () {
    TA.downloadDataJs(TA.allArticles());
  });

  setLang(TA.savedLang());
  fillForm(emptyArticle());
  checkServer();
})();
