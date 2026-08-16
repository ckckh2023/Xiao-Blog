/* about.js - 关于页：网站统计 + 博主信息填充 */
(function () {
  "use strict";

  var SITE_BIRTH = new Date("2026-08-13T00:00:00+08:00").getTime();

  /* 递归收集所有文档节点的 id 路径 */
  function walkDocs(list, ids, nodes) {
    list.forEach(function (it) {
      var childIds = ids.concat([it.id]);
      nodes.push(childIds);
      if (it.children) walkDocs(it.children, childIds, nodes);
    });
  }

  function docMdPath(ids) {
    return "/docs/" + ids.map(encodeURIComponent).join("/") + "/index.md";
  }

  /* 仅统计实际存在 index.md 的文档（HEAD 探测） */
  function countExistingDocs(list) {
    var nodes = [];
    walkDocs(list, [], nodes);
    return Promise.all(nodes.map(function (ids) {
      return fetch(docMdPath(ids), { method: "HEAD" }).then(function (r) {
        return r.ok ? 1 : 0;
      }).catch(function () { return 0; });
    })).then(function (arr) {
      return arr.reduce(function (a, b) { return a + b; }, 0);
    });
  }

  function setNum(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* 运行天数 */
  var days = Math.max(0, Math.floor((Date.now() - SITE_BIRTH) / 86400000));
  setNum("stat-days", days);

  /* 最后更新时间 */
  var updated = document.getElementById("stat-updated");
  if (updated && document.lastModified) {
    var d = new Date(document.lastModified);
    if (!isNaN(d.getTime())) {
      updated.textContent = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    } else {
      updated.textContent = document.lastModified;
    }
  }

  /* 并行拉取各数据源计算统计 */
  Promise.all([
    fetch("/docs/DocsList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/repo/RepoList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/share/SoftWareList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/share/OtherList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/api/guestbook").then(function (r) { return r.json(); }).catch(function () { return { list: [] }; })
  ]).then(function (res) {
    countExistingDocs(res[0]).then(function (n) { setNum("stat-docs", n); });
    setNum("stat-repos", res[1].length);
    setNum("stat-shares", res[2].length + res[3].length);
    setNum("stat-guestbook", (res[4] && res[4].list) ? res[4].list.length : 0);
  });

  /* 从 GitHub API 补充博主信息（bio / email / blog） */
  if (typeof fetchGitHubJSON === "function" && typeof GITHUB_API === "string") {
    fetchGitHubJSON(GITHUB_API).then(function (data) {
      if (!data) return;
      if (data.bio) {
        var bio = document.getElementById("about-bio");
        if (bio) bio.textContent = data.bio;
      }
      if (data.email) {
        var email = document.getElementById("about-email");
        if (email) email.innerHTML = '<a href="mailto:' + Utils.escapeHTML(data.email) + '">' + Utils.escapeHTML(data.email) + "</a>";
      }
      if (data.blog) {
        var blog = document.getElementById("about-blog");
        var url = data.blog;
        if (url.indexOf("http") !== 0) url = "https://" + url;
        if (blog) blog.innerHTML = '<a href="' + Utils.escapeHTML(url) + '" target="_blank" rel="noopener">' + Utils.escapeHTML(data.blog) + "</a>";
      }
    }).catch(function () {});
  }
})();
