/* ============================================================
   拦截不应公开的根目录文件：

   BLOCKED 列表里列出的请求会被屏蔽至 404 页面，可自行更改
   ============================================================ */

const BLOCKED = new Set([
  '/README.md',
  '/README.en.md',
  '/LICENSE',
  '/schema.sql',
  '/wrangler.toml',
  '/.gitignore',
]);

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED.has(pathname)) {
    const res = await context.env.ASSETS.fetch(
      new Request(new URL('/404.html', context.request.url))
    );
    return new Response(res.body, { status: 404, headers: res.headers });
  }
  return context.next();
}