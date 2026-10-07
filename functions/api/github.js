/* ============================================================
   GitHub API 代理与 KV 缓存的实现
   前端请求 /api/github/{path} -> 代理到 https://api.github.com/{path}
   KV 命中且未过期则直接返回缓存，过期则带 ETag 协商回源

   可以将 GITHUB_TOKEN 放到 CF Secrets 来提高限额
   ============================================================*/
var GITHUB_API_BASE = "https://api.github.com/";
var CACHE_TTL = 3600; /* 1 小时 */

function jsonResponse(data, etag, cacheStatus) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "ETag": etag || "",
      "X-Cache": cacheStatus,
      "Cache-Control": "public, max-age=60"
    }
  });
}

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var url = new URL(request.url);
  var ghPath = url.pathname.replace(/^\/api\/github\/?/, "");
  if (!ghPath) return new Response("Bad Request", { status: 400 });
  var ghUrl = GITHUB_API_BASE + ghPath + (url.search || "");
  var cacheKey = "gh:" + ghPath + (url.search || "");

  var ghHeaders = {
    "User-Agent": "Xiao-Blog-Proxy",
    "Accept": "application/vnd.github+json"
  };
  if (env.GITHUB_TOKEN) ghHeaders["Authorization"] = "Bearer " + env.GITHUB_TOKEN;

  /* 查 KV 缓存 */
  var cached = null;
  if (env.GITHUB_CACHE) {
    try {
      var raw = await env.GITHUB_CACHE.get(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}
  }

  if (cached && (Date.now() - cached.t) < CACHE_TTL * 1000) return jsonResponse(cached.d, cached.etag, "HIT-KV");

  /* 回源 GitHub，带 KV 中的 ETag 做协商 */
  if (cached && cached.etag) ghHeaders["If-None-Match"] = cached.etag;

  try {
    var ghRes = await fetch(ghUrl, { headers: ghHeaders });

    if (ghRes.status === 304 && cached) {
      cached.t = Date.now();
      if (env.GITHUB_CACHE) await env.GITHUB_CACHE.put(cacheKey, JSON.stringify(cached));
      return jsonResponse(cached.d, cached.etag, "HIT-ETag");
    }

    if (!ghRes.ok) {
      if (cached) return jsonResponse(cached.d, cached.etag, "STALE");
      return new Response("GitHub API error: " + ghRes.status, { status: ghRes.status });
    }

    var etag = ghRes.headers.get("ETag") || "";
    var data = await ghRes.json();
    if (env.GITHUB_CACHE) await env.GITHUB_CACHE.put(cacheKey, JSON.stringify({ t: Date.now(), etag: etag, d: data }));
    return jsonResponse(data, etag, "MISS");
  }
  catch (err) {
    if (cached) return jsonResponse(cached.d, cached.etag, "STALE");
    return new Response("Proxy error: " + err.message, { status: 502 });
  }
}