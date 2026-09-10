Linux 系统（如 Ubuntu、Debian）通常预装了一个或多个 Python 版本，例如 Ubuntu 26.04 默认带有 Python 3.14。这些系统自带的 Python 被许多底层工具依赖。
如果你直接在系统环境中安装第三方包，会触发 `externally-managed-environment` 错误，这是 Linux 发行版启用的 `PEP 668` 保护机制，目的是防止用户意外破坏系统环境。

> 在 Linux 系统内，Python 版本管理不可或缺！

---

### 查看 Python 版本

你可以通过以下命令查看系统中已有的 Python 版本：

```bash
ls /usr/bin/python*
```

> **注意**：系统自带的 Python 被许多底层工具（如 `apt`、系统设置、软件中心）所依赖，因此**不要**直接往系统 Python 中安装第三方包（`pip install` 会被 PEP 668 保护机制拦截）。

### 安装不同版本的 Python

除了系统仓库自带的 Python 版本外，你可以通过 **Deadsnakes PPA** 第三方仓库来安装几乎任何你需要的 Python 版本。这是一个专门为 Ubuntu 提供多个 Python 版本的非官方仓库，安装的版本**不会覆盖系统默认的 Python**，因此相对安全。

#### 添加 Deadsnakes PPA 源

首先安装 `software-properties-common` 包（如果尚未安装），然后添加 Deadsnakes PPA 并更新包列表：

```bash
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
```

> **提示**：Deadsnakes 提供两个版本：稳定版（`ppa:deadsnakes/ppa`）和尝鲜版（`ppa:deadsnakes/nightly`）。如果想体验最新的 Python 开发版，可以添加 nightly 版本。

#### 安装指定版本的 Python

添加源之后，就可以像安装普通软件包一样安装 Python 了：

```bash
sudo apt install python3.11
```

安装完成后，通过对应命令验证：

```bash
python3.11 --version
```

> Deadsnakes 支持从 Python 3.7 到 3.14 的几乎所有版本，具体可用版本取决于你的 Ubuntu 版本。

#### 安装相关开发组件

除了 Python 解释器本身，通常还需要安装一些配套组件。Deadsnakes 为每个 Python 版本提供了多个子包：

| 包名 | 说明 |
| :--- | :--- |
| `python3.x` | Python 解释器（核心） |
| `python3.x-venv` | 虚拟环境支持（`venv` 模块） |
| `python3.x-dev` | 头文件和静态库（用于编译 C 扩展） |
| `python3.x-full` | **完整版**——包含标准库中的所有模块 |
| `python3.x-tk` | Tkinter GUI 支持 |
| `python3.x-gdbm` | GNU dbm 数据库支持 |

建议至少安装 `python3.x-venv` 和 `python3.x-dev`：

```bash
sudo apt install python3.11 python3.11-venv python3.11-dev
```

##### 关于 `python3.x-full` 包

`python3.x-full` 是**完整版** Python 包，它包含了 Python 解释器以及**完整的标准库**。普通的 `python3.x` 包可能不会安装所有标准库模块（如 `tkinter`、`gdbm` 等），而 `-full` 版本会一并安装。

如果遇到 `ModuleNotFoundError` 提示缺少某个标准库模块，安装对应的 `-full` 包通常可以解决问题：

```bash
sudo apt install python3.11-full
```

> **注意**：`-full` 包会安装更多依赖，占用更多磁盘空间。如果只是日常开发，安装 `python3.x` + `python3.x-venv` + `python3.x-dev` 通常就足够了。只有在需要完整标准库（如使用 Tkinter 开发 GUI 应用）时才需要安装 `-full`。

---

### 使用不同版本的 Python

Linux 上不同版本的 Python 通过不同的命令名称来区分。使用时，直接指定完整命令即可：

| 操作 | 命令 | 说明 |
| :--- | :--- | :--- |
| **启动 Python 3.11** | `python3.11` | 进入 Python 3.11 交互式解释器 |
| **启动 Python 3.14** | `python3.14` | 进入 Python 3.14 交互式解释器 |
| **运行脚本** | `python3.11 script.py` | 使用 Python 3.11 执行脚本 |
| **使用 pip 安装包** | `python3.11 -m pip install 包名` | 用 `-m pip` 方式调用对应版本的 pip |
| **列出已安装包** | `python3.11 -m pip list` | 查看该版本已安装的包 |

---

### 核心用法详解

#### 启动交互式解释器

直接输入版本命令即可进入该版本的 Python 交互环境：

```bash
python3.11
```

##### 运行 Python 脚本

用指定版本运行 `.py` 文件：

```bash
python3.14 main.py
python3.11 /home/user/project/app.py
```

##### 使用 pip 管理包

由于 Linux 启用了 PEP 668 保护，直接向系统环境安装包会报错：

```bash
pip install requests
```

**正确做法**是不要染指系统环境：为项目创建独立的虚拟环境（`venv`），所有第三方包都安装到虚拟环境内，不受 PEP 668 限制：

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install requests
```

> 虚拟环境的完整用法可查看我的[文档](https://xiao-blog.top/docs/article?id=python-guide&sub=venv-guide)。虚拟环境内的包完全隔离，不会污染系统 Python，也更安全。

---

##### 导出与安装依赖清单

> 以下内容建立在非系统 Python 环境的情况下！

```bash
# 导出当前环境的所有包
python3.11 -m pip freeze > requirements.txt

# 从文件安装依赖
python3.11 -m pip install -r requirements.txt
```

> `requirements.txt` 文件中记录了所有包的名称和版本号，方便在不同环境中复制相同的依赖环境，是 Python 标准的依赖清单。

#### 版本切换与默认版本

Linux 系统中，`python3` 命令通常指向系统默认的 Python 版本（一般是最新版）：

```bash
python3 --version
```

如果你希望临时使用其他版本，只需要显式输入完整命令即可，例如 `python3.11`、`python3.14`。

---

**如果想修改系统默认的 `python3` 指向**，可以使用 `update-alternatives` 工具：

```bash
sudo update-alternatives --config python3
```

系统会列出所有已安装的 Python 版本，输入对应数字即可切换。**但请注意**：随意更改系统默认 Python 版本可能导致系统工具（如 `apt`）出错，建议保持默认不变，需要时直接使用 `python3.11` 或 `python3.14` 等完整命令。

---

> **重要提醒**：在实际开发中，**强烈建议每个项目独立使用虚拟环境**（详见我的[文档](https://xiao-blog.top/docs/article?id=python-guide&sub=venv-guide)）。这可以避免不同项目之间的依赖冲突，也能让包管理更加清晰。虚拟环境内的包全部隔离，不会污染系统环境。