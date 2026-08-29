在开发C/C++命令行程序时，清屏是一个常见的需求。无论是制作游戏、菜单界面，还是实时刷新信息。然而，不同操作系统下的实现方式截然不同，可能会导致 `undefined reference` 等问题，本文将给出跨平台解决方案。

---

## 为什么清屏不是一句 printf 能解决的？

终端（或控制台）本质上是一个字符缓冲区，清屏就是要清空可见区域并将光标复位。但操作系统的终端实现方式不同：

- **Windows** 使用 `CONSOLE_SCREEN_BUFFER_INFO` 结构体配合 `FillConsoleOutputCharacter` 等 API，或者直接调用 `system("cls")`。
- **Linux/Unix/macOS** 通常基于 ANSI 转义序列，或通过 `system("clear")` 调用系统命令。

直接调用 `system()` 虽然简单，但会启动一个子进程，效率低且有注入风险，因此生产级代码往往采用更底层的 API 或转义序列。

---

## Windows 平台的标准做法

### 使用 `system("cls")`

```cpp
system("cls");
```

- **优点**：一行搞定，无需额外头文件。
- **缺点**：调用外部命令（`cmd.exe`），性能差，且易受路径/环境变量影响。在某些精简版 Windows 中甚至可能缺失相关库。

### 使用 Windows API

```cpp
#include <windows.h>

void clearWindows() {
    HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
    CONSOLE_SCREEN_BUFFER_INFO csbi;
    DWORD written, cells;

    // 获取当前缓冲区信息
    if (!GetConsoleScreenBufferInfo(hConsole, &csbi)) { return; }

    cells = csbi.dwSize.X * csbi.dwSize.Y;
    COORD origin = {0, 0};

    // 用空格填充整个缓冲区
    FillConsoleOutputCharacter(hConsole, ' ', cells, origin, &written);
    // 重置属性
    FillConsoleOutputAttribute(hConsole, csbi.wAttributes, cells, origin, &written);
    // 光标归位
    SetConsoleCursorPosition(hConsole, origin);
}
```

- **优点**：直接操作控制台缓冲区，速度极快，无子进程开销。
- **缺点**：代码较长，且只适用于 Windows。

---

## Unix 平台的标准做法

### 使用 `system("clear")`

```cpp
system("clear");
```

同样简单，但同样存在安全与性能问题。

### 使用 ANSI 转义序列

几乎所有现代终端（包括 Windows 10+ 的 CMD/PowerShell、Linux 下的 xterm、gnome-terminal 等）都支持 ANSI 转义序列。清屏序列为：

```text
\033[2J\033[1;1H
```

- `\033[2J` 清除屏幕
- `\033[1;1H` 将光标移到第 1 行第 1 列

```cpp
void clearANSI() {
    printf("\033[2J\033[1;1H");
    fflush(stdout);
}
```

- **优点**：真正跨平台（Windows 10 版本 1511 后默认支持），无需调用外部命令，代码精简。
- **缺点**：如果用户使用 Windows 7 或禁用了 ANSI 支持，则可能显示乱码。不过目前绝大多数开发环境已无此问题。

---

## 跨平台方案

我们可以综合利用以上方法，编写一个 `clearConsole()` 函数：

```cpp
#include <cstdio>
#include <cstdlib>

#ifdef _WIN32
    #include <windows.h>
#endif

void clearConsole() {
    #ifdef _WIN32
        // 尝试使用 ANSI 转义（Windows 10+）
        // 若想更稳健，可以先检测是否启用 VT 模式，但这里简化
        HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
        DWORD dwMode = 0;
        GetConsoleMode(hOut, &dwMode);
        if (dwMode & ENABLE_VIRTUAL_TERMINAL_PROCESSING) {
            // 已启用 VT 模式，直接使用 ANSI
            printf("\033[2J\033[1;1H");
            fflush(stdout);
            return;
        }
        // 否则回退到 Windows API
        CONSOLE_SCREEN_BUFFER_INFO csbi;
        DWORD written, cells;
        if (GetConsoleScreenBufferInfo(hOut, &csbi)) {
            cells = csbi.dwSize.X * csbi.dwSize.Y;
            COORD origin = {0, 0};
            FillConsoleOutputCharacter(hOut, ' ', cells, origin, &written);
            FillConsoleOutputAttribute(hOut, csbi.wAttributes, cells, origin, &written);
            SetConsoleCursorPosition(hOut, origin);
        } 
        else system("cls");
    #else
        // Unix 系统使用此方案
        // 优先使用 ANSI 转义
        printf("\033[2J\033[1;1H");
        fflush(stdout);
    #endif
}
```

### 针对早期 Windows 系统的额外考虑

如果你需要支持 Windows 7，最稳妥的是使用 Windows API 方法，因为旧版 CMD 默认不识别转义序列。检测 VT 支持可以提升兼容性。

---

## 常见问题

### Q: 为什么使用 `printf` 后还要 `fflush`？

终端输出默认是行缓冲，若不主动刷新，转义序列可能不会立即生效，导致清屏延迟。调用 `fflush(stdout)` 强制输出。

### Q: `system("clear")` 和 `system("cls")` 哪个更快？
都不快，因为它们会创建新进程。在需要频繁清屏时，强烈建议使用 API 或 ANSI 转义序列。

### Q: 如何判断终端是否支持 ANSI 转义？

- **Windows**：通过 `GetConsoleMode` 检查 `ENABLE_VIRTUAL_TERMINAL_PROCESSING` 标志。
- **Unix**：可以通过检查 `TERM` 环境变量，但最简单的是直接发送序列，多数现代终端都支持。
