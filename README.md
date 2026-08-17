# Xiao-Blog

个人技术博客站点，部署于 Cloudflare Pages。零构建零依赖，源码即产物。

在线访问：<https://xiao-blog.top>

## 功能特性

- **首页**：聚合 GitHub 个人信息、精选项目 / 文档 / 分享 / 留言
- **项目展示**：Vue 3 渲染卡片网格，GitHub API enrich（ETag 缓存 + localStorage 兜底），实时搜索
- **文档知识库**：多级目录树 + Markdown 渲染 + 面包屑 / 上下页分页 + 动态 SEO 元数据
- **星标分享库**：软件 / 其他双数据源，分类 → 标签 → 搜索三级叠加筛选；支持 `?type=software|other&name=xxx` URL 双映射直达
- **留言板**：Cloudflare D1 持久化，Markdown 内容，IP 加盐哈希 + 频率限制
- **好友页 / 关于页**：好友列表、站点统计、隐私政策
- **RSS 订阅**：Edge Function 动态生成 RSS 2.0，1 小时缓存
- **主题系统**：深浅色切换，`theme-init.js` 在 head 最早加载防 FOUC 闪白
- **完整 SEO**：sitemap.xml / robots.txt / OG meta / Twitter Card / JSON-LD

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML / CSS / JavaScript + Vue 3 |
| Markdown | marked 4.3 + DOMPurify |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 SQLite |
| 部署 | Cloudflare Pages + wrangler CLI |

第三方库（Vue 3、marked）以本地化文件形式置于 `assets/vendor/`，无 CDN 运行时依赖。

## 目录结构

```
├── index.html              # 首页（聚合精选内容）
├── wrangler.toml           # Cloudflare Pages 配置（D1 绑定）
├── schema.sql              # 留言板建表 SQL
├── sitemap.xml / robots.txt
├── assets/
│   ├── css/                # 页面样式（common + 各页面）
│   ├── js/                 # 脚本（common.js 全局，其余按页面）
│   └── vendor/             # vue.global.js + marked.min.js（本地化）
├── docs/                   # 文档知识库（DocsList.json + Markdown 文章）
├── repo/                   # 项目展示（Vue 渲染 + GitHub API enrich）
├── share/                  # 分享库（软件 + 其他资源）
├── guestbook/              # 留言板
├── friend/                 # 好友页
├── about/                  # 关于页
└── functions/              # Edge Functions 后端
    ├── api/guestbook.js    # 留言板 API（GET/POST，IP 哈希 + 频率限制）
    └── rss.xml.js          # 动态 RSS 生成
```

## 本地开发

```bash
wrangler pages dev .
```

默认监听 `http://localhost:8788`。留言板 API 需要 D1 绑定，本地 dev 会自动读取 `wrangler.toml` 配置。

## 部署

```bash
# 生产部署
wrangler pages deploy . --project-name=xiao-blog

# 数据库初始化（首次或重置）
wrangler d1 execute xiao-guestbook --remote --file=./schema.sql
```

`wrangler.toml` 已配置 D1 绑定 `GUESTBOOK` → 数据库 `xiao-guestbook`。

## 路由约定

- **静态文件**：按目录路径直接访问（如 `/repo/index.html`）
- **Edge Functions**：`functions/` 目录约定自动映射
  - `functions/api/guestbook.js` → `/api/guestbook`
  - `functions/rss.xml.js` → `/rss.xml`
- **文章页**：`/docs/article.html?id=vue-guide` 或多级 `/docs/article.html?id=deploy&sub=overview`
- **分享页直达**：`/share/?type=software&name=db-browser-sqlite`

## 安全设计

- 留言板 IP 经 SHA-256 加盐哈希存储，不保存原 IP
- 10 分钟 / IP 频率限制
- Markdown 正文经 DOMPurify 消毒，防 XSS
- 字段长度校验

## 致谢

Powered by Cloudflare Pages · Edge Runtime · D1
