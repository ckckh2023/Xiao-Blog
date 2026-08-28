CMake 是一个开源的跨平台自动化构建系统。它不直接构建软件，而是生成标准的构建文件：如 Windows 上的 Visual Studio 项目文件、Linux 上的 Makefile。CMake 是目前 C++ 项目事实上的跨平台构建标准。

---

## CMake 的核心价值

- **一套脚本，多平台构建**：只需编写一套 CMakeLists.txt，即可在各平台生成对应的构建文件
- **自动依赖管理**：自动查找和配置第三方库依赖
- **行业标准**：Qt、OpenCV、Boost 等大量开源项目使用 CMake
- **灵活性**：支持条件编译、自定义构建配置

## 安装 CMake

**Windows：** 从 [CMake 官网](https://cmake.org/download/)下载安装包，安装时勾选“添加 CMake 到系统 PATH”

**Linux：**
```bash
# Ubuntu/Debian
sudo apt-get install cmake
# CentOS/RHEL
sudo yum install cmake
```

**macOS：**
```bash
brew install cmake
```

验证安装：`cmake --version`

---

## 第一个 CMake 项目

项目结构：
```
hello_cmake/
├── CMakeLists.txt
└── main.cpp
```

**CMakeLists.txt：**
```cmake
cmake_minimum_required(VERSION 3.10)
project(HelloCMake)
add_executable(hello main.cpp)
```

## 构建流程

CMake 采用**源码外构建**（out-of-source build）的方式，保持源码目录整洁：

```bash
mkdir build && cd build
cmake ..
cmake --build .
```

## 跨平台条件编译

CMake 支持根据平台进行条件配置：

```cmake
if(WIN32)
    target_compile_definitions(myapp PUBLIC PLATFORM_WINDOWS)
elseif(UNIX)
    target_compile_definitions(myapp PUBLIC PLATFORM_UNIX)
endif()
```

也支持根据编译器设置不同选项
```cmake
if(MSVC)
    target_compile_options(myapp PRIVATE /W4)
else()
    target_compile_options(myapp PRIVATE -Wall -Wextra)
endif()
```

---

## 总结

- 使用 **target-based** 的设计理念（现代 CMake，3.15+）
- 使用 `target_include_directories`、`target_link_libraries` 而非全局命令
- 善用 `find_package` 查找第三方库
- 使用 `CMakePresets.json` 管理不同平台的构建配置
