/* ============================================================
   functions/api/guestbook.js - 留言板后端 API
   运行环境：Cloudflare Pages Functions + D1（SQLite）
   路由（由 functions/ 目录约定自动映射到 /api/guestbook）：
     GET  /api/guestbook            获取全部留言（按 id 倒序）
     GET  /api/guestbook?ids=1,2,3  按 id 批量获取（首页精选留言）
     POST /api/guestbook            发布留言（10 分钟/IP 频率限制）
   数据表 messages：id, nickname, body, avatar, ip_hash, created_at
   id 策略：新留言 id = MAX(id) + 1（空表时为 1），显式指定，不依赖 AUTOINCREMENT
   D1 绑定：env.GUESTBOOK（见 wrangler.toml [[d1_databases]] binding = "GUESTBOOK"）
   ============================================================ */

const RATE_LIMIT_MS = 10 * 60 * 1000;   /* 每 IP 10 分钟一次 */
const MAX_NICKNAME = 32;
const MAX_BODY = 2000;
const MAX_AVATAR = 500;

/* ---------- 工具：JSON 响应 ---------- */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

/* ---------- 工具：IP 哈希（SHA-256，不存原 IP） ---------- */
async function hashIP(ip) {
  if (!ip) return "unknown";
  const data = new TextEncoder().encode(ip + "::xiao-gb-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- 工具：行 → 前端对象 ---------- */
function normalize(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    body: row.body,
    avatar: row.avatar || "",
    created_at: row.created_at
  };
}

/* ---------- 幂等建表（与 schema.sql 保持一致，作兜底） ---------- */
async function ensureSchema(env) {
  await env.GUESTBOOK.batch([
    env.GUESTBOOK.prepare(
      "CREATE TABLE IF NOT EXISTS messages (" +
      "id INTEGER PRIMARY KEY, " +
      "nickname TEXT NOT NULL, " +
      "body TEXT NOT NULL, " +
      "avatar TEXT, " +
      "ip_hash TEXT NOT NULL, " +
      "created_at TEXT NOT NULL" +
      ")"
    ),
    env.GUESTBOOK.prepare("CREATE INDEX IF NOT EXISTS idx_msg_ip ON messages(ip_hash)"),
    env.GUESTBOOK.prepare("CREATE INDEX IF NOT EXISTS idx_msg_id ON messages(id DESC)")
  ]);
}

/* ============================================================
   GET /api/guestbook
   ============================================================ */
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    await ensureSchema(env);
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("ids");

    /* 按 id 批量获取（首页精选留言） */
    if (idsParam) {
      const ids = idsParam.split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n) && n > 0);
      if (!ids.length) return json({ list: [] });
      const placeholders = ids.map(() => "?").join(",");
      const { results } = await env.GUESTBOOK.prepare(
        "SELECT * FROM messages WHERE id IN (" + placeholders + ") ORDER BY id DESC"
      ).bind(...ids).all();
      return json({ list: (results || []).map(normalize) });
    }

    /* 获取全部留言（按 id 倒序，id 递增即时间递增） */
    const { results } = await env.GUESTBOOK.prepare(
      "SELECT * FROM messages ORDER BY id DESC"
    ).all();
    return json({ list: (results || []).map(normalize) });
  } catch (e) {
    console.error("[guestbook] 获取留言失败：", e);
    return json({ error: "获取留言失败，请稍后重试" }, 500);
  }
}

/* ============================================================
   POST /api/guestbook
   body: { nickname, body, avatar }
   ============================================================ */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    await ensureSchema(env);

    /* 解析请求体 */
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: "请求体格式错误" }, 400);
    }

    const nickname = String(payload.nickname || "").trim();
    const body = String(payload.body || "").trim();
    const avatar = String(payload.avatar || "").trim();

    /* 字段校验 */
    if (!nickname) return json({ error: "请填写昵称" }, 400);
    if (nickname.length > MAX_NICKNAME) return json({ error: "昵称最多 " + MAX_NICKNAME + " 个字符" }, 400);
    if (!body) return json({ error: "请填写留言内容" }, 400);
    if (body.length > MAX_BODY) return json({ error: "留言内容最多 " + MAX_BODY + " 个字符" }, 400);
    if (avatar && avatar.length > MAX_AVATAR) return json({ error: "头像 URL 过长" }, 400);
    if (avatar && !/^https?:\/\//i.test(avatar)) return json({ error: "头像 URL 需以 http(s):// 开头" }, 400);

    /* IP 哈希 + 频率限制 */
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ipHash = await hashIP(ip);

    const recent = await env.GUESTBOOK.prepare(
      "SELECT created_at FROM messages WHERE ip_hash = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(ipHash).first();

    if (recent && recent.created_at) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      if (elapsed < RATE_LIMIT_MS) {
        const wait = Math.ceil((RATE_LIMIT_MS - elapsed) / 60000);
        return json({ error: "留言过于频繁，请 " + wait + " 分钟后再试" }, 429);
      }
    }

    /* 插入：id = COALESCE(MAX(id), 0) + 1
       INSERT...SELECT 在 D1 单写者锁下原子执行；
       聚合查询空表仍返回 1 行（MAX 为 NULL → COALESCE 取 0 → id=1），故首条留言 id=1 */
    const createdAt = new Date().toISOString();
    await env.GUESTBOOK.prepare(
      "INSERT INTO messages (id, nickname, body, avatar, ip_hash, created_at) " +
      "SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ?, ? FROM messages"
    ).bind(nickname, body, avatar || null, ipHash, createdAt).run();

    /* 取回刚插入的留言（通过 ip_hash + created_at 定位，确保返回正确 id） */
    let inserted = await env.GUESTBOOK.prepare(
      "SELECT * FROM messages WHERE ip_hash = ? AND created_at = ? ORDER BY id DESC LIMIT 1"
    ).bind(ipHash, createdAt).first();

    if (!inserted) {
      /* 兜底：取全表最大 id 的留言 */
      inserted = await env.GUESTBOOK.prepare(
        "SELECT * FROM messages ORDER BY id DESC LIMIT 1"
      ).first();
    }

    return json({ message: normalize(inserted) }, 201);
  } catch (e) {
    console.error("[guestbook] 发布留言失败：", e);
    return json({ error: "发布留言失败，请稍后重试" }, 500);
  }
}
