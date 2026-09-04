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

  /* ---------- 平台图标（全部纯色跟随 currentColor，自动适配深色模式） ---------- */
  var PLATFORM_ICONS = {
    "Windows": '<svg viewBox="0 0 88 88" fill="currentColor" aria-hidden="true"><path d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z"/></svg>',
    "macOS": '<svg viewBox="4 4 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M44 38V10C44 8.89543 43.1046 8 42 8H6C4.89543 8 4 8.89543 4 10V38C4 39.1046 4.89543 40 6 40H42C43.1046 40 44 39.1046 44 38Z"/><path d="M25 8C25 8 20 18 21 25H27L28 40"/><path d="M34 40H22"/><path d="M30 8H18"/><path d="M34 16V18"/><path d="M14 16V18"/><path d="M13 29C13 29 17.1905 32 24 32C30.8095 32 35 29 35 29"/></svg>',
    "Linux": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"/></svg>',
    "Web": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/><ellipse cx="12" cy="12" rx="4.5" ry="9"/></svg>',
    "Android": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z"/></svg>',
    "iOS": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>'
  };

  /* ---------- 主按钮：优先主页，次仓库，都没有则灰色 ----------
     URL 可能是 null / 空串 / 字符串 "null"，统一视为不存在 */
  function isRealUrl(u) {
    return !!u && typeof u === "string" && u !== "null" && u.trim() !== "";
  }
  function primaryBtn(item) {
    if (isRealUrl(item.officialUrl)) {
      return '<a class="btn btn-primary" href="' + utils.escapeHTML(item.officialUrl) +
        '" target="_blank" rel="noopener">访问主页</a>';
    }
    if (isRealUrl(item.repoUrl)) {
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
    if (isRealUrl(item.iconUrl)) {
      iconNode =
        '<img class="sc-icon" src="' + utils.escapeHTML(item.iconUrl) + '" alt="' +
          utils.escapeHTML(name) + '" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="sc-icon-fallback" style="display:none">' + utils.escapeHTML(initial) + "</div>";
    } else {
      iconNode = '<div class="sc-icon-fallback">' + utils.escapeHTML(initial) + "</div>";
    }

    /* 平台图标行：展示 platforms 数组对应的 SVG 图标 */
    var platformsHTML = "";
    if (Array.isArray(item.platforms) && item.platforms.length) {
      platformsHTML = '<div class="sc-platforms">' +
        item.platforms.map(function (p) {
          var icon = PLATFORM_ICONS[p];
          return icon ? '<span class="sc-platform" data-platform="' + utils.escapeHTML(p) + '" title="' + utils.escapeHTML(p) + '">' + icon + "</span>" : "";
        }).join("") + "</div>";
    }

    /* 标签：仅展示 tags 数组，category（software/other）不在卡片上展示 */
    var tagsHTML = "";
    if (Array.isArray(item.tags) && item.tags.length) {
      tagsHTML = '<div class="sc-tags">' +
        item.tags.map(function (t) {
          return '<span class="sc-tag">' + utils.escapeHTML(t) + "</span>";
        }).join("") + "</div>";
    }

    /* 平台与标签合并为一行，中间用 | 分隔 */
    var metaHTML = "";
    if (platformsHTML || tagsHTML) {
      var sep = (platformsHTML && tagsHTML) ? '<span class="sc-meta-sep">|</span>' : "";
      metaHTML = '<div class="sc-meta">' + platformsHTML + sep + tagsHTML + "</div>";
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
      metaHTML +
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
