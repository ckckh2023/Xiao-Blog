# Xiao-Blog

个人技术博客站点，部署于 Cloudflare Pages，**零构建零依赖，源码即产物**。

> 在线访问：<https://xiao-blog.top>

## 目录结构

```
├── index.html               # 首页
├── wrangler.toml            # Cloudflare Pages 配置项
├── schema.sql               # 留言板 SQL 建表
├── assets/
│   ├── css/                 # 全项目 CSS
│   ├── js/                  # 全项目 JS
│   ├── icons/               # 站点图片
│   └── vendor/              # 第三方 JS 库
├── docs/                    # 文档页
├── repo/                    # 项目页
├── share/                   # 分享页
├── guestbook/               # 留言页
├── friend/                  # 好友页
├── about/                   # 关于页
├── functions/api/
│   ├── article.js           # 文章内容 API
│   ├── docs-count.js        # 文档阅读计数
│   ├── guestbook.js         # 留言板 API
│   └── github/[[path]].js   # GitHub API 代理
├── functions/rss.xml.js     # 动态 RSS 生成
└── functions/sitemap.xml.js # 动态 sitemap 生成
```

## 本地开发

```bash
wrangler pages dev .
```

默认监听 `http://localhost:8788`。

## 部署

```bash
wrangler pages deploy . --project-name=xiao-blog # 生产部署
wrangler d1 execute xiao-guestbook --remote --file=./schema.sql # 数据库初始化
wrangler kv namespace create xiao-repo-cache # 创建 GitHub KV 缓存
```

`wrangler.toml` 已配置 D1 绑定 `GUESTBOOK` -> 数据库 `xiao-guestbook`，KV 绑定 `GITHUB_CACHE` -> namespace `xiao-repo-cache`，需自行更改。

## 环境变量

在 Cloudflare Pages 仪表板 -> 设置 -> **环境变量（机密）** 中配置：

| 变量名 | 说明 |
| --- | --- |
| `GITHUB_TOKEN` | GitHub Classic Token，需要 `public_repo` 权限 |
| `GUESTBOOK_SALT` | 留言板 IP 哈希盐值 |
