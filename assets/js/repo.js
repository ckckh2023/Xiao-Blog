/* ============================================================
   repo.js - 项目页逻辑
   加载页面：/index.html、/repo/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;
  var fetchGitHubJSON = global.fetchGitHubJSON;
  var platformIconSVG = global.platformIconSVG;

  /* ---------- 精选项目数据加载 ---------- */
  function fetchStarProjects() {
    return utils.fetchJSON(root() + "repo/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] repo/star.json 加载失败：", err);
      return null;
    });
  }
  global.fetchStarProjects = fetchStarProjects;

  /* 项目页全部仓库列表 */
  function fetchRepoList() {
    return utils.fetchJSON(root() + "repo/RepoList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[repo] RepoList.json 加载失败：", err);
      return null;
    });
  }
  global.fetchRepoList = fetchRepoList;

  /* ---------- GitHub 仓库详情获取 ---------- */
  var REPO_API = "/api/github/repos/";

  var FORK_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>';

  var STAR_SVG = '<svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true"><path d="M800.308 993.4c-7.2 0-14.5-1.7-21.2-5.2L512.008 847.8L244.908 988.2c-15.3 8-33.9 6.7-47.9-3.5s-21-27.4-18.1-44.5l51-297.5L13.7079 432.1C1.30788 420-3.09212 402 2.20788 385.5c5.4-16.5 19.6-28.5 36.7-31l298.7-43.4L471.208 40.5c7.7-15.5 23.5-25.4 40.8-25.4s33.1 9.8 40.8 25.4l133.6 270.6l298.7 43.4c17.1 2.5 31.4 14.5 36.7 31c5.3 16.5 0.9 34.6-11.5 46.7L794.108 642.8l51 297.5c2.9 17.1-4.1 34.3-18.1 44.5c-7.9 5.7-17.3 8.6-26.7 8.6ZM512.008 750.9c7.3 0 14.5 1.7 21.2 5.2l206.7 108.7l-39.5-230.2c-2.5-14.8 2.4-29.8 13.1-40.3l167.2-163l-231.1-33.6c-14.8-2.1-27.6-11.5-34.3-24.9L512.008 163.5L408.708 372.9c-6.6 13.4-19.4 22.7-34.3 24.9l-231.1 33.6l167.2 163c10.7 10.5 15.6 25.5 13.1 40.3l-39.5 230.2l206.7-108.7c6.7-3.6 13.9-5.3 21.2-5.3Z"/></svg>';

  /* 获取仓库简介和真实 star 数 */
  function fetchRepoInfo(fullName) {
    var key = "repo:" + fullName;
    return fetchGitHubJSON(REPO_API + fullName, key).then(function (d) {
      return { desc: d.description || "", stars: d.stargazers_count || 0, forks: d.forks_count || 0 };
    }).catch(function (err) {
      console.warn("[repo] info 获取失败 " + fullName + "：", err);
      return null;
    });
  }
  global.fetchRepoInfo = fetchRepoInfo;

  /* 获取仓库语言列表 */
  function fetchRepoLanguages(fullName) {
    var key = "lang:" + fullName;
    return fetchGitHubJSON(REPO_API + fullName + "/languages", key).then(function (d) {
      return Object.keys(d || {});
    }).catch(function (err) {
      console.warn("[repo] languages 获取失败 " + fullName + "：", err);
      return [];
    });
  }
  global.fetchRepoLanguages = fetchRepoLanguages;

  /* 并发获取项目数据GitHub API 可用时以其为准 */
  function enrichProject(p) {
    if (!p || !p.full_name) return Promise.resolve(p);
    return Promise.all([
      fetchRepoInfo(p.full_name),
      fetchRepoLanguages(p.full_name)
    ]).then(function (arr) {
      var info = arr[0], langs = arr[1];
      if (info) {
        if (info.desc) p.desc = info.desc;
        p.stars = info.stars;
        p.forks = info.forks;
      }
      else {
        if (!p.desc) p.desc = "暂无简介";
      }
      p.tags = (langs && langs.length) ? langs : (p.tags || []);
      return p;
    });
  }
  global.enrichProject = enrichProject;

  /* 项目搜索匹配 */
  function matchProject(p, q) {
    if (!q) return true;
    var fields = [p.name, p.id, p.desc, (p.tags || []).join(" "), p.full_name];
    for (var i = 0; i < fields.length; i++) {
      if (fields[i] && String(fields[i]).toLowerCase().indexOf(q) !== -1) return true;
    }
    return false;
  }
  global.matchProject = matchProject;

  /* ---------- 选择弹窗 ---------- */
  function openSelectDialog(title, items) {
    var old = document.getElementById("pc-dialog");
    if (old) old.remove();

    var listHTML = items.map(function (it) {
      var u = utils.escapeHTML(it.url || "");
      var icon = platformIconSVG ? platformIconSVG(it.url) : "";
      return '<a class="pc-dialog-item" href="' + u + '" target="_blank" rel="noopener">' +
        '<div class="pc-dialog-item-main">' +
          '<div class="pc-dialog-item-title">' + utils.escapeHTML(it.title || it.url || "") + "</div>" +
          '<div class="pc-dialog-item-url">' + u + "</div>" +
        "</div>" +
        (icon ? '<span class="pc-dialog-item-icon" aria-hidden="true">' + icon + "</span>" : "") +
      "</a>";
    }).join("");

    var mask = document.createElement("div");
    mask.id = "pc-dialog";
    mask.className = "pc-dialog-mask";
    mask.innerHTML =
      '<div class="pc-dialog" role="dialog" aria-modal="true">' +
        '<button class="pc-dialog-close" type="button" aria-label="关闭">✕</button>' +
        '<div class="pc-dialog-title">' + utils.escapeHTML(title) + "</div>" +
        '<div class="pc-dialog-list">' + listHTML + "</div>" +
      "</div>";
    document.body.appendChild(mask);

    function close() { mask.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    mask.addEventListener("click", function (e) {
      if (e.target === mask) { close(); return; }
      if (e.target.closest(".pc-dialog-close")) { close(); return; }
      if (e.target.closest(".pc-dialog-item")) { close(); return; }
    });
    document.addEventListener("keydown", onKey);
  }

  /* 项目源码按钮处理 */
  function handleSourceRepo(repo, otherRepo) {
    var items = [{ title: "GitHub", url: repo }];
    if (Array.isArray(otherRepo)) {
      otherRepo.forEach(function (it) { items.push(it); });
    }
    openSelectDialog("选择项目源码仓库", items);
  }

  /* ---------- 项目卡片渲染 ----------
     p: 项目对象
     idx: 在 projects 全量数组中的索引，供事件委托 data-source 定位
     labels: 按钮文案
     q: 搜索关键词 */
  function projectCardHTML(p, idx, labels, q) {
    var descText = p.loading ? "加载中…" : (p.desc || "暂无简介");
    var tagsHTML;
    if (p.loading) {
      tagsHTML = '<div class="pc-tags"><span class="pc-tag pc-tag-loading">…</span></div>';
    } else {
      tagsHTML = '<div class="pc-tags">' + (p.tags || []).map(function (t) {
        return '<span class="pc-tag">' + highlight(t, q) + "</span>";
      }).join("") + "</div>";
    }
    var actions = [];
    if (p.url) {
      actions.push('<a class="btn btn-primary" href="' + utils.escapeHTML(p.url) +
        '" target="_blank" rel="noopener">' + utils.escapeHTML(labels.primary) + "</a>");
    }
    if (Array.isArray(p.other_repo) && p.other_repo.length) {
      actions.push('<button class="btn" type="button" data-source="' + idx + '">' +
        utils.escapeHTML(labels.secondary) + "</button>");
    } else {
      actions.push('<a class="btn" href="' + utils.escapeHTML(p.repo || "") +
        '" target="_blank" rel="noopener">' + utils.escapeHTML(labels.secondary) + "</a>");
    }
    var meta = ['<span class="star"><span class="ico">' + STAR_SVG + "</span>" + String(p.stars || 0) + "</span>"];
    if (p.forks) meta.push('<span class="fork"><span class="ico">' + FORK_SVG + "</span>" + String(p.forks) + "</span>");
    meta.push("<span>#" + utils.escapeHTML(String(p.id)) + "</span>");
    return '<article class="card project-card" data-project-id="' + utils.escapeHTML(String(p.id)) + '">' +
      '<div class="pc-title">' + highlight(p.name, q) + "</div>" +
      '<div class="pc-desc">' + highlight(descText, q) + "</div>" +
      tagsHTML +
      '<div class="pc-meta">' + meta.join("") + "</div>" +
      '<div class="pc-actions">' + actions.join("") + "</div>" +
    "</article>";
  }

  /* ---------- 项目网格挂载 ----------
     selector: 挂载点选择器
     list:     项目数组
     perRow:   每行列数
     labels:   按钮文案
     返回控制器 setQuery(q) 可触发过滤重渲染；
     但首页精选项目不接收返回值。 */
  function mountProjectGrid(selector, list, perRow, labels) {
    var container = document.querySelector(selector);
    if (!container) return null;
    var cls = "project-grid" + (perRow ? " project-grid-" + perRow : "");
    var lab = Object.assign({ primary: "访问主页", secondary: "项目源码" }, labels || {});
    var PAGE_SIZE = 10; /* 分页内卡片数量调节项 */
    var projects = list.map(function (p) {
      return Object.assign({}, p, {
        tags: (p.tags || []).slice(),
        loading: false
      });
    });
    var query = "";
    var currentPage = 1;

    ensurePaginationHolder(selector, "project-pagination");
    var pager = mountPagination("#project-pagination", {
      total: projects.length,
      pageSize: PAGE_SIZE,
      current: 1,
      scrollAnchor: container,
      onChange: function (p) { currentPage = p; render(); }
    });

    function getFiltered() {
      var q = query.toLowerCase().trim();
      if (!q) return projects;
      return projects.filter(function (p) { return matchProject(p, q); });
    }

    function render() {
      var items = getFiltered();
      if (!items.length) {
        container.innerHTML = '<div class="status-box">' +
          (query.trim() ? "未找到匹配的项目。" : "暂无项目。") + "</div>";
        pager.setCurrent(1, 0);
        return;
      }
      var pages = Math.ceil(items.length / PAGE_SIZE);
      if (currentPage < 1) currentPage = 1;
      if (currentPage > pages) currentPage = pages;
      var start = (currentPage - 1) * PAGE_SIZE;
      var pageItems = items.slice(start, start + PAGE_SIZE);
      container.innerHTML = '<div class="' + cls + '">' +
        pageItems.map(function (p) {
          return projectCardHTML(p, projects.indexOf(p), lab, query);
        }).join("") +
        "</div>";
      pager.setCurrent(currentPage, items.length);
    }

    /* 卡片事件委托仅绑定一次，避免重渲染累积监听器 */
    if (!container._projectBound) {
      container.addEventListener("click", function (e) {
        var src = e.target.closest("[data-source]");
        if (src) {
          var idx = parseInt(src.getAttribute("data-source"), 10);
          var item = projects[idx];
          if (item) handleSourceRepo(item.repo, item.other_repo);
        }
      });
      container._projectBound = true;
    }

    /* enrich 完成后合并重渲染，注意只触发一次重建 */
    var pending = false;
    function scheduleRender() {
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () { pending = false; render(); });
    }

    /* 首次渲染本地数据，enrich 后台补充再合并重渲染，注意此处使用了 KV 缓存，需要新建 namespace */
    render();
    projects.forEach(function (p) {
      enrichProject(p).then(scheduleRender);
    });
    return {
      setQuery: function (q) {
        query = q || "";
        currentPage = 1;
        render();
      }
    };
  }
  global.mountProjectGrid = mountProjectGrid;
})(window);
