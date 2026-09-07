在应用开发完成后，如何将程序分发到用户的 Windows 或 Linux 机器上，并且提供友好的安装、更新和卸载体验？

**Qt Installer Framework (QIFW)** 是 Qt 官方提供的跨平台安装包制作工具，它不仅能生成 Windows 的 `.exe` 安装程序和 Linux 的 `.run` 安装程序，还内建了在线更新、组件选择、维护工具等企业级功能。

---

## Qt Installer Framework 的优点

- **跨平台**：一套配置，同时生成 Windows 和 Linux 安装程序（macOS 也支持）。
- **支持在线更新**：内置维护工具（MaintenanceTool），可检测并安装新版本。
- **组件化设计**：可将大型应用拆分为多个可选组件，支持自定义安装选项。
- **脚本扩展**：允许使用 JavaScript 编写安装逻辑，灵活控制安装过程。
- **官方背景**：由 Qt 官方维护，与 Qt 生态无缝集成。

### QIFW 核心概念

- **组件（Component）**：安装包的基本单元，可以是一个应用程序、库或资源。每个组件有自己的 `package.xml` 描述文件和数据目录。
- **安装器（Installer）**：最终生成的安装程序，负责引导用户完成安装。
- **维护工具（MaintenanceTool）**：随程序安装到用户机器上的独立程序，用于后续更新、卸载或添加/删除组件。
- **仓库（Repository）**：存放更新元数据和组件数据包的远程位置（HTTP/HTTPS），供维护工具检查更新（仅在线更新才用得到）。

---

## 项目结构

一个典型的 QIFW 项目目录如下：

```
my_projects/
├── config/
│   └── config.xml                  # 全局安装器配置
└── packages/
    └── com.github.projects/        # 组织通用标识符，反域名格式
        ├── meta/
        │   ├── package.xml         # 组件描述配置
        │   └── installscript.qs    # 安装脚本配置
        └── data/                   # 要安装的文件（保持原打包后目录结构）
            └── 打包后的输出文件夹/
            ...
```

- `config.xml` 定义安装器名称、版本、目标目录、远程仓库等全局设置。
- `packages` 下每个子目录对应一个组件，目录名即组织通用标识符（通常使用反域名格式）。

---

## 基础配置

### config.xml 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Installer>
    <Name>项目名字</Name>
    <Version>1.0.0</Version>
	<WizardDefaultWidth>880px</WizardDefaultWidth>
    <WizardDefaultHeight>480px</WizardDefaultHeight>
    <Title>安装器标题</Title>
    <Publisher>公司或组织名字</Publisher>
    <StartMenuDir>系统开始目录内显示名字（最好与项目名字保持一致）</StartMenuDir>
    <TargetDir>@ApplicationsDir@/项目名字</TargetDir>
</Installer>
```

> `@ApplicationsDir@` 会根据系统自动解析为合适的应用程序目录（Windows 下为 `C:\Program Files`，Linux 下为 `/opt`）。但请注意，Windows 下 `Program Files` 通常需要管理员权限，可考虑使用 `@HomeDir@/项目名字` 避免权限问题。

### package.xml 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package>
    <DisplayName>程序组件包显示名字</DisplayName>
    <Description>软件描述</Description>
    <Version>1.0.0</Version>
    <ReleaseDate>2025-01-01</ReleaseDate>
    <Name>与组织通用标识符保持一致！！！</Name>
    <Script>installscript.qs</Script>
    <Licenses>
        <License name="许可协议名字" file="协议文件路径" />
    </Licenses>
</Package>
```

打包后输出的文件夹放在与 `meta` 同级的 `data` 目录中，安装时会被原样复制到 `TargetDir`。

---

## QIFW 脚本使用方式

QIFW 通过 `installscript.qs` 中的操作创建开始菜单/桌面快捷方式。

### Windows 下创建开始菜单快捷方式和桌面快捷方式：

```js
Component.prototype.createOperations = function()
{
    component.createOperations();

    var appDir = "@TargetDir@/打包后输出的文件夹名字";
    var entryFile = appDir + "/app.exe";
    var shortcutExt = "lnk";
    var iconArg = "iconPath=" + appDir + "/图标路径";

    component.addOperation("CreateShortcut",
        entryFile,
        "@DesktopDir@/快捷方式名字." + shortcutExt,
        "",
        "workingDirectory=" + appDir,
        iconArg
    );

    component.addOperation("CreateShortcut",
        entryFile,
        "@StartMenuDir@/快捷方式名字." + shortcutExt,
        "",
        "workingDirectory=" + appDir,
        iconArg
    );
}
```

#### Linux 下创建开始菜单快捷方式和桌面快捷方式：

```js
Component.prototype.createOperations = function()
{
    component.createOperations();

    var appDir = "@TargetDir@/打包后输出的文件夹名字";
    var shortcutName = "快捷方式名字";

    component.addOperation("Execute", "chmod", "+x", appDir + "/程序入口文件（如 sh文件）");
    component.addOperation("Execute", "chmod", "+x", appDir + "/可执行文件入口");
    component.addOperation("Execute", "chmod", "-R", "755", appDir);

    var sudoUser = installer.environmentVariable("SUDO_USER");
    var realHome = "";

    if (sudoUser && sudoUser !== "root") realHome = "/home/" + sudoUser;
    else realHome = installer.value("HomeDir");

    var appsDir = realHome + "/.local/share/applications";
    component.addOperation("Mkdir", appsDir);

    var desktopDir = realHome + "/Desktop";
    component.addOperation("Mkdir", desktopDir);

    var desktopEntry = [
        "[Desktop Entry]",
        "Version=2.2.1",
        "Type=Application",
        "Terminal=false",
        "Name=" + shortcutName,
        "Exec=" + appDir + "/程序入口文件（如 sh文件）",
        "Icon=" + appDir + "/图标路径",
        "Path=" + appDir,
        "Categories=Utility;"
    ].join("\n");

    component.addOperation("CreateDesktopEntry",
        appsDir + "/" + shortcutName + ".desktop",
        desktopEntry
    );

    component.addOperation("Copy",
        appsDir + "/" + shortcutName + ".desktop",
        desktopDir + "/" + shortcutName + ".desktop"
    );
}
```

### 依赖处理

- **Windows**：通常需要将打包后输出的文件夹放入 `data` 目录中，可以使用 `windeployqt` 自动收集 Qt 依赖。
- **Linux**：推荐使用打包工具（如 CQtDeployer、linuxdeploy）生成自包含的文件夹，然后将该目录整体放入 `data/`，依赖由 CQtDeployer 等工具解决。

---

## 生成安装包

安装 QIFW 后（可从 QT MaintenanceTool 下载最新版本），找到其路径，使用 `binarycreator` 工具生成安装程序：

- **Windows 使用 Powershell 生成**

    ```powershell
    & "C:\Qt\Tools\QtInstallerFramework\4.11\bin\binarycreator.exe" -c config/config.xml -p packages Setup.exe
    ```

- **Linux 使用 bash 生成**
    ```bash
    "/opt/Qt/Tools/QtInstallerFramework/4.11/bin/binarycreator" -c config/config.xml -p packages Setup.run
    ```

> 路径需要自己改动，类似于示例路径！

若要生成离线安装包（不包含维护工具），可添加 `--offline-only` 参数。但推荐保留维护工具，以便后续更新。

---

## 在线更新与仓库（一般用不到）

### 创建远程仓库

使用 `repogen` 工具从同一 `packages` 目录生成仓库：

```bash
repogen -p packages repository/MyApp
```

生成的 `repository/MyApp/` 目录包含 `Updates.xml` 和组件数据包（.7z），将其上传到 HTTP 服务器即可。确保 `config.xml` 中的 `<RemoteRepositories>` URL 指向该目录。

### 发布新版本

1. 修改组件版本号（`package.xml` 中的 `<Version>`）。
2. 替换 `data/` 目录内容为新版本文件。
3. 重新运行 `repogen` 更新仓库并上传。
4. 用户运行维护工具（`MaintenanceTool`）即可检测并安装更新。

---

## 常见问题与技巧

### 安装时需要管理员权限

Windows 下若安装在 `Program Files`，需以管理员身份运行安装器；Linux 下若安装到 `/opt`，需要 `sudo` 权限。

### 签名

- **Windows**：使用 Microsoft Authenticode 签名安装程序和可执行文件。
- **Linux**：可以使用 GPG 签名 `.run` 文件，或打包为发行版原生格式（deb/rpm）通过官方渠道分发。
