/* ============================================================
   docs.js - Wiki 子系统
   功能：DocsList 加载、侧边栏渲染、上下页分页、文章详情页初始化、
         Markdown 正文渲染
   依赖：common.js（Utils / root）
   加载页面：/docs/index.html、/docs/article.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  var DOCS_BASE = root() + "docs/";
  var DOCS_LIST_URL = DOCS_BASE + "DocsList.json";
  var docsListCache = null;

  function fetchDocsList() {
    if (docsListCache) return Promise.resolve(docsListCache);
    return utils.fetchJSON(DOCS_LIST_URL).then(function (list) {
      docsListCache = list || [];
      return docsListCache;
    }).catch(function (err) {
      console.warn("[docs] DocsList.json 加载失败：", err);
      docsListCache = [];
      return docsListCache;
    });
  }
  global.fetchDocsList = fetchDocsList;

  /* 渲染左侧目录侧边栏；currentId 为当前一级 id，currentSub 为当前二级 id（目录页均可传 null）
     有 children 的一级：整行（标题+图标）点击折叠/展开，默认全部折叠 */
  function renderSidebar(currentId, currentSub) {
    var holder = document.getElementById("docs-sidebar");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var TOGGLE_SVG = '<svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M4 2L10 6L4 10Z"/></svg>';
      var html = "<h3>目录</h3>";
      list.forEach(function (it) {
        if (it.children && it.children.length) {
          var isActive = (currentId === it.id);
          var groupActive = isActive ? " sidebar-group-active" : "";
          /* 在分支里（当前组）展开，不在分支里折叠；目录页无当前章节则全折叠 */
          var collapsed = isActive ? "" : " collapsed";
          var expanded = isActive ? "true" : "false";
          html += '<div class="sidebar-group' + groupActive + collapsed + '">' +
            '<div class="sidebar-group-header" role="button" tabindex="0" aria-expanded="' + expanded + '">' +
              '<span class="sidebar-group-title">' + utils.escapeHTML(it.title) + "</span>" +
              '<span class="sidebar-toggle" aria-hidden="true">' + TOGGLE_SVG + "</span>" +
            "</div>" +
            '<div class="sidebar-sub">';
          it.children.forEach(function (c) {
            var href = docHref(it.id, c.id);
            var cls = "sidebar-link sidebar-sub-link";
            if (currentId === it.id && currentSub === c.id) cls += " active";
            html += '<a class="' + cls + '" href="' + href + '">' +
              utils.escapeHTML(c.title) + "</a>";
          });
          html += "</div></div>";
        } else {
          var href = docHref(it.id);
          var cls = "sidebar-link";
          if (currentId === it.id) cls += " active";
          html += '<a class="' + cls + '" href="' + href + '">' +
            utils.escapeHTML(it.title) + "</a>";
        }
      });
      holder.innerHTML = html;
      /* 折叠/展开：点整行（标题或图标）或键盘 Enter/Space 切换（仅绑定一次） */
      if (!holder.__sidebarToggleBound) {
        var toggleGroup = function (group) {
          var isCollapsed = group.classList.toggle("collapsed");
          var header = group.querySelector(".sidebar-group-header");
          if (header) header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        };
        holder.addEventListener("click", function (e) {
          var header = e.target.closest(".sidebar-group-header");
          if (!header) return;
          var group = header.closest(".sidebar-group");
          if (group) toggleGroup(group);
        });
        holder.addEventListener("keydown", function (e) {
          if (e.key !== "Enter" && e.key !== " ") return;
          var header = e.target.closest(".sidebar-group-header");
          if (!header) return;
          e.preventDefault();
          var group = header.closest(".sidebar-group");
          if (group) toggleGroup(group);
        });
        holder.__sidebarToggleBound = true;
      }
    });
  }
  global.renderSidebar = renderSidebar;

  /* 渲染上一页/下一页按钮到 #pagination
     将 DocsList 展开为扁平序列（二级章节展开为独立节点），按当前位置前后切换；
     二级到边界时自然跨到相邻一级，实现章节间连续分页。 */
  function renderPagination(currentId, currentSub) {
    var holder = document.getElementById("pagination");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var seq = flattenDocsSequence(list);
      var idx = -1;
      for (var i = 0; i < seq.length; i++) {
        if (seq[i].id === currentId && seq[i].sub === (currentSub || null)) {
          idx = i; break;
        }
      }
      if (idx === -1) { holder.innerHTML = ""; return; }

      var prev = idx > 0 ? seq[idx - 1] : null;
      var next = idx < seq.length - 1 ? seq[idx + 1] : null;

      function btnHTML(node, type) {
        if (!node) {
          var label = type === "prev" ? "已是第一篇" : "已是最后一篇";
          return '<div class="page-btn ' + type + ' disabled">' +
            '<span class="label">' + label + "</span>" +
            '<span class="title">—</span></div>';
        }
        var arrow = type === "prev" ? "← " : " →";
        var labelText = type === "prev" ? "上一页" : "下一页";
        var href = docHref(node.id, node.sub);
        var display = node.parent ? (node.parent + " · " + node.title) : node.title;
        return '<a class="page-btn ' + type + '" href="' + href + '">' +
          '<span class="label">' + labelText + "</span>" +
          '<span class="title">' + arrow + utils.escapeHTML(display) + "</span></a>";
      }

      holder.innerHTML =
        btnHTML(prev, "prev") +
        '<div class="page-divider"></div>' +
        btnHTML(next, "next");
    });
  }
  global.renderPagination = renderPagination;

  /* 文章详情页链接：/docs/article.html?id=xxx[&sub=yyy]
     sub 为二级章节 id；单层文章不传 sub */
  function docHref(id, sub) {
    var base = DOCS_BASE + "article.html?id=" + encodeURIComponent(id);
    if (sub) base += "&sub=" + encodeURIComponent(sub);
    return base;
  }
  global.docHref = docHref;

  /* 按 id 在 DocsList 中查找一级条目 */
  function findDocEntry(id) {
    return docsListCache.filter(function (it) { return it.id === id; })[0];
  }

  /* 将 DocsList 展开为扁平分页序列：
     无 children 的一级 → { id, sub: null, title, parent: null }
     有 children 的一级 → 每个 child → { id, sub, title, parent: 一级title } */
  function flattenDocsSequence(list) {
    var seq = [];
    (list || []).forEach(function (it) {
      if (it.children && it.children.length) {
        it.children.forEach(function (c) {
          seq.push({ id: it.id, sub: c.id, title: c.title, parent: it.title });
        });
      } else {
        seq.push({ id: it.id, sub: null, title: it.title, parent: null });
      }
    });
    return seq;
  }

  /* 文章模板页初始化：按 ?id=（&sub=）渲染标题、面包屑、正文、侧边栏 + 分页
     - 一级有 children 且未传 sub → 重定向到第一个子章节
     - 二级章节 → 加载 docs/{id}/{sub}/index.md，标题"子标题 - 一级标题"
     - 单层文章 → 加载 docs/{id}/index.md（向后兼容） */
  function initArticlePage() {
    var query = new URLSearchParams(window.location.search);
    var id = query.get("id") || "";
    var sub = query.get("sub") || "";
    if (!id) {
      window.location.replace(DOCS_BASE + "index.html");
      return;
    }
    return fetchDocsList().then(function (list) {
      var entry = findDocEntry(id);

      /* 一级有 children 且未指定 sub → 跳第一个子章节 */
      if (entry && entry.children && entry.children.length && !sub) {
        window.location.replace(docHref(id, entry.children[0].id));
        return;
      }

      var title = id;
      var parentTitle = null;
      var mdUrl;
      if (entry && entry.children && entry.children.length && sub) {
        /* 二级章节 */
        var child = entry.children.filter(function (c) { return c.id === sub; })[0];
        if (child) title = child.title;
        parentTitle = entry.title;
        mdUrl = DOCS_BASE + id + "/" + sub + "/index.md";
      } else {
        /* 单层文章 */
        if (entry) title = entry.title;
        mdUrl = DOCS_BASE + id + "/index.md";
      }

      document.title = parentTitle
        ? (title + " - " + parentTitle + " - ckckh2023 Wiki")
        : (title + " - ckckh2023 Wiki");

      var h1 = document.getElementById("doc-title");
      if (h1) h1.textContent = title;

      /* 面包屑：一级标题 / 当前章节 */
      var breadcrumb = document.getElementById("doc-breadcrumb");
      if (breadcrumb) {
        if (parentTitle && entry && entry.children && entry.children.length) {
          breadcrumb.innerHTML =
            '<a href="' + docHref(id, entry.children[0].id) + '">' +
              utils.escapeHTML(parentTitle) + "</a>" +
            '<span class="breadcrumb-sep">/</span>' +
            '<span class="breadcrumb-current">' + utils.escapeHTML(title) + "</span>";
        } else {
          breadcrumb.innerHTML = "";
        }
      }

      return Promise.all([
        renderDocMarkdown("#doc-body", mdUrl),
        renderSidebar(id, sub || null),
        renderPagination(id, sub || null)
      ]);
    });
  }
  global.initArticlePage = initArticlePage;

  /* ---------- Markdown 正文渲染 ----------
     selector: 正文容器选择器
     mdUrl:    markdown 文件 URL（相对路径即可，如 ./index.md）
  ---------- */
  function renderDocMarkdown(selector, mdUrl) {
    var box = document.querySelector(selector);
    if (!box) return Promise.resolve();
    var parse = window.marked && (window.marked.parse || window.marked);
    if (!parse) {
      box.innerHTML = '<p class="status-box">Markdown 解析器未加载。</p>';
      return Promise.resolve();
    }
    return fetch(mdUrl).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (md) {
      box.innerHTML = parse(md);
    }).catch(function (err) {
      console.warn("[doc] markdown 加载失败 " + mdUrl + "：", err);
      box.innerHTML = '<p class="status-box">正文加载失败。</p>';
    });
  }
  global.renderDocMarkdown = renderDocMarkdown;
})(window);
