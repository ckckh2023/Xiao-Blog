/* ============================================================
   guestbook.js - 留言板专属逻辑
   加载页面：/guestbook/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var API_URL = "/api/guestbook";

  var wallBox = null;
  var wallData = [];
  var GB_PAGE_SIZE = 30;
  var wallPage = 1;
  var wallPager = null;

  /* ---------- 留言墙本地缓存 ---------- */
  var GB_WALL_CACHE_KEY = "gb_wall";
  var GB_WALL_CACHE_TTL = 24 * 60 * 60 * 1000;
  function readWallCache() {
    try {
      var raw = localStorage.getItem(GB_WALL_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.list)) return null;
      if (Date.now() - (obj.t || 0) > GB_WALL_CACHE_TTL) return null;
      return obj.list;
    } catch (e) { return null; }
  }
  function writeWallCache(list) {
    try {
      localStorage.setItem(GB_WALL_CACHE_KEY, JSON.stringify({ t: Date.now(), list: list || [] }));
    } catch (e) {}
  }

  /* 卡片渲染共享模块 */
  var gbCard = global.GBCard;

  /* ---------- 留言墙渲染 ---------- */
  function mountWall(list, hasQuery, q) {
    if (!wallBox) return;
    var items = list || [];
    if (!items.length) {
      wallBox.innerHTML = '<div class="status-box">' +
        (hasQuery ? "未找到匹配的留言。" : "还没有留言，在上方写下第一条吧。") +
        "</div>";
      return;
    }
    wallBox.innerHTML = '<div class="guestbook-wall">' +
      items.map(function (c) { return gbCard.gbCardHTML(c, q); }).join("") + "</div>";
    gbCard.setupClamp(wallBox);
  }

  /* ---------- 留言搜索 ---------- */
  var wallQuery = "";
  function matchComment(c, q) {
    if (!q) return true;
    var name = c.nickname || "";
    var body = c.body || "";
    return String(name).toLowerCase().indexOf(q) !== -1 ||
           String(body).toLowerCase().indexOf(q) !== -1;
  }
  function applyWall() {
    if (!wallBox) return;
    var q = wallQuery.toLowerCase().trim();
    var list = wallData;
    if (q) list = wallData.filter(function (c) { return matchComment(c, q); });
    /* 按 id 倒序排列 */
    list = list.slice().sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
    if (!list.length) {
      wallBox.innerHTML = '<div class="status-box">' +
        (q ? "未找到匹配的留言。" : "还没有留言，在上方写下第一条吧。") + "</div>";
      if (wallPager) wallPager.destroy();
      return;
    }
    var pages = Math.ceil(list.length / GB_PAGE_SIZE);
    if (wallPage > pages) wallPage = 1;
    var start = (wallPage - 1) * GB_PAGE_SIZE;
    mountWall(list.slice(start, start + GB_PAGE_SIZE), !!q, wallQuery);

    var holder = ensurePaginationHolder("#guestbook-wall", "guestbook-pagination");
    if (!holder) return;
    if (pages > 1) {
      if (!wallPager) {
        wallPager = mountPagination("#guestbook-pagination", {
          total: list.length,
          pageSize: GB_PAGE_SIZE,
          current: wallPage,
          scrollAnchor: "#guestbook-wall",
          onChange: function (p) { wallPage = p; applyWall(); }
        });
      } else {
        wallPager.setCurrent(wallPage, list.length);
      }
    } else if (wallPager) {
      wallPager.destroy();
    }
  }

  function setWall(list) {
    wallData = (list || []).slice();
    applyWall();
  }

  /* ---------- 刷新按钮 ---------- */
  var refreshCount = 0;
  function setRefreshSpinning(on) {
    var btn = document.getElementById("guestbook-refresh");
    if (!btn) return;
    if (on) {
      refreshCount++;
      btn.classList.add("gb-refreshing");
      btn.disabled = true;
    }
    else {
      refreshCount = Math.max(0, refreshCount - 1);
      if (refreshCount === 0) {
        btn.classList.remove("gb-refreshing");
        btn.disabled = false;
      }
    }
  }

  /* 刷新留言墙 */
  function refreshWall() {
    setRefreshSpinning(true);
    return fetch(API_URL).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var list = (data && data.list) || [];
      setWall(list);
      writeWallCache(list);
    }).catch(function (err) {
      console.warn("[guestbook] 加载失败：", err);
      if (!wallData.length) wallBox.innerHTML = '<div class="status-box">留言加载失败，请稍后重试。</div>';
    }).then(function () {
      setRefreshSpinning(false);
    });
  }

  /* ---------- Markdown 工具栏插入辅助 ---------- */
  function insertMd(textarea, type) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;
    var sel = value.slice(start, end);

    function apply(nv, s, e) {
      textarea.value = nv;
      textarea.focus();
      try { textarea.setSelectionRange(s, e == null ? s : e); } catch (err) {}
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (type === "h1") {
      var ls = value.lastIndexOf("\n", start - 1) + 1;
      apply(value.slice(0, ls) + "### " + value.slice(ls), ls + 4 + (end - start), ls + 4 + (end - start));
    }
    else if (type === "bold") apply(value.slice(0, start) + "**" + sel + "**" + value.slice(end), start + 2, start + 2 + sel.length);
    else if (type === "italic") apply(value.slice(0, start) + "_" + sel + "_" + value.slice(end), start + 1, start + 1 + sel.length);
    else if (type === "quote") {
      var ls = value.lastIndexOf("\n", start - 1) + 1;
      apply(value.slice(0, ls) + "> " + value.slice(ls), ls + 2 + (end - start), ls + 2 + (end - start));
    }
    else if (type === "code") apply(value.slice(0, start) + "`" + sel + "`" + value.slice(end), start + 1, start + 1 + sel.length);
    else if (type === "link") {
      if (sel) {
        var nv = value.slice(0, start) + "[" + sel + "](url)" + value.slice(end);
        var up = start + 1 + sel.length + 2;
        apply(nv, up, up + 3);
      }
      else apply(value.slice(0, start) + "[文本](url)" + value.slice(end), start + 1, start + 3);
    }
  }

  /* ---------- 发布表单 ---------- */
  function initForm() {
    var form = document.getElementById("guestbook-form");
    if (!form) return;
    var inputName = form.querySelector("#gb-input-name");
    var inputQQ = form.querySelector("#gb-input-qq");
    var inputBody = form.querySelector("#gb-input-body");
    var btn = form.querySelector("#gb-submit");
    var hint = form.querySelector("#gb-form-hint");
    if (!inputName || !inputBody || !btn) return;

    /* Markdown 工具栏 */
    var toolbar = form.querySelector(".gb-toolbar");
    if (toolbar) {
      toolbar.addEventListener("click", function (e) {
        var toolBtn = e.target.closest(".gb-tool");
        if (!toolBtn) return;
        e.preventDefault();
        insertMd(inputBody, toolBtn.getAttribute("data-md"));
      });
    }


    function setHint(msg, isErr) {
      if (!hint) return;
      hint.textContent = msg || "";
      hint.className = "gb-form-hint" + (isErr ? " gb-form-hint-err" : "");
    }

    function setLoading(on) {
      btn.disabled = on;
      btn.classList.toggle("gb-submitting", on);
      btn.textContent = on ? "发布中…" : "发布留言";
    }

    /* 由 QQ 号生成头像 URL */
    function avatarFromQQ(qq) {
      if (!qq) return "";
      if (!/^\d{5,11}$/.test(qq)) return null;
      return "https://q1.qlogo.cn/g?b=qq&nk=" + qq + "&s=640";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nickname = inputName.value.trim();
      var body = inputBody.value.trim();
      var qq = inputQQ ? inputQQ.value.trim() : "";

      if (!nickname) { setHint("请填写昵称", true); inputName.focus(); return; }
      if (!qq) { setHint("请填写 QQ 号", true); inputQQ.focus(); return; }
      if (!body) { setHint("请填写留言内容", true); inputBody.focus(); return; }

      var avatar = avatarFromQQ(qq);
      if (avatar === null) { setHint("QQ 号应为 5-11 位数字", true); inputQQ.focus(); return; }

      setLoading(true);
      setHint("");
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname, body: body, avatar: avatar })
      }).then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      }).then(function (r) {
        if (!r.ok) {
          setHint(r.data && r.data.error || "发布失败", true);
          return;
        }
        inputBody.value = "";
        setHint("留言发布成功！");
        wallPage = 1; /* 发布成功后回到第一页 */
        /* 清除本地缓存，确保刷新后立即看到新留言 */
        try { localStorage.removeItem(GB_WALL_CACHE_KEY); } catch (e) {}
        refreshWall();
      }).catch(function () {
        setHint("网络错误，请稍后重试", true);
      }).then(function () {
        setLoading(false);
      });
    });

    /* 预览留言 */
    var previewBtn = document.getElementById("gb-preview");
    if (previewBtn) {
      previewBtn.addEventListener("click", function () {
        var nickname = inputName.value.trim() || "匿名";
        var body = inputBody.value.trim();
        var qq = inputQQ ? inputQQ.value.trim() : "";
        var avatar = avatarFromQQ(qq);
        if (!body) { setHint("请先填写留言内容再预览", true); inputBody.focus(); return; }
        setHint("");
        var cardHTML = gbCard.gbCardHTML({
          nickname: nickname,
          body: body,
          avatar: avatar,
          created_at: new Date().toISOString()
        });
        var tmp = document.createElement("div");
        tmp.innerHTML = cardHTML;
        var cardEl = tmp.firstElementChild;
        var header = cardEl && cardEl.querySelector(".gb-header");
        var bodyEl = cardEl && cardEl.querySelector(".gb-body");
        gbCard.openDialog(header ? header.outerHTML : "", bodyEl ? bodyEl.innerHTML : "");
      });
    }
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    wallBox = document.getElementById("guestbook-wall");
    var refreshBtn = document.getElementById("guestbook-refresh");
    if (refreshBtn) refreshBtn.addEventListener("click", refreshWall);

    /* 优先用本地缓存渲染，再后台刷新 */
    var cached = readWallCache();
    if (cached) {
      setWall(cached);
    } else {
      refreshWall();
    }
    initForm();

    mountSearchBox("#gb-search", {
      placeholder: "搜索留言…",
      onQuery: function (q) { wallQuery = q; wallPage = 1; applyWall(); }
    });
  });
})(window);
