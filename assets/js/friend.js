/* ============================================================
   friend.js - 好友页专属逻辑
   功能：好友列表加载、好友卡片渲染
   依赖：common.js（Utils / root）
   加载页面：/friend/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 好友列表（格式：[{ id, avatar?, bio, url }]，avatar 缺失时以 ID 首字母占位） */
  function fetchFriendList() {
    return utils.fetchJSON(root() + "friend/FriendList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[friend] FriendList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchFriendList = fetchFriendList;

  /* ---------- 好友卡片渲染（纯 DOM） ----------
     selector: 挂载点选择器
     list:     好友数组 [{ id, avatar?, bio, url }]
     perRow:   每行列数（默认 2）
     头像缺失时以 ID 首字母占位；头像加载失败时回退到首字母占位。
  ---------- */
  function friendCardHTML(item) {
    var id = item.id || "";
    var initial = (id.charAt(0) || "?").toUpperCase();
    var bio = utils.escapeHTML(item.bio || "");
    var url = utils.escapeHTML(item.url || "#");

    /* 头像节点：有 avatar 用 img（onerror 回退首字母圆）；无 avatar 直接首字母圆 */
    var avatarNode;
    if (item.avatar) {
      avatarNode =
        '<img class="fc-avatar" src="' + utils.escapeHTML(item.avatar) + '" alt="' +
          utils.escapeHTML(id) + '" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="fc-avatar-fallback" style="display:none">' + utils.escapeHTML(initial) + "</div>";
    } else {
      avatarNode = '<div class="fc-avatar-fallback">' + utils.escapeHTML(initial) + "</div>";
    }

    return '<article class="card friend-card">' +
      '<div class="fc-header">' + avatarNode +
        '<div class="fc-id">' + utils.escapeHTML(id) + "</div>" +
      "</div>" +
      '<div class="fc-bio">' + bio + "</div>" +
      '<div class="fc-actions">' +
        '<a class="btn btn-primary" href="' + url + '" target="_blank" rel="noopener">访问主页</a>' +
      "</div>" +
    "</article>";
  }

  function mountFriendGrid(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = list || [];
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无好友。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(friendCardHTML).join("") + "</div>";
  }
  global.mountFriendGrid = mountFriendGrid;
})(window);
