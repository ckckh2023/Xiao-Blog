/* ============================================================
   guestbook.js - 留言板专属逻辑
   功能：留言墙卡片渲染（读取 GitHub Issue 评论）、Gitalk 发布入口
   数据模型：所有留言保存为仓库里一个固定 GitHub Issue 的评论，
            该 Issue 由标签「留言」+ id「guestbook」定位（与 Gitalk 规则一致），
            发布经 Gitalk 完成，发布后通过监听自动刷新留言墙。
   依赖：common.js（Utils / fetchGitHubJSON / showNotice）+ Gitalk 库
   加载页面：/guestbook/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;

  /* ---------- 配置：按需修改 ---------- */
  var GB_OWNER = "ckckh2023";          /* 仓库所有者 */
  var GB_REPO = "ckckh2023.github.io"; /* 存放留言 Issue 的仓库 */
  var GB_LABEL = "留言";               /* 留言 Issue 的标签（需与 Gitalk labels 保持一致） */
  var GB_ID = "guestbook";             /* 留言线程唯一标识（Gitalk 会把它作为附加标签） */
  var GB_TITLE = "访客留言板";          /* 留言 Issue 的标题 */
  var GB_PER_PAGE = 100;

  /* GitHub OAuth App 凭据（发布留言需要，Gitalk 用于登录授权）。
     在 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App 创建：
       Homepage URL：https://xiao-blog.top/
       Authorization callback URL：https://xiao-blog.top/guestbook/index.html
     然后把生成的 Client ID / Client Secret 填到下面两项。 */
  var GB_CLIENT_ID = "Ov23lixDSaNCGWLDq6sI";
  var GB_CLIENT_SECRET = "211191956e7f65f3f44b2965bf00fac8a1c04701";

  var GB_API = "https://api.github.com/repos/" + GB_OWNER + "/" + GB_REPO;
  var LABEL_SEARCH_URL = "https://github.com/" + GB_OWNER + "/" + GB_REPO +
    "/issues?q=is%3Aissue+label%3A" + encodeURIComponent(GB_LABEL);

  var wallBox = null;
  var moreLink = null;

  function isConfigured() {
    return GB_CLIENT_ID.indexOf("YOUR_") !== 0 && GB_CLIENT_SECRET.indexOf("YOUR_") !== 0;
  }

  /* 格式化时间：ISO → YYYY-MM-DD HH:mm（本地时区） */
  function formatTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* 渲染留言正文：转义 → 链接化 → 换行转 <br> */
  function renderBody(text) {
    var s = utils.escapeHTML(text || "");
    s = s.replace(/(https?:\/\/[^\s<>"']+)/g, function (m) {
      return '<a href="' + m + '" target="_blank" rel="noopener">' + m + "</a>";
    });
    s = s.replace(/\r?\n/g, "<br>");
    return s;
  }

  /* 留言卡片 HTML（风格与好友卡片一致） */
  function gbCardHTML(c) {
    var login = (c.user && c.user.login) || "匿名";
    var avatar = (c.user && c.user.avatar_url) || "";
    var time = formatTime(c.created_at);
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
      '<div class="gb-body">' + renderBody(c.body) + "</div>" +
    "</article>";
  }

  function mountWall(list) {
    if (!wallBox) return;
    var items = list || [];
    if (!items.length) {
      wallBox.innerHTML = '<div class="status-box">还没有留言，登录 GitHub 账号后在上方写下第一条吧。</div>';
      return;
    }
    /* 最新留言在前 */
    var sorted = items.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    wallBox.innerHTML = '<div class="guestbook-wall">' +
      sorted.map(gbCardHTML).join("") + "</div>";
  }

  /* 定位留言线程 Issue（与 Gitalk 规则一致：按「标签 + id」的 labels 查询，取第一个） */
  function findIssue() {
    var labels = encodeURIComponent([GB_LABEL, GB_ID].join(","));
    return global.fetchGitHubJSON(
      GB_API + "/issues?labels=" + labels + "&state=all&per_page=" + GB_PER_PAGE,
      "gb_issue_" + labels
    ).then(function (list) {
      var arr = (list || []).filter(function (i) { return !i.pull_request; });
      return arr.length ? arr[0] : null;
    }).catch(function () { return null; });
  }

  function fetchComments(number) {
    return global.fetchGitHubJSON(
      GB_API + "/issues/" + number + "/comments?per_page=" + GB_PER_PAGE,
      "gb_comments_" + number
    ).then(function (list) { return list || []; })
    .catch(function () { return []; });
  }

  /* 刷新留言墙：先定位 Issue，再拉取评论渲染 */
  function refreshWall() {
    findIssue().then(function (issue) {
      if (!issue) {
        mountWall([]);
        if (moreLink) moreLink.href = LABEL_SEARCH_URL;
        return;
      }
      if (moreLink) moreLink.href = issue.html_url || LABEL_SEARCH_URL;
      return fetchComments(issue.number).then(mountWall);
    });
  }

  /* 初始化 Gitalk：仅保留输入框作为发布入口 */
  function initGitalk() {
    var holder = document.getElementById("guestbook-form");
    if (!holder) return;
    if (!isConfigured()) {
      holder.innerHTML = '<div class="status-box">留言发布功能暂未配置 GitHub OAuth App，配置后可在此留言。</div>';
      return;
    }
    if (typeof global.Gitalk === "undefined") {
      holder.innerHTML = '<div class="status-box">留言组件加载失败，请刷新重试。</div>';
      return;
    }
    var gitalk = new global.Gitalk({
      clientID: GB_CLIENT_ID,
      clientSecret: GB_CLIENT_SECRET,
      repo: GB_REPO,
      owner: GB_OWNER,
      admin: [GB_OWNER],
      id: GB_ID,
      title: GB_TITLE,
      labels: [GB_LABEL],
      perPage: 10,
      distractionFreeMode: false,
      language: "zh-CN"
    });
    gitalk.render("guestbook-form");
  }

  /* 监听 Gitalk 渲染变化 → 防抖刷新留言墙（发布新留言后自动更新） */
  function watchForm() {
    var form = document.getElementById("guestbook-form");
    if (!form) return;
    var timer = null;
    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(refreshWall, 600);
    });
    observer.observe(form, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wallBox = document.getElementById("guestbook-wall");
    moreLink = document.getElementById("guestbook-more-link");
    if (!isConfigured()) {
      global.showNotice("留言功能需要 GitHub OAuth App 配置，请在 assets/js/guestbook.js 顶部填写 clientID / clientSecret。", { level: "warn", autoHide: 0 });
    }
    refreshWall();
    initGitalk();
    watchForm();
  });
})(window);