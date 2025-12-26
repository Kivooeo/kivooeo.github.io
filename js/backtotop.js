(function () {
  var SHOW_AFTER = 400;
  var btn = null;
  var toc = null;
  var scrollBound = false;

  function update() {
    if (!btn) return;
    if (window.scrollY > SHOW_AFTER) {
      btn.removeAttribute("hidden");
    } else {
      btn.setAttribute("hidden", "");
    }
  }

  function init() {
    btn = document.getElementById("to-contents");
    toc = document.querySelector(".toc");

    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        (toc || document.body).scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (!scrollBound) {
      scrollBound = true;
      window.addEventListener("scroll", update, { passive: true });
    }
    update();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.initBackToContents = init;
})();
