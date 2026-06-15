(function () {
  var SHELL_LANGS = ["shell", "bash", "sh", "zsh", "console", "shellsession"];
  var PROMPT = /^\s*(?:[\w.-]+@[\w.\-~ ()\/]*)?[$#>]\s+/;

  function init() {
    var blocks = document.querySelectorAll(".articleBody pre");

    blocks.forEach(function (pre) {
      if (pre.parentNode && pre.parentNode.classList.contains("code-block")) return;
      var code = pre.querySelector("code");
      if (!code) return;

      var wrap = document.createElement("div");
      wrap.className = "code-block";
      pre.parentNode.insertBefore(wrap, pre);

      var head = document.createElement("div");
      head.className = "code-head";

      var lang = (code.getAttribute("data-lang") || "").toLowerCase();
      var langEl = document.createElement("span");
      langEl.className = "code-lang";
      langEl.textContent = lang;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");

      head.appendChild(langEl);
      head.appendChild(btn);
      wrap.appendChild(head);
      wrap.appendChild(pre);

      var isShell = SHELL_LANGS.indexOf(lang) !== -1;

      function copyText() {
        var text = code.textContent;
        if (isShell) {
          text = text
            .split("\n")
            .map(function (line) {
              return line.replace(PROMPT, "");
            })
            .join("\n");
        }
        return text;
      }

      btn.addEventListener("click", function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(copyText()).then(function () {
          btn.textContent = "copied";
          btn.classList.add("copied");
          window.setTimeout(function () {
            btn.textContent = "copy";
            btn.classList.remove("copied");
          }, 1200);
        }, function () {});
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.initCopyButtons = init;
})();
