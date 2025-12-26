(function () {
  function eligible(a) {
    if (!a) return null;
    if (a.target && a.target !== "_self") return null;
    if (a.hasAttribute("download")) return null;
    if (a.protocol !== "http:" && a.protocol !== "https:") return null;
    if (a.host !== location.host) return null;
    var last = a.pathname.split("/").pop();
    if (last.indexOf(".") !== -1) return null;
    if (a.pathname === location.pathname && a.hash) return null;
    return a.href;
  }

  function enhance() {
    if (window.hljs) { hljs.highlightAll(); }
    if (window.initCopyButtons) window.initCopyButtons();
    if (window.initHeadingAnchors) window.initHeadingAnchors();
    if (window.initBackToContents) window.initBackToContents();
    if (window.__updateDocks) window.__updateDocks();
  }

  function swap(html, url) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var newMain = doc.querySelector("main");
    var curMain = document.querySelector("main");
    if (!newMain || !curMain) { location.href = url; return; }

    curMain.innerHTML = newMain.innerHTML;
    if (doc.title) document.title = doc.title;
    enhance();

    var hash = new URL(url).hash;
    var target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  function navigate(url, push) {
    fetch(url, { credentials: "same-origin" })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        if (push) history.pushState(null, "", url);
        swap(html, url);
      })
      .catch(function () { location.href = url; });
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a") : null;
    var url = eligible(a);
    if (!url) return;
    e.preventDefault();
    if (url === location.href) return;
    navigate(url, true);
  });

  window.addEventListener("popstate", function () {
    navigate(location.href, false);
  });
})();
