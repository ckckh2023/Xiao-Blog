gcc/g++ 是 GNU 编译器集合中的 C/C++ 编译器，是 Linux 平台上最广泛使用的 C++ 编译工具，它开源、跨平台，支持多种语言和架构。

> Windows 下有移植版本 Mingw，是适合 Windows C/C++ 初学者的工具，因为 MSVC 阉割了许多 C 语言特性。

---

## 环境配置

在 Linux 上安装 g++：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential

# CentOS/RHEL/Fedora
sudo dnf groupinstall "Development Tools" # 较新版本（使用 dnf)
sudo yum groupinstall "Development Tools" # 较旧版本（使用 yum）
```

安装完成后，可通过 `g++ --version` 验证安装。

## 基本编译命令

编译单个 C++ 源文件：

```bash
g++ -o myapp myapp.cpp
```

`-o` 选项指定输出文件名。

---

### 常用编译选项

| 选项 | 说明 |
|------|------|
| `-std=c++17` | 指定 C++ 标准 |
| `-O2` / `-O3` | 优化级别 |
| `-g` | 生成调试信息 |
| `-I <path>` | 添加头文件搜索路径 |
| `-L <path>` | 添加库文件搜索路径 |
| `-l<name>` | 链接指定的库 |
| `-Wall` | 启用所有警告 |

### 多文件编译

```bash
g++ -o myapp main.cpp utils.cpp -I./include -L./lib -lmylib
```

---

## Windows 上的 g++（MinGW）

在 Windows 上使用 g++，需要安装 MinGW-w64 或 MSYS2 环境。

> 安装 MinGW-w64可以查看我的[分享页](https://xiao-blog.top/share/?type=other&name=mingw)，它相对更加便捷轻量。

> 64 位电脑前缀为 `x86_64`，Windows 11/10 请选择 `posix-seh-ucrt-rt`，Windows 8/7 请选择 `posix-seh-msvcrt-rt`;<br>
> 32 位电脑前缀为 `i686`，Windows 11/10 请选择 `posix-dwarf-ucrt-rt`，Windows 8/7 请选择 `posix-dwarf-msvcrt-rt`;

此处仅提供 MinGW-w64 的安装和使用方法（因为过于懒人）：下载并解压到某个合适的目录，将 `bin/` 目录添加到系统环境变量即可。

**编译 Windows 可执行文件：**
```pwsh
g++ -o program.exe main.cpp
```

需要注意 Windows 下的路径分隔符问题。

---

## 跨平台代码注意事项

- 尽量使用标准 C++ 库，避免平台特定的 API
- 可使用跨平台库如 Qt、Boost、wxWidgets 等
- 注意不同平台的文件路径分隔符、换行符等差异


