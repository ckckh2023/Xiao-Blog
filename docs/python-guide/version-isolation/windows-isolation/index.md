在 Windows 上，如果你同时安装了 Python 3.11 和 Python 3.14，直接输入 `python` 命令时，系统只会调用 PATH 环境变量中**排在最前面**的那个版本。这会导致你无法精确控制哪个项目使用哪个 Python 版本，极易引发混乱。

更麻烦的是，过去从 python.org 下载独立的 `.exe` 安装包来安装 Python，容易造成电脑同时存在多个版本、`python` 和 `py` 命令指向混乱、`pip` 装错环境等问题。为了解决这些痛点，Python 官方推出了新一代的解决方案。

---

### 首选方案：Python Install Manager（官方推荐）

**Python Install Manager** 是 Python 官方团队为 Windows 平台打造的**新一代 Python 安装与版本管理工具**。它统一了安装 Python和管理多个 Python 版本这两个功能，是未来 Python 在 Windows 上的主流安装方式。

> **重要提示**：从 **Python 3.16** 开始，传统的独立 `.exe` 安装包将停止发布。因此，**现在就迁移到 Python Install Manager 是最明智的选择**。

##### 安装方式

Python Install Manager 本身是一个 Windows 应用，有以下几种安装方式：

| 安装方式 | 命令 / 操作 |
| :--- | :--- |
| **微软商店（推荐）** | 在 微软商店中搜索 “Python Install Manager” 并安装即可 | 
| **WinGet** | PowerShell 运行 `winget install 9NQ7512CXL7T` 即可 | 
| **手动下载 MSIX** | 从 [官方网站](https://www.python.org/downloads/release/pymanager-260/) 下载 `MSI 包`安装 | 

安装完成后，建议运行一次配置检查，让工具自动完成环境初始化：

```powershell
py install --configure
```

> **注意**：如果电脑上之前安装过旧版 Python Launcher，建议先将其卸载，避免命令冲突。

##### 核心用法

安装完成后，Python Install Manager 会自动注册 `python`、`py`、`pymanager` 这四个命令。其中 `py` 是日常使用最频繁的命令。

**版本管理**

| 命令 | 作用 |
| :--- | :--- |
| `py list` | 列出系统上所有已安装的 Python 版本 |
| `py list --online` | 查看官方源所有可用的 Python 版本 |
| `py install 3.14` | 安装 Python 3.14 |
| `py install default` | 安装最新的稳定版 Python |
| `py uninstall 3.13` | 卸载 Python 3.13 |
| `py uninstall --purge` | 彻底清理所有通过 Manager 安装的内容 |

**运行与切换**

| 命令 | 作用 |
| :--- | :--- |
| `py` 或 `python` | 启动默认版本的 Python 解释器 |
| `py -3.11` | 启动 Python 3.11 |
| `py -3.11 -m pip install requests` | 使用 Python 3.11 的 pip 安装包 |
| `py -3.11 script.py` | 使用 Python 3.11 运行脚本 |

---

#### 再选方案：旧版 py launcher

传统的 py launcher 只能“选择”已安装的版本，但**不能安装或卸载** Python 本身。而 Python Install Manager 是它的**全面升级版**，在保留所有旧命令兼容性的同时，新增了完整的版本安装、卸载、更新功能。

> 如果你暂时不想迁移到 Python Install Manager，旧版的 `py` 启动器仍然可以使用。

它的基本用法与新版类似，但**缺少安装和卸载 Python 版本的能力**：

| 命令 | 作用 |
| :--- | :--- |
| `py --list` | 列出系统上安装的所有 Python 版本 |
| `py` | 启动默认版本的 Python 解释器 |
| `py -3.11` | 启动 Python 3.11 |
| `py -3.11 -m pip install requests` | 使用 Python 3.11 的 pip 安装第三方包 |

> **建议**：官方已经明确传统安装包将在 Python 3.16 停止发布，建议尽早切换到 Python Install Manager，一劳永逸。

---

### 总结

在 Windows 上管理多版本 Python 时，推荐以下做法：

1.  **优先使用 Python Install Manager**：通过 `py install` 安装所有 Python 版本，通过 `py list` 和 `py uninstall` 统一管理，彻底告别 `.exe` 安装包的混乱。
2.  **使用 `py -3.X` 选择版本**：始终使用 `py -3.X` 的形式来明确指定你要使用的 Python 版本。
3.  **结合虚拟环境**：用 `py -3.11 -m venv myenv` 创建虚拟环境，精准锁定该环境使用的 Python 版本，可查看[我的博客](https://xiao-blog.top/docs/article?id=python-guide&sub=venv-guide)。

---