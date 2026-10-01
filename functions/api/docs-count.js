/* ============================================================
   functions/api/docs-count.js - 文档计数 API
   路由：GET /api/docs-count
   返回：{ ok, count }
   - count：DocsList.json 树中的叶子节点数
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

/* 递归统计叶子节点 */
function countLeaves(list) {
  var n = 0;
  list.forEach(function (it) {
    if (it.children && it.children.length) n += countLeaves(it.children);
    else n++;
  });
  return n;
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env || !env.ASSETS) return json({ ok: false, error: "ASSETS 未绑定" }, 500);

  try {
    var resp = await env.ASSETS.fetch(new Request(SITE + DOCS + "DocsList.json"));
    if (!resp.ok) return json({ ok: false, error: "DocsList.json 不存在" }, 404);
    var list = await resp.json();
    if (!Array.isArray(list)) return json({ ok: false, error: "DocsList 格式错误" }, 500);

    return json({ ok: true, count: countLeaves(list) });
  }
  catch (e) {
    console.error("[docs-count] 获取失败：", e);
    return json({ ok: false, error: "获取文档计数失败" }, 500);
  }
}