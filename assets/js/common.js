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
  var GITHUB_AVATAR = "/assets/icons/head.jpg";
  var GITHUB_HOME = "https://github.com/" + GITHUB_USER;
  var GITHUB_API = "https://api.github.com/users/" + GITHUB_USER;
  var GITEE_HOME = "https://gitee.com/" + GITHUB_USER;
  var GITCODE_HOME = "https://gitcode.com/" + GITHUB_USER;

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
       options.onClose  关闭时回调（用户点 X 或自动隐藏后触发）
     返回关闭函数；后续其他场景（如站点公告）可直接复用该接口。 */
  function showNotice(message, options) {
    var body = document.body;
    if (!body || !message) return function () {};
    var opts = Object.assign({ level: "warn", closable: true, autoHide: 0 }, options || {});

    var bar = utils.el("div", { class: "notice-bar notice-bar-" + opts.level, role: "alert" });
    bar.appendChild(utils.el("span", { class: "notice-text" }, message));

    var closed = false;
    var close = function () {
      if (closed) return;
      closed = true;
      bar.remove();
      if (typeof opts.onClose === "function") opts.onClose();
    };
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

  /* GitHub API 不可用时提醒一次；用户手动关闭后本机不再弹出（localStorage 持久化） */
  var GH_NOTICE_KEY = "gh_notice_dismissed";
  function ghNoticeDismissed() {
    try { return localStorage.getItem(GH_NOTICE_KEY) === "1"; } catch (e) { return false; }
  }
  function dismissGhNotice() {
    try { localStorage.setItem(GH_NOTICE_KEY, "1"); } catch (e) {}
  }
  var ghIssuesNoticed = false;
  function notifyGitHubIssues() {
    if (ghIssuesNoticed || ghNoticeDismissed()) return;
    ghIssuesNoticed = true;
    showNotice("GitHub API 暂时不可用或已达请求上限，部分数据可能不是最新，请稍后访问重试。", {
      onClose: dismissGhNotice
    });
  }

  /* 带 ETag 条件请求的 GitHub API 获取：
     有缓存时带 If-None-Match 重新校验；304 复用缓存并刷新时间戳；
     200 更新缓存并记录新 ETag；离线 / 限流 / 报错时回退缓存
     extraHeaders：可选，追加到请求头（如 OAuth client 认证头，用于提高速率上限） */
  function fetchGitHubJSON(url, key, extraHeaders) {
    var entry = cacheRead(key);
    var headers = {};
    if (extraHeaders) Object.assign(headers, extraHeaders);
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
    { label: "文档", href: root() + "docs/index.html", match: /^\/docs\//, more: true },
    { label: "好友", href: root() + "friend/index.html", match: /^\/friend\//, more: true },
    { label: "分享", href: root() + "share/index.html", match: /^\/share\//, more: true },
    { label: "留言", href: root() + "guestbook/index.html", match: /^\/guestbook\//, more: true },
    { label: "关于", href: root() + "about/index.html", match: /^\/about\//, more: true }
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

  var GITCODE_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<line x1="6" y1="3" x2="6" y2="15"/>' +
    '<circle cx="18" cy="6" r="3"/>' +
    '<circle cx="6" cy="18" r="3"/>' +
    '<path d="M18 9a9 9 0 0 1-9 9"/></svg>';

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
      '<div class="nav-more-panel" role="menu" aria-hidden="true">' + panelLinks + "</div>" +
      '<div class="nav-spacer"></div>' +
      '<div class="nav-right">' +
        '<a class="github-link" href="' + GITHUB_HOME + '" target="_blank" rel="noopener">' +
          GITHUB_ICON_SVG + "<span>GitHub</span></a>" +
        '<a class="github-link gitee-link" href="' + GITEE_HOME + '" target="_blank" rel="noopener">' +
          GITEE_ICON_SVG + "<span>Gitee</span></a>" +
        '<a class="github-link gitcode-link" href="' + GITCODE_HOME + '" target="_blank" rel="noopener">' +
          GITCODE_ICON_SVG + "<span>GitCode</span></a>" +
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
    /* 兜底：根路径且未匹配时高亮首页（其他未匹配路径如 404 不高亮任何项） */
    if (!matched && /^\/(index\.html)?$/.test(path)) {
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
      panel.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
    }
    function open() {
      /* 面板水平居中对齐三点按钮：left 设到按钮中心，配合 translateX(-50%) 居中 */
      panel.style.left = (btn.offsetLeft + btn.offsetWidth / 2) + "px";
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
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

  /* ---------- 通用搜索框 ----------
     selector:        挂载点选择器（空元素，渲染后获得 .search-box 类）
     opts.placeholder:输入框占位文本（同时作为 aria-label）
     opts.onQuery:    输入回调，参数为 trim 后的字符串（防抖 150ms）
     返回控制器 { setQuery, getQuery, focus }；opts.onQuery 在 query 变化时触发。
     样式见 common.css .search-box；明暗主题通过 CSS 变量自动适配。 */
  var SEARCH_ICON_SVG =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-9 0 4.499 4.499 0 0 0 9 0Z"/></svg>';
  var CLEAR_ICON_SVG =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>';

  function mountSearchBox(selector, opts) {
    var holder = document.querySelector(selector);
    if (!holder) return null;
    opts = opts || {};
    var placeholder = opts.placeholder || "搜索…";
    var onQuery = typeof opts.onQuery === "function" ? opts.onQuery : function () {};

    holder.className = (holder.className ? holder.className + " " : "") + "search-box";
    holder.innerHTML =
      '<span class="search-icon" aria-hidden="true">' + SEARCH_ICON_SVG + "</span>" +
      '<input class="search-input" type="text" autocomplete="off" spellcheck="false" ' +
        'placeholder="' + utils.escapeHTML(placeholder) + '" aria-label="' +
        utils.escapeHTML(placeholder) + '">' +
      '<button class="search-clear" type="button" aria-label="清除搜索">' +
        CLEAR_ICON_SVG + "</button>";

    var input = holder.querySelector(".search-input");
    var clearBtn = holder.querySelector(".search-clear");
    var timer = null;

    function syncHasValue() {
      if (input.value) holder.classList.add("has-value");
      else holder.classList.remove("has-value");
    }
    function emit(immediate) {
      var q = input.value.trim();
      syncHasValue();
      if (timer) { clearTimeout(timer); timer = null; }
      if (immediate) onQuery(q);
      else timer = setTimeout(function () { onQuery(q); }, 150);
    }

    input.addEventListener("input", function () { emit(false); });
    clearBtn.addEventListener("click", function () {
      input.value = "";
      syncHasValue();
      if (timer) { clearTimeout(timer); timer = null; }
      onQuery("");
      input.focus();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) {
        input.value = "";
        syncHasValue();
        if (timer) { clearTimeout(timer); timer = null; }
        onQuery("");
      }
    });

    return {
      setQuery: function (q) { input.value = q || ""; syncHasValue(); },
      getQuery: function () { return input.value.trim(); },
      focus: function () { input.focus(); }
    };
  }
  global.mountSearchBox = mountSearchBox;

  /* ---------- 自动挂载 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    mountNav();
    mountYear();
    /* 全站公告：GitHub 账号被标记。用户关闭后本机不再弹出（localStorage 持久化） */
    var MARK_NOTICE_KEY = "mark_notice_dismissed";
    var markDismissed = false;
    try { markDismissed = localStorage.getItem(MARK_NOTICE_KEY) === "1"; } catch (e) {}
    if (!markDismissed) {
      showNotice(
        "本站 GitHub 账号目前被标记，部分内容不可见，但文档、分享等内容仍可正常访问。",
        {
          level: "warn",
          closable: true,
          autoHide: 0,
          onClose: function () {
            try { localStorage.setItem(MARK_NOTICE_KEY, "1"); } catch (e) {}
          }
        }
      );
    }
  });
})(window);
