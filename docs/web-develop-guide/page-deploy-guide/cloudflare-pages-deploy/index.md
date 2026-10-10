本文介绍如何将静态页面部署到 **Cloudflare Pages**。Cloudflare Pages 是 Cloudflare 提供的全栈静态站点托管服务，直接运行于 Cloudflare 全球边缘网络，具备免费 SSL、自动缓存、Git 触发部署以及 Pages Functions（边缘函数）等能力。部署方式有两种：**连接 Git 仓库**和 **使用 Wrangler CLI**。

> Cloudflare Pages 有每月 500 次构建、无限请求、无限带宽、单个项目最多 20 个预览部署的惠民免费额度，对绝大多数个人项目与文档站点完全够用。

---

## 前置准备

注册 Cloudflare 账号并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。两种部署方式均需在 **Workers & Pages** 模块下操作。

> [!CAUTION]
> 若选择 Wrangler CLI 方式，还需本地安装 Node.js（v18+）及 Wrangler。

Nodejs 可前往查看我的[分享页](https://xiao-blog.top/share/?type=other&name=nodejs)，下载并安装最新版本，Windows 用户点击[此处](https://nodejs.org/dist/v24.21.0/node-v24.21.0-x64.msi)直接下载并安装即可。

Wrangler 可在 Node.js 环境安装好后执行该命令安装：

```bash
npm install -g wrangler
```

> [!TIP]
> 可使用 `wrangler --version` 检验是否安装好。

---

## 方式一：连接到 GitHub

此方式将 Cloudflare Pages 与 GitHub 仓库关联，每次推送到指定分支即自动触发构建与部署，无需本地安装任何工具。适合代码托管在 GitHub、希望持续部署的项目。

### 创建 Pages 项目

- 进入 Dashboard → **计算** → **Workers 和 Pages** → **创建应用程序** → **Continue with GitHub**。

- 首次使用会要求授权 Cloudflare 访问 GitHub 账号。可选择授权全部仓库，或仅授权指定仓库。

- 在仓库列表中选中目标仓库，点击 **Begin setup**。

### 配置构建

在 **Set up builds and deployments** 页面填写以下信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Production branch | 触发生产部署的分支 | `main` |
| Framework preset | 框架预置 | `Vite` / `Vue` / `None` |
| Build command | 构建命令 | `npm run build` |
| Build output directory | 构建产物目录 | `dist` |
| Root directory | 仓库子目录作为构建根 | `/` |

纯静态页面（无构建步骤）可将 Framework preset 选为 `None`，Build command 留空，Build output directory 填 `.` 或 `public` 等存放 HTML 的目录。

### 配置环境变量（可选）

在 **Environment variables** 步骤添加构建期所需变量，例如：

| 变量名 | 值 |
|--------|-----|
| `NODE_VERSION` | `20` |
| `VITE_API_URL` | `https://api.example.com` |

生产环境与预览环境（Preview）的变量分别配置，互不影响。

### 保存并部署

点击 **Save and Deploy**，Cloudflare 会首次拉取仓库并执行构建。构建日志实时输出，完成后页面顶部显示访问地址：

- 生产：`https://<项目名>.pages.dev`
- 预览：`https://<commit-hash>.<项目名>.pages.dev`

### 后续部署流程

配置完成后，日常部署只需：

```bash
git add .
git commit -m "update content"
git push origin main
```

推送到 `main` 分支即触发生产部署；推送到其他分支则触发预览部署。可在部署页查看每次构建状态与日志，支持一键回滚到任意历史版本。

> [!TIP]
> 也可在仓库设置中接入其他 Git 提供商（GitLab），同理执行对应操作即可。

---

## 方式二：使用 Wrangler CLI

此方式不依赖 Git 集成，直接从本地上传构建产物到 Cloudflare Pages，适合希望手动控制发布内容的用户。

### 连接 Cloudflare

```bash
wrangler login
```

执行后浏览器会打开授权页面，点击 **Allow** 完成登录。验证当前账号：

```bash
wrangler whoami
```

### 创建 Pages 项目

首次部署需创建项目：

```bash
wrangler pages project create my-site --production-branch=main
```

`--production-branch` 指定生产分支名，后续部署该分支时即标记为生产部署。

### 部署构建产物

将构建产物目录（如 `dist`）上传部署：

```bash
wrangler pages deploy ./dist --project-name=my-site --branch=main
```

| 参数 | 说明 |
|------|------|
| `./dist` | 要部署的目录路径 |
| `--project-name` | 目标 Pages 项目名 |
| `--branch` | 部署目标分支 |
| `--commit-dirty` | 附带当前 git commit 信息 |

部署成功后命令行会输出访问地址：

```text
✨ Deployment complete! Take a peek over at https://<commit-hash>.my-site.pages.dev
```

### 本地开发预览

Wrangler 可在本地启动开发服务器预览站点，模拟边缘运行时：

```bash
wrangler pages dev ./dist
```

默认监听 `http://localhost:8787`。

### 配置文件

对于含 Pages Functions、D1 数据库等绑定的项目，建议在仓库根目录添加配置文件。

```toml
name = "my-site"
compatibility_date = "2026-09-01"
pages_build_output_dir = "."

# 绑定 D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "<数据库ID>"
```

> [!TIP]
> `pages_build_output_dir` 指定构建产物目录。配置 D1、KV、R2 等绑定的 ID 可通过 `npx wrangler d1 list` 等命令查询。完整字段参考 [Wrangler 配置文档](https://developers.cloudflare.com/workers/wrangler/configuration/)。

配置完成后部署命令可简化，因为会自动读取配置。

```bash
wrangler pages deploy . --project-name=my-site
```

### 在 CI/CD 中部署

Wrangler CLI 可集成到任意 CI/CD 平台。推荐使用 API Token 而非交互登录：

- 在 Dashboard → **My Profile → API Tokens** 创建 Token，模板选择 **Edit Cloudflare Workers**。

- 在 CI 环境中设置环境变量：

   ```bash
   export CLOUDFLARE_API_TOKEN="<你的API Token>"
   export CLOUDFLARE_ACCOUNT_ID="<你的Account ID>"
   ```

- 部署命令与本地一致：

   ```bash
   wrangler pages deploy ./dist --project-name=my-site --branch=main
   ```

> [!CAUTION]
> GitHub Actions 中可直接使用 `cloudflare/pages-action@v1` 或上述命令。但是不要将 API Token 提交到仓库，应存放在 Actions Secrets 或 CI 平台的加密变量中。

---

## 自定义域名

### 绑定域名

- 进入 Dashboard → **自定义域** → **设置自定义域**。

- 输入域名，点击 **继续**。

- 若域名已在 Cloudflare 托管，Cloudflare 会自动添加所需 CNAME 记录；否则按提示到域名 DNS 服务商处手动添加：

   | 记录类型 | 名称 | 值 |
   |---------|------|-----|
   | CNAME | `www` 或 `blog` | `<项目名>.pages.dev` |

- 等待证书签发，状态变为 **Active** 即可访问。

> [!TIP]
> 顶级域名（如 `example.com`）绑定到 Pages 时，Cloudflare 会自动配置根域 CNAME flattening。若域名不在 Cloudflare 托管，需在 DNS 服务商处添加 CNAME 记录指向 `<项目名>.pages.dev`，部分 DNS 服务商不支持根域 CNAME，可改用 ALIAS/ANAME 记录或迁移 DNS 到 Cloudflare。

---

## 常见问题

### Q：构建失败：Module not found

**A：** 多为构建命令或输出目录配置错误。确认 Framework preset 与项目实际框架一致；若使用 monorepo，正确填写 Root directory。可在 Dashboard → Deployments → 失败记录 → **Retry deployment** 查看完整日志定位。

### Q：wrangler pages deploy 报错 "project not found"

**A：** 项目名拼写错误或尚未创建。先用 `npx wrangler pages project list` 查看已有项目；首次部署务必先执行 `pages project create`。

### Q：部署后页面空白或路由 404

**A：** Cloudflare Pages 对单页应用（SPA）默认将所有未匹配路径回退到 `index.html`，无需额外配置。若仍 404，检查 `_routes.json` 或 `_redirects` 是否误排除了相关路径。可在发布目录添加 `_redirects`：

```
/*  /index.html  200
```

### Q：Functions 不生效

**A：** 确认 Edge Functions 函数文件位于仓库的 `functions/` 目录下，且文件名符合路由约定。Wrangler 部署时 `pages_build_output_dir` 应指向含 `functions/` 的项目根目录，而非仅构建产物目录！

> [!CAUTION]
> 本人已经遇上过这样的情况，请严格注意函数文件位置！

### Q：超出免费额度

**A：** 免费额度每月 500 次构建。频繁构建可合并提交或仅在必要时部署，超额后可升级至 Pages Pro 或 Workers Paid 计划获取更高额度。