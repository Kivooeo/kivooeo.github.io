(function () {
  var RE = /(^|[^\w@\/])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/g;

  function process(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || n.nodeValue.indexOf("@") === -1) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("a, pre")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var text = node.nodeValue;
      RE.lastIndex = 0;
      if (!RE.test(text)) return;

      RE.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0;
      var m;
      while ((m = RE.exec(text))) {
        var boundary = m[1];
        var user = m[2];
        frag.appendChild(document.createTextNode(text.slice(last, m.index) + boundary));

        var a = document.createElement("a");
        a.className = "gh-mention";
        a.href = "https://github.com/" + user;
        a.target = "_blank";
        a.rel = "noopener";

        var img = document.createElement("img");
        img.className = "gh-avatar";
        img.src = "https://github.com/" + user + ".png?size=40";
        img.alt = "";
        img.loading = "lazy";

        a.appendChild(img);
        a.appendChild(document.createTextNode("@" + user));
        frag.appendChild(a);

        last = RE.lastIndex;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function init() {
    process(document.querySelector(".articleBody"));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.initMentions = init;
})();
