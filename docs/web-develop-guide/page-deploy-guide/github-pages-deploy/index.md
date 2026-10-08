本文介绍如何将静态页面部署到 **GitHub Pages**。GitHub Pages 是 GitHub 提供的免费静态站点托管服务，适合托管个人博客、项目主页、文档站点等。每个 GitHub 账户可拥有一个用户站点（`<用户名>.github.io`）以及若干项目站点（`<用户名>.github.io/<仓库名>`），均通过仓库分支或 GitHub Actions 进行部署。

> GitHub Pages 对**公开仓库**免费提供，私有仓库需仓库拥有者账号为 GitHub Pro 或以上套餐。站点默认使用 HTTPS，自定义域名也支持强制 HTTPS。

---

## 站点类型

GitHub Pages 提供两种站点类型，部署前需先明确目标：

| 类型 | 仓库名 | 访问地址 | 数量限制 |
|------|--------|----------|----------|
| 用户或组织站点 | `<用户名>.github.io` | `https://<用户名>.github.io` | 每账号 1 个 |
| 项目站点 | 任意 | `https://<用户名>.github.io/<仓库名>` | 每仓库 1 个 |

用户站点的资源必须放在仓库根目录或 `/docs` 目录下；项目站点同理，但路径会多一层 `/<仓库名>`，构建时需注意资源引用路径（通常使用相对路径或配置 `base` 参数）。

---

## 准备工作

### 创建仓库

**用户站点**：新建一个名为 `<你的用户名>.github.io` 的公开仓库（必须与用户名完全一致）。例如用户名为 `ckckh2023`，则仓库名为 `ckckh2023.github.io`。

**项目站点**：新建任意名称的公开仓库即可，例如 `my-project`。

### 准备静态文件

将静态页面（HTML、CSS、JS 及相关资源）放入仓库。最简结构如下：

```
.
├── index.html
├── css/
│   └── style.css
└── js/
    └── main.js
```

若使用构建工具（如 Vite、Webpack），先将产物输出到 `/docs`，再决定如何提交。

---

## 方式一：从分支部署

这是最传统也是最简单的部署方式，GitHub 会直接从指定分支的指定目录提供静态文件服务。

### 操作步骤

- 将静态文件提交到仓库的某个分支；
- 进入仓库 **Settings → Pages**。
- 在 **Source** 下拉框中选择分支与目录：
  - **Deploy from a branch**：选择提交的分支名；
  - **Folder**：选择 `/`（仓库根目录）或 `/docs`（仓库下的 `docs` 目录）。
- 点击 **Save**，等待数分钟后页面顶部会显示站点地址 `https://<用户名>.github.io`。

### 使用 docs 目录

若希望源码与发布产物分离，可将构建产物放入 `/docs` 目录，源码保留在根目录：

```
.
├── src/             # 源码
├── package.json
└── docs/            # 构建产物
    └── index.html
```

然后在 Pages 设置中选择分支 `main` + 目录 `/docs` 即可。这种方式无需额外分支，适合简单项目。

### 使用 gh-pages 分支

更常见的做法是将构建产物推送到独立的 `gh-pages` 分支，保持 `main` 分支仅存放源码：

```bash
npm run build # 构建产物
git subtree push --prefix dist origin gh-pages # 将 dist 内容推送到 gh-pages 分支
```

然后在 Pages 设置中选择分支 `gh-pages` + 目录 `/`。

---

## 方式二：使用 GitHub Actions 部署

Actions 方式更灵活，可在推送时自动构建并部署，适合需要构建步骤的项目（如 Vue、React 等框架产物）。

### 配置工作流

在仓库中新建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 启用 Actions 部署

进入仓库 **Settings → Pages**，在 **Source** 下拉框中选择 **GitHub Actions**。此后每次推送到 `main` 分支都会自动触发构建与部署。

### 框架配置要点

**Vite 项目**：若部署的是项目站点（非用户站点），需在 `vite.config.ts` 中设置 `base`：

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/<仓库名>/',
  build: {
    outDir: 'dist',
  },
})
```

用户站点（`<用户名>.github.io`）则 `base` 设为 `'/'` 即可。

**Vue CLI / Create React App**：同理设置 `publicPath` 或 `homepage` 字段。

---

## 自定义域名

### 绑定域名

- 在仓库或发布目录新建 `CNAME` 文件（无扩展名），内容为你的域名：

  ```text
  www.example.com
  ```

  > [!TIP]
  > 也可在 **Settings → Pages → Custom domain** 中直接填写并保存。

- 到域名 DNS 服务商处添加解析记录：

   | 域名类型 | 记录 | 值 |
   |---------|------|-----|
   | 顶级域名 | A 记录 | `185.199.108.153`<br>`185.199.109.153`<br>`185.199.110.153`<br>`185.199.111.153` |
   | 子域名 | CNAME 记录 | `<用户名>.github.io` |

- Pages 设置有需要可以勾选 **Enforce HTTPS**。

> [!TIP]
> 顶级域名使用 A 记录指向 GitHub 的四个 IP；子域名使用 CNAME 指向 `<用户名>.github.io`。DNS 生效通常需要数分钟到数小时，等待生效即可。

### 域名变更后 404

若自定义域名后访问 404，常见原因：
- `CNAME` 文件未随部署一同提交到发布分支/目录。
- DNS 记录配置错误或尚未生效，可用 `dig <域名>` 验证解析结果。

---

## 常见问题

### 资源路径 404

项目站点路径带 `/<仓库名>` 前缀，若资源引用使用绝对路径 `/css/style.css`，实际会请求 `https://<用户名>.github.io/css/style.css` 导致 404。解决方法：
- 改用相对路径 `./css/style.css`。
- 或在构建工具中配置 `base` / `publicPath` 为 `/<仓库名>/`。

### 部署后页面空白

多为前端路由在刷新时找不到对应文件。可在发布目录添加 `404.html`，或改用 hash 路由模式。GitHub Pages 不支持服务端重写规则，无法像 Nginx 那样将所有路径回退到 `index.html`。

### 单仓库大小限制

GitHub Pages 站点大小建议不超过 1 GB，带宽每月 100 GB。若站点资源较大，建议使用对象存储 + CDN 承载静态资源，仅将 HTML/JS 部署到 Pages。

### 部署不触发

使用 Actions 方式时，确认 **Settings → Pages → Source** 已选为 **GitHub Actions**；若仍为分支方式，工作流虽能运行但产物不会发布。同时检查工作流 `permissions` 是否包含 `pages: write` 与 `id-token: write`。