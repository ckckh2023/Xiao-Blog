-- ============================================================
-- schema.sql - 留言板数据库初始化（Cloudflare D1 / SQLite）
-- 用法：
--   本地：  wrangler d1 execute xiao-guestbook --local  --file=./schema.sql
--   远程：  wrangler d1 execute xiao-guestbook --remote --file=./schema.sql
-- 重置（清空所有留言后重建）：
--   wrangler d1 execute xiao-guestbook --remote --command="DROP TABLE IF EXISTS messages"
--   wrangler d1 execute xiao-guestbook --remote --file=./schema.sql
-- ============================================================

-- 留言表
-- id 由后端显式指定为 MAX(id)+1，故不使用 AUTOINCREMENT（避免 sqlite_sequence 与显式 id 不一致）
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY,
  nickname   TEXT NOT NULL,
  body       TEXT NOT NULL,
  avatar     TEXT,
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ip_hash 索引：频率限制查询（WHERE ip_hash = ? ORDER BY created_at DESC LIMIT 1）
CREATE INDEX IF NOT EXISTS idx_msg_ip ON messages(ip_hash);

-- id 倒序索引：留言墙按 id 排序获取（ORDER BY id DESC）
CREATE INDEX IF NOT EXISTS idx_msg_id ON messages(id DESC);
