gcc/g++ 是 GNU 编译器集合中的 C/C++ 编译器，是 Linux 平台上最广泛使用的 C++ 编译工具，它开源、跨平台，支持多种语言和架构。

---

## 环境配置

在 Linux 上安装 g++：

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential

# CentOS/RHEL/Fedora
sudo dnf groupinstall "Development Tools"
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

此处仅提供 MinGW-w64 的安装和使用方法（因为过于懒人）：下载并解压到某个合适的目录，添加到系统环境变量即可。

**编译 Windows 可执行文件：**
```bash
g++ main.cpp -o program.exe
```

需要注意 Windows 下的路径分隔符问题。

## 交叉编译

g++ 支持交叉编译——在一个平台上生成另一个平台的可执行文件。

**在 Linux 上为 Windows 编译：**
```bash
sudo apt-get install mingw-w64
x86_64-w64-mingw32-g++ main.cpp -o app.exe
```

**为 ARM 平台交叉编译：**
```bash
sudo apt-get install gcc-arm-linux-gnueabihf
arm-linux-gnueabihf-g++ -o myapp myapp.cpp
```

---

## 跨平台代码注意事项

- 尽量使用标准 C++ 库，避免平台特定的 API
- 可使用跨平台库如 Qt、Boost、wxWidgets 等
- 注意不同平台的文件路径分隔符、换行符等差异


