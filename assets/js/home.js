/* ============================================================
   home.js - 首页专属逻辑
   功能：GitHub 用户信息加载、精选文档 卡片渲染、精选留言卡片渲染
   依赖：common.js（Utils / fetchGitHubJSON / root）+ marked + DOMPurify（留言正文 Markdown）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;
  var GITHUB_API = global.GITHUB_API;
  var GITHUB_AVATAR = global.GITHUB_AVATAR;
  var GITHUB_HOME = global.GITHUB_HOME;
  var fetchGitHubJSON = global.fetchGitHubJSON;

  /* ---------- GitHub 用户信息 ----------
     与仓库卡片（repo.js enrichProject）行为一致：本地数据优先，
     GitHub API 只在可用时后台覆盖更新（成功覆盖，失败保留本地）。 */
  var FALLBACK_PROFILE = {
    name: "Xander Xiao",
    bio: "没招了没招了没招了",
    location: "China",
    company: null,
    followers: 8,
    public_repos: 6
  };

  /* 本地数据（高优）：直接返回内置 FALLBACK_PROFILE，页面秒开 */
  function fetchLocalProfile() {
    var p = Object.assign({}, FALLBACK_PROFILE);
    p.avatar = GITHUB_AVATAR;
    p.html_url = GITHUB_HOME;
    return Promise.resolve(p);
  }
  global.fetchLocalProfile = fetchLocalProfile;

  /* GitHub API 更新：成功返回最新数据覆盖本地；断流/限流/报错返回 null 保留本地 */
  function fetchGitHubProfile() {
    return fetchGitHubJSON(GITHUB_API, "profile").then(function (data) {
      var p = {
        name: data.name || FALLBACK_PROFILE.name,
        bio: data.bio || FALLBACK_PROFILE.bio,
        location: data.location || FALLBACK_PROFILE.location,
        company: data.company || FALLBACK_PROFILE.company,
        avatar: GITHUB_AVATAR,
        html_url: GITHUB_HOME,
        followers: data.followers || 0,
        public_repos: data.public_repos || 0
      };
      return p;
    }).catch(function (err) {
      console.warn("[profile] GitHub API 不可用，保留本地数据：", err);
      return null;
    });
  }
  global.fetchGitHubProfile = fetchGitHubProfile;

  /* ---------- 精选文档 数据加载 ---------- */
  function fetchStarDocs() {
    return utils.fetchJSON(root() + "docs/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] docs/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarDocs = fetchStarDocs;

  /* ---------- 精选分享 数据加载 ---------- */
  function fetchStarShares() {
    return utils.fetchJSON(root() + "share/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] share/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarShares = fetchStarShares;

  /* ---------- 精选文档 卡片渲染（纯 DOM） ----------
     selector: 挂载点选择器
     list:     精选 wiki 数组 [{ url, title, excerpt }]
     perRow:   每行列数（默认 2）
  ---------- */
  function wikiCardHTML(item) {
    var href = utils.escapeHTML(item.url || "#");
    return '<article class="card wiki-card">' +
      '<div class="wc-title">' + utils.escapeHTML(item.title || "") + "</div>" +
      '<div class="wc-excerpt">' + utils.escapeHTML(item.excerpt || "") + "</div>" +
      '<div class="wc-actions">' +
        '<a class="btn btn-primary" href="' + href + '">查看</a>' +
      "</div>" +
    "</article>";
  }

  function mountWikiCards(selector, list, perRow, maxItems) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = (list || []).slice(0, maxItems || perRow || 2);
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无精选文档。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(wikiCardHTML).join("") + "</div>";
  }
  global.mountWikiCards = mountWikiCards;

  /* ---------- 精选留言数据加载 ----------
     guestbook/star.json 存放精选留言的 id 数组，例如：[1, 5, 12]
     渲染时按 id 调 /api/guestbook?ids= 从 D1 数据库批量获取。 */
  function fetchStarGuestbook() {
    return utils.fetchJSON(root() + "guestbook/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] guestbook/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarGuestbook = fetchStarGuestbook;

  /* 卡片渲染复用 gb-card.js 的 window.GBCard（与留言板一致） */

  /* 精选留言卡片渲染（纯 DOM）
     selector: 挂载点选择器
     list:     star.json 内容（留言 id 数字数组） */
  function mountGuestbookCards(selector, list) {
    var box = document.querySelector(selector);
    if (!box) return;
    var ids = (list || []).filter(function (n) { return typeof n === "number" && n > 0; });
    if (!ids.length) {
      box.innerHTML = '<div class="status-box">暂无精选留言。</div>';
      return;
    }
    box.innerHTML = '<div class="status-box">加载中…</div>';
    fetch("/api/guestbook?ids=" + ids.join(",")).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var valid = (data && data.list) || [];
      if (!valid.length) {
        box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
        return;
      }
      box.innerHTML = '<div class="guestbook-wall">' +
        valid.map(global.GBCard.gbCardHTML).join("") + "</div>";
      global.GBCard.setupClamp(box);
    }).catch(function () {
      box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
    });
  }
  global.mountGuestbookCards = mountGuestbookCards;
})(window);
