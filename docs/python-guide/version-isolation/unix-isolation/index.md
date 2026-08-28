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

由于 Linux 启用了 PEP 668 保护，直接使用 `pip install` 会报错：

```bash
pip install requests
```

**正确做法**是使用 `-m pip` 模块方式，并配合 `--user` 参数将包安装到用户目录：

```bash
python3.11 -m pip install --user requests
```

> **为什么加 `--user`？** 因为不加 `--user` 时，pip 默认尝试安装到系统目录（`/usr/lib/python3.X/`），这会被 PEP 668 阻止。加 `--user` 后，包会安装到 `~/.local/lib/python3.X/site-packages/`，完全属于用户个人，不受系统保护机制限制，也更安全。

##### 导出与安装依赖清单

```bash
# 导出当前用户环境的所有包
python3.11 -m pip freeze --user > requirements.txt

# 从文件安装依赖
python3.11 -m pip install --user -r requirements.txt
```

> `requirements.txt` 文件中记录了所有包的名称和版本号，方便在不同环境中复制相同的依赖环境，是 Python 标准的依赖清单。

#### 版本切换与默认版本

Linux 系统中，`python3` 命令通常指向系统默认的 Python 版本（一般是最新版）：

```bash
python3 --version
```

如果你希望临时使用其他版本，只需要显式输入完整命令即可，例如 `python3.11`、`python3.14`。

**如果想修改系统默认的 `python3` 指向**，可以使用 `update-alternatives` 工具：

```bash
sudo update-alternatives --config python3
```

系统会列出所有已安装的 Python 版本，输入对应数字即可切换。**但请注意**：随意更改系统默认 Python 版本可能导致系统工具（如 `apt`）出错，建议保持默认不变，需要时直接使用 `python3.11` 或 `python3.14` 等完整命令。

---

> **重要提醒**：在实际开发中，**强烈建议每个项目独立使用虚拟环境**（详见[我的博客](https://xiao-blog.top/docs/article?id=python-guide&sub=venv-guide)）。这可以避免不同项目之间的依赖冲突，也能让包管理更加清晰。虚拟环境内的包全部隔离，不会污染用户目录，也无需反复使用 `--user` 参数。