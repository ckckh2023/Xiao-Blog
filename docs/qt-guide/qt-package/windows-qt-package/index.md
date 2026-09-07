在 Qt 应用程序开发完成后，如何将程序交付给没有安装 Qt 开发环境的用户运行，是每一位 Qt 开发者都会面临的问题。直接复制可执行文件往往会导致“缺少 xxx.dll”或程序闪退等问题，其根本原因在于 Qt 程序依赖于大量的动态链接库、插件和资源文件。

Qt 官方为此提供了 **windeployqt** 工具，能够帮助开发者快速、准确地将应用程序所需的所有 Qt 相关依赖项打包到一起。

---

## 什么是 windeployqt

windeployqt 是 Qt 框架**自带的 Windows 部署工具**，设计用于自动创建可部署文件夹，其中包含从该文件夹运行应用程序所需的 Qt 相关依赖项，包括库文件（DLL）、QML 导入模块、插件和翻译文件等。该工具可为 Windows 桌面应用程序创建完整的安装树，方便后续打包成安装程序。

### 工具位置

windeployqt.exe 位于 Qt 安装目录的 `bin` 子目录下，具体路径与 Qt 版本和编译器相关。例如：

- `C:\Qt\6.10.3\msvc2022_64\bin\windeployqt.exe`
- `C:\Qt\6.11.1\mingw_64\bin\windeployqt.exe`

> 需要自行寻找工具位置，一般位于版本后的编译器文件夹的 `bin` 子目录中。

### 工作原理

windeployqt 将 .exe 文件或包含 .exe 文件的目录作为参数，通过扫描可执行文件的导入表（Import Table）来识别所需的 Qt 库。对于 QML 应用程序，当指定 `--qmldir` 参数时，工具会调用 qmlimportscanner 扫描 QML 文件中的 import 语句，收集所需的 QML 模块依赖。

> 注意：windeployqt **仅能导入 Qt 库**，无法处理其他依赖项（如第三方库 OpenCV ）。

---

## 打包前置准备

- **编译 Release 版本Z**

    **务必使用 Release 版本进行打包发布**。Debug 版本包含大量调试信息，体积臃肿且在没有开发环境的电脑上极易报错。

    在 Qt Creator 中，将左下角的构建模式切换为 **Release**，然后执行构建。

- **准备发布文件夹**

    新建一个干净的文件夹（建议使用全英文路径，避免中文字符引发潜在问题），将编译生成的 Release 版 .exe 文件复制到该文件夹中。

- **确认环境信息**

    记录当前项目使用的 Qt 版本和编译器类型（如 Qt 6.10.3.0 MSVC2022 64-bit），并找到对应的 windeployqt 路径。

    > 不同版本、不同编译器对应的依赖库完全不同，使用错误的 windeployqt 版本会导致部署失败。

---

## 执行 windeployqt 命令

获取 windeployqt.exe 的路径后，打开命令行窗口（PowerShell），可执行以下命令：

**Widget 应用程序**：
```powershell
& "C:\Qt\6.10.3\msvc2022_64\bin\windeployqt.exe" MyApp.exe
```

> 此处的 `C:\Qt\6.10.3\msvc2022_64\bin\windeployqt.exe` 要更换成自己的路径！

**QML 应用程序**：

```powershell
& "C:\Qt\6.10.3\msvc2022_64\bin\windeployqt.exe" MyQmlApp.exe --qmldir "源码 QML 路径"
```

> `--qmldir` 参数需要指向**项目源码中 QML 文件所在的目录**（即包含 .qml 文件的文件夹），而非 Qt 安装目录下的 qml 路径。

命令执行完成后，查看发布文件夹，会发现 windeployqt 已自动将所需的 DLL、插件和资源文件复制到 .exe 所在目录。

### 验证打包结果

双击发布文件夹中的 .exe 文件，确认程序能够正常启动和运行。如果一切正常，即可将整个文件夹压缩打包分发给用户。

---

## 常用命令行参数

windeployqt 提供了丰富的命令行参数，允许开发者对部署过程进行精细化控制。

### 基本参数

| 参数 | 说明 |
|------|------|
| `--help`, `-h` | 显示帮助信息 |
| `--version`, `-v` | 显示版本信息 |
| `--dir <目录>` | 指定输出目录（默认与 .exe 同目录） |
| `--libdir <路径>` | 指定库文件的复制目标路径 |
| `--plugindir <路径>` | 指定插件的复制目标路径 |
| `--translationdir <路径>` | 指定翻译文件的复制目标路径 |
| `--qml-deploy-dir <路径>` | 指定 QML 文件的复制目标路径 |

### 构建类型参数

| 参数 | 说明 |
|------|------|
| `--release` | 部署 Release 版本的 DLL（默认） |
| `--debug` | 部署 Debug 版本的 DLL |
| `--pdb` | 同时部署 .pdb 调试符号文件（MSVC） |

### QML 相关参数

| 参数 | 说明 |
|------|------|
| `--qmldir <目录>` | 指定项目 QML 文件根目录，启用 QML 依赖扫描 |

### 排除与精简参数

| 参数 | 说明 |
|------|------|
| `--no-compiler-runtime` | 不复制编译器运行时文件（如 VC++ Redistributable） |
| `--no-plugins` | 跳过插件部署 |
| `--no-translations` | 不复制翻译文件 |
| `--no-angle` | 不部署 ANGLE 库 |
| `--no-opengl-sw` | 不部署软件 OpenGL 光栅化库 |
| `--no-system-d3d-compiler` | 不部署系统 D3D 编译器 |

### 其他实用参数

| 参数 | 说明 |
|------|------|
| `--force` | 强制覆盖目标目录中的已有文件 |
| `--dry-run` | 模拟运行模式，显示将要执行的操作但不实际复制文件 |
| `--verbose` | 输出详细信息，便于调试 |
| `--include-soft-plugins` | 部署所有相关的软依赖插件 |
| `--ignore-library-errors` | 忽略库文件找不到时的错误 |

### 命令示例

```powershell
windeployqt MyApp.exe

# 指定 QML 目录并强制覆盖
windeployqt MyApp.exe --qmldir "D:\MyProject\qml" --force

# 精简部署（排除不需要的组件）
windeployqt MyApp.exe --no-angle --no-opengl-sw --no-translations

# 模拟运行，查看将要执行的操作
windeployqt MyApp.exe --dry-run --verbose
```

---

## 进阶用法

### 结合安装包制作工具

完成 windeployqt 打包后，可以进一步使用安装包制作工具将整个文件夹封装为专业的安装程序。常用的工具有：

- **Qt Installer Framework**：Qt 官方提供的安装包制作框架，功能强大，可查看我的这篇[文档](https://xiao-blog.top/docs/article?id=qt-guide&sub=qifw-guide)
- **Inno Setup**：免费、功能强大、脚本语法简单
- **NSIS**（Nullsoft Scriptable Install System）：免费、高度可定制

### Qt WebEngine 应用程序的注意事项

对于使用了 Qt WebEngine 的应用程序，需要额外注意：

- Windows 平台需要 Visual C++ Redistributable 版本 14.28 或更高版本
- 部署时需添加 `--webengine` 参数，确保所有 WebEngine 依赖（如 icudtl.dat）被正确复制

---

## 常见问题排查

### 打包后程序仍然报`缺少 DLL`

**原因**：windeployqt 基于静态分析识别依赖，无法检测通过 `QLibrary` 或 `LoadLibrary` 动态加载的库。

**解决方案**：
- 使用 `dumpbin /DEPENDENTS your_app.exe` 工具手动检查依赖
- 从 Qt 安装目录的 `bin` 或相应模块目录下手动补充缺失的 DLL
- 使用 Process Monitor 等系统工具追踪程序运行时的文件访问行为

### 打包后程序闪退或界面空白（QML 应用）

**原因**：QML 模块未正确部署，通常是因为 `--qmldir` 参数指向了错误的路径或没有使用 `--qmldir` 参数。

**解决方案**：
- 确保 `--qmldir` 指向**项目源码中的 QML 文件夹**，而非 Qt 安装目录下的 qml 路径
- 检查是否遗漏了自定义 QML 模块的依赖

### 环境变量导致的打包错误

**原因**：windeployqt 拷贝了错误版本的 DLL，或无法找到某些依赖。

**解决方案**：
- 使用 Qt 专用命令行工具，而非系统 powershell
- 检查系统 PATH 环境变量中是否存在多个 Qt 版本的 bin 目录，避免优先级冲突
- 可直接使用 windeployqt 的完整路径调用，避免 PATH 干扰

### 编译器运行时文件缺失

**现象**：在未安装 Visual C++ Redistributable 的机器上运行报错。

**解决方案**：
- 默认情况下 windeployqt 会自动复制编译器运行时文件
- 如果使用了 `--no-compiler-runtime` 参数，需确保目标机器已安装对应版本的 VC++ Redistributable
- 对于 MSVC 编译的程序，可在安装包中捆绑 VC++ Redistributable 安装程序

