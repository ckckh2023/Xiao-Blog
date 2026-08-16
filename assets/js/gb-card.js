/* ============================================================
   gb-card.js - 留言卡片共享渲染
   被 guestbook.js（留言墙）与 home.js（首页精选留言）复用
   卡片展示：#id + 头像（QQ 头像或首字母 fallback）+ 昵称 + 时间 + Markdown 正文
   依赖：common.js（Utils.escapeHTML）+ marked + DOMPurify（运行时按需）
   ============================================================ */
(function (global) {
  "use strict";
  var utils = global.Utils;

  /* 格式化时间：ISO → YYYY-MM-DD HH:mm（本地时区） */
  function formatTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* 渲染留言正文：marked 解析 Markdown + DOMPurify 消毒；
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

  /* 留言卡片 HTML
     数据结构：{ id, nickname, body, avatar, created_at }
     结构：#id（右上角徽章） + 头像 | (昵称 / 时间) / Markdown 正文 */
  function gbCardHTML(c) {
    var hasId = c.id != null && c.id !== "";
    var name = c.nickname || "匿名";
    var avatar = c.avatar || "";
    var time = formatTime(c.created_at);
    var initial = (name.charAt(0) || "?").toUpperCase();

    /* 头像节点：有 URL 用 <img>（加载失败回退首字母），无 URL 直接首字母 */
    var avatarNode = avatar
      ? '<img class="gb-avatar" src="' + utils.escapeHTML(avatar) + '" alt="' +
          utils.escapeHTML(name) + '" loading="lazy" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="gb-avatar-fallback" style="display:none">' + utils.escapeHTML(initial) + "</div>"
      : '<div class="gb-avatar-fallback">' + utils.escapeHTML(initial) + "</div>";

    /* #id 徽章（右上角绝对定位） */
    var idBadge = hasId ? '<span class="gb-id">#' + utils.escapeHTML(String(c.id)) + "</span>" : "";

    return '<article class="card gb-card">' +
      idBadge +
      '<div class="gb-header">' + avatarNode +
        '<div class="gb-meta">' +
          '<div class="gb-name">' + utils.escapeHTML(name) + "</div>" +
          '<div class="gb-time">' + utils.escapeHTML(time) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="gb-body">' + renderBody(c.body) + "</div>" +
    "</article>";
  }

  global.GBCard = { formatTime: formatTime, renderBody: renderBody, gbCardHTML: gbCardHTML };
})(window);
