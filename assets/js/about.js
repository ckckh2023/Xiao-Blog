/* ============================================================
   about.js - 关于页逻辑
   加载页面：/about/index.html
   ============================================================ */
(function (global) {
  "use strict";

  var SITE_BIRTH = new Date("2026-08-13T00:00:00+08:00").getTime();


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

  /* 拉取各数据源计算统计 */
  Promise.all([
    fetch("/api/docs-count").then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }),
    fetch("/repo/RepoList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/share/SoftWareList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/share/OtherList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/api/guestbook").then(function (r) { return r.json(); }).catch(function () { return { list: [] }; })
  ]).then(function (res) {
    setNum("stat-docs", (res[0] && res[0].ok) ? res[0].count : 0);
    setNum("stat-repos", res[1].length);
    setNum("stat-shares", res[2].length + res[3].length);
    setNum("stat-guestbook", (res[4] && res[4].list) ? res[4].list.length : 0);
  });

  var em = document.getElementById("about-email");
  if (em) em.href = "ma" + "ilto:" + "ckc" + "kh2023@wust.ed" + "u.cn";
})(window);
