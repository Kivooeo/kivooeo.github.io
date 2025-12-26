(function () {
  var KEY = "theme";

  function apply(name) {
    if (name) {
      document.documentElement.setAttribute("data-theme", name);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function markActive(name) {
    var current = name || "";
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      var val = b.getAttribute("data-theme") || "";
      b.classList.toggle("active", val === current);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var saved = "";
    try {
      saved = localStorage.getItem(KEY) || "";
    } catch (e) {}
    markActive(saved);

    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var name = b.getAttribute("data-theme") || "";
        apply(name);
        try {
          if (name) {
            localStorage.setItem(KEY, name);
          } else {
            localStorage.removeItem(KEY);
          }
        } catch (e) {}
        markActive(name);
      });
    });
  });
})();
