/* ============================================================
   common.js - 全局共享逻辑
   功能：导航栏渲染 / 高亮、主题切换、GitHub API 基础设施、
         公告条、工具函数、版权年份
   各页面专属逻辑请见 home.js / repo.js / docs.js / friend.js
   ============================================================ */

(function (global) {
  "use strict";

  /* ---------- 全局常量 ---------- */
  var GITHUB_USER = "ckckh2023";
  var GITHUB_AVATAR = "https://avatars.githubusercontent.com/" + GITHUB_USER;
  var GITHUB_HOME = "https://github.com/" + GITHUB_USER;
  var GITHUB_API = "https://api.github.com/users/" + GITHUB_USER;
  var GITEE_HOME = "https://gitee.com/" + GITHUB_USER;

  /* 根路径（用户页站点部署在域名根目录） */
  function root() { return "/"; }
  global.root = root;

  /* ---------- 工具函数 ---------- */
  function Utils() {}
  Utils.prototype.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  };
  Utils.prototype.fetchJSON = function (url, options) {
    return fetch(url, options).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " @ " + url);
      return r.json();
    });
  };
  Utils.prototype.escapeHTML = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  var utils = new Utils();
  global.Utils = utils;

  /* ---------- localStorage 缓存（GitHub API 数据） ----------
     配合 GitHub REST API 的 ETag 条件请求（If-None-Match）：
     数据未变化时返回 304（不计入速率限制），变化时返回 200 并更新缓存，
     因此每次访问都能拿到最新数据，又不会耗尽 API 配额；
     缓存仅在离线 / 限流 / 接口报错时作为兜底。 */
  var CACHE_PREFIX = "gh_cache:";

  function cacheRead(key) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return undefined;
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object" && "d" in obj) ? obj : undefined;
    } catch (e) { return undefined; }
  }
  function cacheWrite(key, entry) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {}
  }
  function cacheClear() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(CACHE_PREFIX) === 0) localStorage.removeItem(k);
      });
    } catch (e) {}
  }
  global.cacheClear = cacheClear;

  /* ---------- 公告条（通用接口） ----------
     showNotice(message, options)：在顶栏下方弹出公告
       message:  公告文本（纯文本，会自动转义）
       options.level    公告类型，默认 "warn"（黄色警示样式），预留其他类型
       options.closable 是否显示红色 X 关闭按钮，默认 true
       options.autoHide 自动关闭毫秒数，0=不自动关闭
     返回关闭函数；后续其他场景（如站点公告）可直接复用该接口。 */
  function showNotice(message, options) {
    var body = document.body;
    if (!body || !message) return function () {};
    var opts = Object.assign({ level: "warn", closable: true, autoHide: 0 }, options || {});

    var bar = utils.el("div", { class: "notice-bar notice-bar-" + opts.level, role: "alert" });
    bar.appendChild(utils.el("span", { class: "notice-text" }, message));

    var close = function () { bar.remove(); };
    if (opts.closable) {
      bar.appendChild(utils.el("button", {
        type: "button",
        class: "notice-close",
        "aria-label": "关闭公告",
        onclick: close
      }, "✕"));
    }
    if (opts.autoHide > 0) setTimeout(close, opts.autoHide);

    var header = document.getElementById("site-nav");
    if (header && header.parentNode) header.insertAdjacentElement("afterend", bar);
    else body.insertBefore(bar, body.firstChild);
    return close;
  }
  global.showNotice = showNotice;

  /* GitHub API 不可用时，页面内只提醒一次 */
  var ghIssuesNoticed = false;
  function notifyGitHubIssues() {
    if (ghIssuesNoticed) return;
    ghIssuesNoticed = true;
    showNotice("GitHub API 暂时不可用或已达请求上限，部分数据可能不是最新，请稍后访问重试。");
  }

  /* 带 ETag 条件请求的 GitHub API 获取：
     有缓存时带 If-None-Match 重新校验；304 复用缓存并刷新时间戳；
     200 更新缓存并记录新 ETag；离线 / 限流 / 报错时回退缓存 */
  function fetchGitHubJSON(url, key) {
    var entry = cacheRead(key);
    var headers = {};
    if (entry && entry.etag) headers["If-None-Match"] = entry.etag;
    return fetch(url, { headers: headers }).then(function (r) {
      if (r.status === 304 && entry) {
        cacheWrite(key, { t: Date.now(), etag: entry.etag, d: entry.d });
        return entry.d;
      }
      if (!r.ok) {
        var err = new Error("HTTP " + r.status + " @ " + url);
        err.status = r.status;
        throw err;
      }
      return r.json().then(function (json) {
        cacheWrite(key, { t: Date.now(), etag: r.headers.get("ETag") || null, d: json });
        return json;
      });
    }).catch(function (err) {
      /* 网络异常 / 服务端 5xx / 限流(403,429) → 视为 GitHub API 不可用，弹公告提醒 */
      if (!err.status || err.status >= 500 || err.status === 403 || err.status === 429) {
        notifyGitHubIssues();
      }
      if (entry) {
        console.warn("[gh-api] 请求失败，回退缓存 " + key + "：", err);
        return entry.d;
      }
      throw err;
    });
  }
  global.fetchGitHubJSON = fetchGitHubJSON;

  /* 暴露常量给子模块（避免重复硬编码） */
  global.GITHUB_USER = GITHUB_USER;
  global.GITHUB_AVATAR = GITHUB_AVATAR;
  global.GITHUB_HOME = GITHUB_HOME;
  global.GITHUB_API = GITHUB_API;
  global.GITEE_HOME = GITEE_HOME;

  /* ---------- 主题切换 ---------- */
  function getStoredTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function setStoredTheme(t) {
    try { localStorage.setItem("theme", t); } catch (e) {}
  }
  function applyTheme(t) {
    if (t !== "dark") t = "light";
    document.documentElement.setAttribute("data-theme", t);
    setStoredTheme(t);
  }
  function initTheme() {
    var stored = getStoredTheme();
    if (!stored) {
      var prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      stored = prefersDark ? "dark" : "light";
    }
    applyTheme(stored);
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  }
  initTheme();

  /* ---------- 导航栏渲染 ---------- */
  var NAV_ITEMS = [
    { label: "首页", href: root() + "index.html", match: /^\/(index\.html)?$/ },
    { label: "项目", href: root() + "repo/index.html", match: /^\/repo\// },
    { label: "Wiki", href: root() + "docs/index.html", match: /^\/docs\//, more: true },
    { label: "好友", href: root() + "friend/index.html", match: /^\/friend\//, more: true }
  ];

  var GITHUB_ICON_SVG =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
    '0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-' +
    '.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-' +
    '1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 ' +
    '.67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-' +
    '.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.' +
    '54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-' +
    '4.42-3.58-8-8-8z"/></svg>';

  var GITEE_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 ' +
    '.593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296Z"/></svg>';

  var SUN_SVG =
    '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" ' +
    'cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" ' +
    'y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" ' +
    'x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" ' +
    'x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" ' +
    'y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON_SVG =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 ' +
    '12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  /* 三点更多菜单图标（水平三点，居中于 16x16 viewBox） */
  var MORE_SVG =
    '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">' +
    '<circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>' +
    '<circle cx="13" cy="8" r="1.5"/></svg>';

  function buildNavHTML() {
    var items = NAV_ITEMS.map(function (it) {
      var moreAttr = it.more ? ' data-more="true"' : "";
      return '<a class="nav-item" href="' + it.href + '" data-href="' + it.href + '"' + moreAttr + '>' +
        utils.escapeHTML(it.label) + "</a>";
    }).join("");

    /* 折叠进"更多"面板的项（移动端三点菜单）；后续新增导航项只需加 more: true 即自动入此面板 */
    var panelLinks = NAV_ITEMS.filter(function (it) { return it.more; }).map(function (it) {
      return '<a class="nav-more-link" href="' + it.href + '" data-href="' + it.href + '" role="menuitem">' +
        utils.escapeHTML(it.label) + "</a>";
    }).join("");

    return (
      '<img class="nav-avatar" src="' + GITHUB_AVATAR + '" alt="avatar" ' +
        'onerror="this.style.visibility=\'hidden\'">' +
      '<a class="nav-id" href="' + GITHUB_HOME + '" target="_blank" rel="noopener">' +
        GITHUB_USER + "</a>" +
      '<nav class="nav-items">' + items + "</nav>" +
      '<button class="nav-more" type="button" aria-label="更多导航" aria-expanded="false">' +
        MORE_SVG + "</button>" +
      '<div class="nav-more-panel" role="menu" hidden>' + panelLinks + "</div>" +
      '<div class="nav-spacer"></div>' +
      '<div class="nav-right">' +
        '<a class="github-link" href="' + GITHUB_HOME + '" target="_blank" rel="noopener">' +
          GITHUB_ICON_SVG + "<span>GitHub</span></a>" +
        '<a class="github-link gitee-link" href="' + GITEE_HOME + '" target="_blank" rel="noopener">' +
          GITEE_ICON_SVG + "<span>Gitee</span></a>" +
        '<button class="theme-toggle" type="button" aria-label="切换主题">' +
          SUN_SVG + MOON_SVG + "</button>" +
      "</div>"
    );
  }

  /* initNav：根据 pathname 高亮当前导航项 */
  function initNav() {
    var path = window.location.pathname;
    var links = document.querySelectorAll(".site-nav .nav-item");
    var matched = false;
    links.forEach(function (a) {
      var href = a.getAttribute("data-href");
      var item = NAV_ITEMS.filter(function (it) { return it.href === href; })[0];
      if (!item) return;
      if (item.match.test(path)) {
        a.classList.add("active");
        matched = true;
      }
    });
    /* 三点菜单面板内的链接同步高亮 */
    document.querySelectorAll(".site-nav .nav-more-link").forEach(function (a) {
      var href = a.getAttribute("data-href");
      var item = NAV_ITEMS.filter(function (it) { return it.href === href; })[0];
      if (item && item.match.test(path)) a.classList.add("active");
    });
    /* 兜底：根路径且未匹配时高亮首页 */
    if (!matched) {
      var home = document.querySelector('.site-nav .nav-item[data-href="' + root() + 'index.html"]');
      if (home) home.classList.add("active");
    }
  }

  /* mountNav：渲染导航到 #site-nav 占位元素，并绑定事件 */
  function mountNav() {
    var holder = document.getElementById("site-nav");
    if (!holder) return;
    holder.className = "site-nav";
    holder.innerHTML = buildNavHTML();
    var toggle = holder.querySelector(".theme-toggle");
    if (toggle) toggle.addEventListener("click", toggleTheme);
    initNav();
    initMoreMenu(holder);
  }

  /* initMoreMenu：移动端三点菜单的展开/关闭（点击按钮切换、点击外部/ESC/选择项后关闭） */
  function initMoreMenu(holder) {
    var btn = holder.querySelector(".nav-more");
    var panel = holder.querySelector(".nav-more-panel");
    if (!btn || !panel) return;

    function close() {
      panel.classList.remove("open");
      panel.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    }
    function open() {
      panel.classList.add("open");
      panel.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.classList.contains("open")) close(); else open();
    });
    /* 选择某项后关闭面板（不阻止默认跳转） */
    panel.addEventListener("click", close);
    /* 点击面板与按钮之外关闭 */
    document.addEventListener("click", function (e) {
      if (!panel.classList.contains("open")) return;
      if (e.target === btn || btn.contains(e.target)) return;
      if (e.target === panel || panel.contains(e.target)) return;
      close();
    });
    /* ESC 关闭 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  global.initNav = initNav;
  global.mountNav = mountNav;
  global.toggleTheme = toggleTheme;

  /* ---------- 版权年份自动填充 ---------- */
  function mountYear() {
    var y = new Date().getFullYear();
    var spans = document.querySelectorAll("#year");
    for (var i = 0; i < spans.length; i++) spans[i].textContent = y;
  }
  global.mountYear = mountYear;

  /* ---------- 自动挂载 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    mountNav();
    mountYear();
  });
})(window);
