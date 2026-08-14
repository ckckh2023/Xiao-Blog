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
  var GB_ISSUE_URL = "https://github.com/" + GB_OWNER + "/" + GB_REPO + "/issues/1";
  var LABEL_SEARCH_URL = "https://github.com/" + GB_OWNER + "/" + GB_REPO +
    "/issues?q=is%3Aissue+label%3A" + encodeURIComponent(GB_LABEL);

  var wallBox = null;
  var moreLink = null;
  var gitalkInstance = null;   /* Gitalk 实例引用（用于合并其权威评论数据） */
  var wallData = [];           /* 当前已展示的留言列表 */

  /* ---------- 留言墙本地缓存 ----------
     留言变动慢，每次进页面都打 GitHub API 既慢又耗配额；
     进页面时优先用缓存即时展示，点"刷新留言"按钮才真正拉新。
     缓存 1 天后失效，过期视为无缓存。 */
  var GB_WALL_CACHE_KEY = "gb_wall";
  var GB_WALL_CACHE_TTL = 24 * 60 * 60 * 1000;
  function readWallCache() {
    try {
      var raw = localStorage.getItem(GB_WALL_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.list)) return null;
      if (Date.now() - (obj.t || 0) > GB_WALL_CACHE_TTL) return null;
      return obj.list;
    } catch (e) { return null; }
  }
  function writeWallCache(list) {
    try {
      localStorage.setItem(GB_WALL_CACHE_KEY, JSON.stringify({ t: Date.now(), list: list || [] }));
    } catch (e) {}
  }

  function isConfigured() {
    return GB_CLIENT_ID.indexOf("YOUR_") !== 0 && GB_CLIENT_SECRET.indexOf("YOUR_") !== 0;
  }

  /* GitHub API 认证头：用 OAuth App 的 clientID/clientSecret 作 Basic 认证，
     速率上限 5000 次/小时（与 Gitalk 内部请求一致），不受匿名 60 次/小时限流影响 */
  function ghHeaders() {
    if (!isConfigured()) return undefined;
    return { "Authorization": "Basic " + btoa(GB_CLIENT_ID + ":" + GB_CLIENT_SECRET) };
  }

  /* 格式化时间：ISO → YYYY-MM-DD HH:mm（本地时区） */
  function formatTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* 渲染留言正文：优先用 marked 解析 Markdown（与 GitHub 渲染一致，
     <br> 等原始 HTML 标签也会正常显示），再经 DOMPurify 消毒；
     marked 未加载时退化为 转义 → 链接化 → 换行转 <br> */
  function renderBody(text) {
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

  function mountWall(list, hasQuery) {
    if (!wallBox) return;
    var items = list || [];
    if (!items.length) {
      wallBox.innerHTML = '<div class="status-box">' +
        (hasQuery ? "未找到匹配的留言。" : "还没有留言，登录 GitHub 账号后在上方写下第一条吧。") +
        "</div>";
      return;
    }
    /* 最新留言在前 */
    var sorted = items.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    wallBox.innerHTML = '<div class="guestbook-wall">' +
      sorted.map(gbCardHTML).join("") + "</div>";
  }

  /* ---------- 留言搜索 ----------
     对留言者 login 与正文（Markdown 源文本）做子串匹配，大小写不敏感；
     wallQuery 为当前搜索词，applyWall 按 wallQuery 过滤 wallData 后渲染，
     setWall / mergeComments / 搜索框均通过 applyWall 统一出口，保证刷新后仍保留过滤。 */
  var wallQuery = "";
  function matchComment(c, q) {
    if (!q) return true;
    var login = (c.user && c.user.login) || "";
    var body = c.body || "";
    return String(login).toLowerCase().indexOf(q) !== -1 ||
           String(body).toLowerCase().indexOf(q) !== -1;
  }
  function applyWall() {
    var q = wallQuery.toLowerCase().trim();
    var list = wallData;
    if (q) list = wallData.filter(function (c) { return matchComment(c, q); });
    mountWall(list, !!q);
  }

  /* 记录并渲染留言墙数据 */
  function setWall(list) {
    wallData = (list || []).slice();
    applyWall();
  }

  /* 将 Gitalk 的权威评论数据合并进留言墙（按评论 id 去重）。
     Gitalk 用 OAuth 凭据拉取评论（5000 次/小时），不受匿名 API 限流影响，
     保证刚发布的留言即使匿名接口被限流也一定能显示出来。 */
  function mergeComments(extra) {
    if (!extra || !extra.length) return;
    var seen = {};
    wallData.forEach(function (c) { if (c && c.id) seen[c.id] = true; });
    var added = false;
    extra.forEach(function (c) {
      if (c && c.id && !seen[c.id]) {
        wallData.push(c);
        seen[c.id] = true;
        added = true;
      }
    });
    if (added) applyWall();
  }

  /* 定位留言线程 Issue（与 Gitalk 规则一致：按「标签 + id」的 labels 查询，取第一个） */
  function findIssue() {
    var labels = encodeURIComponent([GB_LABEL, GB_ID].join(","));
    return global.fetchGitHubJSON(
      GB_API + "/issues?labels=" + labels + "&state=all&per_page=" + GB_PER_PAGE,
      "gb_issue_" + labels,
      ghHeaders()
    ).then(function (list) {
      var arr = (list || []).filter(function (i) { return !i.pull_request; });
      return arr.length ? arr[0] : null;
    }).catch(function () { return null; });
  }

  function fetchComments(number) {
    return global.fetchGitHubJSON(
      GB_API + "/issues/" + number + "/comments?per_page=" + GB_PER_PAGE,
      "gb_comments_" + number,
      ghHeaders()
    ).then(function (list) { return list || []; })
    .catch(function () { return []; });
  }

  /* 刷新按钮转圈：进入/退出刷新状态（用计数防止并发调用提前关闭动画） */
  var refreshCount = 0;
  function setRefreshSpinning(on) {
    var btn = document.getElementById("guestbook-refresh");
    if (!btn) return;
    if (on) {
      refreshCount++;
      btn.classList.add("gb-refreshing");
      btn.disabled = true;
    } else {
      refreshCount = Math.max(0, refreshCount - 1);
      if (refreshCount === 0) {
        btn.classList.remove("gb-refreshing");
        btn.disabled = false;
      }
    }
  }

  /* 刷新留言墙：先定位 Issue，再拉取评论渲染；
     无论匿名 API 是否被限流，都合并 Gitalk 已有评论，保证最新留言可见。 */
  function refreshWall() {
    setRefreshSpinning(true);
    return findIssue().then(function (issue) {
      if (!issue) {
        /* Issue 尚未创建：若 Gitalk 已持有评论（如刚发过）则保留展示，否则显示空态 */
        if (!gitalkInstance || !gitalkInstance.state || !gitalkInstance.state.comments ||
            !gitalkInstance.state.comments.length) {
          setWall([]);
        } else {
          mergeComments(gitalkInstance.state.comments);
        }
        if (moreLink) moreLink.href = LABEL_SEARCH_URL;
        return;
      }
      if (moreLink) moreLink.href = issue.html_url || LABEL_SEARCH_URL;
      return fetchComments(issue.number).then(function (comments) {
        setWall(comments);
        writeWallCache(comments);
        if (gitalkInstance && gitalkInstance.state) {
          mergeComments(gitalkInstance.state.comments);
        }
      });
    }).catch(function () {
      /* findIssue / fetchComments 内部已做缓存兜底，这里只负责结束动画 */
    }).then(function () {
      setRefreshSpinning(false);
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
      perPage: GB_PER_PAGE,
      distractionFreeMode: false,
      language: "zh-CN"
    });
    gitalkInstance = gitalk;
    gitalk.render("guestbook-form");
  }

  /* 监听 Gitalk 渲染变化 → 防抖刷新留言墙（发布新留言后自动更新）；
     同时检测 Gitalk 的网络错误提示，追加一行环境提示 */
  var networkHintShown = false;
  function checkNetworkError() {
    var form = document.getElementById("guestbook-form");
    if (!form || networkHintShown) return;
    var err = form.querySelector(".gt-error");
    if (!err) return;
    var text = err.textContent || "";
    if (/Network Error/i.test(text)) {
      networkHintShown = true;
      var hint = document.createElement("div");
      hint.className = "gb-network-hint";
      hint.innerHTML = "无法连接到 GitHub Issue，可以尝试在这里直接发表留言：" +
        '<a class="gb-network-link" href="' + GB_ISSUE_URL +
        '" target="_blank" rel="noopener">网页链接</a>';
      err.insertAdjacentElement("afterend", hint);
    }
  }

  function watchForm() {
    var form = document.getElementById("guestbook-form");
    if (!form) return;
    var timer = null;
    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(refreshWall, 600);
      checkNetworkError();
    });
    observer.observe(form, { childList: true, subtree: true });
  }

  /* 清理 OAuth 残留：GitHub 登录失败/取消后地址栏可能留下空查询串（如 …index.html?），
     而 Gitalk 登录会把当前完整 URL 作为 redirect_uri，带着 ? 会反复触发
     "redirect_uri is not associated"，这里加载时自动抹掉（不影响带回 code 的正常回跳）。 */
  (function cleanOAuthResidue() {
    try {
      var href = location.href;
      if (href.charAt(href.length - 1) === "?" && !/code=/.test(location.search)) {
        history.replaceState(null, "", location.pathname + location.hash);
      }
    } catch (e) {}
  })();

  document.addEventListener("DOMContentLoaded", function () {
    wallBox = document.getElementById("guestbook-wall");
    moreLink = document.getElementById("guestbook-more-link");
    var refreshBtn = document.getElementById("guestbook-refresh");
    if (refreshBtn) refreshBtn.addEventListener("click", refreshWall);
    if (!isConfigured()) {
      global.showNotice("留言功能需要 GitHub OAuth App 配置，请在 assets/js/guestbook.js 顶部填写 clientID / clientSecret。", { level: "warn", autoHide: 0 });
    }
    var cached = readWallCache();
    if (cached) {
      setWall(cached);
    } else {
      refreshWall();
    }
    initGitalk();
    watchForm();

    /* 搜索框：对留言者 / 正文实时过滤，刷新留言后过滤仍保留 */
    mountSearchBox("#gb-search", {
      placeholder: "搜索留言…",
      onQuery: function (q) { wallQuery = q; applyWall(); }
    });
  });
})(window);