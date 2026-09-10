在 Linux 下分发 Qt 应用程序，远比 Windows 的 `windeployqt` 复杂得多。由于缺少官方统一工具、发行版碎片化、依赖库版本差异，故会遇到一系列问题，本文总结了一套经过验证的打包流程，帮助你高效地将 Qt 程序打包为可移植的目录，并顺利集成到安装包中。

---

## 为什么 Linux 打包这么难？

- **没有官方独立打包工具**：Windows 有 `windeployqt`，macOS 有 `macdeployqt`，但 Linux 官方并未提供对等的命令行工具。Qt 仅在 CMake 中提供了部署 API（Qt 6.3+），但仍需开发者手动配置。
- **系统依赖碎片化**：不同发行版的库路径、版本、命名差异巨大，一个程序在某台机器上能跑，换一台就可能缺库。
- **图形栈复杂**：X11、Wayland、EGL、GLX 等协议共存，Qt 需要正确加载对应平台插件和渲染后端。

因此，掌握一套可靠的打包方法至关重要。

---

## 常用打包工具对比

| 工具 | 特点 | 现状 |
|------|------|------|
| **linuxdeployqt** | 经典第三方工具，自动收集 Qt 依赖 | 已停止维护，不支持 Qt 6 |
| **linuxdeploy + Qt 插件** | 通过插件支持 Qt，需手动处理 QML 和额外依赖 | 仍可用，但配置繁琐，易出错 |
| **CQtDeployer** | 专为 Qt 设计，支持 QML、第三方库、多种输出格式（含 QIFW） | 活跃维护，推荐使用 |
| **CMake 部署 API** | Qt 官方提供的 CMake 函数，适合有 CMake 构建系统的项目 | 需要额外学习，配置较复杂 |

综合考虑，**CQtDeployer** 是当前最实用的选择，它一条命令即可完成大部分依赖收集，并支持直接生成 QIFW 使用的数据。

---

## CQtDeployer 基础用法

### 安装

前往 [GitHub Release](https://github.com/QuasarApp/CQtDeployer/releases/) 下载最新版本安装使用

### 基本打包命令

```bash
cqtdeployer -bin MyApp -qmake "qmake 路径" -targetDir "输出路径"
```

**参数说明**：
- `-bin`：可执行文件路径
- `-qmake`：对应 Qt 版本的 qmake，用于部署 Qt 库和插件
- `-qmlDir`：QML 文件所在目录（可重复多次，用于分散的 QML）
- `-libDir`：第三方库搜索路径（如 OpenCV）
- `-recursiveDepth`：递归扫描深度，帮助发现间接依赖
- `-targetDir`：输出目录

> qmake 示例路径：`/home/Users/Qt/6.10.3/gcc_64/bin/qmake` 或 `/opt/Qt/6.10.3/gcc_64/bin/qmake`。

> 如果希望更激进地捕获系统依赖，可使用 `deploySystem` 参数，但效果因环境而异，建议搭配手动补全。

---

## 处理插件缺失与路径问题

CQtDeployer 的自动扫描经常**遗漏 Qt 插件**（尤其是平台插件 `platforms`、图像格式插件 `imageformats`）。

最稳妥的办法是**全量复制 Qt 插件目录**到部署包：

```bash
# Qt路径需要你按照环境更换
cp -r /opt/Qt/6.10.3/gcc_64/plugins/* ./打包输出目录/plugins/
```

这样可确保 X11、Wayland、图像解码等插件全部就位。

---

## 常见错误与解决方案

### 缺少系统库（如 `libtiff.so.5`）

即使 CQtDeployer 已经打包了大部分依赖，仍可能遗漏一些间接依赖。可用 `ldd` 找出所有 “not found” 的库，并手动复制：

```bash
ldd bin/yourapp | grep "not found"
# 然后在系统中查找并复制到部署包的 lib/ 目录
```

### 提示缺少 `libOpenGL.so.0` 或 `libEGL.so.1`

这类库属于系统图形栈，**不应打包进部署包**，而应由目标系统提供。开发环境中若缺少，可安装 Mesa 相关包（Ubuntu 22.04+ 使用 `libgl1 libegl1 libglx0 libopengl0`）。打包时确保 `lib/` 下**不包含**这些系统 GL 库，否则会导致版本冲突。

### 程序启动时报 `Failed to create wl_display` 或 `EGL not available`

这是因为 Qt 尝试使用 Wayland 平台插件，但当前环境没有运行 Wayland 混成器（常见于 WSL、服务器或无图形环境）。解决方案：

- **开发测试时**：临时设置 `export QT_QPA_PLATFORM=xcb` 或 `offscreen`。
- **打包发布时**：**不要**硬编码平台变量，让 Qt 根据用户桌面自动选择。若某些特殊环境（如 Steam Deck 的 Gamescope）需要强制 XCB，可在 `.desktop` 文件的 `Exec` 行加上 `env QT_QPA_PLATFORM=xcb`，而不要改程序本身。

### 缺失数据库驱动插件

Qt 默认携带多种 SQL 驱动（PostgreSQL、ODBC 等），但你的程序可能根本用不到。这些插件会引入额外的系统依赖（如 `libmysqlclient`），导致打包警告或错误。**删除不需要的 `plugins/sqldrivers/` 下的 .so 文件**即可。

---

一个完备的可移植目录应类似：

```
AppDir/
├── Myapp.sh             # 程序入口，可自动检测 Qt 路径
├── bin/
│   ├── yourapp          # 程序真正的二进制文件
│   └── qt.conf
├── lib/                 # 所有第三方库（OpenCV、Qt 等）
├── plugins/             # 完整的 Qt 插件集合
├── qml/                 # 你的 QML 文件
└── translations/        # 可选翻译文件
```

将此目录内容整体作为 QIFW 组件的数据源，即可实现一键安装，可参考我的另一篇[文档](https://xiao-blog.top/docs/article?id=qt-guide&sub=qifw-guide)。