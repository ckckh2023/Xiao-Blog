/* ============================================================
   theme-init.js - 主题初始化逻辑
   ============================================================ */
(function () {
  var MODE_KEY = "theme-mode";
  var LEGACY_KEYS = ["theme", "theme-ts"];

  function getMode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m === "auto" || m === "light" || m === "dark") return m;
      var hasLegacy = false;
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        if (localStorage.getItem(LEGACY_KEYS[i]) !== null) { hasLegacy = true; break; }
      }
      if (hasLegacy) {
        for (var j = 0; j < LEGACY_KEYS.length; j++) localStorage.removeItem(LEGACY_KEYS[j]);
        localStorage.setItem(MODE_KEY, "auto");
      }
      return "auto";
    } catch (e) { return "auto"; }
  }

  function systemTheme() {
    return (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" : "light";
  }

  function resolveTheme(mode) {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return systemTheme();
  }

  function applyMode(mode) {
    var root = document.documentElement;
    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme", resolveTheme(mode));
  }

  try {
    applyMode(getMode());

    if (window.matchMedia) {
      var mql = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function (e) {
        if (getMode() !== "auto") return;
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  }
  catch (e) {
    applyMode("auto");
  }
})();
