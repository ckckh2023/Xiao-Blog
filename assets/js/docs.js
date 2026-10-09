/* ============================================================
   docs.js - 文档页逻辑
   加载页面：/docs/index.html、/docs/article.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  var DOCS_BASE = root() + "docs/";
  var DOCS_LIST_URL = DOCS_BASE + "DocsList.json";
  var docsListCache = null;

  /* ---------- SEO 元数据 ---------- */
  var SITE_ORIGIN = "https://xiao-blog.top";
  var SITE_AUTHOR = "ckckh2023";
  var SITE_AVATAR = "https://xiao-blog.top/assets/icons/head.jpg";

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
    /* titlePath 为从根到叶的标题数组，fullTitle 反向拼接，headline 取最末一级 */
    var titlePath = opt.titlePath && opt.titlePath.length ? opt.titlePath : [opt.title || ""];
    var headline = titlePath[titlePath.length - 1];
    var fullTitle = titlePath.slice().reverse().join(" - ") + " - ckckh2023 文档";
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

  /* 从渲染后的正文容器提取首段纯文本作为摘要 */
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
  var SIDEBAR_TOGGLE_SVG = '<svg viewBox="0 0 1024 1024" width="12" height="12" fill="none" stroke="currentColor" aria-hidden="true"><g transform="rotate(-90 512 512)" stroke-width="120" stroke-linecap="round" stroke-linejoin="round"><path d="M256 384 L512 640 L768 384"/></g></svg>';

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

  /* 文章详情页链接解析 */
  function docHref(ids) {
    var base = DOCS_BASE + "article?id=" + encodeURIComponent(ids[0]);
    if (ids[1]) base += "&sub=" + encodeURIComponent(ids[1]);
    if (ids[2]) base += "&sub2=" + encodeURIComponent(ids[2]);
    return base;
  }
  global.docHref = docHref;

  /* 沿 id 路径查找节点 */
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

  /* 沿 id 路径收集标题数组 */
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

  /* 从 node 沿第一个 child 递归到叶子，返回完整 id 路径 */
  function firstLeafIds(node, parentIds) {
    var ids = parentIds.concat(node.id);
    if (node.children && node.children.length) {
      return firstLeafIds(node.children[0], ids);
    }
    return ids;
  }
  global.firstLeafIds = firstLeafIds;

  /* 将 DocsList 递归展平为叶子分页序列，但是有 children 的非叶子节点不进入序列 */
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

  /* 渲染左侧目录侧边栏 */
  function renderSidebar(currentPath) {
    var holder = document.getElementById("docs-sidebar");
    if (!holder) return Promise.resolve();
    return fetchDocsList().then(function (list) {
      var html = "<h3>目录</h3>";
      list.forEach(function (it) {
        html += renderSidebarNode(it, [], currentPath);
      });
      holder.innerHTML = html;
      /* 折叠或展开可通过点整行或键盘 Enter 和 Space 切换 */
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
     parentIds   父路径 id 数组
     currentPath 当前文章完整 id 路径
     有 children -> 折叠组，内部递归渲染 children
     无 children -> 叶子链接 */
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

  /* 渲染上一页/下一页按钮到 #pagination */
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

  /* 文章模板页初始化 */
  function initArticlePage() {
    var query = new URLSearchParams(window.location.search);
    var id = query.get("id") || "";
    var sub = query.get("sub") || "";
    var sub2 = query.get("sub2") || "";
    if (!id) {
      window.location.replace(DOCS_BASE);
      return;
    }
    var idPath = [id];
    if (sub) idPath.push(sub);
    if (sub2) idPath.push(sub2);

    return fetchDocsList().then(function (list) {
      var node = findNodeByPath(list, idPath);
      if (!node) {
        window.location.replace(DOCS_BASE);
        return;
      }
      /* 非叶子 -> 重定向到第一个叶子 */
      if (node.children && node.children.length) {
        window.location.replace(docHref(firstLeafIds(node, idPath.slice(0, -1))));
        return;
      }

      /* 叶子文章 -> 渲染文档 */
      var titlePath = findTitlePath(list, idPath) || [id];
      var title = titlePath[titlePath.length - 1];
      var mdUrl = DOCS_BASE + idPath.join("/") + "/index.md";
      var articleUrl = SITE_ORIGIN + docHref(idPath);

      setArticleMeta({
        titlePath: titlePath,
        description: "ckckh2023 的文档库文章",
        url: articleUrl
      });

      var h1 = document.getElementById("doc-title");
      if (h1) h1.textContent = title;

      /* 面包屑沿层级路径渲染，前 N-1 级为链接，点击可跳该层第一个叶子，末级为当前 */
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

  /* ---------- 代码块复制按钮 ---------- */
  var COPY_SVG =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>' +
    '<path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>';
  var CHECK_SVG =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';

  function enhanceCodeBlocks(root) {
    var pres = root.querySelectorAll("pre");
    Array.prototype.forEach.call(pres, function (pre) {
      if (pre.parentElement && pre.parentElement.classList.contains("code-block-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "code-block-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = document.createElement("button");
      btn.className = "code-copy-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "复制代码");
      btn.innerHTML = COPY_SVG;
      wrap.appendChild(btn);
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = code ? code.textContent : pre.textContent;
        var done = function () {
          btn.innerHTML = CHECK_SVG;
          btn.classList.add("copied");
          setTimeout(function () {
            btn.innerHTML = COPY_SVG;
            btn.classList.remove("copied");
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        }
        else {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ---------- 代码语法高亮 ---------- */
  function highlightCodeBlocks(root) {
    if (!global.hljs) return;
    if (!highlightCodeBlocks._aliased) {
      try { global.hljs.registerAliases(["pwsh"], { languageName: "powershell" }); } catch (e) {}
      highlightCodeBlocks._aliased = true;
    }
    Array.prototype.forEach.call(root.querySelectorAll("pre code"), function (block) {
      try { global.hljs.highlightElement(block); } catch (e) {}
    });
  }

  /* ---------- Markdown 正文渲染 ----------
      selector: 正文容器选择器
      mdUrl:    markdown 文件 URL */

  /* 从 HTTP Last-Modified 头解析并填充最后更新日期
  （不知道为什么 Cloudflare Pages 无效，但是 GitHub Pages 有效，所以先保留） */
  function fillDocUpdated(lastModified) {
    var el = document.getElementById("doc-updated");
    if (!el || !lastModified) return;
    var d = new Date(lastModified);
    if (isNaN(d.getTime())) return;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    el.textContent = "最后更新：" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  var ALERT_TYPES = {
    CAUTION: { cls: "alert-caution", title: "注意", icon: '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="5" r="0.9" fill="currentColor"/><rect x="7.1" y="6.7" width="1.8" height="5.3" fill="currentColor"/></svg>' },
    WARNING: { cls: "alert-warning", title: "警告", icon: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1.6 14.25 12.4A1 1 0 0 1 13.39 14H2.61a1 1 0 0 1-.86-1.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><rect x="7.1" y="6.3" width="1.8" height="4.2" fill="currentColor"/><circle cx="8" cy="11.7" r="0.9" fill="currentColor"/></svg>' },
    TIP: { cls: "alert-tip", title: "提示", icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 1.6a4.8 4.8 0 0 0-3.05 8.5c.4.4.65.9.65 1.45v.15h4.8v-.15c0-.55.25-1.05.65-1.45A4.8 4.8 0 0 0 8 1.6Z"/><path d="M6.3 12.2h3.4v.7a.7.7 0 0 1-.7.7H7a.7.7 0 0 1-.7-.7Z"/></svg>' },
    IMPORTANT: { cls: "alert-important", title: "重要提示", icon: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 1.6a.7.7 0 0 1 .7.7v.25a4.3 4.3 0 0 1 3.6 4.25v2.1l.75 1.25H2.95l.75-1.25v-2.1A4.3 4.3 0 0 1 7.3 2.55v-.25A.7.7 0 0 1 8 1.6Z"/><path d="M6.35 12.8a1.65 1.65 0 0 0 3.3 0"/></svg>' }
  };

  function convertAlerts(box) {
    box.querySelectorAll("blockquote").forEach(function (bq) {
      var first = bq.firstElementChild;
      if (!first || first.tagName !== "P") return;
      var node = first.firstChild;
      if (!node || node.nodeType !== 3) return;
      var m = node.nodeValue.match(/^\[!(CAUTION|WARNING|TIP|IMPORTANT)\][ \t]*\r?\n?/i);
      if (!m) return;
      var cfg = ALERT_TYPES[m[1].toUpperCase()];
      if (!cfg) return;
      var rest = node.nodeValue.slice(m[0].length);
      if (rest.length) node.nodeValue = rest;
      else first.removeChild(node);
      if (!first.hasChildNodes()) bq.removeChild(first);
      bq.classList.add(cfg.cls);
      var title = document.createElement("p");
      title.className = "alert-title";
      title.innerHTML = cfg.icon + "<span>" + cfg.title + "</span>";
      bq.insertBefore(title, bq.firstChild);
    });
  }

  function renderDocMarkdown(selector, mdUrl) {
    var box = document.querySelector(selector);
    if (!box) return Promise.resolve();
    var parse = window.marked && (window.marked.parse || window.marked);
    if (!parse) {
      box.innerHTML = '<p class="status-box">Markdown 解析器未加载。</p>';
      return Promise.resolve();
    }
    /* 文章计数使用 /api/article.js 统一函数入口 */
    var rel = mdUrl.replace(/^\/docs\//, "").replace(/\/index\.md$/, "");
    var idPath = rel.split("/");
    var apiUrl = "/api/article?id=" + encodeURIComponent(idPath[0]);
    if (idPath[1]) apiUrl += "&sub=" + encodeURIComponent(idPath[1]);
    if (idPath[2]) apiUrl += "&sub2=" + encodeURIComponent(idPath[2]);
    var mdDir = mdUrl.slice(0, mdUrl.lastIndexOf("/") + 1);
    return fetch(apiUrl).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      if (!data || !data.ok) throw new Error((data && data.error) || "文章加载失败");
      fillDocUpdated(data.date || data.lastModified);
      box.innerHTML = parse(data.markdown);
      convertAlerts(box);
      box.querySelectorAll("img").forEach(function (img) {
        var s = img.getAttribute("src");
        if (s && !/^(https?:)?\/\//i.test(s) && !/^data:/i.test(s) && s.charAt(0) !== "/") img.src = mdDir + s;
      });
      highlightCodeBlocks(box);
      enhanceCodeBlocks(box);
    }).catch(function (err) {
      console.warn("[doc] markdown 加载失败 " + mdUrl + "：", err);
      box.innerHTML = '<p class="status-box">正文加载失败。</p>';
    });
  }
  global.renderDocMarkdown = renderDocMarkdown;
})(window);
