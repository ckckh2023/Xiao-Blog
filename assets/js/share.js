/* ============================================================
   share.js - 分享页专属逻辑
   功能：分享列表加载、星标卡片渲染、相关文档/下载选择弹窗
   依赖：common.js（Utils / root）
   加载页面：/share/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 软件列表（格式见 /share/SoftWareList.json） */
  function fetchShareList() {
    return utils.fetchJSON(root() + "share/SoftWareList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[share] SoftWareList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchShareList = fetchShareList;

  /* 其他列表（格式见 /share/OtherList.json） */
  function fetchOtherList() {
    return utils.fetchJSON(root() + "share/OtherList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[share] OtherList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchOtherList = fetchOtherList;

  /* ---------- 状态 LED ---------- */
  function statusInfo(s) {
    if (s === "active") return { cls: "sc-status-active", label: "活跃更新中" };
    if (s === "deprecated") return { cls: "sc-status-deprecated", label: "已停更/已废弃" };
    return { cls: "sc-status-unknown", label: "状态未知" };
  }

  /* ---------- 主按钮：优先主页，次仓库，都没有则灰色 ---------- */
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

  /* 相关文档按钮（blogs 非空才渲染） */
  function docsBtn(idx) {
    return '<button class="btn" type="button" data-action="blogs" data-index="' + idx + '">相关文档</button>';
  }

  /* 下载按钮（installType 非空才渲染） */
  function downloadBtn(idx) {
    return '<button class="btn" type="button" data-action="install" data-index="' + idx + '">下载</button>';
  }

  /* ---------- 选择弹窗 ----------
     title: 弹窗标题；items: [{ title, url }]
     点击选择项跳转 url（新窗口）；点遮罩空白 / 关闭按钮 / ESC 关闭 */
  function openSelectDialog(title, items) {
    var old = document.getElementById("sc-dialog");
    if (old) old.remove();

    var listHTML = items.map(function (it) {
      var u = utils.escapeHTML(it.url || "");
      return '<a class="sc-dialog-item" href="' + u + '" target="_blank" rel="noopener">' +
        '<div class="sc-dialog-item-title">' + utils.escapeHTML(it.title || it.url || "") + "</div>" +
        '<div class="sc-dialog-item-url">' + u + "</div>" +
      "</a>";
    }).join("");

    var mask = document.createElement("div");
    mask.id = "sc-dialog";
    mask.className = "sc-dialog-mask";
    mask.innerHTML =
      '<div class="sc-dialog" role="dialog" aria-modal="true">' +
        '<button class="sc-dialog-close" type="button" aria-label="关闭">✕</button>' +
        '<div class="sc-dialog-title">' + utils.escapeHTML(title) + "</div>" +
        '<div class="sc-dialog-list">' + listHTML + "</div>" +
      "</div>";
    document.body.appendChild(mask);

    function close() { mask.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    mask.addEventListener("click", function (e) {
      if (e.target === mask) { close(); return; }                       /* 点遮罩空白 */
      if (e.target.closest(".sc-dialog-close")) { close(); return; }    /* 关闭按钮 */
      if (e.target.closest(".sc-dialog-item")) { close(); return; }     /* 选择项跳转后关闭 */
    });
    document.addEventListener("keydown", onKey);
  }

  /* 多元素按钮处理：1 个直接跳转，多个弹窗 */
  function handleMulti(arr, title) {
    if (!Array.isArray(arr) || !arr.length) return;
    if (arr.length === 1) {
      window.open(arr[0].url, "_blank", "noopener");
      return;
    }
    openSelectDialog(title, arr);
  }

  /* ---------- 卡片渲染（纯 DOM） ---------- */
  function shareCardHTML(item, idx) {
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

    /* 左下角：访问主页 + 相关文档（blogs 非空才显示）；右下角：下载（installType 非空才显示） */
    var docsHTML = (Array.isArray(item.blogs) && item.blogs.length) ? docsBtn(idx) : "";
    var dlHTML = (Array.isArray(item.installType) && item.installType.length) ? downloadBtn(idx) : "";

    return '<article class="card share-card">' +
      '<span class="sc-status ' + st.cls + '" title="' + utils.escapeHTML(st.label) +
        '" aria-label="' + utils.escapeHTML(st.label) + '"></span>' +
      '<div class="sc-header">' + iconNode +
        '<div class="sc-name">' + utils.escapeHTML(name) + "</div>" +
      "</div>" +
      '<div class="sc-desc">' + desc + "</div>" +
      tagsHTML +
      '<div class="sc-actions">' +
        '<div class="sc-actions-left">' +
          primaryBtn(item) +
          docsHTML +
        "</div>" +
        dlHTML +
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
    box._shareItems = items; /* 供事件委托读取，每次渲染刷新 */
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(function (item, idx) { return shareCardHTML(item, idx); }).join("") + "</div>";

    /* 事件委托仅绑定一次，避免重渲染累积监听器 */
    if (!box._shareBound) {
      box.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-action]");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-index"), 10);
        var item = (box._shareItems || [])[idx];
        if (!item) return;
        var action = btn.getAttribute("data-action");
        if (action === "blogs") handleMulti(item.blogs, "选择相关文档");
        else if (action === "install") handleMulti(item.installType, "选择下载方式");
      });
      box._shareBound = true;
    }
  }
  global.mountShareGrid = mountShareGrid;
})(window);
