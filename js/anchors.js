(function () {
  function flash(el) {
    el.classList.add("anchor-copied");
    window.setTimeout(function () {
      el.classList.remove("anchor-copied");
    }, 1200);
  }

  function init() {
    var anchors = document.querySelectorAll(
      ".articleBody h1 a, .articleBody h2 a, .articleBody h3 a, .articleBody h4 a, .articleBody h5 a, .articleBody h6 a"
    );

    anchors.forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      if (a.dataset.anchorBound) return;
      a.dataset.anchorBound = "1";

      a.classList.add("heading-anchor");
      a.setAttribute("title", "Click to copy link to this section");

      a.addEventListener("click", function () {
        var url = location.origin + location.pathname + href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            flash(a);
          }, function () {});
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.initHeadingAnchors = init;
})();
