/* ============================================================
   home.js - 首页专属逻辑
   功能：GitHub 用户信息加载、精选 Wiki 卡片渲染
   依赖：common.js（Utils / fetchGitHubJSON / root）
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
    name: "ckckh2023",
    bio: "Full-stack Developer | AI Enthusiast",
    location: "Earth",
    company: null
  };

  function fetchGitHubProfile() {
    return fetchGitHubJSON(GITHUB_API, "profile").then(function (data) {
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

  /* ---------- 精选 Wiki 数据加载 ---------- */
  function fetchStarDocs() {
    return utils.fetchJSON(root() + "docs/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] docs/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarDocs = fetchStarDocs;

  /* ---------- 精选 Wiki 卡片渲染（纯 DOM） ----------
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
})(window);
