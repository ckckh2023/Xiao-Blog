/* ============================================================
   home.js - 首页专属逻辑
   加载页面：/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;
  var GITHUB_API = global.GITHUB_API;
  var GITHUB_AVATAR = global.GITHUB_AVATAR;
  var GITHUB_HOME = global.GITHUB_HOME;
  var fetchGitHubJSON = global.fetchGitHubJSON;

  /* ---------- GitHub 用户信息 ---------- */
  var FALLBACK_PROFILE = {
    name: "Xander Xiao",
    bio: "没招了没招了没招了",
    location: "China",
    company: null,
    followers: 10,
    public_repos: 10
  };

  /* 本地数据高优先级 */
  function fetchLocalProfile() {
    var p = Object.assign({}, FALLBACK_PROFILE);
    p.avatar = GITHUB_AVATAR;
    p.html_url = GITHUB_HOME;
    return Promise.resolve(p);
  }
  global.fetchLocalProfile = fetchLocalProfile;

  /* GitHub API 更新 */
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

  /* ---------- 精选文档数据加载 ---------- */
  function fetchStarDocs() {
    return utils.fetchJSON(root() + "docs/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] docs/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarDocs = fetchStarDocs;

  /* ---------- 精选分享数据加载 ---------- */
  function fetchStarShares() {
    return utils.fetchJSON(root() + "share/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] share/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarShares = fetchStarShares;

  /* ---------- 精选文档卡片渲染 ----------
     selector: 挂载点选择器
     list:     精选文档数组
     perRow:   每行列数 */
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

  /* ---------- 精选留言数据加载 ---------- */
  function fetchStarGuestbook() {
    return utils.fetchJSON(root() + "guestbook/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] guestbook/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarGuestbook = fetchStarGuestbook;

  /* 精选留言卡片渲染
     selector: 挂载点选择器
     list:     star.json 内容 */
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
      box.innerHTML = '<div class="guestbook-wall">' + valid.map(function (c) { return global.GBCard.gbCardHTML(c, ""); }).join("") + "</div>";
      global.GBCard.setupClamp(box);
    }).catch(function () {
      box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
    });
  }
  global.mountGuestbookCards = mountGuestbookCards;
})(window);
