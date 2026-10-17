本文介绍如何把一个现成的网页前端打包成 Electron 桌面客户端，需要新建核心文件 `main.js` 和 `preload.js`。本文注重 Electron 打包本地前端 + 远程 API 的架构，网页版与桌面版共用同一份前端代码（由 BTIR 项目的客户端开发总结而来）。

---

## 前置准备

- 本地安装 Node.js（v18+）与 npm。
- 前端最好为纯静态文件，无构建步骤可直接用；若有构建需先执行构建再取产物目录。
- 明确服务端 API 地址，例如 `https://api.example.com`。

> [!CAUTION]
> 新版 npm 默认拦截第三方包的 postinstall 脚本，Electron 的 postinstall 负责下载二进制。安装后若出现 `install-scripts blocked` 警告，需执行 `npm install-scripts approve electron` 放行，再手动补跑 `node node_modules/electron/install.js`，否则 `npm start` 会报 `Electron failed to install correctly`。

国内网络下载 Electron 较慢时，可以加国内镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

---

## 架构选型

Electron 加载本地前端有三种方式：

| 方式 | Origin | 存在的问题 |
|------|--------|-----------|
| 直接 `loadURL` 远程页面 | 服务端域名 | 不算打包前端，断网即白屏 |
| `file://` 加载本地文件 | `null` | fetch 相对路径打到 `file://` 直接失败，且 CORS 需放行字符串 `null`，不安全 |
| 自定义协议 `app://` | `app://myapp` | 标准 scheme 有正常 origin，CORS 可精确放行，相对路径、URL 参数天然工作 |

> [!CAUTION]
> `file://` 协议最常见的问题：页面能打开，但所有 `fetch('/api/...')` 全部失败，因为相对路径解析到 `file://` 协议上去了，采用自定义协议是综合唯一正解。

---

## 步骤一：创建工程

新建一个独立目录，创建 `package.json`：

> [!TIP]
> 将中文内容替换即可得到完整的 `package.json` 。

```json
{
  "name": "项目名字（需小写）",
  "version": "版本号（如 0.1.0）",
  "description": "项目描述内容",
  "main": "electron/main.js",
  "author": "作者名字 <作者邮箱>",
  "license": "许可证（如 MIT）",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^34.5.8"
  }
}
```

> [!CAUTION]
> `name` 字段必须是**小写英文**，不允许中文、空格、大写字母，否则 `npm install` 直接报 `Invalid name`。

> [!IMPORTANT]
> Linux 平台的 Deb 打包强制要求作者提供邮箱！

目录结构规划：

```text
myapp/
├── package.json
├── electron/
│   ├── main.js        # 主进程
│   └── preload.js     # 预加载脚本
└── renderer/
    └── frontend/      # 前端项目
```

---

## 步骤二：新建主进程 main.js

这是整个方案的核心文件，完整骨架如下：

```js
const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_SCHEME = 'app'
const APP_HOST = 'myapp'

protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_SCHEME,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
        },
    },
])

const rendererRoot = app.isPackaged ? path.join(process.resourcesPath, 'renderer') : path.join(__dirname, '..', 'renderer')

const frontendRoot = path.join(rendererRoot, 'frontend')


const resolveWithin = (baseDir, relativePath) => {
    const target = path.resolve(baseDir, `.${path.sep}${relativePath}`)
    if (target !== baseDir && !target.startsWith(baseDir + path.sep)) return null
    return target
}

const handleAppRequest = (request) => {
    const url = new URL(request.url)
    if (url.hostname !== APP_HOST) return new Response('Not Found', { status: 404 })
    const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
    const filePath = resolveWithin(frontendRoot, decodeURIComponent(relativePath))
    if (!filePath) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(filePath).href)
}

const createMainWindow = () => {
    const win = new BrowserWindow({
        width: 1366,
        height: 860,
        icon: path.join(frontendRoot, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url === 'about:blank') return { action: 'allow' }
        shell.openExternal(url)
        return { action: 'deny' }
    })
    win.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`)
    return win
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) app.quit()
else {
    app.on('second-instance', () => {
        const [win] = BrowserWindow.getAllWindows()
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })

    app.whenReady().then(() => {
        Menu.setApplicationMenu(null)
        protocol.handle(APP_SCHEME, handleAppRequest)
        createMainWindow()
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
        })
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })
}
```

关键代码说明如下：

| 代码 | 说明 |
|------|------|
| `registerSchemesAsPrivileged` | 必须在 `app.ready` 之前调用 |
| `protocol.handle` | `app://myapp/*` 整体映射到 `frontend/` 目录 |
| `resolveWithin` | 路径穿越防护，把请求路径约束在基础目录内，防止 `..%2F` 之类读取任意文件 |
| `net.fetch(pathToFileURL(...))` | 官方推荐的静态文件响应方式，自动带 Content-Type、支持 Range |
| `Menu.setApplicationMenu(null)` | 去掉默认菜单栏，注意移除后 Ctrl+R、F12 会失效，可用 `before-input-event` 事件补回 |
| `setWindowOpenHandler` | `window.open` 打印预览等场景放行 `about:blank`，其余外部链接交给系统浏览器 |
| 安全三件套 | `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，远程内容不可信时的底线配置 |

> [!TIP]
> 移除菜单栏后，可以在 `createMainWindow` 里补回常用快捷键：监听 `win.webContents.on('before-input-event')`，对 Ctrl+R 调用 `reload()`，对 F12 调用 `toggleDevTools()`。

---

## 步骤三：新建 preload.js

主进程与页面之间唯一的桥梁，把服务端地址注入页面全局：

```js
const { contextBridge } = require('electron')

const DEFAULT_API_BASE = 'https://api.example.com'
const ENV_API_BASE = process.env.MYAPP_API_BASE || ''

contextBridge.exposeInMainWorld('myappEnv', {
    apiBase: ENV_API_BASE || DEFAULT_API_BASE,
})
```

这样页面里就存在 `window.myappEnv.apiBase`，用环境变量覆盖默认值的设计可以让你临时连接测试服务器：

```bash
MYAPP_API_BASE=https://test.example.com npm start
```

---

## 步骤四：前端适配

前端只需要极少量环境自适应改动，保证浏览器版行为完全不变。

- **API 基地址注入**，把原来硬编码的空字符串改为：

    ```js
    API_BASE: window.myappEnv?.apiBase ?? '',
    ```

    浏览器里 `window.myappEnv` 不存在，回退 `''` 走同源请求，与原来完全等价；桌面版则自动指向远程 API。

    > [!CAUTION]
    > 全局搜索一遍 `fetch('/`，确认**每一个**请求都走了 `API_BASE` 拼接。本人实战中就漏过一个页面的硬编码 `fetch('/auth/change-password')`，成为桌面版里唯一打不开的接口。

- **页面跳转改相对路径**。如果前端里存在 `/page/xxx.html` 这类依赖服务端路由的绝对路径跳转，全部改成 `./xxx.html` 相对路径。

---

## 步骤五：服务端 CORS 配置

桌面版发请求时，`Origin` 头是 `app://myapp`，服务端必须显式放行这个来源。以 FastAPI 为例：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.cors_origins,  # 环境变量 CORS_ORIGINS 中加入 app://myapp
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

环境变量改成这样即可：

```text
CORS_ORIGINS=https://your-web-domain.com,app://myapp
```

> [!IMPORTANT]
> CORS 中间件是精确字符串匹配，`app://myapp` 可以直接作为白名单项。

---

## 运行与调试

```bash
npm install
npm start
```

> [!TIP]
> 登录态按 origin 隔离，`app://myapp` 与浏览器版互不共享，桌面版首次使用需要重新登录一次，属正常现象。

---

## 常见问题

**Q：登录请求一直失败，且控制台报 CORS 错误**
**A：** 服务端白名单没有放行 `app://myapp`。

**Q：页面能打开但接口全部不可用**
**A：** 检查是否漏改了没走 `API_BASE` 的硬编码请求；再检查 `registerSchemesAsPrivileged` 是否在 `app.ready` 之前调用。

**Q：如何隐藏顶部菜单栏**
**A：** `Menu.setApplicationMenu(null)`，同时建议补回 Ctrl+R 刷新快捷键（见步骤二的 TIP）。

**Q：`window.open` 弹出的打印预览窗口空白？**
**A：** 在 `setWindowOpenHandler` 里放行 `about:blank`，其余 URL 则使用 `shell.openExternal`。