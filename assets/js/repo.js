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
      return [];
    });
  }
  global.fetchStarProjects = fetchStarProjects;

  /* 项目页全部仓库列表 */
  function fetchRepoList() {
    return utils.fetchJSON(root() + "repo/RepoList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[repo] RepoList.json 加载失败：", err);
      return [];
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

  /* ---------- Vue 项目卡片渲染 ----------
     selector: 挂载点选择器
     list:     项目数组
     perRow:   每行列数
     labels:   按钮文案
     返回控制器 setQuery(q) 可触发响应式过滤重渲染；
     但首页精选项目不接收返回值。 */
  function projectCardVNode(h, p, labels, q) {
    var tags = (p.tags || []).map(function (t) {
      return h("span", { class: "pc-tag", innerHTML: highlight(t, q) });
    });
    var descText = p.loading ? "加载中…" : (p.desc || "暂无简介");
    var tagsNode = p.loading
      ? h("div", { class: "pc-tags" }, [h("span", { class: "pc-tag pc-tag-loading" }, "…")])
      : (tags.length ? h("div", { class: "pc-tags" }, tags) : h("div", { class: "pc-tags" }, []));
    var actions = [];
    if (p.url) actions.push(h("a", { class: "btn btn-primary", href: p.url, target: "_blank", rel: "noopener" }, labels.primary));
    if (Array.isArray(p.other_repo) && p.other_repo.length) actions.push(h("button", { class: "btn", type: "button", onClick: function () { handleSourceRepo(p.repo, p.other_repo); } }, labels.secondary));
    else actions.push(h("a", { class: "btn", href: p.repo, target: "_blank", rel: "noopener" }, labels.secondary));
    return h("article", { class: "card project-card", key: p.id }, [
      h("div", { class: "pc-title", innerHTML: highlight(p.name, q) }),
      h("div", { class: "pc-desc", innerHTML: highlight(descText, q) }),
      tagsNode,
      h("div", { class: "pc-meta" }, (function () {
        var m = [h("span", { class: "star" }, [h("span", { class: "ico", innerHTML: STAR_SVG }), String(p.stars || 0)])];
        if (p.forks) m.push(h("span", { class: "fork" }, [h("span", { class: "ico", innerHTML: FORK_SVG }), String(p.forks)]));
        m.push(h("span", "#" + p.id));
        return m;
      })()),
      h("div", { class: "pc-actions" }, actions)
    ]);
  }

  /* ---------- Vue 分页 ---------- */
  function paginationVNode(h, total, pageSize, current, onPick) {
    var items = buildPageItems(total, pageSize, current, 1);
    if (!items.length) return null;
    var pages = Math.ceil(total / pageSize);
    var btns = [];
    btns.push(h("button", {
      class: "pg-btn pg-nav", type: "button", disabled: current === 1,
      onClick: function () { if (current > 1) onPick(current - 1); }
    }, "上一页"));
    items.forEach(function (it) {
      if (it === "...") {
        btns.push(h("span", { class: "pg-ellipsis", "aria-hidden": "true" }, "…"));
      } else {
        var active = it === current;
        var attrs = {
          class: "pg-btn" + (active ? " pg-active" : ""),
          type: "button",
          onClick: function () { if (it !== current) onPick(it); }
        };
        if (active) attrs["aria-current"] = "page";
        btns.push(h("button", attrs, String(it)));
      }
    });
    btns.push(h("button", {
      class: "pg-btn pg-nav", type: "button", disabled: current === pages,
      onClick: function () { if (current < pages) onPick(current + 1); }
    }, "下一页"));
    /* 跳转到指定页 */
    btns.push(h("span", { class: "pg-jump" }, [
      "跳转到第",
      h("input", {
        class: "pg-jump-input", type: "number", min: "1", inputmode: "numeric",
        "aria-label": "跳转到第几页",
        onKeydown: function (e) {
          if (e.key !== "Enter") return;
          var v = parseInt(e.target.value, 10);
          if (isNaN(v)) return;
          if (v < 1) v = 1;
          if (v > pages) v = pages;
          e.target.value = "";
          e.target.blur();
          onPick(v);
        }
      }),
      "页"
    ]));
    return h("div", { class: "pagination" }, btns);
  }

  function mountProjectGrid(selector, list, perRow, labels) {
    if (!window.Vue) {
      console.warn("[project-grid] Vue 未加载，跳过渲染");
      return null;
    }
    var V = window.Vue;
    var createApp = V.createApp, ref = V.ref, computed = V.computed, onMounted = V.onMounted, watch = V.watch, h = V.h;
    var container = document.querySelector(selector);
    if (!container) return null;
    var cls = "project-grid" + (perRow ? " project-grid-" + perRow : "");
    var lab = Object.assign({ primary: "访问主页", secondary: "项目源码" }, labels || {});
    var PAGE_SIZE = 10; /* 分页内卡片数量调节项 */
    var initial = list.map(function (p) {
      return Object.assign({}, p, {
        tags: (p.tags || []).slice(),
        loading: false
      });
    });

    /* query 提到 setup 外部，使返回的控制器闭包能访问并触发响应式重渲染 */
    var query = ref("");
    var currentPage = ref(1);
    var app = createApp({
      setup: function () {
        var projects = ref(initial);
        var filtered = computed(function () {
          var q = query.value.toLowerCase().trim();
          if (!q) return projects.value;
          return projects.value.filter(function (p) { return matchProject(p, q); });
        });
        var paginated = computed(function () {
          var items = filtered.value;
          var pages = Math.ceil(items.length / PAGE_SIZE);
          if (pages <= 1) return items;
          var cur = currentPage.value;
          if (cur < 1) cur = 1;
          if (cur > pages) cur = pages;
          var start = (cur - 1) * PAGE_SIZE;
          return items.slice(start, start + PAGE_SIZE);
        });
        /* 搜索时重置页码 */
        watch(query, function () { currentPage.value = 1; });
        onMounted(function () {
          projects.value.forEach(function (p, i) {
            enrichProject(p).then(function () {
              /* enrich 就地更新，赋新对象触发重渲染 */
              projects.value[i] = Object.assign({}, p);
            });
          });
        });
        return function () {
          var items = filtered.value;
          var q = query.value;
          if (!items.length) {
            return h("div", { class: cls }, [
              h("div", { class: "status-box" }, "未找到匹配的项目。")
            ]);
          }
          var grid = h("div", { class: cls },
            paginated.value.map(function (p) { return projectCardVNode(h, p, lab, q); })
          );
          var pg = paginationVNode(h, items.length, PAGE_SIZE, currentPage.value, function (p) {
            if (global.smoothScrollTo) global.smoothScrollTo(container);
            currentPage.value = p;
          });
          return pg ? [grid, pg] : grid;
        };
      }
    });
    app.mount(selector);
    return { setQuery: function (q) { query.value = q || ""; } };
  }
  global.mountProjectGrid = mountProjectGrid;
})(window);
