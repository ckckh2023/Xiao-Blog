# Xiao-Blog

个人技术博客站点，部署于 Cloudflare Pages，**零构建零依赖，源码即产物**。

> 在线访问：<https://xiao-blog.top>

## 目录结构

```
├── index.html              # 首页
├── wrangler.toml           # Cloudflare Pages 配置项
├── schema.sql              # 留言板 SQL 建表
├── robots.txt
├── assets/
│   ├── css/                # 全项目 CSS
│   ├── js/                 # 全项目 JS
│   └── vendor/             # 第三方 JS 库
├── docs/                   # 文档页
├── repo/                   # 项目页
├── share/                  # 分享页
├── guestbook/              # 留言页
├── friend/                 # 好友页
├── about/                  # 关于页
└── functions/              # Edge Functions
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
