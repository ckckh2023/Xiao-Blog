/* ============================================================
   share.js - 分享页专属逻辑
   功能：分享列表加载、工具/项目卡片渲染
   依赖：common.js（Utils / root）
   加载页面：/share/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 分享列表（格式见 /share/ShareList.json） */
  function fetchShareList() {
    return utils.fetchJSON(root() + "share/ShareList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[share] ShareList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchShareList = fetchShareList;

  /* ---------- 状态 LED ---------- */
  function statusInfo(s) {
    if (s === "active") return { cls: "sc-status-active", label: "活跃更新中" };
    if (s === "deprecated") return { cls: "sc-status-deprecated", label: "已停更/已废弃" };
    return { cls: "sc-status-unknown", label: "状态未知" };
  }

  /* ---------- 主按钮：只展示一个，优先主页，次仓库，都没有则灰色 ----------
     有 officialUrl → "访问主页"（主样式）；否则有 repoUrl → "访问仓库"；都没有灰色禁用 */
  function primaryBtn(item) {
    if (item.officialUrl) {
      return '<a class="btn btn-primary" href="' + utils.escapeHTML(item.officialUrl) +
        '" target="_blank" rel="noopener">访问主页</a>';
    }
    if (item.repoUrl) {
      return '<a class="btn" href="' + utils.escapeHTML(item.repoUrl) +
        '" target="_blank" rel="noopener">访问仓库</a>';
    }
    return '<button class="btn disabled" type="button" disabled>访问主页</button>';
  }

  /* 下载按钮：installType 三态
     null      → 无安装包，不显示
     "manual"  → 需手动下载，灰色禁用
     "https://"→ 直链下载 */
  function downloadBtn(item) {
    var t = item.installType;
    if (t == null) return "";
    if (t === "manual") {
      return '<button class="btn disabled" type="button" disabled>手动下载</button>';
    }
    return '<a class="btn" href="' + utils.escapeHTML(t) +
      '" target="_blank" rel="noopener">下载</a>';
  }

  /* ---------- 卡片渲染（纯 DOM） ---------- */
  function shareCardHTML(item) {
    var name = item.name || item.id || "";
    var initial = (name.charAt(0) || "?").toUpperCase();
    var desc = utils.escapeHTML(item.description || "");
    var st = statusInfo(item.status);

    /* 图标节点：有 iconUrl 用 img（onerror 回退首字母方块）；无则直接首字母方块 */
    var iconNode;
    if (item.iconUrl) {
      iconNode =
        '<img class="sc-icon" src="' + utils.escapeHTML(item.iconUrl) + '" alt="' +
          utils.escapeHTML(name) + '" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="sc-icon-fallback" style="display:none">' + utils.escapeHTML(initial) + "</div>";
    } else {
      iconNode = '<div class="sc-icon-fallback">' + utils.escapeHTML(initial) + "</div>";
    }

    /* 标签：仅展示 tags 数组，category（software/other）不在卡片上展示 */
    var tagsHTML = "";
    if (Array.isArray(item.tags) && item.tags.length) {
      tagsHTML = '<div class="sc-tags">' +
        item.tags.map(function (t) {
          return '<span class="sc-tag">' + utils.escapeHTML(t) + "</span>";
        }).join("") + "</div>";
    }

    return '<article class="card share-card">' +
      '<span class="sc-status ' + st.cls + '" title="' + utils.escapeHTML(st.label) +
        '" aria-label="' + utils.escapeHTML(st.label) + '"></span>' +
      '<div class="sc-header">' + iconNode +
        '<div class="sc-name">' + utils.escapeHTML(name) + "</div>" +
      "</div>" +
      '<div class="sc-desc">' + desc + "</div>" +
      tagsHTML +
      '<div class="sc-actions">' +
        primaryBtn(item) +
        downloadBtn(item) +
      "</div>" +
    "</article>";
  }

  function mountShareGrid(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = list || [];
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无分享。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(shareCardHTML).join("") + "</div>";
  }
  global.mountShareGrid = mountShareGrid;
})(window);
