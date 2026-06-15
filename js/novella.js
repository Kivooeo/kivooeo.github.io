/* novella.js — Katana ZERO-styled reader.
 *
 * Reading model: text ACCUMULATES top-to-bottom. Each click/keypress appends the
 * next beat below the previous ones (nothing disappears); the newest prose line
 * is typed out letter-by-letter, the page follows it down. Progress is saved, so
 * reopening restores everything read so far.
 *
 * Story script format (see static/novella/part1.txt):
 *   ## Глава 1: Title      -> chapter heading
 *   # Title                -> part / act heading
 *   > text                 -> document fragment strip (dossier reveal)
 *   ---                    -> scene break
 *   [doc title="..." stamp="..." kind="file|sms|alert"]
 *   ...lines...
 *   [/doc]                 -> document panel
 *   // ...                 -> comment (ignored)
 *   anything else          -> a line of prose
 *
 * Inline markup (coloring/tone is ALWAYS manual — no auto-highlighting):
 *   colors:  [pink]..[/] [yellow]..[/] [orange]..[/] [red]..[/] [green]..[/]
 *            [cyan]..[/] [purple]..[/] [blue]..[/] [gray]..[/]
 *   tones (Katana ZERO paralanguage — bundle color+anim+weight+speed):
 *            [scared]..[/]  wavy aloof purple
 *            [angry]..[/]   quivering bold red
 *            [stern]..[/]   unmoving bold red (menacing)
 *            [whisper]..[/] dim, smaller, fragile drift, types slowly
 *            [shout]..[/]   bold, larger, pulsing glow, types fast
 *            [glitch]..[/]  cyan digital jitter (cyber / toxin / system)
 *   raw modifiers: [wave]..[/] [shake]..[/] [b]..[/] [fast]..[/] [slow]..[/]
 *   shorthand: _thought_  **strong**  *aside*
 *   tags nest & combine, e.g. [red][shake]Damnit![/][/]
 */
(function () {
  "use strict";

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* Inline tags. c = css class, s = typewriter speed multiplier, a = per-char animation.
   * Coloring/tone are ALWAYS manual; tones bundle color + weight + animation + speed. */
  var TAGS = {
    // raw colors
    pink: { c: "c-pink" }, yellow: { c: "c-yellow" }, orange: { c: "c-orange" },
    red: { c: "c-red" }, green: { c: "c-green" }, cyan: { c: "c-cyan" },
    purple: { c: "c-purple" }, blue: { c: "c-blue" }, gray: { c: "c-gray" },
    // markdown-ish (from preprocess)
    strong: { c: "t-strong" }, thought: { c: "t-thought" }, aside: { c: "t-aside" },
    // raw modifiers
    b: { c: "tone-b" },
    wave: { c: "tone-wave", a: 1 }, shake: { c: "tone-shake", a: 1 },
    fast: { s: 0.45 }, slow: { s: 2 },
    // emotion tones (Katana ZERO paralanguage)
    scared: { c: "tone-scared", a: 1 },   // wavy + aloof purple
    angry: { c: "tone-angry", a: 1 },     // quivering + bold red
    stern: { c: "tone-stern" },           // unmoving bold red — menacing (static by design)
    glitch: { c: "tone-glitch", a: 1 },   // digital corruption (cyber / toxin / system)
    whisper: { c: "tone-whisper", a: 1, s: 1.7 }, // fragile drift, slow
    shout: { c: "tone-shout", s: 0.5 }
  };

  function preprocess(s) {
    return s.replace(/\*\*([\s\S]*?)\*\*/g, "[strong]$1[/]")
      .replace(/_([\s\S]*?)_/g, "[thought]$1[/]")
      .replace(/\*([\s\S]*?)\*/g, "[aside]$1[/]");
  }

  // -> [{classes:[...], speed, animated, text}]
  function tokenize(markup) {
    var s = preprocess(markup);
    var runs = [], stack = [], buf = "";
    function flush() {
      if (!buf) return;
      var classes = [], speed = 1, anim = false;
      for (var k = 0; k < stack.length; k++) {
        var d = stack[k];
        if (d.c) classes.push(d.c);
        if (d.s) speed *= d.s;
        if (d.a) anim = true;
      }
      runs.push({ classes: classes, speed: speed, animated: anim, text: buf });
      buf = "";
    }
    var i = 0;
    while (i < s.length) {
      if (s.charAt(i) === "[") {
        var close = s.indexOf("]", i);
        if (close > i) {
          var tag = s.slice(i + 1, close);
          if (tag === "/") { flush(); stack.pop(); i = close + 1; continue; }
          if (TAGS[tag]) { flush(); stack.push(TAGS[tag]); i = close + 1; continue; }
        }
      }
      buf += s.charAt(i); i++;
    }
    flush();
    return runs;
  }

  // Build spans (initially hidden) into `container`; return ordered reveal steps.
  function buildInline(container, markup) {
    var runs = tokenize(markup), steps = [];
    runs.forEach(function (run) {
      var span = document.createElement("span");
      if (run.classes.length) span.className = run.classes.join(" ");
      container.appendChild(span);
      var chars = Array.prototype.slice.call(run.text);
      if (run.animated) {
        var idx = 0;
        chars.forEach(function (ch) {
          if (ch === " ") {
            var tn = document.createTextNode("");
            span.appendChild(tn);
            steps.push({ ch: ch, speed: run.speed, reveal: appendChar(tn, " ") });
          } else {
            var el = document.createElement("i");
            el.className = "nv-c";
            el.textContent = ch;
            el.style.animationDelay = (idx * 0.06).toFixed(2) + "s";
            span.appendChild(el);
            steps.push({ ch: ch, speed: run.speed, reveal: revealEl(el) });
            idx++;
          }
        });
      } else {
        var tnode = document.createTextNode("");
        span.appendChild(tnode);
        chars.forEach(function (ch) {
          steps.push({ ch: ch, speed: run.speed, reveal: appendChar(tnode, ch) });
        });
      }
    });
    return steps;
  }
  function revealEl(el) { return function () { el.classList.add("on"); }; }
  function appendChar(tn, ch) { return function () { tn.nodeValue += ch; }; }

  function parse(raw) {
    var lines = raw.replace(/\r/g, "").split("\n");
    var beats = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      if (!t || t.indexOf("//") === 0) continue;

      if (t.indexOf("[doc") === 0) {
        var title = (line.match(/title="([^"]*)"/) || [])[1] || "";
        var stamp = (line.match(/stamp="([^"]*)"/) || [])[1] || "";
        var kind = (line.match(/kind="([^"]*)"/) || [])[1] || "file";
        var dl = []; i++;
        while (i < lines.length && lines[i].trim() !== "[/doc]") { dl.push(lines[i]); i++; }
        beats.push({ type: "doc", title: title, stamp: stamp, kind: kind, lines: dl });
        continue;
      }
      if (t.indexOf("## ") === 0) { beats.push({ type: "chapter", title: t.slice(3) }); continue; }
      if (t.indexOf("# ") === 0) { beats.push({ type: "part", title: t.slice(2) }); continue; }
      if (t.indexOf("> ") === 0) { beats.push({ type: "fragment", text: t.slice(2) }); continue; }
      if (t === "---") { beats.push({ type: "break" }); continue; }

      var cls = "narration";
      if (t.charAt(0) === "—") cls = "dialogue";
      else if (/^_[\s\S]*_$/.test(t)) cls = "thought";
      beats.push({ type: "text", text: line, cls: cls });
    }
    return beats;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("nv");
    if (!root) return;

    var storeKey = "novella-" + (root.getAttribute("data-key") || "part1");
    var storyUrl = root.getAttribute("data-story");

    var elProg = document.getElementById("nv-prog-fill");
    var elChapter = document.getElementById("nv-chapter");
    var elRead = document.getElementById("nv-read");
    var elNext = document.getElementById("nv-next");
    var elCog = document.getElementById("nv-cog");
    var elTocBtn = document.getElementById("nv-toc-btn");
    var elToc = document.getElementById("nv-toc");
    var elTocList = document.getElementById("nv-toc-list");
    var elSettings = document.getElementById("nv-settings");
    var elSpeed = document.getElementById("nv-speed");
    var elSize = document.getElementById("nv-size");
    var elInstant = document.getElementById("nv-instant");
    var elPixel = document.getElementById("nv-pixel");
    var elFont = document.getElementById("nv-font");

    var PIXEL_FONTS = {
      dot: '"DotGothic16", monospace',
      pixelify: '"Pixelify Sans", monospace',
      handjet: '"Handjet", monospace'
    };

    function clampNum(v, lo, hi, dflt) {
      if (isNaN(v)) return dflt;
      return Math.max(lo, Math.min(hi, v));
    }

    // --- settings (persisted) ---
    var speedPct = clampNum(parseInt(localStorage.getItem("novella-speed"), 10), 0, 100, 63);
    var sizePct = clampNum(parseInt(localStorage.getItem("novella-size"), 10), 0, 100, 40);
    var instant = localStorage.getItem("novella-instant") === "1";
    var pixel = localStorage.getItem("novella-pixel") === "1";
    var fontKey = localStorage.getItem("novella-font") || "dot";
    if (!PIXEL_FONTS[fontKey]) fontKey = "dot";
    elSpeed.value = speedPct;
    elSize.value = sizePct;
    elInstant.checked = instant;
    elPixel.checked = pixel;
    elFont.value = fontKey;

    // slider 0 (slow) .. 100 (fast)  ->  ms per character
    function charDelay() { return Math.round(60 - (speedPct / 100) * 54); }
    function applySize() {
      root.style.setProperty("--nv-read-scale", (0.85 + (sizePct / 100) * 0.6).toFixed(3));
    }
    function applyPixel() { root.classList.toggle("nv--pixel", pixel); }
    function applyFont() { root.style.setProperty("--nv-font-pixel", PIXEL_FONTS[fontKey]); }
    applySize();
    applyPixel();
    applyFont();

    elCog.addEventListener("click", function (e) {
      e.stopPropagation();
      elSettings.hidden = !elSettings.hidden;
      elToc.hidden = true;
    });
    elSettings.addEventListener("click", function (e) { e.stopPropagation(); });
    elTocBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      elToc.hidden = !elToc.hidden;
      elSettings.hidden = true;
      if (!elToc.hidden) refreshToc();
    });
    elToc.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { elSettings.hidden = true; elToc.hidden = true; });
    elSpeed.addEventListener("input", function () {
      speedPct = parseInt(elSpeed.value, 10) || 0;
      localStorage.setItem("novella-speed", String(speedPct));
    });
    elSize.addEventListener("input", function () {
      sizePct = parseInt(elSize.value, 10) || 0;
      localStorage.setItem("novella-size", String(sizePct));
      applySize();
    });
    elInstant.addEventListener("change", function () {
      instant = elInstant.checked;
      localStorage.setItem("novella-instant", instant ? "1" : "0");
    });
    elPixel.addEventListener("change", function () {
      pixel = elPixel.checked;
      localStorage.setItem("novella-pixel", pixel ? "1" : "0");
      applyPixel();
    });
    elFont.addEventListener("change", function () {
      fontKey = PIXEL_FONTS[elFont.value] ? elFont.value : "dot";
      localStorage.setItem("novella-font", fontKey);
      applyFont();
    });

    var beats = [];
    var idx = -1;
    var typing = false;
    var timer = null;
    var curSteps = [], curStep = 0;

    fetch(storyUrl, { cache: "no-cache" })
      .then(function (r) { return r.text(); })
      .then(function (raw) { beats = parse(raw); buildToc(); boot(); })
      .catch(function () { elRead.innerHTML = '<p class="nv-line">…ошибка загрузки текста.</p>'; });

    var chapters = []; // [{index, title}]

    function chapterAt(i) {
      var name = "";
      for (var k = 0; k <= i && k < beats.length; k++) {
        if (beats[k].type === "chapter") name = beats[k].title;
      }
      return name;
    }
    function currentChapterIndex() {
      var ci = -1;
      for (var k = 0; k <= idx && k < beats.length; k++) {
        if (beats[k].type === "chapter") ci = k;
      }
      return ci;
    }
    function save() { try { localStorage.setItem(storeKey, String(idx)); } catch (e) {} }

    function buildToc() {
      chapters = [];
      for (var k = 0; k < beats.length; k++) {
        if (beats[k].type === "chapter") chapters.push({ index: k, title: beats[k].title });
      }
      elTocList.innerHTML = "";
      chapters.forEach(function (ch, n) {
        var li = document.createElement("li");
        li.setAttribute("data-beat", ch.index);
        li.innerHTML = '<span class="nv-toc-num">' + (n + 1) + ".</span>" + esc(ch.title);
        li.addEventListener("click", function () { jumpToChapter(ch.index); });
        elTocList.appendChild(li);
      });
    }

    function refreshToc() {
      var cur = currentChapterIndex();
      var items = elTocList.children;
      for (var n = 0; n < items.length; n++) {
        var bi = parseInt(items[n].getAttribute("data-beat"), 10);
        items[n].classList.toggle("active", bi === cur);
        items[n].classList.toggle("locked", bi > idx);
      }
    }

    function chapterStartOf(i) {
      var s = 0;
      for (var k = 0; k <= i && k < beats.length; k++) {
        if (beats[k].type === "chapter") s = k;
      }
      return s;
    }

    // Jump = restart the reading fresh from the chosen chapter.
    function jumpToChapter(target) {
      clearType(); typing = false;
      elRead.innerHTML = "";
      idx = target; save(); updateHud();
      append(target, false);   // chapter card, then read forward from here
      elRead.scrollTop = 0;
      elNext.hidden = false;
      elToc.hidden = true;
      refreshToc();
    }

    function updateHud() {
      elProg.style.width = (beats.length > 1 ? ((idx + 1) / beats.length) * 100 : 100) + "%";
      elChapter.textContent = chapterAt(idx);
      refreshToc();
    }

    function nearBottom() {
      return elRead.scrollHeight - elRead.scrollTop - elRead.clientHeight < 120;
    }
    function toBottom() { elRead.scrollTop = elRead.scrollHeight; }

    function clearType() { if (timer) { clearTimeout(timer); timer = null; } }

    function typeIn(steps, done) {
      curSteps = steps; curStep = 0;
      typing = true;
      elNext.hidden = true;
      var base = charDelay();
      (function tick() {
        if (!typing) return;
        if (curStep >= curSteps.length) { typing = false; done && done(); return; }
        var st = curSteps[curStep++];
        st.reveal();
        toBottom();
        var d = base * (st.speed || 1);
        if (".!?…".indexOf(st.ch) >= 0) d *= 11;
        else if (",;:—".indexOf(st.ch) >= 0) d *= 4;
        timer = setTimeout(tick, d);
      })();
    }

    function revealAll(steps) {
      for (var i = 0; i < steps.length; i++) steps[i].reveal();
    }
    function finishType() {
      typing = false; clearType();
      for (var i = curStep; i < curSteps.length; i++) curSteps[i].reveal();
    }

    // returns { el, steps, noType }
    function makeBeat(beat) {
      var el, steps = [], noType = false;
      if (beat.type === "chapter") {
        el = document.createElement("h2");
        el.className = "nv-ch";
        var k = document.createElement("span");
        k.className = "nv-ch-kicker"; k.textContent = "ГЛАВА";
        var ti = document.createElement("span");
        ti.className = "nv-ch-title";
        el.appendChild(k); el.appendChild(ti);
        steps = buildInline(ti, beat.title);
        noType = true;

      } else if (beat.type === "part") {
        el = document.createElement("h1");
        el.className = "nv-part";
        steps = buildInline(el, beat.title);
        noType = true;

      } else if (beat.type === "break") {
        el = document.createElement("div");
        el.className = "nv-break";
        el.innerHTML = "<span></span><i>✦</i><span></span>";
        noType = true;

      } else if (beat.type === "fragment") {
        el = document.createElement("div");
        el.className = "nv-frag";
        steps = buildInline(el, beat.text);

      } else if (beat.type === "doc") {
        el = document.createElement("div");
        el.className = "nv-doc nv-doc--" + beat.kind;
        var head = document.createElement("div");
        head.className = "nv-doc-head";
        head.innerHTML = '<span class="nv-doc-tag">ДОКУМЕНТ</span>' +
          '<span class="nv-doc-title">' + esc(beat.title) + "</span>";
        var body = document.createElement("div");
        body.className = "nv-doc-body";
        el.appendChild(head); el.appendChild(body);
        beat.lines.forEach(function (l) {
          var p = document.createElement("p");
          body.appendChild(p);
          steps = steps.concat(buildInline(p, l));
        });
        if (beat.stamp) {
          var st = document.createElement("div");
          st.className = "nv-doc-stamp"; st.textContent = beat.stamp;
          el.appendChild(st);
        }

      } else {
        el = document.createElement("p");
        el.className = "nv-line nv-line--" + beat.cls;
        steps = buildInline(el, beat.text);
      }
      return { el: el, steps: steps, noType: noType };
    }

    function append(i, restore) {
      var beat = beats[i];
      var made = makeBeat(beat);
      if (beat.type === "chapter") made.el.id = "nv-ch-" + i;
      elRead.appendChild(made.el);
      if (beat.type === "doc") requestAnimationFrame(function () { made.el.classList.add("in"); });

      var animate = !restore && !instant && !made.noType && made.steps.length > 0;
      if (animate) {
        made.el.scrollIntoView({ block: "nearest" });
        typeIn(made.steps, function () { elNext.hidden = false; });
      } else {
        revealAll(made.steps);
        typing = false;
        if (!restore) { elNext.hidden = false; if (nearBottom()) toBottom(); }
      }
    }

    function advance() {
      if (typing) { finishType(); elNext.hidden = false; return; }
      if (idx >= beats.length - 1) { elNext.hidden = true; return; }
      idx++; save(); updateHud();
      append(idx, false);
    }

    function boot() {
      var saved = parseInt(localStorage.getItem(storeKey), 10);
      if (isNaN(saved) || saved < 0) {
        idx = 0; save(); updateHud();
        append(0, false);
      } else {
        saved = Math.min(saved, beats.length - 1);
        var start = chapterStartOf(saved);   // resume from the start of the current chapter
        for (var i = start; i <= saved; i++) append(i, true);
        idx = saved; updateHud();
        elNext.hidden = false;
        toBottom();
      }
    }

    elRead.addEventListener("click", advance);
    elNext.addEventListener("click", function (e) { e.stopPropagation(); advance(); });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") { elToc.hidden = true; elSettings.hidden = true; return; }
      if (!elToc.hidden || !elSettings.hidden) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault(); advance();
      }
    });
  });
})();
