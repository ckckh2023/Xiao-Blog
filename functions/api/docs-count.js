/* ============================================================
   functions/api/docs-count.js - 文档计数 API
   路由：GET /api/docs-count
   返回：{ ok, count }
   - count：DocsList.json 树中实际存在 index.md 的节点数

   Cache-Control: 5 分钟边缘缓存
   ============================================================ */

const SITE = "https://xiao-blog.top";
const DOCS = "/docs/";

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

/* 递归收集所有文档节点的 id 路径 */
function walkDocs(list, ids, nodes) {
  list.forEach(function (it) {
    var childIds = ids.concat([it.id]);
    nodes.push(childIds);
    if (it.children) walkDocs(it.children, childIds, nodes);
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env || !env.ASSETS) return json({ ok: false, error: "ASSETS 未绑定" }, 500);

  try {
    var resp = await env.ASSETS.fetch(new Request(SITE + DOCS + "DocsList.json"));
    if (!resp.ok) return json({ ok: false, error: "DocsList.json 不存在" }, 404);
    var list = await resp.json();
    if (!Array.isArray(list)) return json({ ok: false, error: "DocsList 格式错误" }, 500);

    var nodes = [];
    walkDocs(list, [], nodes);

    var count = 0;
    await Promise.all(nodes.map(function (ids) {
      var mdPath = DOCS + ids.map(encodeURIComponent).join("/") + "/index.md";
      return env.ASSETS.fetch(new Request(SITE + mdPath, { method: "HEAD" })).then(function (r) {
        if (r.ok) count++;
      }).catch(function () {});
    }));

    return json({ ok: true, count: count });
  }
  catch (e) {
    console.error("[docs-count] 获取失败：", e);
    return json({ ok: false, error: "获取文档计数失败" }, 500);
  }
}