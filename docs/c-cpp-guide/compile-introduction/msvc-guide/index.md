MSVC（Microsoft Visual C++）是微软推出的 C/C++ 编译器工具集，包含编译器（cl.exe）、链接器、标准库和相关实用工具。它是 Windows 平台上最主流的 C++ 开发工具，深度集成于 Visual Studio 生态系统中。

> **注意**：MSVC 编译器 `cl.exe` 只能在支持 Microsoft Visual Studio for Windows 的操作系统上运行，且必须从 Visual Studio 开发者命令提示符中启动。

---

## 环境配置

使用 MSVC 编译器前，需要先安装 Visual Studio 或 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/)。

C/C++相关组件安装完成后，可通过以下方式进入编译环境：

> 现代 C++ 开发非常建议使用 VS2019 或 VS2022，他们经历过了多次更新，修复了许多历史遗留问题，并且对 C++20 的支持已经非常完善。

**Visual Studio 开发者命令提示符**：开始菜单中找到 “Developer PowerShell for VS 2022” 即可进入 MSVC 环境。

## 基本编译命令

MSVC 编译器 `cl.exe` 的基本用法非常直观。以下命令接受单个源代码文件，生成可执行文件：

```powershell
cl /EHsc hello.cpp
```

`/EHsc` 指定了 C++ 异常处理模型，是 MSVC 编译 C++ 程序时常用的选项。

> 注意需要先进入 MSVC 编译环境，否则 `cl.exe` 命令可能无法识别。

>  **警告**：环境默认在 VS 安装目录，需要先 `cd` 到工作环境才可以运行！！！

---

### 常用编译选项

| 选项 | 说明 |
|------|------|
| `/EHsc` | 启用 C++ 异常处理 |
| `/std:c++17` | 指定 C++ 标准版本 |
| `/MD` | 使用动态链接的运行时库 |
| `/MDd` | 使用调试版本的动态运行时库 |
| `/O2` | 优化速度 |
| `/Fe:filename.exe` | 指定输出文件名 |

### 多文件编译

```cmd
cl /EHsc /Fe:myapp.exe main.cpp utils.cpp
```

---

## 跨平台开发的局限与策略

MSVC 本身是 Windows 专属的编译器。要实现跨平台开发，有以下几种策略：

- **在 Windows 上使用 MSVC 编译**，然后在目标平台（Linux/macOS）上使用对应的编译器（g++/Clang）重新编译
- **使用 CMake 支持**：Visual Studio 已集成在 CMake，可以编辑跨平台 CMake 项目，然后在 Linux 开发机上使用 g++ 编译
- **使用 Clang-cl**：`clang-cl` 是 Clang 的 MSVC 兼容驱动，可在非 Windows 主机上以 MSVC 兼容模式编译

## 注意事项

- MSVC 的编译选项风格与 GCC/Clang 不同（如 `/O2` vs `-O2`）
- MSVC 对 C++ 标准的支持节奏与 GCC/Clang 略有差异
- 模板相关的 SFINAE 处理规则在 MSVC 与 GCC/Clang 之间可能存在差异


