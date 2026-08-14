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

  function mountWikiCards(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = (list || []).slice(0, perRow || 2);
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
     guestbook/star.json 仅存放 GitHub issue comment 链接数组，例如：
       ["https://github.com/{owner}/{repo}/issues/1#issuecomment-{id}", ...]
     渲染时再按链接调 GitHub API 拉取单条评论内容（带 ETag 304 缓存）。 */
  function fetchStarGuestbook() {
    return utils.fetchJSON(root() + "guestbook/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] guestbook/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarGuestbook = fetchStarGuestbook;

  /* 解析 GitHub issue comment 链接 → { apiUrl, commentId }
     形如 https://github.com/{owner}/{repo}/issues/{n}#issuecomment-{id} */
  function parseGuestbookUrl(url) {
    var m = String(url || "").match(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/\d+#issuecomment-(\d+)$/
    );
    if (!m) return null;
    return {
      commentId: m[3],
      apiUrl: "https://api.github.com/repos/" + m[1] + "/" + m[2] +
        "/issues/comments/" + m[3]
    };
  }

  /* 拉取单条 issue comment（复用 fetchGitHubJSON 的 ETag 304 缓存，不计入速率限制） */
  function fetchGuestbookComment(url) {
    var info = parseGuestbookUrl(url);
    if (!info) return Promise.resolve(null);
    return global.fetchGitHubJSON(info.apiUrl, "gb_comment_" + info.commentId)
      .then(function (c) { return c && c.id ? c : null; })
      .catch(function () { return null; });
  }

  /* 格式化时间：ISO → YYYY-MM-DD HH:mm（本地时区，与留言板一致） */
  function gbFormatTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* 渲染留言正文：marked 解析 Markdown + DOMPurify 消毒（与留言板一致）；
     marked 未加载时退化为 转义 → 链接化 → 换行转 <br> */
  function gbRenderBody(text) {
    var src = String(text == null ? "" : text);
    var parse = window.marked && (window.marked.parse || window.marked);
    if (parse) {
      var html = "";
      try { html = parse(src); } catch (e) { html = ""; }
      if (html) {
        if (window.DOMPurify) html = window.DOMPurify.sanitize(html);
        return html;
      }
    }
    var s = utils.escapeHTML(src);
    s = s.replace(/(https?:\/\/[^\s<>"']+)/g, function (m) {
      return '<a href="' + m + '" target="_blank" rel="noopener">' + m + "</a>";
    });
    s = s.replace(/\r?\n/g, "<br>");
    return s;
  }

  /* 留言卡片 HTML（复用留言板 .card .gb-card 样式） */
  function gbCardHTML(c) {
    var login = (c.user && c.user.login) || "匿名";
    var avatar = (c.user && c.user.avatar_url) || "";
    var time = gbFormatTime(c.created_at);
    var initial = (login.charAt(0) || "?").toUpperCase();
    var avatarNode = avatar
      ? '<img class="gb-avatar" src="' + utils.escapeHTML(avatar) + '" alt="' +
          utils.escapeHTML(login) + '" loading="lazy" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="gb-avatar-fallback" style="display:none">' + utils.escapeHTML(initial) + "</div>"
      : '<div class="gb-avatar-fallback">' + utils.escapeHTML(initial) + "</div>";

    return '<article class="card gb-card">' +
      '<div class="gb-header">' + avatarNode +
        '<div class="gb-meta">' +
          '<div class="gb-name">' + utils.escapeHTML(login) + "</div>" +
          '<div class="gb-time">' + utils.escapeHTML(time) + "</div>" +
        "</div>" +
        '<a class="gb-link" href="' + utils.escapeHTML(c.html_url || "#") +
          '" target="_blank" rel="noopener">查看 »</a>' +
      "</div>" +
      '<div class="gb-body">' + gbRenderBody(c.body) + "</div>" +
    "</article>";
  }

  /* 精选留言卡片渲染（纯 DOM）
     selector: 挂载点选择器
     list:     star.json 内容（字符串数组或 {url} 对象数组） */
  function mountGuestbookCards(selector, list) {
    var box = document.querySelector(selector);
    if (!box) return;
    var urls = (list || []).map(function (it) {
      return typeof it === "string" ? it : (it && it.url) || "";
    }).filter(Boolean);
    if (!urls.length) {
      box.innerHTML = '<div class="status-box">暂无精选留言。</div>';
      return;
    }
    box.innerHTML = '<div class="status-box">加载中…</div>';
    Promise.all(urls.map(fetchGuestbookComment)).then(function (comments) {
      var valid = comments.filter(Boolean);
      if (!valid.length) {
        box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
        return;
      }
      box.innerHTML = '<div class="guestbook-wall">' +
        valid.map(gbCardHTML).join("") + "</div>";
    });
  }
  global.mountGuestbookCards = mountGuestbookCards;
})(window);
