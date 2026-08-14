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

  /* ---------- SEO 元数据（OG / Twitter Card / canonical / JSON-LD） ----------
     文章页正文由 JS 运行时渲染，初始 <head> 仅有占位 meta；
     此处根据当前文章的标题 / 正文 / URL 动态补全社交分享与结构化数据，
     Googlebot 等支持 JS 的爬虫可在执行后抓到完整元信息。 */
  var SITE_ORIGIN = "https://xiao-blog.top";
  var SITE_AUTHOR = "ckckh2023";
  var SITE_AVATAR = "https://avatars.githubusercontent.com/ckckh2023";

  function setMetaAttr(selector, attr, value) {
    var el = document.head.querySelector(selector);
    if (!el) return;
    el.setAttribute(attr, value);
  }

  function upsertMeta(name, content) {
    var el = document.head.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function upsertJSONLD(obj) {
    var el = document.head.querySelector('script[type="application/ld+json"][data-seo="article"]');
    if (!el) {
      el = document.createElement("script");
      el.setAttribute("type", "application/ld+json");
      el.setAttribute("data-seo", "article");
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(obj);
  }

  function setArticleMeta(opt) {
    /* titlePath：从根到叶的标题数组，如 ["Github Pages 部署流程","github","概述"]；
       fullTitle 反向拼接，headline 取最末一级 */
    var titlePath = opt.titlePath && opt.titlePath.length ? opt.titlePath : [opt.title || ""];
    var headline = titlePath[titlePath.length - 1];
    var fullTitle = titlePath.slice().reverse().join(" - ") + " - ckckh2023 Wiki";
    document.title = fullTitle;
    upsertMeta("description", opt.description);

    setMetaAttr('meta[property="og:title"]', "content", fullTitle);
    setMetaAttr('meta[property="og:description"]', "content", opt.description);
    setMetaAttr('meta[property="og:url"]', "content", opt.url);
    setMetaAttr('meta[property="og:image"]', "content", opt.image || SITE_AVATAR);

    setMetaAttr('meta[name="twitter:title"]', "content", fullTitle);
    setMetaAttr('meta[name="twitter:description"]', "content", opt.description);
    setMetaAttr('meta[name="twitter:image"]', "content", opt.image || SITE_AVATAR);

    var canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", opt.url);

    upsertJSONLD({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": headline,
      "description": opt.description,
      "url": opt.url,
      "image": opt.image || SITE_AVATAR,
      "author": { "@type": "Person", "name": SITE_AUTHOR, "url": "https://github.com/" + SITE_AUTHOR },
      "publisher": { "@type": "Person", "name": SITE_AUTHOR, "url": "https://github.com/" + SITE_AUTHOR },
      "mainEntityOfPage": { "@type": "WebPage", "@id": opt.url }
    });
  }

  /* 从渲染后的正文容器提取首段纯文本作为摘要（最多 120 字） */
  function extractDescription(box) {
    if (!box) return "";
    var p = box.querySelector("p");
    var text = p ? p.textContent : box.textContent;
    text = (text || "").replace(/\s+/g, " ").trim();
    if (text.length > 120) text = text.slice(0, 120) + "…";
    return text;
  }

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

  /* 侧边栏折叠图标 */
  var SIDEBAR_TOGGLE_SVG = '<svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M4 2L10 6L4 10Z"/></svg>';

  function isPrefix(short, long) {
    if (!long || short.length > long.length) return false;
    for (var i = 0; i < short.length; i++) if (short[i] !== long[i]) return false;
    return true;
  }
  function idsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* 渲染左侧目录侧边栏；currentPath 为当前文章完整 id 路径（目录页传 null）
     有 children 的节点渲染为折叠组，在当前路径上的组默认展开，其余折叠 */
  function renderSidebar(currentPath) {
    var holder = document.getElementById("docs-sidebar");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var html = "<h3>目录</h3>";
      list.forEach(function (it) {
        html += renderSidebarNode(it, [], currentPath);
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

  /* 递归渲染侧边栏节点：
     node        当前节点
     parentIds   父路径 id 数组（不含 node.id）
     currentPath 当前文章完整 id 路径（目录页传 null）
     有 children → 折叠组（在当前路径上展开），内部递归渲染 children
     无 children → 叶子链接 */
  function renderSidebarNode(node, parentIds, currentPath) {
    var ids = parentIds.concat(node.id);
    var depth = parentIds.length;
    if (node.children && node.children.length) {
      var onPath = isPrefix(ids, currentPath);
      var collapsed = onPath ? "" : " collapsed";
      var expanded = onPath ? "true" : "false";
      var groupActive = onPath ? " sidebar-group-active" : "";
      var html = '<div class="sidebar-group sidebar-depth-' + depth + groupActive + collapsed + '">' +
        '<div class="sidebar-group-header" role="button" tabindex="0" aria-expanded="' + expanded + '">' +
          '<span class="sidebar-group-title">' + utils.escapeHTML(node.title) + "</span>" +
          '<span class="sidebar-toggle" aria-hidden="true">' + SIDEBAR_TOGGLE_SVG + "</span>" +
        "</div>" +
        '<div class="sidebar-sub">';
      node.children.forEach(function (c) {
        html += renderSidebarNode(c, ids, currentPath);
      });
      html += "</div></div>";
      return html;
    } else {
      var href = docHref(ids);
      var cls = "sidebar-link sidebar-depth-" + depth;
      if (idsEqual(ids, currentPath)) cls += " active";
      return '<a class="' + cls + '" href="' + href + '">' +
        utils.escapeHTML(node.title) + "</a>";
    }
  }

  /* 渲染上一页/下一页按钮到 #pagination
     将 DocsList 递归展平为叶子序列，按当前文章 id 路径定位前后；
     跨章节连续分页（三层亦然）。 */
  function renderPagination(currentPath) {
    var holder = document.getElementById("pagination");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var seq = flattenDocsSequence(list);
      var idx = -1;
      for (var i = 0; i < seq.length; i++) {
        if (idsEqual(seq[i].ids, currentPath)) { idx = i; break; }
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
        var href = docHref(node.ids);
        var display = node.titles.join(" · ");
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

  /* 文章详情页链接：ids 为 id 路径数组，如 ["deploy","github","overview"]
     → /docs/article.html?id=deploy&sub=github&sub2=overview
     单层 ["vue-guide"] → ?id=vue-guide；两层 ["deploy","overview"] → ?id=deploy&sub=overview */
  function docHref(ids) {
    var base = DOCS_BASE + "article.html?id=" + encodeURIComponent(ids[0]);
    if (ids[1]) base += "&sub=" + encodeURIComponent(ids[1]);
    if (ids[2]) base += "&sub2=" + encodeURIComponent(ids[2]);
    return base;
  }
  global.docHref = docHref;

  /* 沿 id 路径查找节点；返回该层节点或 null */
  function findNodeByPath(list, idPath) {
    var nodes = list;
    var node = null;
    for (var i = 0; i < idPath.length; i++) {
      node = (nodes || []).filter(function (n) { return n.id === idPath[i]; })[0];
      if (!node) return null;
      nodes = node.children;
    }
    return node;
  }

  /* 沿 id 路径收集标题数组；路径无效返回 null */
  function findTitlePath(list, idPath) {
    var nodes = list;
    var titles = [];
    for (var i = 0; i < idPath.length; i++) {
      var node = (nodes || []).filter(function (n) { return n.id === idPath[i]; })[0];
      if (!node) return null;
      titles.push(node.title);
      nodes = node.children;
    }
    return titles;
  }

  /* 从 node 沿第一个 child 递归到叶子，返回完整 id 路径；
     parentIds 为 node 的父路径（不含 node.id） */
  function firstLeafIds(node, parentIds) {
    var ids = parentIds.concat(node.id);
    if (node.children && node.children.length) {
      return firstLeafIds(node.children[0], ids);
    }
    return ids;
  }
  global.firstLeafIds = firstLeafIds;

  /* 将 DocsList 递归展平为叶子分页序列：
     每个叶子 → { ids: [...], titles: [...] }，均为从根到叶的路径
     有 children 的非叶子节点不进入序列（点击会重定向到其第一个叶子） */
  function flattenDocsSequence(list) {
    var seq = [];
    function walk(nodes, parentIds, parentTitles) {
      (nodes || []).forEach(function (n) {
        var ids = parentIds.concat(n.id);
        var titles = parentTitles.concat(n.title);
        if (n.children && n.children.length) {
          walk(n.children, ids, titles);
        } else {
          seq.push({ ids: ids, titles: titles });
        }
      });
    }
    walk(list, [], []);
    return seq;
  }

  /* 文章模板页初始化：按 ?id=[&sub][&sub2] 渲染标题、面包屑、正文、侧边栏 + 分页
     URL 层级：  单层 ?id=a          → docs/a/index.md
                两层 ?id=a&sub=b    → docs/a/b/index.md
                三层 ?id=a&sub=b&sub2=c → docs/a/b/c/index.md
     - 路径指向非叶子（有 children）→ 重定向到其第一个叶子
     - 路径无效 → 回目录页 */
  function initArticlePage() {
    var query = new URLSearchParams(window.location.search);
    var id = query.get("id") || "";
    var sub = query.get("sub") || "";
    var sub2 = query.get("sub2") || "";
    if (!id) {
      window.location.replace(DOCS_BASE + "index.html");
      return;
    }
    var idPath = [id];
    if (sub) idPath.push(sub);
    if (sub2) idPath.push(sub2);

    return fetchDocsList().then(function (list) {
      var node = findNodeByPath(list, idPath);
      if (!node) {
        window.location.replace(DOCS_BASE + "index.html");
        return;
      }
      /* 非叶子 → 重定向到第一个叶子 */
      if (node.children && node.children.length) {
        window.location.replace(docHref(firstLeafIds(node, idPath.slice(0, -1))));
        return;
      }

      /* 叶子文章 → 渲染 */
      var titlePath = findTitlePath(list, idPath) || [id];
      var title = titlePath[titlePath.length - 1];
      var mdUrl = DOCS_BASE + idPath.join("/") + "/index.md";
      var articleUrl = SITE_ORIGIN + docHref(idPath);

      setArticleMeta({
        titlePath: titlePath,
        description: "ckckh2023 的 Wiki 知识库文章",
        url: articleUrl
      });

      var h1 = document.getElementById("doc-title");
      if (h1) h1.textContent = title;

      /* 面包屑：沿层级路径渲染，前 N-1 级为链接（点击跳该层第一个叶子），末级为当前 */
      var breadcrumb = document.getElementById("doc-breadcrumb");
      if (breadcrumb) {
        if (idPath.length > 1) {
          var bcHTML = "";
          for (var i = 0; i < idPath.length - 1; i++) {
            bcHTML += '<a href="' + docHref(idPath.slice(0, i + 1)) + '">' +
              utils.escapeHTML(titlePath[i]) + "</a>" +
              '<span class="breadcrumb-sep">/</span>';
          }
          bcHTML += '<span class="breadcrumb-current">' + utils.escapeHTML(title) + "</span>";
          breadcrumb.innerHTML = bcHTML;
        } else {
          breadcrumb.innerHTML = "";
        }
      }

      return Promise.all([
        renderDocMarkdown("#doc-body", mdUrl).then(function () {
          /* 正文渲染完成后，用首段文本更新 description / OG / JSON-LD */
          var desc = extractDescription(document.querySelector("#doc-body"));
          if (!desc) return;
          upsertMeta("description", desc);
          setMetaAttr('meta[property="og:description"]', "content", desc);
          setMetaAttr('meta[name="twitter:description"]', "content", desc);
          var ld = document.head.querySelector('script[type="application/ld+json"][data-seo="article"]');
          if (ld) {
            try {
              var obj = JSON.parse(ld.textContent);
              obj.description = desc;
              ld.textContent = JSON.stringify(obj);
            } catch (e) {}
          }
        }),
        renderSidebar(idPath),
        renderPagination(idPath)
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
