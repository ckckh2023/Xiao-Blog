/* functions/sitemap.xml.js
   动态生成 sitemap → /sitemap.xml
   读取 /docs/DocsList.json，递归遍历所有节点，
   仅包含实际存在 index.md 的文章（HEAD 探测）。
   叠加静态栏目页（首页、各栏目入口、rss.xml）。 */
const SITE = "https://xiao-blog.top";
const DOCS = "/docs/";

function docHref(ids) {
  var url = DOCS + "article?id=" + encodeURIComponent(ids[0]);
  if (ids[1]) url += "&sub=" + encodeURIComponent(ids[1]);
  if (ids[2]) url += "&sub2=" + encodeURIComponent(ids[2]);
  return url;
}

function docMdPath(ids) {
  return DOCS + ids.map(encodeURIComponent).join("/") + "/index.md";
}

function walk(list, ids, nodes) {
  list.forEach(function (it) {
    var childIds = ids.concat([it.id]);
    nodes.push({ ids: childIds });
    if (it.children) walk(it.children, childIds, nodes);
  });
}

function escapeXML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* 静态栏目页：loc / changefreq / priority */
var STATIC_PAGES = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/docs/", changefreq: "weekly", priority: "0.9" },
  { loc: "/repo/", changefreq: "monthly", priority: "0.6" },
  { loc: "/friend/", changefreq: "monthly", priority: "0.5" },
  { loc: "/guestbook/", changefreq: "weekly", priority: "0.5" },
  { loc: "/share/", changefreq: "monthly", priority: "0.5" },
  { loc: "/about/", changefreq: "monthly", priority: "0.4" },
  { loc: "/rss.xml", changefreq: "weekly", priority: "0.3" }
];

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
  walk(list, [], nodes);

  var checked = await Promise.all(
    nodes.map(function (n) {
      if (!env || !env.ASSETS) return Promise.resolve(null);
      return env.ASSETS
        .fetch(new Request(SITE + docMdPath(n.ids), { method: "HEAD" }))
        .then(function (r) {
          if (!r.ok) return null;
          var lm = r.headers.get("last-modified");
          return lm ? { ids: n.ids, lastmod: lm } : n;
        })
        .catch(function () { return null; });
    })
  );
  var articles = checked.filter(function (n) { return n !== null; });

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_PAGES.forEach(function (p) {
    xml += "  <url>\n";
    xml += "    <loc>" + escapeXML(SITE + p.loc) + "</loc>\n";
    xml += "    <changefreq>" + p.changefreq + "</changefreq>\n";
    xml += "    <priority>" + p.priority + "</priority>\n";
    xml += "  </url>\n";
  });

  articles.forEach(function (it) {
    xml += "  <url>\n";
    xml += "    <loc>" + escapeXML(SITE + docHref(it.ids)) + "</loc>\n";
    if (it.lastmod) xml += "    <lastmod>" + escapeXML(it.lastmod) + "</lastmod>\n";
    xml += "    <changefreq>monthly</changefreq>\n";
    xml += "    <priority>0.7</priority>\n";
    xml += "  </url>\n";
  });

  xml += "</urlset>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
