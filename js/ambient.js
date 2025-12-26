(function () {
  var KEY = "ambient";
  var VKEY = "ambient-volume";
  var audio = new Audio();
  audio.volume = 0.4;
  var current = "";
  var slider = null;
  var player = null;
  var npTitle = null;
  var volLabel = null;

  var playlistMode = false;
  var lofiList = null;
  var lofiBase = "";
  var lofiQueue = [];
  var lofiIdx = 0;

  function srcFor(name) {
    var btn = document.querySelector('.ambient-btn[data-ambient="' + name + '"]');
    return btn ? btn.getAttribute("data-src") : "";
  }

  function mark(name) {
    var sel = name || "";
    document.querySelectorAll(".ambient-btn").forEach(function (b) {
      b.classList.toggle("active", (b.getAttribute("data-ambient") || "") === sel);
    });
  }

  function applyVolColor() {
    if (!slider) return;
    var v = audio.volume;
    var pct = Math.round(v * 100);
    var sat = Math.round(22 + v * 26);
    var light = Math.round(62 - v * 16);
    var color = "hsl(258, " + sat + "%, " + light + "%)";
    slider.style.setProperty("--vol-color", color);
    slider.style.background =
      "linear-gradient(to right, " + color + " " + pct + "%, var(--surface) " + pct + "%)";
    if (volLabel) volLabel.style.color = color;
  }

  function reflectPlayer() {
    if (player) player.classList.toggle("playing", current !== "");
    if (window.__updateDocks) window.__updateDocks();
  }

  function setNowPlaying(text) {
    if (npTitle) npTitle.textContent = text || "";
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function playCurrentSrc() {
    var p = audio.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  function stop() {
    audio.pause();
    playlistMode = false;
    current = "";
    try { localStorage.removeItem(KEY); } catch (e) {}
    mark("");
    reflectPlayer();
    setNowPlaying("");
  }

  function startLofiQueue() {
    lofiQueue = shuffle(lofiList.map(function (t) {
      return { title: t.title, url: lofiBase + t.file };
    }));
    lofiIdx = 0;
    audio.src = lofiQueue[0].url;
    setNowPlaying(lofiQueue[0].title);
    playCurrentSrc();
  }

  function playLofi() {
    playlistMode = true;
    audio.loop = false;
    current = "lofi";
    try { localStorage.setItem(KEY, "lofi"); } catch (e) {}
    mark("lofi");
    reflectPlayer();
    applyVolColor();
    setNowPlaying("…");

    if (lofiList) { startLofiQueue(); return; }

    var btn = document.querySelector('.ambient-btn[data-ambient="lofi"]');
    var url = btn && btn.getAttribute("data-playlist");
    if (!url) { stop(); return; }
    lofiBase = url.replace(/playlist\.json.*$/, "");
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (list) {
        lofiList = list;
        if (current === "lofi") { startLofiQueue(); }
      })
      .catch(function () {});
  }

  audio.addEventListener("ended", function () {
    if (!playlistMode) return;
    lofiIdx++;
    if (lofiIdx >= lofiQueue.length) {
      lofiQueue = shuffle(lofiQueue);
      lofiIdx = 0;
    }
    audio.src = lofiQueue[lofiIdx].url;
    setNowPlaying(lofiQueue[lofiIdx].title);
    playCurrentSrc();
  });

  function playLoop(name) {
    var src = srcFor(name);
    if (!src) { stop(); return; }
    playlistMode = false;
    audio.loop = true;
    if (current !== name) { audio.src = src; current = name; }
    playCurrentSrc();
    try { localStorage.setItem(KEY, name); } catch (e) {}
    mark(name);
    reflectPlayer();
    applyVolColor();
    setNowPlaying(name);
  }

  function play(name) {
    if (name === "lofi") { playLofi(); }
    else { playLoop(name); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    slider = document.getElementById("ambient-volume");
    player = document.querySelector(".player");
    npTitle = document.getElementById("np-title");
    volLabel = document.querySelector(".volume .ctl-label");

    var savedVol = null;
    try { savedVol = localStorage.getItem(VKEY); } catch (e) {}
    if (savedVol !== null) { audio.volume = parseFloat(savedVol); }
    if (slider) {
      slider.value = audio.volume;
      applyVolColor();
      slider.addEventListener("input", function () {
        audio.volume = parseFloat(slider.value);
        applyVolColor();
        try { localStorage.setItem(VKEY, slider.value); } catch (e) {}
      });
    }

    document.querySelectorAll(".ambient-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var name = b.getAttribute("data-ambient") || "";
        if (!name) { stop(); return; }
        if (name === current && !audio.paused) { stop(); return; }
        play(name);
      });
    });

    var saved = "";
    try { saved = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (saved) {
      play(saved);
      var resume = function () {
        document.removeEventListener("click", resume);
        document.removeEventListener("keydown", resume);
        if (current && audio.paused) { playCurrentSrc(); }
      };
      document.addEventListener("click", resume);
      document.addEventListener("keydown", resume);
    }
  });
})();
