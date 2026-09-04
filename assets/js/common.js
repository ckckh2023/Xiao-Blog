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
       options.level       公告类型，默认 "warn"（黄色警示样式），预留其他类型
       options.closable    是否显示红色 X 关闭按钮，默认 true
       options.autoHide    自动关闭毫秒数，0=不自动关闭
       options.onClose     关闭时回调（用户点 X 或自动隐藏后触发）
       options.link        点击公告文本跳转的 URL，不传则不可点击跳转（默认不启用）
       options.linkTarget  跳转 target，默认 "_blank"（新开）；为 "_blank" 时自动加 rel="noopener noreferrer"
     返回关闭函数；后续其他场景（如站点公告）可直接复用该接口。 */
  function showNotice(message, options) {
    var body = document.body;
    if (!body || !message) return function () {};
    var opts = Object.assign({ level: "warn", closable: true, autoHide: 0, linkTarget: "_blank" }, options || {});

    var bar = utils.el("div", { class: "notice-bar notice-bar-" + opts.level, role: "alert" });
    /* 公告文本：有 link 时用 <a> 支持点击跳转（原生链接语义，中键/右键均可用）；无 link 时用 <span> 保持原样 */
    if (opts.link) {
      var linkAttrs = { class: "notice-text notice-text-link", href: opts.link, target: opts.linkTarget };
      if (opts.linkTarget === "_blank") linkAttrs.rel = "noopener noreferrer";
      bar.appendChild(utils.el("a", linkAttrs, message));
    } else {
      bar.appendChild(utils.el("span", { class: "notice-text" }, message));
    }

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
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="m15.585 4.586l.486-.274q.032.17.06.303c.032.158.06.289.072.418c.103 1.118.665 1.941 1.462 2.127c1.165.27 2.264-.177 2.856-1.164c.711-1.184.403-2.634-.808-3.507C16.346.061 12.647-.609 8.663.56C.072 3.095-2.867 13.65 3.23 20.122c2.608 2.769 5.92 3.964 9.68 3.873c4.817-.113 8.285-2.513 10.5-6.674c1.57-2.952-.137-6.178-3.405-6.849a21 21 0 0 0-5.675-.362a4.8 4.8 0 0 0-1.805.548c-.625.325-.805.998-.735 1.666c.065.608.531.972 1.086 1.064c1.118.175 2.25.277 3.378.37c.327.027.657.03.986.033c.473.005.944.01 1.405.086c1.314.217 1.766 1.284 1.09 2.425a4.7 4.7 0 0 1-.577.766a6.55 6.55 0 0 1-3.318 1.964c-2.333.57-4.669.603-6.99-.13c-2.645-.835-4.221-2.777-4.277-5.392A9.1 9.1 0 0 1 5.76 8.907c.36-.654.558-1.327.503-2.067a26 26 0 0 1-.05-.972l-.025-.565q.401.084.792.212c1.011.406 2.007.592 3.102.294a5.6 5.6 0 0 1 1.902-.122a4.76 4.76 0 0 0 2.921-.714c.218-.128.439-.251.681-.387"/></svg>';

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

  /* ---------- 页尾 Cloudflare 图标 ---------- */
  var CF_LOGO_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727"/></svg>';
  function mountFooterLogo() {
    var footers = document.querySelectorAll(".site-footer");
    for (var i = 0; i < footers.length; i++) {
      var span = document.createElement("span");
      span.className = "footer-cf-logo";
      span.innerHTML = CF_LOGO_SVG;
      footers[i].appendChild(span);
    }
  }
  global.mountFooterLogo = mountFooterLogo;

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
    mountFooterLogo();
  });
})(window);
