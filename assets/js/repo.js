/* ============================================================
   repo.js - 项目页 & 首页精选项目共享逻辑
   功能：项目列表加载、GitHub 仓库详情获取、项目卡片渲染
   依赖：common.js（Utils / fetchGitHubJSON / root）
   加载页面：/index.html（精选项目）、/repo/index.html（全部项目）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;
  var fetchGitHubJSON = global.fetchGitHubJSON;

  /* ---------- star.json 数据加载（首页精选项目） ---------- */
  function fetchStarProjects() {
    return utils.fetchJSON(root() + "repo/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] repo/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarProjects = fetchStarProjects;

  /* 项目页全部仓库列表（格式与 star.json 一致，独立接口） */
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
  var REPO_API = "https://api.github.com/repos/";

  /* 获取仓库简介 + 真实 star 数 */
  function fetchRepoInfo(fullName) {
    var key = "repo:" + fullName;
    return fetchGitHubJSON(REPO_API + fullName, key).then(function (d) {
      return { desc: d.description || "", stars: d.stargazers_count || 0 };
    }).catch(function (err) {
      console.warn("[repo] info 获取失败 " + fullName + "：", err);
      return null;
    });
  }
  global.fetchRepoInfo = fetchRepoInfo;

  /* 获取仓库语言列表（技术栈） */
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

  /* 并发 enrich 单个项目：简介 / star / 技术栈
     GitHub API 可用时以其为准（优先）；不可用时回退 JSON 预设的 desc / stars / tags */
  function enrichProject(p) {
    if (!p || !p.full_name) return Promise.resolve(p);
    return Promise.all([
      fetchRepoInfo(p.full_name),
      fetchRepoLanguages(p.full_name)
    ]).then(function (arr) {
      var info = arr[0], langs = arr[1];
      if (info) {
        /* GitHub API 优先：覆盖 JSON 预设值 */
        if (info.desc) p.desc = info.desc;
        p.stars = info.stars;
      } else {
        /* API 不可用：保留 JSON 预设的简介与 star，仅当无简介时给兜底文案 */
        if (!p.desc) p.desc = "暂无简介";
      }
      /* 技术栈：API 返回语言列表时以 API 为准，否则回退 JSON 预设 tags */
      p.tags = (langs && langs.length) ? langs : (p.tags || []);
      return p;
    });
  }
  global.enrichProject = enrichProject;

  /* 项目搜索匹配：name / id / desc / 技术栈 / full_name 任一含 query（大小写不敏感） */
  function matchProject(p, q) {
    if (!q) return true;
    var fields = [p.name, p.id, p.desc, (p.tags || []).join(" "), p.full_name];
    for (var i = 0; i < fields.length; i++) {
      if (fields[i] && String(fields[i]).toLowerCase().indexOf(q) !== -1) return true;
    }
    return false;
  }
  global.matchProject = matchProject;

  /* ---------- 选择弹窗（其他仓库） ----------
     title: 弹窗标题；items: [{ title, url }]
     点击选择项跳转 url（新窗口）；点遮罩空白 / 关闭按钮 / ESC 关闭 */
  function openSelectDialog(title, items) {
    var old = document.getElementById("pc-dialog");
    if (old) old.remove();

    var listHTML = items.map(function (it) {
      var u = utils.escapeHTML(it.url || "");
      return '<a class="pc-dialog-item" href="' + u + '" target="_blank" rel="noopener">' +
        '<div class="pc-dialog-item-title">' + utils.escapeHTML(it.title || it.url || "") + "</div>" +
        '<div class="pc-dialog-item-url">' + u + "</div>" +
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

  /* 项目源码按钮处理：有 other_repo 时弹窗（首项 GitHub + other_repo），无则直接跳转 */
  function handleSourceRepo(repo, otherRepo) {
    var items = [{ title: "GitHub（本站GitHub账号被标记，访问会404）", url: repo }];
    if (Array.isArray(otherRepo)) {
      otherRepo.forEach(function (it) { items.push(it); });
    }
    openSelectDialog("选择项目源码仓库", items);
  }

  /* ---------- Vue 项目卡片渲染（封装，供页面调用） ----------
     selector: 挂载点选择器
     list:     项目数组
     perRow:   每行列数（2 / 3 / null=自适应）
     labels:   按钮文案 { primary, secondary }
     返回控制器 { setQuery }：setQuery(q) 触发响应式过滤重渲染；
     首页精选项目不接收返回值，query 恒为空，行为与原先一致。
  ---------- */
  function projectCardVNode(h, p, labels) {
    var tags = (p.tags || []).map(function (t) {
      return h("span", { class: "pc-tag" }, t);
    });
    var descText = p.loading ? "加载中…" : (p.desc || "暂无简介");
    var tagsNode = p.loading
      ? h("div", { class: "pc-tags" }, [h("span", { class: "pc-tag pc-tag-loading" }, "…")])
      : (tags.length ? h("div", { class: "pc-tags" }, tags) : h("div", { class: "pc-tags" }, []));
    var actions = [];
    if (p.url) {
      actions.push(h("a", { class: "btn btn-primary", href: p.url, target: "_blank", rel: "noopener" }, labels.primary));
    }
    if (Array.isArray(p.other_repo) && p.other_repo.length) {
      actions.push(h("button", { class: "btn", type: "button", onClick: function () { handleSourceRepo(p.repo, p.other_repo); } }, labels.secondary));
    } else {
      actions.push(h("a", { class: "btn", href: p.repo, target: "_blank", rel: "noopener" }, labels.secondary));
    }
    return h("article", { class: "card project-card", key: p.id }, [
      h("div", { class: "pc-title" }, p.name),
      h("div", { class: "pc-desc" }, descText),
      tagsNode,
      h("div", { class: "pc-meta" }, [
        h("span", { class: "star" }, "★ " + (p.stars || 0)),
        h("span", "#" + p.id)
      ]),
      h("div", { class: "pc-actions" }, actions)
    ]);
  }

  function mountProjectGrid(selector, list, perRow, labels) {
    if (!window.Vue) {
      console.warn("[project-grid] Vue 未加载，跳过渲染");
      return null;
    }
    var V = window.Vue;
    var createApp = V.createApp, ref = V.ref, computed = V.computed, onMounted = V.onMounted, h = V.h;
    var container = document.querySelector(selector);
    if (!container) return null;
    var cls = "project-grid" + (perRow ? " project-grid-" + perRow : "");
    var lab = Object.assign({ primary: "访问主页", secondary: "项目源码" }, labels || {});

    /* 本地优先：先用 JSON 预设数据（desc/stars/tags）立即渲染，
       再后台调 GitHub API enrich，成功则覆盖更新，失败保留本地。 */
    var initial = list.map(function (p) {
      return Object.assign({}, p, {
        tags: (p.tags || []).slice(),
        loading: false
      });
    });

    /* query 提到 setup 外部，使返回的控制器闭包能访问并触发响应式重渲染 */
    var query = ref("");
    var app = createApp({
      setup: function () {
        var projects = ref(initial);
        var filtered = computed(function () {
          var q = query.value.toLowerCase().trim();
          if (!q) return projects.value;
          return projects.value.filter(function (p) { return matchProject(p, q); });
        });
        onMounted(function () {
          projects.value.forEach(function (p, i) {
            enrichProject(p).then(function () {
              /* enrich 就地更新 p（API 成功覆盖，失败保留本地），赋新对象触发重渲染 */
              projects.value[i] = Object.assign({}, p);
            });
          });
        });
        return function () {
          var items = filtered.value;
          if (!items.length) {
            return h("div", { class: cls }, [
              h("div", { class: "status-box" }, "未找到匹配的项目。")
            ]);
          }
          return h("div", { class: cls },
            items.map(function (p) { return projectCardVNode(h, p, lab); })
          );
        };
      }
    });
    app.mount(selector);
    return { setQuery: function (q) { query.value = q || ""; } };
  }
  global.mountProjectGrid = mountProjectGrid;
})(window);
