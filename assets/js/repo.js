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

  /* 并发 enrich 单个项目：简介 / star / 技术栈 */
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
      } else {
        p.desc = "暂无简介";
      }
      p.tags = (langs && langs.length) ? langs : [];
      return p;
    });
  }
  global.enrichProject = enrichProject;

  /* ---------- Vue 项目卡片渲染（封装，供页面调用） ----------
     selector: 挂载点选择器
     list:     项目数组
     perRow:   每行列数（2 / 3 / null=自适应）
  ---------- */
  function projectCardVNode(h, p, labels) {
    var tags = (p.tags || []).map(function (t) {
      return h("span", { class: "pc-tag" }, t);
    });
    var descText = p.loading ? "加载中…" : (p.desc || "暂无简介");
    var tagsNode = p.loading
      ? h("div", { class: "pc-tags" }, [h("span", { class: "pc-tag pc-tag-loading" }, "…")])
      : (tags.length ? h("div", { class: "pc-tags" }, tags) : h("div", { class: "pc-tags" }, []));
    return h("article", { class: "card project-card", key: p.id }, [
      h("div", { class: "pc-title" }, p.name),
      h("div", { class: "pc-desc" }, descText),
      tagsNode,
      h("div", { class: "pc-meta" }, [
        h("span", { class: "star" }, "★ " + (p.stars || 0)),
        h("span", "#" + p.id)
      ]),
      h("div", { class: "pc-actions" }, [
        h("a", { class: "btn btn-primary", href: p.url, target: "_blank", rel: "noopener" }, labels.primary),
        h("a", { class: "btn", href: p.repo, target: "_blank", rel: "noopener" }, labels.secondary)
      ])
    ]);
  }

  function mountProjectGrid(selector, list, perRow, labels) {
    if (!window.Vue) {
      console.warn("[project-grid] Vue 未加载，跳过渲染");
      return;
    }
    var V = window.Vue;
    var createApp = V.createApp, ref = V.ref, onMounted = V.onMounted, h = V.h;
    var container = document.querySelector(selector);
    if (!container) return;
    var cls = "project-grid" + (perRow ? " project-grid-" + perRow : "");
    var lab = Object.assign({ primary: "访问主页", secondary: "项目源码" }, labels || {});

    var initial = list.map(function (p) {
      return Object.assign({}, p, {
        tags: (p.tags || []).slice(),
        loading: true
      });
    });

    createApp({
      setup: function () {
        var projects = ref(initial);
        onMounted(function () {
          projects.value.forEach(function (p, i) {
            enrichProject(p).then(function () {
              projects.value[i] = Object.assign({}, p, { loading: false });
            });
          });
        });
        return function () {
          return h("div", { class: cls },
            projects.value.map(function (p) { return projectCardVNode(h, p, lab); })
          );
        };
      }
    }).mount(selector);
  }
  global.mountProjectGrid = mountProjectGrid;
})(window);
