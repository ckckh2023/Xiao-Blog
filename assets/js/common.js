/* ============================================================
   common.js - 全局共享逻辑
   功能：导航栏渲染 / 高亮、主题切换、GitHub API、
         Wiki 侧边栏、上下页分页、工具函数
   ============================================================ */

(function (global) {
  "use strict";

  /* ---------- 全局常量 ---------- */
  var GITHUB_USER = "ckckh2023";
  var GITHUB_AVATAR = "https://avatars.githubusercontent.com/" + GITHUB_USER;
  var GITHUB_HOME = "https://github.com/" + GITHUB_USER;
  var GITHUB_API = "https://api.github.com/users/" + GITHUB_USER;

  /* 根路径（用户页站点部署在域名根目录） */
  function root() { return "/"; }

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

  /* ---------- localStorage 缓存（降低 GitHub API 调用，规避速率限制） ---------- */
  var CACHE_PREFIX = "gh_cache:";
  var CACHE_TTL = 6 * 60 * 60 * 1000; // 6 小时

  function cacheGet(key) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return undefined;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.t < CACHE_TTL) return obj.d;
    } catch (e) {}
    return undefined;
  }
  function cacheSet(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key,
        JSON.stringify({ t: Date.now(), d: data }));
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
    { label: "Wiki", href: root() + "docs/index.html", match: /^\/docs\// }
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

  function buildNavHTML() {
    var items = NAV_ITEMS.map(function (it) {
      return '<a class="nav-item" href="' + it.href + '" data-href="' + it.href + '">' +
        utils.escapeHTML(it.label) + "</a>";
    }).join("");

    return (
      '<img class="nav-avatar" src="' + GITHUB_AVATAR + '" alt="avatar" ' +
        'onerror="this.style.visibility=\'hidden\'">' +
      '<a class="nav-id" href="' + GITHUB_HOME + '" target="_blank" rel="noopener">' +
        GITHUB_USER + "</a>" +
      '<nav class="nav-items">' + items + "</nav>" +
      '<div class="nav-spacer"></div>' +
      '<div class="nav-right">' +
        '<a class="github-link" href="' + GITHUB_HOME + '" target="_blank" rel="noopener">' +
          GITHUB_ICON_SVG + "<span>GitHub</span></a>" +
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
  }

  global.initNav = initNav;
  global.mountNav = mountNav;
  global.toggleTheme = toggleTheme;

  /* ---------- GitHub 用户信息 ---------- */
  var FALLBACK_PROFILE = {
    name: "ckckh2023",
    bio: "Full-stack Developer | AI Enthusiast",
    location: "Earth",
    company: null
  };

  function fetchGitHubProfile() {
    var cached = cacheGet("profile");
    if (cached) return Promise.resolve(cached);
    return utils.fetchJSON(GITHUB_API).then(function (data) {
      var p = {
        name: data.name || FALLBACK_PROFILE.name,
        bio: data.bio || FALLBACK_PROFILE.bio,
        location: data.location || FALLBACK_PROFILE.location,
        company: data.company || FALLBACK_PROFILE.company,
        avatar: data.avatar_url || GITHUB_AVATAR,
        html_url: data.html_url || GITHUB_HOME,
        followers: data.followers || 0,
        public_repos: data.public_repos || 0
      };
      cacheSet("profile", p);
      return p;
    }).catch(function (err) {
      console.warn("[profile] 加载失败，使用兜底数据：", err);
      var p = Object.assign({}, FALLBACK_PROFILE);
      p.avatar = GITHUB_AVATAR;
      p.html_url = GITHUB_HOME;
      p.followers = 0;
      p.public_repos = 0;
      return p;
    });
  }
  global.fetchGitHubProfile = fetchGitHubProfile;

  /* ---------- star.json 数据加载（精选项目 / 精选 Wiki） ---------- */
  function fetchStarProjects() {
    return utils.fetchJSON(root() + "repo/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] repo/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarProjects = fetchStarProjects;

  /* 项目页全部仓库列表（格式与 star.json 一致，独立接口） */
  function fetchRepoList() {
    return utils.fetchJSON(root() + "repo/RepoList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[repo] RepoList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchRepoList = fetchRepoList;

  function fetchStarDocs() {
    return utils.fetchJSON(root() + "docs/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] docs/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarDocs = fetchStarDocs;

  /* ---------- GitHub 仓库详情获取 ---------- */
  var REPO_API = "https://api.github.com/repos/";

  /* 获取仓库简介 + 真实 star 数 */
  function fetchRepoInfo(fullName) {
    var key = "repo:" + fullName;
    var cached = cacheGet(key);
    if (cached) return Promise.resolve(cached);
    return utils.fetchJSON(REPO_API + fullName).then(function (d) {
      var info = { desc: d.description || "", stars: d.stargazers_count || 0 };
      cacheSet(key, info);
      return info;
    }).catch(function (err) {
      console.warn("[repo] info 获取失败 " + fullName + "：", err);
      return null;
    });
  }
  global.fetchRepoInfo = fetchRepoInfo;

  /* 获取仓库语言列表（技术栈） */
  function fetchRepoLanguages(fullName) {
    var key = "lang:" + fullName;
    var cached = cacheGet(key);
    if (cached) return Promise.resolve(cached);
    return utils.fetchJSON(REPO_API + fullName + "/languages").then(function (d) {
      var keys = Object.keys(d || {});
      cacheSet(key, keys);
      return keys;
    }).catch(function (err) {
      console.warn("[repo] languages 获取失败 " + fullName + "：", err);
      return [];
    });
  }
  global.fetchRepoLanguages = fetchRepoLanguages;

  /* 并发 enrich 单个项目：简介 / star / 技术栈 */
  function enrichProject(p) {
    if (!p || !p.full_name) return Promise.resolve(p);
    return Promise.all([
      fetchRepoInfo(p.full_name),
      fetchRepoLanguages(p.full_name)
    ]).then(function (arr) {
      var info = arr[0], langs = arr[1];
      if (info) {
        if (info.desc) p.desc = info.desc;
        p.stars = info.stars;
      } else {
        p.desc = "暂无简介";
      }
      p.tags = (langs && langs.length) ? langs : [];
      return p;
    });
  }
  global.enrichProject = enrichProject;

  /* ---------- Vue 项目卡片渲染（封装，供页面调用） ----------
     selector: 挂载点选择器
     list:     项目数组
     perRow:   每行列数（2 / 3 / null=自适应）
  ---------- */
  function projectCardVNode(h, p, labels) {
    var tags = (p.tags || []).map(function (t) {
      return h("span", { class: "pc-tag" }, t);
    });
    var descText = p.loading ? "加载中…" : (p.desc || "暂无简介");
    var tagsNode = p.loading
      ? h("div", { class: "pc-tags" }, [h("span", { class: "pc-tag pc-tag-loading" }, "…")])
      : (tags.length ? h("div", { class: "pc-tags" }, tags) : h("div", { class: "pc-tags" }, []));
    return h("article", { class: "card project-card", key: p.id }, [
      h("div", { class: "pc-title" }, p.name),
      h("div", { class: "pc-desc" }, descText),
      tagsNode,
      h("div", { class: "pc-meta" }, [
        h("span", { class: "star" }, "★ " + (p.stars || 0)),
        h("span", "#" + p.id)
      ]),
      h("div", { class: "pc-actions" }, [
        h("a", { class: "btn btn-primary", href: p.url, target: "_blank", rel: "noopener" }, labels.primary),
        h("a", { class: "btn", href: p.repo, target: "_blank", rel: "noopener" }, labels.secondary)
      ])
    ]);
  }

  function mountProjectGrid(selector, list, perRow, labels) {
    if (!window.Vue) {
      console.warn("[project-grid] Vue 未加载，跳过渲染");
      return;
    }
    var V = window.Vue;
    var createApp = V.createApp, ref = V.ref, onMounted = V.onMounted, h = V.h;
    var container = document.querySelector(selector);
    if (!container) return;
    var cls = "project-grid" + (perRow ? " project-grid-" + perRow : "");
    var lab = Object.assign({ primary: "访问主页", secondary: "项目源码" }, labels || {});

    var initial = list.map(function (p) {
      return Object.assign({}, p, {
        tags: (p.tags || []).slice(),
        loading: true
      });
    });

    createApp({
      setup: function () {
        var projects = ref(initial);
        onMounted(function () {
          projects.value.forEach(function (p, i) {
            enrichProject(p).then(function () {
              projects.value[i] = Object.assign({}, p, { loading: false });
            });
          });
        });
        return function () {
          return h("div", { class: cls },
            projects.value.map(function (p) { return projectCardVNode(h, p, lab); })
          );
        };
      }
    }).mount(selector);
  }
  global.mountProjectGrid = mountProjectGrid;

  /* ---------- 精选 Wiki 卡片渲染（纯 DOM，硬编码数据） ----------
     selector: 挂载点选择器
     list:     精选 wiki 数组 [{ id, title, excerpt }]
     perRow:   每行列数（默认 2）
  ---------- */
  function wikiCardHTML(item) {
    var href = root() + "docs/" + item.id + "/index.html";
    return '<article class="card wiki-card">' +
      '<div class="wc-title">' + utils.escapeHTML(item.title || "") + "</div>" +
      '<div class="wc-excerpt">' + utils.escapeHTML(item.excerpt || "") + "</div>" +
      '<div class="wc-actions">' +
        '<a class="btn btn-primary" href="' + href + '">查看</a>' +
      "</div>" +
    "</article>";
  }

  function mountWikiCards(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = (list || []).slice(0, perRow || 2);
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无精选 Wiki。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(wikiCardHTML).join("") + "</div>";
  }
  global.mountWikiCards = mountWikiCards;

  /* ============================================================
     Wiki 子系统：fetchDocsList / renderSidebar /
     renderPagination / initDocsPage
     ============================================================ */
  var DOCS_BASE = root() + "docs/";
  var DOCS_LIST_URL = DOCS_BASE + "DocsList.json";
  var docsListCache = null;

  function fetchDocsList() {
    if (docsListCache) return Promise.resolve(docsListCache);
    return utils.fetchJSON(DOCS_LIST_URL).then(function (list) {
      docsListCache = list || [];
      return docsListCache;
    }).catch(function (err) {
      console.warn("[docs] DocsList.json 加载失败：", err);
      docsListCache = [];
      return docsListCache;
    });
  }
  global.fetchDocsList = fetchDocsList;

  /* 渲染左侧目录侧边栏；currentId 为当前文章 id（目录页可传 null） */
  function renderSidebar(currentId) {
    var holder = document.getElementById("docs-sidebar");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var items = list.map(function (item) {
        var href = DOCS_BASE + item.id + "/index.html";
        var cls = "sidebar-link" + (currentId && item.id === currentId ? " active" : "");
        return '<a class="' + cls + '" href="' + href + '">' +
          utils.escapeHTML(item.title) + "</a>";
      }).join("");
      holder.innerHTML = "<h3>目录</h3>" + items;
    });
  }
  global.renderSidebar = renderSidebar;

  /* 渲染上一页/下一页按钮到 #pagination */
  function renderPagination(currentId) {
    var holder = document.getElementById("pagination");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var idx = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === currentId) { idx = i; break; }
      }
      if (idx === -1) { holder.innerHTML = ""; return; }

      var prev = idx > 0 ? list[idx - 1] : null;
      var next = idx < list.length - 1 ? list[idx + 1] : null;

      function btnHTML(item, type) {
        if (!item) {
          var label = type === "prev" ? "已是第一篇" : "已是最后一篇";
          return '<div class="page-btn ' + type + ' disabled">' +
            '<span class="label">' + label + "</span>" +
            '<span class="title">—</span></div>';
        }
        var arrow = type === "prev" ? "← " : " →";
        var labelText = type === "prev" ? "上一页" : "下一页";
        var href = DOCS_BASE + item.id + "/index.html";
        return '<a class="page-btn ' + type + '" href="' + href + '">' +
          '<span class="label">' + labelText + "</span>" +
          '<span class="title">' + arrow + utils.escapeHTML(item.title) + "</span></a>";
      }

      holder.innerHTML =
        btnHTML(prev, "prev") +
        '<div class="page-divider"></div>' +
        btnHTML(next, "next");
    });
  }
  global.renderPagination = renderPagination;

  /* 从 pathname 解析当前文章 id */
  function parseCurrentDocId() {
    var path = window.location.pathname;
    /* 形如 /docs/vue-guide/ 或 /docs/vue-guide/index.html */
    var m = path.match(/^\/docs\/([^\/]+?)(?:\/(?:index\.html)?)?$/);
    return m ? m[1] : null;
  }
  global.parseCurrentDocId = parseCurrentDocId;

  /* 文章详情页初始化：渲染侧边栏 + 分页 */
  function initDocsPage() {
    var id = parseCurrentDocId();
    if (!id) return;
    return Promise.all([
      renderSidebar(id),
      renderPagination(id)
    ]);
  }
  global.initDocsPage = initDocsPage;

  /* ---------- 自动挂载 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    mountNav();
  });
})(window);
