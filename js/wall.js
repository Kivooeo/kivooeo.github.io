(function () {
  var TILE = 96;
  var GAP = 10;
  var FULL = TILE + GAP;
  var SPEEDS = [13, 16, 11]; // px/sec per row, slightly different for variety

  function makeImg(base, photos, idx) {
    var img = document.createElement("img");
    img.className = "photo";
    img.src = base + photos[idx];
    img.alt = "";
    img.dataset.i = idx;
    return img;
  }

  // pick a random photo that isn't currently shown ANYWHERE on the wall.
  // (Falls back to fully random only when there are fewer photos than tiles.)
  function pick(wall, photos) {
    if (photos.length === 1) return 0;
    var used = {};
    var imgs = wall.querySelectorAll(".photo");
    for (var i = 0; i < imgs.length; i++) used[imgs[i].dataset.i] = true;
    var avail = [];
    for (var j = 0; j < photos.length; j++) if (!used[j]) avail.push(j);
    if (!avail.length) for (var k = 0; k < photos.length; k++) avail.push(k);
    return avail[Math.floor(Math.random() * avail.length)];
  }

  function setupRow(wall, el, photos, base, wallW, speed) {
    var dirRight = el.classList.contains("row-right");
    el.innerHTML = "";
    var tx = 0;

    // initial fill: cover the wall plus a little buffer on each side
    while (el.children.length * FULL < wallW + FULL) {
      el.appendChild(makeImg(base, photos, pick(wall, photos)));
    }
    if (dirRight) {
      el.insertBefore(makeImg(base, photos, pick(wall, photos)), el.firstChild);
      tx = -FULL;
    }

    var last = 0;
    function frame(t) {
      if (!document.contains(el)) return; // stop orphaned loops after SPA nav
      if (!last) last = t;
      var dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      tx += (dirRight ? 1 : -1) * speed * dt;

      var n = el.children.length;
      // drop tiles fully past the left edge
      while (n > 1 && FULL + tx < 0) { el.removeChild(el.firstChild); tx += FULL; n--; }
      // drop tiles fully past the right edge
      while (n > 1 && (n - 1) * FULL + tx > wallW) { el.removeChild(el.lastChild); n--; }
      // refill a left gap (right-moving rows) with a fresh random tile
      while (tx > 0) { el.insertBefore(makeImg(base, photos, pick(wall, photos)), el.firstChild); tx -= FULL; n++; }
      // refill a right gap (left-moving rows)
      while (n * FULL + tx < wallW + FULL) { el.appendChild(makeImg(base, photos, pick(wall, photos))); n++; }

      el.style.transform = "translateX(" + tx + "px)";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    var wall = document.querySelector(".photo-wall");
    if (!wall || wall.dataset.filled) return;
    var url = wall.getAttribute("data-manifest");
    if (!url) return;
    var base = url.replace(/manifest\.json.*$/, "");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    fetch(url).then(function (r) { return r.json(); }).then(function (list) {
      if (!list || !list.length) return;
      wall.dataset.filled = "1";
      var wallW = wall.clientWidth || 360;
      var rows = wall.querySelectorAll(".photo-row");
      rows.forEach(function (el, i) {
        if (reduce) {
          while (el.children.length * FULL < wallW + FULL) {
            el.appendChild(makeImg(base, list, pick(wall, list)));
          }
        } else {
          setupRow(wall, el, list, base, wallW, SPEEDS[i % SPEEDS.length]);
        }
      });
    }).catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", init);
  window.initWall = init;
})();
