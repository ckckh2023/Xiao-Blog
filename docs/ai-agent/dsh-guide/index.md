以下是 **DeepSeek Harness（dsh）** 的完整使用方法教程，涵盖安装、启动、配置与插件管理。你可以在我的 [dsh 分享页](https://xiao-blog.top/share/?type=software&name=dsh)找到它

---

### 什么是 dsh？

DeepSeek Harness（简称 **dsh**）是 DeepSeek 开源的一款 AI Agent 运行框架，核心设计理念是 **"一切皆插件"** ——模型、工具、Agent 循环、UI 界面等所有能力均由插件组合而成，可自由替换与灵活重组。

> 注意⚠️：社区已经开发了 DeepSeek Harness 桌面版，，该版本并非官方产物，如果你非常懒人不想折腾，可以直接[点此](https://www.dshdesktop.cn/)下载使用。
---

## 环境准备

### 1. 安装 Node.js（必需）

dsh 需要 **Node.js ≥ 22**，推荐使用 24+ LTS 版本。

可前往查看我分享的 [Node.js 运行时](https://xiao-blog.top/share/?type=other&name=nodejs)，下载并安装最新版本。

> Windows 用户懒人版安装教程：点击[此处](https://nodejs.org/dist/v24.19.0/node-v24.19.0-x64.msi)直接下载并安装即可

### 2. 安装 pnpm（插件管理必需）

dsh 的插件管理依赖 `pnpm`，需要提前全局安装：

```bash
npm install -g pnpm
```

> 安装完成后**必须重启终端**，让系统环境变量生效，否则 `dsh plugin` 命令会报错找不到 pnpm。

> 如果你在Windows环境遇到了下列报错，请查看此篇[文档](https://xiao-blog.top/docs/article?id=ai-agent&sub=npm-question)：
```
Get-ExecutionPolicy : Restricted
. : 因为在此系统上禁止运行脚本...
```

---

## 安装与启动 dsh

### 方式一：npx 一键启动（临时体验，推荐首次使用）

不全局安装，直接通过 npx 启动：

```bash
npx @deepseek-ai/dsh web
```

执行后浏览器打开 `http://127.0.0.1:3080` 页面即可开始使用。

> 首次使用会自动初始化配置目录。这种方式适合快速体验，每次启动都会检查最新版本。

### 方式二：全局安装（日常使用推荐）

```bash
npm install -g @deepseek-ai/dsh
```

> 如果你遇到了下列报错，请查看此篇[文档](https://xiao-blog.top/docs/article?id=ai-agent&sub=npm-question)：
```
npm warn install-scripts Run `npm install -g --allow-scripts=...` to allow these scripts once, or `npm config set allow-scripts=... --location=user` to allow them for all global installs.
```

安装完成后，直接使用 `dsh` 命令：

```bash
dsh web
```

执行后浏览器打开 `http://127.0.0.1:3080` 页面即可开始使用。

### 方式三：通过 Python SDK 安装

```bash
pip install deepseek-harness-sdk
```

>  本人没使用过也不清楚具体使用方法，请参考[官方文档](https://deepseek-harness.github.io/deepseek-harness/)。

---

## 首次启动配置

浏览器打开 `http://127.0.0.1:3080` 后：

1. 进入 **设置 → 模型**，填入你的 API 密钥（如 DeepSeek API Key）并保存。
2. 选择工作区目录和运行模式。
3. 新建会话，开始对话。

## 常用命令速查

| 用途 | 命令 |
|------|------|
| 启动 Web UI | `dsh web` 或 `npx @deepseek-ai/dsh web` |
| 指定 profile 启动 | `dsh --profile <名称>` |
| 一次性任务（headless 模式） | `dsh --profile headless "任务描述"` |
| 查看帮助 | `dsh --help` |
| 查看最终配置（排查用） | `dsh --dump-config` |
| 查看默认配置 | `dsh --dump-default-config` |
| 更换端口 | `dsh web --port 13080` |
| 从源码启动 | `cd deepseek-harness && pnpm dsh web` |

> **参数顺序注意**：启动器参数（`--profile`、`--patch` 等）必须写在最前面，应用参数写在后面。

---

## 插件管理（核心功能）

> 本教程提供懒人版插件管理方式：终端运行 `dsh plugin --profile web add dshmarket`，再次打开 Web UI 在**设置界面**即可看到插件市场。

### 1. 插件安装命令

基本语法：

```bash
dsh plugin --profile <profile名称> add <插件包名>
```

最常用的 profile 是 `web`（Web UI 界面）。

**几种安装方式：**

| 来源 | 命令示例 |
|------|----------|
| **从 npm 安装（推荐）** | `dsh plugin --profile web add dsh-web-shell` |
| **从 GitHub 安装** | `dsh plugin --profile web add github:owner/repo#ref` |
| **从本地目录安装** | `dsh plugin --profile web add ./my-plugin` |
| **带版本号安装（推荐锁定版本）** | `dsh plugin --profile web add @liustack/modlens@3.17.2` |

>  **安装插件前确保 `pnpm` 已在 PATH 中**。建议锁定固定版本号，不建议使用 `@latest` 标签。

### 2. 插件生效

- 安装声明了 `dsh.bundle.patch` 的插件后，**需要重启 dsh 服务才能生效**：
  ```bash
  dsh web
  ```
- 部分纯 Cordis 插件支持**实时生效**，无需重启。

### 3. 在 Web UI 中管理插件

安装插件后，可以在 **设置 → 插件** 中查看已安装的插件列表。部分插件管理面板还支持一键启用/停用。

### 4. 实用插件推荐

| 插件 | 功能 |
|------|------|
| **dsh-market** | DeepSeek插件市场 |
| **DSH-better-sidebar** | Web UI 右侧工作区面板 |
| **modlens** | 处理图片信息 |
| **dsh-usage-stats** | Token 额度使用面板 |

> 更多插件可以在 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com) 浏览，或查看 GitHub 上的 [`dsh-plugin` Topic](https://github.com/topics/dsh-plugin)。

---

## 常见问题

### Q：`npx` 和 `dsh` 命令有什么区别？
`npx @deepseek-ai/dsh` 是首次安装/临时调用；全局安装后可以直接用 `dsh` 命令，两者后续参数一致。

### Q：提示找不到 `dsh` 命令？
确认是否已全局安装，或改用 `npx @deepseek-ai/dsh` 前缀。

### Q：启动后浏览器没自动打开？
手动访问 `http://127.0.0.1:3080`，确认端口没被占用。如被占用可换端口：`dsh web --port 13080`。

### Q：`dsh plugin` 报错 `'pnpm' 不是内部或外部命令`？
说明 pnpm 未安装或不在 PATH 中。执行 `npm install -g pnpm` 后**重启终端**即可。

### Q：插件安装后不生效？
重启 dsh 服务：`dsh web`。

### Q：如何排查配置问题？
使用 `dsh --dump-config` 查看叠加后的最终配置。

---

以上就是 dsh 的完整使用教程。核心流程总结为：**装 Node.js → 装 pnpm → 启动 dsh → 配置 API Key → 安装插件扩展能力**。遇到问题优先用 `dsh --dump-config` 排查配置，插件管理记住 `dsh plugin --profile web add <包名>` 这条核心命令即可。