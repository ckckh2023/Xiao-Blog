/* ============================================================
   guestbook.js - 留言板专属逻辑
   后端：Cloudflare Pages Functions + D1（xiao-guestbook）
   功能：发布表单（昵称 + 可选 QQ 号获取头像 + Markdown 内容）、留言墙卡片渲染、搜索、刷新、预览、本地缓存
   依赖：common.js（Utils / showNotice / mountSearchBox）+ gb-card.js（GBCard）+ marked + DOMPurify
   加载页面：/guestbook/index.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var API_URL = "/api/guestbook";

  var wallBox = null;
  var wallData = [];

  /* ---------- 留言墙本地缓存（1 天 TTL） ---------- */
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

  /* 卡片渲染共享模块（formatTime/renderBody/gbCardHTML）来自 gb-card.js */
  var gbCard = global.GBCard;

  /* ---------- 留言墙渲染 ---------- */
  function mountWall(list, hasQuery) {
    if (!wallBox) return;
    var items = list || [];
    if (!items.length) {
      wallBox.innerHTML = '<div class="status-box">' +
        (hasQuery ? "未找到匹配的留言。" : "还没有留言，在上方写下第一条吧。") +
        "</div>";
      return;
    }
    /* 按 id 倒序排列（id 递增即时间递增，最新在前） */
    var sorted = items.slice().sort(function (a, b) {
      return (b.id || 0) - (a.id || 0);
    });
    wallBox.innerHTML = '<div class="guestbook-wall">' +
      sorted.map(gbCard.gbCardHTML).join("") + "</div>";
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
    var q = wallQuery.toLowerCase().trim();
    var list = wallData;
    if (q) list = wallData.filter(function (c) { return matchComment(c, q); });
    mountWall(list, !!q);
  }

  function setWall(list) {
    wallData = (list || []).slice();
    applyWall();
  }

  /* ---------- 刷新按钮转圈 ---------- */
  var refreshCount = 0;
  function setRefreshSpinning(on) {
    var btn = document.getElementById("guestbook-refresh");
    if (!btn) return;
    if (on) {
      refreshCount++;
      btn.classList.add("gb-refreshing");
      btn.disabled = true;
    } else {
      refreshCount = Math.max(0, refreshCount - 1);
      if (refreshCount === 0) {
        btn.classList.remove("gb-refreshing");
        btn.disabled = false;
      }
    }
  }

  /* 刷新留言墙：调 API 拉取全部留言 */
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
      if (!wallData.length) {
        wallBox.innerHTML = '<div class="status-box">留言加载失败，请稍后重试。</div>';
      }
    }).then(function () {
      setRefreshSpinning(false);
    });
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

    /* 由 QQ 号生成头像 URL（仅用于获取头像，不存储 QQ 号本身） */
    function avatarFromQQ(qq) {
      if (!qq) return "";
      if (!/^\d{5,11}$/.test(qq)) return null;  /* 格式不合法 */
      return "https://q1.qlogo.cn/g?b=qq&nk=" + qq + "&s=640";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nickname = inputName.value.trim();
      var body = inputBody.value.trim();
      var qq = inputQQ ? inputQQ.value.trim() : "";

      if (!nickname) { setHint("请填写昵称", true); inputName.focus(); return; }
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
        /* 清除本地缓存，确保刷新后立即看到新留言 */
        try { localStorage.removeItem(GB_WALL_CACHE_KEY); } catch (e) {}
        refreshWall();
      }).catch(function () {
        setHint("网络错误，请稍后重试", true);
      }).then(function () {
        setLoading(false);
      });
    });

    /* 预览留言：用当前表单内容渲染一张与留言墙一致的卡片 */
    var previewBtn = document.getElementById("gb-preview");
    var previewBox = document.getElementById("gb-preview-box");
    if (previewBtn && previewBox) {
      previewBtn.addEventListener("click", function () {
        var nickname = inputName.value.trim() || "匿名";
        var body = inputBody.value.trim();
        var qq = inputQQ ? inputQQ.value.trim() : "";
        var avatar = avatarFromQQ(qq);
        if (avatar === null) { setHint("QQ 号应为 5-11 位数字", true); inputQQ.focus(); return; }
        if (!body) { setHint("请先填写留言内容再预览", true); inputBody.focus(); return; }
        setHint("");
        var card = gbCard.gbCardHTML({
          nickname: nickname,
          body: body,
          avatar: avatar,
          created_at: new Date().toISOString()
        });
        card = card.replace('<article class="card gb-card">',
          '<article class="card gb-card gb-preview-card">' +
          '<button class="gb-preview-close" type="button" aria-label="关闭预览" title="关闭预览">×</button>');
        previewBox.innerHTML = '<div class="guestbook-wall">' + card + "</div>";
        previewBox.hidden = false;
        previewBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      previewBox.addEventListener("click", function (e) {
        if (e.target.classList.contains("gb-preview-close")) {
          previewBox.hidden = true;
          previewBox.innerHTML = "";
        }
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
      onQuery: function (q) { wallQuery = q; applyWall(); }
    });
  });
})(window);
