截屏是桌面开发中的常见需求，从截图工具到录屏软件都离不开它。不同平台的截屏技术差异很大：Windows 上经历了从 GDI 到 DirectX 的演进，Linux 上则分为 X11 和 Wayland 两套显示协议。本文将给出 Windows GDI 与 Linux X11 两个完整可运行示例。

---

## Windows 上的两种主流截屏方式

### Desktop Duplication API

Desktop Duplication API 是 Windows 8/8.1 及以上版本引入的 `DirectX` 家族的一部分，是当前推荐和主流的截屏技术。

它的基本原理就是允许应用程序直接复制整个桌面的图像数据。这种方式可以高效地获取包括硬件加速内容（游戏、视频）在内的所有画面，因此可以实现高性能的屏幕录制。

- **优点**：可以完美捕获所有类型的画面（GDI、DirectX、OpenGL），性能高，延迟低，适合游戏截图和录屏。
- **缺点**：编程相对复杂，需要 DirectX 知识，且只支持较新的 Windows 版本。

> [!TIP]
> 现在的截图工具（如 Windows 11 的截图工具、Snipaste、OBS、游戏录屏软件）都优先使用 `Desktop Duplication API`，在它无法使用的情况下会回退到基于 GDI 的传统截屏方式。

### GDI 方式

GDI（Graphics Device Interface）是 Windows 早期的图形接口，通过设备上下文来操作图形。基于 GDI 的截屏兼容所有 Windows 版本，实现简单，但无法捕获硬件加速的全屏内容（如部分游戏画面），性能也相对较低。

---

## Windows GDI 截屏的基本流程

使用基于 GDI 的截屏方式非常容易理解：

- 使用 `GetDC(NULL)` 获取整个屏幕的设备上下文。
- 创建一个与屏幕 DC 兼容的内存设备上下文，以及一个与屏幕 DC 兼容的位图，尺寸与屏幕分辨率相同。
- 将新创建的位图选入内存 DC 中。
- 使用 `BitBlt` 函数从屏幕 DC 复制整个屏幕区域到内存 DC，完成将屏幕内容复制到内存位图中的操作。

如果我们需要把截屏内容保存到文件中，就把内存位图中的内容转成对应格式的图片保存成文件即可。

### 完整示例代码

> [!CAUTION]
> 使用 `msvc` 编译时需要链接 user32 和 gdi32 库：`cl main.cpp user32.lib gdi32.lib`；使用 `mingw64/g++` 编译时需要链接 gdi32 库：`g++ main.cpp -lgdi32`。

```cpp
#include <cstdio>
#include <windows.h>

bool SaveBitmapImage(HBITMAP hBitmap, const char* Filename) {
    BITMAP bmp;
    BITMAPINFOHEADER bi;
    BITMAPFILEHEADER bfh;
    HANDLE hFile;
    DWORD dwBytesWritten;
    BYTE* lpBits;
    HDC hdc;
    
    GetObject(hBitmap, sizeof(BITMAP), &bmp);

    ZeroMemory(&bi, sizeof(BITMAPINFOHEADER));
    bi.biSize = sizeof(BITMAPINFOHEADER);
    bi.biWidth = bmp.bmWidth;
    bi.biHeight = bmp.bmHeight;
    bi.biPlanes = 1;
    bi.biBitCount = 24;
    bi.biCompression = BI_RGB;
    bi.biSizeImage = 0;
    
    DWORD dwBmpSize = ((bmp.bmWidth * bi.biBitCount + 31) / 32) * 4 * bmp.bmHeight; // BMP 每行需按 4 字节对齐
    
    lpBits = (BYTE*)GlobalAlloc(GMEM_FIXED, dwBmpSize);

    hdc = GetDC(NULL);

    GetDIBits(
        hdc,
        hBitmap,
        0,
        (UINT)bmp.bmHeight,
        lpBits,
        (BITMAPINFO*)&bi,
        DIB_RGB_COLORS
    );
    ReleaseDC(NULL, hdc);
    
    hFile = CreateFileA(
        Filename,
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    bfh.bfType = 0x4D42;
    bfh.bfSize = dwBmpSize + sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
    bfh.bfOffBits = sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
    bfh.bfReserved1 = 0;
    bfh.bfReserved2 = 0;
    
    WriteFile(hFile, &bfh, sizeof(BITMAPFILEHEADER), &dwBytesWritten, NULL);
    WriteFile(hFile, &bi, sizeof(BITMAPINFOHEADER), &dwBytesWritten, NULL);

    WriteFile(hFile, lpBits, dwBmpSize, &dwBytesWritten, NULL);

    GlobalFree(lpBits);
    CloseHandle(hFile);

    return true;
}

int main(int argc, char *argv[]) {
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);

    HDC hdcScreen = GetDC(NULL);
    HDC hdcMem = CreateCompatibleDC(hdcScreen);
    HBITMAP hBitmap = CreateCompatibleBitmap(hdcScreen, screenWidth, screenHeight);

    HGDIOBJ hOld = SelectObject(hdcMem, hBitmap);
    bool result = BitBlt(
        hdcMem,
        0,
        0,
        screenWidth,
        screenHeight,
        hdcScreen,
        0,
        0,
        SRCCOPY
    );

    if (result) {
        if (SaveBitmapImage(hBitmap, "ScreenShot.bmp")) printf("Screenshot saved successfully\n");
        else printf("Failed to save screenshot\n");
    }
    else printf("Failed to capture screen\n");

    SelectObject(hdcMem, hOld);
    DeleteObject(hBitmap);
    DeleteDC(hdcMem);
    ReleaseDC(NULL, hdcScreen);

    return 0;
}
```

---

## 保存 BMP 文件的原理

`SaveBitmapImage` 函数是保存图片的关键。它通过 `GetDIBits` 获取位图的实际像素数据，将 DDB（设备相关位图）转换为 DIB（设备无关位图），然后依次把以下三部分写入文件，就得到了一张 BMP 格式的图片：

- **位图文件头** `BITMAPFILEHEADER`：标识文件类型（"BM"）、文件总大小、像素数据偏移量。
- **位图信息头** `BITMAPINFOHEADER`：描述位图的宽度、高度、位深、压缩方式等。
- **位图像素数据**：真正的 RGB 像素，每行按 4 字节对齐。

> [!CAUTION]
> BMP 格式中 `biHeight` 为正值时，像素数据是自下而上存储的，这是 BMP 的历史约定，读取时需注意。

---

## Linux 上的截屏方式

Linux 桌面有两套显示协议：传统的 **X11**（X Window System）和现代的 **Wayland**。它们的截屏接口完全不同，需要分别处理。

### X11 方式

X11 是 Linux 上历史悠久的显示协议，截屏接口非常直接。核心思路是通过 `XOpenDisplay` 连接显示服务器，获取根窗口（`DefaultRootWindow`），再用 `XGetImage` 一次性把整个屏幕的像素读到一个 `XImage` 结构里。

- **优点**：API 简单，几行代码即可完成；兼容所有 X11 桌面（GNOME、KDE、XFCE 的 X11 会话）。
- **缺点**：X11 已逐步被 Wayland 取代；`XGetImage` 走的是软件拷贝，性能不如硬件加速方案；在 Wayland 会话下通过 XWayland 运行时，只能截到 XWayland 自己的窗口，截不到原生 Wayland 窗口。

> [!CAUTION]
> 编译时需要链接 X11 库：`g++ main.cpp -lX11`

#### 完整示例代码

```cpp
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <cstdio>
#include <cstring>
#include <cstdint>

#pragma pack(push, 2) // BMP 文件头需 2 字节对齐
struct BITMAPFILEHEADER {
    uint16_t bfType;
    uint32_t bfSize;
    uint16_t bfReserved1;
    uint16_t bfReserved2;
    uint32_t bfOffBits;
};
#pragma pack(pop)

struct BITMAPINFOHEADER {
    uint32_t biSize;
    int32_t biWidth;
    int32_t biHeight;
    uint16_t biPlanes;
    uint16_t biBitCount;
    uint32_t biCompression;
    uint32_t biSizeImage;
    int32_t biXPelsPerMeter;
    int32_t biYPelsPerMeter;
    uint32_t biClrUsed;
    uint32_t biClrImportant;
};

bool SaveXImageAsBmp(XImage* img, const char* filePath) {
    int width  = img->width;
    int height = img->height;

    int rowSize = ((width * 3 + 3) / 4) * 4;
    int imageSize = rowSize * height;

    FILE* fp = fopen(filePath, "wb");
    if (!fp) return false;

    BITMAPFILEHEADER bfh;
    BITMAPINFOHEADER bih;
    memset(&bfh, 0, sizeof(bfh));
    memset(&bih, 0, sizeof(bih));

    bfh.bfType = 0x4D42;
    bfh.bfOffBits = sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
    bfh.bfSize = bfh.bfOffBits + imageSize;

    bih.biSize = sizeof(BITMAPINFOHEADER);
    bih.biWidth = width;
    bih.biHeight = height;
    bih.biPlanes = 1;
    bih.biBitCount = 24;
    bih.biCompression = 0;

    fwrite(&bfh, sizeof(bfh), 1, fp);
    fwrite(&bih, sizeof(bih), 1, fp);

    unsigned char* row = new unsigned char[rowSize];
    for (int y = height - 1; y >= 0; y--) {
        for (int x = 0; x < width; x++) {
            unsigned long pixel = XGetPixel(img, x, y);
            row[x * 3 + 0] = (pixel >> 0)  & 0xFF;
            row[x * 3 + 1] = (pixel >> 8)  & 0xFF;
            row[x * 3 + 2] = (pixel >> 16) & 0xFF;
        }
        for (int p = width * 3; p < rowSize; p++) row[p] = 0;
        fwrite(row, 1, rowSize, fp);
    }
    delete[] row;
    fclose(fp);
    return true;
}

int main(int argc, char *argv[]) {
    Display* disp = XOpenDisplay(NULL);
    if (!disp) {
        printf("Cannot open xDisplay\n");
        return 1;
    }

    Window root = DefaultRootWindow(disp);
    int width  = DisplayWidth(disp, DefaultScreen(disp));
    int height = DisplayHeight(disp, DefaultScreen(disp));

    XImage* img = XGetImage(
        disp,
        root,
        0,
        0,
        width,
        height,
        AllPlanes,
        ZPixmap
    );
    if (!img) {
        printf("Failed to get image\n");
        XCloseDisplay(disp);
        return 1;
    }

    if (SaveXImageAsBmp(img, "ScreenShot.bmp")) printf("Screenshot saved successfully\n");
    else printf("Failed to save screenshot\n");

    XDestroyImage(img);
    XCloseDisplay(disp);
    return 0;
}
```

> [!TIP]
> 上面用 `XGetPixel` 逐像素读取，代码直观但较慢。追求性能时可直接访问 `img->data`，根据 `img->byte_order`、`img->bits_per_pixel`、`img->red_mask/green_mask/blue_mask` 做批量转换。

### Wayland 方式

Wayland 出于安全设计，**不允许客户端任意读取其他窗口或整屏的像素**，因此没有类似 `XGetImage` 的简单接口。要在 Wayland 下截屏，必须走协议协商流程：

- 通过 D-Bus 调用 `xdg-desktop-portal` 的 `org.freedesktop.portal.ScreenCast` 接口请求一个屏幕源，会弹出系统授权对话框让用户确认。
- portal 后端（如 `xdg-desktop-portal-gnome`/`-kde`/`-wlr`）将屏幕内容以 **PipeWire** 流的形式提供。
- 应用通过 `libpipewire` 订阅该流，从流缓冲区中拿到每一帧的 DMA-BUF 或共享内存数据。

本文不展开 Wayland 截屏方式。实际项目中通常直接复用现成库。

> [!TIP]
> 如果只是想快速在 Wayland 下截屏，最省事的方式是调用 `grim`（wlroots 系）或 `kscreen-grab`（KDE）等专用工具，把结果写入文件再读取。例如 `system("grim screenshot.png");`。

---

## 各方式的对比与选择

| 特性 | Windows GDI | Desktop Duplication API | Linux X11 | Linux Wayland |
| --- | --- | --- | --- | --- |
| 支持范围 | 所有 Windows 版本 | Windows 8/8.1+ | X11 会话 | Wayland 会话 |
| 能否捕获游戏画面 | 一般不能 | 能 | 能 | 能 |
| 性能 | 较低 | 高、延迟低 | 中等 | 高 |
| 实现复杂度 | 简单 | 复杂，需 DirectX | 简单 | 复杂，需 D-Bus+PipeWire |
| 是否需要用户授权 | 否 | 否 | 否 | 是 |
| 适用场景 | 普通桌面截图 | 录屏、游戏截图 | X11 桌面截图 | Wayland 桌面截图/录屏 |

> [!TIP]
> 实际工程中常见的做法是：Windows 优先尝试 Desktop Duplication API，失败时回退到 GDI；Linux 上根据 `XDG_SESSION_TYPE` 环境变量判断是 X11 还是 Wayland，分别走 Xlib 或 portal/grim 路径，这样既兼顾性能，又保证跨平台兼容性。

---

## 常见问题

### Q: 为什么我用 GDI 截游戏画面得到的是黑屏？

部分游戏使用 DirectX/OpenGL 独占全屏模式，画面直接由 GPU 渲染到屏幕，不经过 GDI 的桌面 DC，因此 `BitBlt` 抓不到内容。这种情况必须使用 Desktop Duplication API。

### Q: `GetDC(NULL)` 和 `GetDC(hwnd)` 有什么区别？

`GetDC(NULL)` 获取的是整个屏幕的 DC，可以截全屏；`GetDC(hwnd)` 获取指定窗口的 DC，用于截取单个窗口。截取指定窗口时还需配合 `GetWindowRect` 获取窗口区域坐标。

### Q: 如何截取多显示器？

将 `GetSystemMetrics(SM_CXSCREEN)` 改为 `GetSystemMetrics(SM_CXVIRTUALSCREEN)`，`SM_CYSCREEN` 改为 `SM_CYVIRTUALSCREEN`，并使用 `SM_XVIRTUALSCREEN` 和 `SM_YVIRTUALSCREEN` 作为起始坐标，即可截取虚拟桌面。

### Q: 如何保存为 PNG 或 JPG？

BMP 格式实现简单、无需第三方库。若要保存为 PNG/JPG，可使用 GDI+ 的 `Bitmap::Save`，或引入 stb_image_write、libpng 等库。

### Q: Linux 上如何判断当前是 X11 还是 Wayland？

读取环境变量 `XDG_SESSION_TYPE`：值为 `x11` 即 X11 会话，值为 `wayland` 即 Wayland 会话。也可检查 `WAYLAND_DISPLAY` 环境变量是否存在来辅助判断。

### Q: 为什么我的 X11 截屏代码在 Wayland 下截不到内容？

在 Wayland 会话中，X11 程序运行在 `XWayland 兼容层` 上，`DefaultRootWindow` 只是 XWayland 自己的根窗口，并非整个桌面。原生 Wayland 窗口的内容不在其中，所以截到的是空白或仅剩 X11 窗口。Wayland 会话下必须走 portal/PipeWire 或调用 `grim` 等专用工具。

### Q: X11 的 `XGetImage` 性能瓶颈在哪？

`XGetImage` 默认走网络协议把像素从 X Server 拷到客户端，是软件拷贝。大分辨率下逐像素 `XGetPixel` 更慢。优化方案：直接按 `img->data` 做批量内存拷贝，或改用 `XShmGetImage`（MIT-SHM 共享内存扩展），可显著减少拷贝开销。

---

## 使用 libpng 保存 PNG

libpng 是官方维护的 PNG 参考库，用标准 C 编写，仅依赖 zlib，，是替代手写 BMP 的跨平台方案。

> [!CAUTION]
> libpng 要求传入的像素**自上而下**逐行排列。而 BMP / `GetDIBits` / `XGetImage` 的像素通常是**自下而上**存储的，直接喂给 libpng 会导致图像上下颠倒。调用前需按行翻转，或在上面的 BMP 示例中把循环改为从 `y = 0` 到 `height - 1` 收集。

```cpp
#include <png.h>
#include <cstdio>
#include <cstring>

bool SaveRgbAsPng(const unsigned char* rgb, int width, int height, const char* filename) {
    FILE* fp = fopen(filename, "wb");
    if (!fp) return false;

    png_structp png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, nullptr, nullptr, nullptr);
    if (!png_ptr) {
        fclose(fp);
        return false;
    }

    png_infop info_ptr = png_create_info_struct(png_ptr);
    if (!info_ptr) {
        png_destroy_write_struct(&png_ptr, nullptr);
        fclose(fp);
        return false;
    }

    if (setjmp(png_jmpbuf(png_ptr))) {
        png_destroy_write_struct(&png_ptr, &info_ptr);
        fclose(fp);
        return false;
    }

    png_init_io(png_ptr, fp);

    png_set_IHDR(
        png_ptr,
        info_ptr,
        width, height, 8,
        PNG_COLOR_TYPE_RGB,
        PNG_INTERLACE_NONE,
        PNG_COMPRESSION_TYPE_DEFAULT,
        PNG_FILTER_TYPE_DEFAULT
    );

    png_write_info(png_ptr, info_ptr);

    // libpng 要求传入每行的起始指针数组
    png_bytep* rows = new png_bytep[height];
    for (int y = 0; y < height; y++) rows[y] = (png_bytep)(rgb + (long)y * width * 3);
    png_write_image(png_ptr, rows);
    delete[] rows;

    png_write_end(png_ptr, info_ptr);

    png_destroy_write_struct(&png_ptr, &info_ptr);
    fclose(fp);
    return true;
}
```

> [!CAUTION]
> libpng 按 `PNG_COLOR_TYPE_RGB` 写入时默认期望 **R,G,B** 顺序。Windows BMP 与 X11 `ZPixmap` 常见的是 **B,G,R**，保存前需交换 R 与 B 两个通道，否则红蓝会互换。

### 接入上面的截屏示例

在前面的 BMP 保存函数基础上，只改两处即可改存 PNG：

- **翻转行序**：BMP/`GetDIBits` 像素自下而上，PNG 需自上而下（X11 用 `XGetPixel` 按 `y` 递增读取时已是自上而下，无需翻转）。
- **交换 R/B**：BMP 与 X11 `ZPixmap` 常见是 BGR，而 PNG 需 RGB。

把像素整理成连续、自上而下、RGB、无 padding 的缓冲区后调用 `SaveRgbAsPng`。对应到 `main` 中，只需替换一行调用：

- **Windows GDI**：`SaveBitmapImage(hBitmap, "ScreenShot.bmp")` -> `SaveHBitmapAsPng(hBitmap, screenWidth, screenHeight, "ScreenShot.png")`
- **Linux X11**：`SaveXImageAsBmp(img, "ScreenShot.bmp")` -> `SaveXImageAsPng(img, "ScreenShot.png")`

> [!TIP]
> 追求性能时，X11 可不逐像素 `XGetPixel`，直接按 `img->data` + `img->red_mask/green_mask/blue_mask` 做批量转换，再喂给 `SaveRgbAsPng`。

### `libpng` 各平台安装与编译

| 平台 | 安装 | 编译链接 |
| --- | --- | --- |
| Windows (vcpkg) | `vcpkg install libpng` | `cl main.cpp libpng.lib zlib.lib` |
| Windows (MinGW) | MSYS2 `pacman -S mingw-w64-x86_64-libpng` | `g++ main.cpp -lpng -lz` |
| Linux (apt) | `sudo apt install libpng-dev` | `g++ main.cpp -lpng -lz` |
| Linux (yum) | `sudo yum install libpng-devel` | `g++ main.cpp -lpng -lz` |
| macOS (brew) | `brew install libpng` | `g++ main.cpp -lpng -lz` |

> [!TIP]
> 若不想引入 libpng，只需使用单头库 `stb_image_write.h` 的 `stbi_write_png` 也能写出 PNG；但 libpng 对压缩参数、渐进式写入、错误处理控制更细，更适合生产环境。