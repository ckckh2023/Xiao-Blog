# Xiao-Blog

[中文](README.md) | English

A personal tech blog site deployed on Cloudflare Pages — **zero build, zero dependencies, the source is the artifact**.

> Live site: <https://xiao-blog.top>

## Directory Structure

```
├── index.html               # Home page
├── wrangler.toml            # Cloudflare Pages config
├── schema.sql               # Guestbook SQL schema
├── assets/
│   ├── css/                 # All CSS
│   ├── js/                  # All JS
│   ├── icons/               # Site images
│   └── vendor/              # Third-party JS libraries
├── docs/                    # Docs pages
├── repo/                    # Projects pages
├── share/                   # Share pages
├── guestbook/               # Guestbook page
├── friend/                  # Friends page
├── about/                   # About page
├── functions/api/
│   ├── article.js           # Article content API
│   ├── docs-count.js        # Docs reading counter
│   ├── guestbook.js         # Guestbook API
│   └── github/[[path]].js   # GitHub API proxy
├── functions/rss.xml.js     # Dynamic RSS generation
└── functions/sitemap.xml.js # Dynamic sitemap generation
```

## Local Development

```bash
wrangler pages dev .
```

Listens on `http://localhost:8788` by default.

## Deployment

```bash
wrangler pages deploy . --project-name=xiao-blog # Production deploy
wrangler d1 execute xiao-guestbook --remote --file=./schema.sql # Database init
wrangler kv namespace create xiao-repo-cache # Create GitHub KV cache
```

`wrangler.toml` already binds the D1 database `GUESTBOOK` -> `xiao-guestbook` and the KV namespace `GITHUB_CACHE` -> `xiao-repo-cache`. Replace these with your own.

## Environment Variables

Configure under Cloudflare Pages dashboard -> Settings -> **Environment variables (secrets)**:

| Variable | Description |
| --- | --- |
| `GITHUB_TOKEN` | GitHub Classic Token, requires `public_repo` scope |
| `GUESTBOOK_SALT` | Salt for guestbook IP hashing |

## Thanks to Open Source

If you forked my project and plan to use it to build your own blog, you can invite me as a collaborator on your repo — I'll push my fixes and optimization patches to you~