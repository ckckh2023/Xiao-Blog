记录将静态站点部署到 GitHub Pages 的完整流程，含用户页与项目页两种模式。

## 1. 两种部署模式

- **用户/组织页**：仓库名形如 `username.github.io`，部署后访问地址为 `https://username.github.io/`，站点根目录为仓库根。
- **项目页**：任意仓库，部署后访问地址为 `https://username.github.io/repo-name/`，路径需带子目录前缀。

## 2. 配置发布源

在仓库 `Settings → Pages` 中选择发布源：

- 部署整个 `main` 分支根目录
- 部署 `main` 分支下的 `/docs` 目录
- 部署 GitHub Actions 构建产物

## 3. 推送即部署

```sh
git add .
git commit -m "deploy: update site"
git push origin main
```

推送后可在 Pages 设置页查看构建进度，约 1-2 分钟生效。

## 4. 自定义域名

在仓库根放置 `CNAME` 文件写入域名，并在域名解析处添加 CNAME 记录指向 `username.github.io`。

> 提示：启用 HTTPS 可在 Pages 设置中勾选 Enforce HTTPS，GitHub 会自动签发证书。

## 5. 常见问题

- 资源 404：多为路径未使用根相对路径（`/assets/...`），项目页需加子目录前缀。
- 缓存未更新：强刷浏览器或等待 CDN 缓存过期。
- Jekyll 处理干扰：在根目录添加 `.nojekyll` 文件可跳过 Jekyll 构建。
