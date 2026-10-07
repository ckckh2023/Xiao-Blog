-- ============================================================
-- schema.sql - 留言板数据库初始化
-- 本地：  wrangler d1 execute <sqlite name> --local  --file=./schema.sql
-- 远程：  wrangler d1 execute <sqlite name> --remote --file=./schema.sql

-- 重置：  wrangler d1 execute <sqlite name> --remote --command="DROP TABLE IF EXISTS messages"
--         wrangler d1 execute <sqlite name> --remote --file=./schema.sql
-- ============================================================

-- 留言表
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY,
  nickname   TEXT NOT NULL,
  body       TEXT NOT NULL,
  avatar     TEXT,
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ip_hash 索引：频率限制查询
CREATE INDEX IF NOT EXISTS idx_msg_ip ON messages(ip_hash);

-- id 倒序索引：留言墙按 id 排序获取
CREATE INDEX IF NOT EXISTS idx_msg_id ON messages(id DESC);
