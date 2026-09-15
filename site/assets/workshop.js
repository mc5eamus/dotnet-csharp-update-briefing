/* =========================================================================
   Workshop shell behaviour — zero dependencies, file:// safe.
   Presentation/handout modes, TOC, scrollspy, syntax highlighting,
   copy buttons, search, speaker notes, further-reading rendering.
   ========================================================================= */
(function () {
  "use strict";

  var STORE = {
    theme: "workshop.theme",
    mode: "workshop.mode",
    notes: "workshop.notes"
  };

  function read(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  /* ---------------------------------------------------------------------
     Syntax highlighting
     Tokenises raw source in a single pass, escaping as it builds output so
     that escaped entities can never be re-tokenised.
     --------------------------------------------------------------------- */

  var CS_KEYWORDS = ("abstract as base bool break byte case catch char checked class const continue decimal " +
    "default delegate do double else enum event explicit extern false finally fixed float for foreach get goto " +
    "if implicit in init int interface internal is lock long namespace new null object operator out override " +
    "params private protected public readonly ref return sbyte sealed set short sizeof stackalloc static string " +
    "struct switch this throw true try typeof uint ulong unchecked unsafe ushort using value virtual void volatile " +
    "when where while yield async await var dynamic nameof partial global record scoped required file allows " +
    "nint nuint and or not").split(" ");

  /* C# 14 / C# 15 additions — deliberately highlighted differently, since
     spotting them is the entire point of this workshop. */
  var CS_NEW_KEYWORDS = ["field", "extension", "union", "closed", "safe"];

  var SQL_KEYWORDS = ("select from where join inner left right full outer on group by order having insert into " +
    "values update set delete create table alter drop index view as and or not null is distinct top limit offset " +
    "case when then else end union all exists in between like asc desc primary key foreign references constraint " +
    "default cast convert with declare begin commit rollback transaction vector_search json_contains").split(" ");

  var SHELL_KEYWORDS = ("cd echo if then else fi for do done function return export set param foreach " +
    "write-host get-content set-content new-item join-path push-location pop-location").split(" ");

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + esc(text) + "</span>";
  }

  // Ordered alternation. Group index maps to a token class via CS_RULES.
  var CS_RE = new RegExp([
    "(\\/\\/[^\\n]*)",                                  // 1 line comment
    "(\\/\\*[\\s\\S]*?\\*\\/)",                         // 2 block comment
    '(""".*?"""|\\$?@"(?:[^"]|"")*"|\\$"(?:\\\\.|[^"\\\\])*"|"(?:\\\\.|[^"\\\\])*")', // 3 strings
    "('(?:\\\\.|[^'\\\\])')",                           // 4 char
    "(^[ \\t]*\\[[A-Z][\\w.<>,\\[\\]\" ()=]*\\])",      // 5 attribute line
    "(#\\w+[^\\n]*)",                                   // 6 preprocessor
    "\\b(0[xX][0-9a-fA-F_]+|\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?[fFdDmMuUlL]*)\\b", // 7 number
    "\\b([A-Za-z_]\\w*)\\b"                             // 8 word
  ].join("|"), "gm");

  var CS_RULES = { 1: "comment", 2: "comment", 3: "string", 4: "string", 5: "attr", 6: "attr", 7: "number" };

  function highlightCSharp(src) {
    var out = "", last = 0, m;
    CS_RE.lastIndex = 0;
    while ((m = CS_RE.exec(src)) !== null) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      var handled = false;
      for (var g in CS_RULES) {
        if (m[g] !== undefined) { out += span(CS_RULES[g], m[g]); handled = true; break; }
      }
      if (!handled && m[8] !== undefined) {
        var w = m[8];
        if (CS_NEW_KEYWORDS.indexOf(w) !== -1) out += span("new", w);
        else if (CS_KEYWORDS.indexOf(w) !== -1) out += span("keyword", w);
        else if (/^[A-Z]/.test(w)) out += span("type", w);
        else out += esc(w);
      } else if (!handled) {
        out += esc(m[0]);
      }
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlightGeneric(src, keywords, opts) {
    opts = opts || {};
    var commentRe = opts.comment || "(--[^\\n]*|#[^\\n]*)";
    var re = new RegExp([
      commentRe,
      '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')',
      "\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b",
      "\\b([A-Za-z_][\\w-]*)\\b"
    ].join("|"), "gmi");
    var out = "", last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      if (m[1] !== undefined) out += span("comment", m[1]);
      else if (m[2] !== undefined) out += span("string", m[2]);
      else if (m[3] !== undefined) out += span("number", m[3]);
      else if (m[4] !== undefined) {
        var w = m[4];
        out += keywords.indexOf(w.toLowerCase()) !== -1 ? span("keyword", w) : esc(w);
      } else out += esc(m[0]);
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlightJson(src) {
    var re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d[\d.eE+-]*)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      if (m[1] !== undefined) {
        out += m[2] ? span("type", m[1]) + span("punct", m[2]) : span("string", m[1]);
      } else if (m[3] !== undefined) out += span("keyword", m[3]);
      else if (m[4] !== undefined) out += span("number", m[4]);
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlightXml(src) {
    var re = /(<!--[\s\S]*?-->)|(<\/?)([\w:.-]+)|([\w:.-]+)(=)("(?:[^"]*)")|(\/?>)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      if (m[1] !== undefined) out += span("comment", m[1]);
      else if (m[3] !== undefined) out += span("punct", m[2]) + span("keyword", m[3]);
      else if (m[4] !== undefined) out += span("attr", m[4]) + span("punct", m[5]) + span("string", m[6]);
      else if (m[7] !== undefined) out += span("punct", m[7]);
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlight(code, lang) {
    switch ((lang || "").toLowerCase()) {
      case "csharp": case "cs": case "c#": return highlightCSharp(code);
      case "json": return highlightJson(code);
      case "xml": case "csproj": case "html": return highlightXml(code);
      case "sql": return highlightGeneric(code, SQL_KEYWORDS, { comment: "(--[^\\n]*)" });
      case "bash": case "sh": case "shell": case "powershell": case "ps1":
        return highlightGeneric(code, SHELL_KEYWORDS, { comment: "(#[^\\n]*)" });
      case "text": case "output": case "": return esc(code);
      default: return highlightCSharp(code);
    }
  }

  function enhanceCodeBlocks(root) {
    root.querySelectorAll("pre > code").forEach(function (code) {
      if (code.dataset.enhanced) return;
      code.dataset.enhanced = "1";

      var lang = "";
      (code.className || "").split(/\s+/).forEach(function (c) {
        if (c.indexOf("language-") === 0) lang = c.slice(9);
      });

      var raw = code.textContent.replace(/\n$/, "");
      code.innerHTML = highlight(raw, lang);

      var pre = code.parentElement;
      var wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      if (code.dataset.label || (lang && lang !== "text" && lang !== "output")) {
        var label = document.createElement("span");
        label.className = "code-label";
        label.textContent = code.dataset.label || lang;
        wrap.appendChild(label);
      }

      var btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", function () {
        var done = function () {
          btn.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).then(done, function () { fallbackCopy(raw, done); });
        } else fallbackCopy(raw, done);
      });
      wrap.appendChild(btn);
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------------------------------------------------------------------
     Further reading, rendered from the vetted sources registry.
     Loaded as assets/sources.js (window.WORKSHOP_SOURCES) rather than
     fetching sources.json, because fetch() is blocked on file:// URLs.
     --------------------------------------------------------------------- */
  function renderFurtherReading() {
    var data = window.WORKSHOP_SOURCES;
    document.querySelectorAll("[data-further]").forEach(function (host) {
      var moduleId = host.getAttribute("data-further");
      var items = (data && data.sources ? data.sources : []).filter(function (s) {
        return s.modules && s.modules.indexOf(moduleId) !== -1;
      });

      var html = '<h4>Further reading</h4>';
      if (!items.length) {
        html += '<p class="empty">No vetted community material mapped to this module yet. ' +
                'Add links via <code>content/inbox/</code> and re-run the sources pipeline.</p>';
        host.innerHTML = html;
        host.classList.add("further");
        return;
      }

      html += "<ul>";
      items.forEach(function (s) {
        var meta = [];
        if (s.author) meta.push(esc(s.author));
        if (s.publisher) meta.push(esc(s.publisher));
        if (s.published) meta.push(esc(s.published));
        if (s.writtenAgainst) meta.push("written against " + esc(s.writtenAgainst));

        // Never let one malformed record abort init() and take the whole page
        // with it. A missing verdict renders as "unrated", not as a TypeError.
        var v = s.verification || "unrated";

        html += "<li>";
        html += '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + "</a>";
        html += '<div class="src-meta">';
        html += '<span class="vstat vstat-' + esc(v) + '">' + esc(v.replace(/-/g, " ")) + "</span>";
        if (s.previewDrift && s.previewDrift !== "none") {
          html += '<span class="vstat vstat-drift-' + esc(s.previewDrift) + '">' +
                  esc(s.previewDrift) + " drift</span>";
        }
        if (meta.length) html += "<span>" + meta.join(" &middot; ") + "</span>";
        html += "</div>";
        if (s.summary) html += '<div class="src-note">' + esc(s.summary) + "</div>";
        if (s.verificationNotes) html += '<div class="src-note"><em>' + esc(s.verificationNotes) + "</em></div>";
        // The drift note is the difference between a useful link and a
        // misleading one, so it is shown with the link, not hidden in sources.html.
        if (s.driftNote) html += '<div class="src-drift">' + esc(s.driftNote) + "</div>";
        html += "</li>";
      });
      html += "</ul>";

      host.innerHTML = html;
      host.classList.add("further");
    });
  }

  /* ---------------------------------------------------------------------
     Full source index, used by sources.html. Renders every registry entry
     grouped by the module it was mapped to, with the provenance that makes
     each entry auditable: where it came from, what build it was written
     against, and how far we are allowed to reuse it.
     --------------------------------------------------------------------- */
  var TIER_LABEL = {
    1: "Tier 1 &mdash; link &amp; our own description",
    2: "Tier 2 &mdash; restated with citation",
    3: "Tier 3 &mdash; short attributed quote"
  };

  function sourceCard(s) {
    var html = '<li>';
    html += '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + "</a>";
    if (s.kind === "docs") html += ' <span class="badge badge-verified">first-party</span>';
    if (s.recommended) html += ' <span class="badge badge-focus">start here</span>';

    var meta = [];
    if (s.author) meta.push(esc(s.author));
    if (s.publisher) meta.push(esc(s.publisher));
    if (s.kind) meta.push(esc(s.kind));
    if (s.published) meta.push(esc(s.published));

    var v = s.verification || "unrated";
    html += '<div class="src-meta">';
    html += '<span class="vstat vstat-' + esc(v) + '">' +
            esc(String(v).replace(/-/g, " ")) + "</span>";
    if (s.previewDrift && s.previewDrift !== "none") {
      html += '<span class="vstat vstat-drift-' + esc(s.previewDrift) + '">' +
              esc(s.previewDrift) + " drift</span>";
    }
    if (meta.length) html += "<span>" + meta.join(" &middot; ") + "</span>";
    html += "</div>";

    if (s.summary) html += '<div class="src-note">' + esc(s.summary) + "</div>";

    /* Provenance. Deliberately shown rather than kept in the registry only:
       an attendee should be able to see why we trusted a third-party post. */
    var prov = [];
    if (s.writtenAgainst) prov.push("written against " + esc(s.writtenAgainst));
    if (s.origin) prov.push(s.origin === "user-supplied" ? "supplied by the customer" : "found during research");
    if (s.retrieved) prov.push("checked " + esc(s.retrieved));
    if (s.usageTier) prov.push(TIER_LABEL[s.usageTier] || ("tier " + esc(String(s.usageTier))));
    if (prov.length) html += '<div class="src-note">' + prov.join(" &middot; ") + "</div>";

    if (s.verificationNotes) html += '<div class="src-note"><em>' + esc(s.verificationNotes) + "</em></div>";
    if (s.driftNote) html += '<div class="src-drift">' + esc(s.driftNote) + "</div>";
    if (s.usageTier === 3 && s.quote) {
      html += '<div class="src-note"><q>' + esc(s.quote) + "</q> &mdash; " + esc(s.author || s.publisher || "source") + "</div>";
    }
    html += "</li>";
    return html;
  }

  function renderSourceIndex() {
    var host = document.querySelector("[data-source-index]");
    if (!host) return;

    var data = window.WORKSHOP_SOURCES || {};
    var all = data.sources || [];
    var modules = data.modules || [];

    var counter = document.querySelector("[data-source-count]");
    if (counter) {
      counter.textContent = all.length === 1 ? "1 vetted source" : all.length + " vetted sources";
    }

    if (!all.length) {
      host.innerHTML =
        '<div class="callout callout-note"><div class="callout-title">Registry is empty</div>' +
        "<p>No community material has been vetted yet. Drop links into " +
        "<code>content/inbox/</code> or run <code>tools/add-source.ps1</code>, then " +
        "<code>tools/build-sources.ps1</code> to regenerate this page.</p></div>";
      return;
    }

    var html = "";
    var seen = {};

    modules.forEach(function (m) {
      var items = all.filter(function (s) {
        return s.modules && s.modules.indexOf(m.id) !== -1;
      });
      if (!items.length) return;

      /* Recommended entries float to the top of each module; the rest keep
         registry order, which build-sources.ps1 already sorts stably. */
      items.sort(function (a, b) { return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0); });
      items.forEach(function (s) { seen[s.id] = true; });

      html += '<section class="slide" id="src-' + esc(m.id) + '">';
      html += '<h2 data-toc="' + esc(m.title) + '">Day ' + esc(String(m.day)) + " &mdash; " + esc(m.title) + "</h2>";
      html += '<div class="further"><ul>';
      items.forEach(function (s) { html += sourceCard(s); });
      html += "</ul></div>";
      html += "</section>";
    });

    var orphans = all.filter(function (s) { return !seen[s.id]; });
    if (orphans.length) {
      html += '<section class="slide" id="src-unmapped">';
      html += '<h2 data-toc="Unmapped">Not mapped to a module</h2>';
      html += '<div class="further"><ul>';
      orphans.forEach(function (s) { html += sourceCard(s); });
      html += "</ul></div></section>";
    }

    host.innerHTML = html;
  }

  /* ---------------------------------------------------------------------
     Table of contents + scrollspy + presentation navigation
     --------------------------------------------------------------------- */
  function init() {
    var body = document.body;
    var deck = document.querySelector(".deck");
    if (!deck) return;

    /* Must run before slides are collected: it injects sections into the deck
       that the TOC and presentation navigation then need to see. */
    renderSourceIndex();

    var slides = Array.prototype.slice.call(deck.querySelectorAll("section.slide"));
    slides.forEach(function (s, i) { if (!s.id) s.id = "slide-" + (i + 1); });

    enhanceCodeBlocks(document);
    renderFurtherReading();

    /* --- TOC ---------------------------------------------------------- */
    var toc = document.querySelector(".toc");
    var tocLinks = [];
    if (toc && slides.length) {
      var list = document.createElement("ol");
      var lastModule = null;

      slides.forEach(function (slide) {
        var heading = slide.querySelector("h2");
        if (!heading) return;
        var moduleLabel = slide.getAttribute("data-module-title");
        if (moduleLabel && moduleLabel !== lastModule) {
          var mi = document.createElement("li");
          mi.className = "toc-module";
          mi.textContent = moduleLabel;
          list.appendChild(mi);
          lastModule = moduleLabel;
        }
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + slide.id;
        // Use only the heading's own text, excluding badge chips
        a.textContent = (heading.getAttribute("data-toc") || heading.childNodes[0].textContent || heading.textContent).trim();
        a.dataset.target = slide.id;
        li.appendChild(a);
        list.appendChild(li);
        tocLinks.push(a);
      });

      var search = document.createElement("input");
      search.type = "search";
      search.className = "toc-search";
      search.placeholder = "Filter topics\u2026";
      search.setAttribute("aria-label", "Filter topics");
      search.addEventListener("input", function () {
        var q = search.value.toLowerCase().trim();
        tocLinks.forEach(function (a) {
          var hit = !q || a.textContent.toLowerCase().indexOf(q) !== -1;
          a.parentElement.classList.toggle("filtered", !hit);
        });
        list.querySelectorAll(".toc-module").forEach(function (m) {
          m.classList.toggle("filtered", !!q);
        });
      });

      var head = document.createElement("h4");
      head.textContent = toc.getAttribute("data-title") || "Contents";
      toc.appendChild(head);
      toc.appendChild(search);
      toc.appendChild(list);
    }

    function markActive(id) {
      tocLinks.forEach(function (a) { a.classList.toggle("active", a.dataset.target === id); });
      var active = tocLinks.filter(function (a) { return a.dataset.target === id; })[0];
      if (active && toc && !body.classList.contains("mode-present")) {
        var r = active.getBoundingClientRect(), t = toc.getBoundingClientRect();
        if (r.top < t.top + 40 || r.bottom > t.bottom - 40) {
          active.scrollIntoView({ block: "center" });
        }
      }
    }

    /* --- Progress ----------------------------------------------------- */
    var progress = document.createElement("div");
    progress.className = "progress";
    progress.style.width = "0";
    document.body.appendChild(progress);

    /* --- Presentation mode -------------------------------------------- */
    var current = 0;
    var nav = document.querySelector(".deck-nav");
    var posEl = nav && nav.querySelector(".pos");
    var whereEl = nav && nav.querySelector(".where");

    function showSlide(i, updateHash) {
      current = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach(function (s, idx) { s.classList.toggle("current", idx === current); });
      var slide = slides[current];
      if (posEl) posEl.textContent = (current + 1) + " / " + slides.length;
      if (whereEl) {
        var h = slide.querySelector("h2");
        whereEl.textContent = h ? (h.getAttribute("data-toc") || h.textContent).trim() : "";
      }
      progress.style.width = ((current + 1) / slides.length * 100) + "%";
      markActive(slide.id);
      if (updateHash) history.replaceState(null, "", "#" + slide.id);
      window.scrollTo(0, 0);
    }

    function indexOfId(id) {
      for (var i = 0; i < slides.length; i++) if (slides[i].id === id) return i;
      return -1;
    }

    function setMode(mode, persist) {
      var present = mode === "present";
      body.classList.toggle("mode-present", present);
      body.classList.toggle("mode-handout", !present);
      if (modeBtn) {
        modeBtn.setAttribute("aria-pressed", present ? "true" : "false");
        modeBtn.textContent = present ? "Presenting" : "Present";
      }
      if (persist) write(STORE.mode, mode);
      if (present) {
        var fromHash = indexOfId(location.hash.slice(1));
        showSlide(fromHash >= 0 ? fromHash : current, false);
      } else {
        slides.forEach(function (s) { s.classList.remove("current"); });
        progress.style.width = "0";
        var target = slides[current];
        if (target) target.scrollIntoView({ block: "start" });
      }
    }

    /* --- Controls ------------------------------------------------------ */
    var modeBtn = document.querySelector("[data-action='mode']");
    var themeBtn = document.querySelector("[data-action='theme']");
    var notesBtn = document.querySelector("[data-action='notes']");

    if (modeBtn) modeBtn.addEventListener("click", function () {
      setMode(body.classList.contains("mode-present") ? "handout" : "present", true);
    });

    function applyTheme(t, persist) {
      document.documentElement.setAttribute("data-theme", t);
      if (themeBtn) {
        themeBtn.textContent = t === "light" ? "Dark" : "Light";
        themeBtn.setAttribute("aria-label", "Switch to " + (t === "light" ? "dark" : "light") + " theme");
      }
      if (persist) write(STORE.theme, t);
    }
    if (themeBtn) themeBtn.addEventListener("click", function () {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light", true);
    });

    function applyNotes(on, persist) {
      body.classList.toggle("show-notes", on);
      if (notesBtn) notesBtn.setAttribute("aria-pressed", on ? "true" : "false");
      if (persist) write(STORE.notes, on ? "1" : "0");
    }
    if (notesBtn) notesBtn.addEventListener("click", function () {
      applyNotes(!body.classList.contains("show-notes"), true);
    });

    if (nav) {
      var prev = nav.querySelector("[data-action='prev']");
      var next = nav.querySelector("[data-action='next']");
      if (prev) prev.addEventListener("click", function () { showSlide(current - 1, true); });
      if (next) next.addEventListener("click", function () { showSlide(current + 1, true); });
    }

    tocLinks.forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (body.classList.contains("mode-present")) {
          e.preventDefault();
          var i = indexOfId(a.dataset.target);
          if (i >= 0) showSlide(i, true);
        }
      });
    });

    /* --- Keyboard ------------------------------------------------------ */
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      var present = body.classList.contains("mode-present");
      switch (e.key) {
        case "ArrowRight": case "PageDown":
          if (present) { e.preventDefault(); showSlide(current + 1, true); } break;
        case " ":
          if (present) { e.preventDefault(); showSlide(current + 1, true); } break;
        case "ArrowLeft": case "PageUp":
          if (present) { e.preventDefault(); showSlide(current - 1, true); } break;
        case "Home":
          if (present) { e.preventDefault(); showSlide(0, true); } break;
        case "End":
          if (present) { e.preventDefault(); showSlide(slides.length - 1, true); } break;
        case "p": case "P":
          e.preventDefault(); setMode(present ? "handout" : "present", true); break;
        case "n": case "N":
          e.preventDefault(); applyNotes(!body.classList.contains("show-notes"), true); break;
        case "t": case "T":
          e.preventDefault();
          applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light", true);
          break;
        case "/":
          var s = document.querySelector(".toc-search");
          if (s && !present) { e.preventDefault(); s.focus(); s.select(); }
          break;
      }
    });

    /* --- Scrollspy (handout mode) -------------------------------------- */
    if ("IntersectionObserver" in window && slides.length) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        if (body.classList.contains("mode-present")) return;
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
        var bestId = null, best = 0;
        slides.forEach(function (s) {
          var v = visible[s.id] || 0;
          if (v > best) { best = v; bestId = s.id; }
        });
        if (bestId) {
          markActive(bestId);
          current = indexOfId(bestId);
        }
        var scrolled = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
        progress.style.width = Math.min(100, scrolled * 100) + "%";
      }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-60px 0px -45% 0px" });
      slides.forEach(function (s) { io.observe(s); });
    }

    window.addEventListener("scroll", function () {
      if (body.classList.contains("mode-present")) return;
      var scrolled = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      progress.style.width = Math.min(100, Math.max(0, scrolled * 100)) + "%";
    }, { passive: true });

    /* --- Restore preferences ------------------------------------------- */
    applyTheme(read(STORE.theme, "dark"), false);
    applyNotes(read(STORE.notes, "0") === "1", false);

    var startIndex = indexOfId(location.hash.slice(1));
    if (startIndex >= 0) current = startIndex;
    setMode(read(STORE.mode, "handout"), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
