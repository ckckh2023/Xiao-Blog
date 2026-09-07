/* functions/rss.xml.js
   动态生成 RSS 2.0 订阅源 → /rss.xml
   读取 /docs/DocsList.json，递归遍历所有节点，
   GET 读取 index.md，提取首段摘要填入 <description>。 */
const SITE = "https://xiao-blog.top";
const DOCS = "/docs/";
const SUMMARY_MAX = 200;

function docHref(ids) {
  var url = DOCS + "article?id=" + encodeURIComponent(ids[0]);
  if (ids[1]) url += "&sub=" + encodeURIComponent(ids[1]);
  if (ids[2]) url += "&sub2=" + encodeURIComponent(ids[2]);
  return url;
}

function docMdPath(ids) {
  return DOCS + ids.map(encodeURIComponent).join("/") + "/index.md";
}

function walk(list, ids, titles, nodes) {
  list.forEach(function (it) {
    var childIds = ids.concat([it.id]);
    var childTitles = titles.concat([it.title]);
    nodes.push({ ids: childIds, title: childTitles.join(" - ") });
    if (it.children) walk(it.children, childIds, childTitles, nodes);
  });
}

function escapeXML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripMD(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "");
}

function extractSummary(md, max) {
  var lines = String(md).split(/\r?\n/);
  var buf = "";
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (!raw) continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(raw)) continue;
    var clean = stripMD(raw).trim();
    if (!clean) continue;
    if (buf) buf += " ";
    buf += clean;
    if (buf.length >= max) break;
  }
  if (buf.length > max) buf = buf.slice(0, max) + "…";
  return buf;
}

export async function onRequestGet(context) {
  var env = context.env;
  var list = [];
  if (env && env.ASSETS) {
    try {
      var resp = await env.ASSETS.fetch(new Request(SITE + DOCS + "DocsList.json"));
      if (resp.ok) list = await resp.json();
    } catch (e) {}
  }

  var nodes = [];
  walk(list, [], [], nodes);

  var fetched = await Promise.all(
    nodes.map(function (n) {
      if (!env || !env.ASSETS) return Promise.resolve(null);
      return env.ASSETS
        .fetch(new Request(SITE + docMdPath(n.ids)))
        .then(function (r) {
          if (!r.ok) return null;
          return r.text().then(function (md) {
            return { ids: n.ids, title: n.title, summary: extractSummary(md, SUMMARY_MAX) };
          });
        })
        .catch(function () { return null; });
    })
  );
  var items = fetched.filter(function (n) { return n !== null; });

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n';
  xml += "    <title>" + escapeXML("ckckh2023 的博客") + "</title>\n";
  xml += "    <link>" + SITE + "</link>\n";
  xml += "    <description>" + escapeXML("记录学习与开发经验，分享实用工具与资源") + "</description>\n";
  xml += "    <language>zh-CN</language>\n";
  xml += "    <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n";
  items.forEach(function (it) {
    var url = SITE + docHref(it.ids);
    xml += "    <item>\n";
    xml += "      <title>" + escapeXML(it.title) + "</title>\n";
    xml += "      <link>" + escapeXML(url) + "</link>\n";
    xml += "      <guid>" + escapeXML(url) + "</guid>\n";
    xml += "      <description>" + escapeXML(it.summary) + "</description>\n";
    xml += "    </item>\n";
  });
  xml += "  </channel>\n</rss>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
