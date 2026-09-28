# Xiao-Blog

个人技术博客站点，部署于 Cloudflare Pages，**零构建零依赖，源码即产物**。

在线访问：<https://xiao-blog.top>

## 功能特性

- **首页**：聚合 GitHub 个人信息，可自行增删更改
- **项目展示**：Vue 3 渲染卡片网格，实时搜索
- **文档知识库**：多级目录树，支持 `docs/star.json` 精选文档
- **星标分享库**：双数据源，支持 `?type=software|other&name=xxx` URL 双映射直达
- **留言板**：Cloudflare D1 持久化，支持 Markdown 渲染
- **好友页与关于页**：好友列表、站点统计、隐私政策
- **RSS 订阅**：Edge Function 动态生成 RSS 2.0
- **主题系统**：深浅色切换
- **完整 SEO**：sitemap.xml / robots.txt / OG meta / Twitter Card

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML / CSS / JavaScript + Vue 3 |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 SQLite |
| 部署 | Cloudflare Pages + wrangler CLI |

第三方库以本地化文件形式置于 `assets/vendor/`，无 CDN 运行时依赖。

## 目录结构

```
├── index.html              # 首页
├── wrangler.toml           # Cloudflare Pages 配置
├── schema.sql              # 留言板 SQL 建表
├── robots.txt              # 网站爬虫协议
├── assets/
│   ├── css/                # 页面样式
│   ├── js/                 # 脚本
│   └── vendor/             # 第三方库
├── docs/                   # 文档知识库
├── repo/                   # 项目展示
├── share/                  # 分享库
├── guestbook/              # 留言板
├── friend/                 # 好友页
├── about/                  # 关于页
└── functions/              # Edge Functions 后端
    ├── api/guestbook.js    # 留言板 API
    ├── rss.xml.js          # 动态 RSS 生成
    └── sitemap.xml.js      # 动态 sitemap 生成
```

## 本地开发

```bash
wrangler pages dev .
```

默认监听 `http://localhost:8788`。

> 留言板 API 需要 D1 绑定，本地 dev 会自动读取 `wrangler.toml` 配置。

## 部署

```bash
wrangler pages deploy . --project-name=xiao-blog # 生产部署
wrangler d1 execute xiao-guestbook --remote --file=./schema.sql # 数据库初始化
```

> `wrangler.toml` 已配置 D1 绑定 `GUESTBOOK` → 数据库 `xiao-guestbook`，需自行更改。

## 致谢

Powered by Cloudflare Pages · Edge Runtime · D1
