虚拟环境是一个**独立的 Python 运行环境**，它拥有自己的 Python 解释器、标准库和第三方包。它的核心价值在于：

- **解决依赖冲突**：不同项目可以使用不同版本的同一个包（如 Django 3.2 和 Django 4.0），互不干扰。
- **避免污染全局环境**：防止因为安装、测试、升级包而破坏系统或其他项目的稳定性。
- **实现环境可复现**：通过 `requirements.txt` 文件，可以精确记录和重现项目的完整依赖环境。

`venv` 是 Python 3.3+ 版本内置的虚拟环境管理工具，是官方推荐的标准方案。

---

#### 核心概念与命令

| 操作 | Windows 命令 | Linux/macOS 命令 | 说明 |
| :--- | :--- | :--- | :--- |
| **创建环境** | `py -3.11 -m venv .venv` | `python3.11 -m venv .venv` | 创建名为 `.venv` 的虚拟环境目录。建议使用 `.venv` 作为目录名。 |
| **激活环境** | `.venv\Scripts\activate` | `source .venv/bin/activate` | 激活虚拟环境。激活后，命令行提示符前会出现 `(.venv)` 标识。 |
| **退出环境** | `deactivate` | `deactivate` | 退出当前激活的虚拟环境。 |
| **导出依赖** | `pip freeze > requirements.txt` | `pip freeze > requirements.txt` | 将当前环境的所有包及其版本导出到文件。 |
| **安装依赖** | `pip install -r requirements.txt` | `pip install -r requirements.txt` | 根据 `requirements.txt` 文件安装所有依赖包。 |

---

#### 从零搭建一个项目

- **创建虚拟环境**（以 Python 3.11 为例）：
    - **Windows**：`py -3.11 -m venv .venv`
    - **Linux/macOS**：`python3.11 -m venv .venv`
    > 使用 `py -3.11`（Windows）或 `python3.11`（Linux）可以**精准锁定**虚拟环境的 Python 版本，避免意外使用错误的解释器。

- **激活虚拟环境**：
    - **Windows**：`.venv\Scripts\activate`
    - **Linux/macOS**：`source .venv/bin/activate`

- **在环境中工作**：
    - 安装项目所需的包，例如：`pip install django requests`
    - 编写和运行你的 Python 代码。

- **调用虚拟环境**：
    - **方案一**：激活后再运行 `python` 代码：
        `.venv\Scripts\activate`（Windows）或 `source .venv/bin/activate`（Unix）

        此时即在虚拟环境内，可自主调用 Python 解释器。
        > 需要运行 `deactivate` 退出虚拟环境

    - **方案二**：直接在命令行中调用虚拟环境中的 Python 解释器：
        `.venv\Scripts\python.exe main.py`（Windows）或`.venv/bin/python main.py`（Unix）
        
        即用即开，无需激活虚拟环境。

- **导出环境依赖**：
    ```bash
    pip freeze > requirements.txt
    ```

- **退出虚拟环境**：
    ```bash
    deactivate
    ```

---

#### 一些技巧与避坑指南

-   **虚拟环境目录可以随时删除**：如果环境乱了，直接删除 `.venv` 目录，然后重新创建即可。
-   **不要将 `.venv` 目录提交到 Git**：在项目的 `.gitignore` 文件中添加 `.venv/`。
-   **区分 `venv` 和 `virtualenv`**：`venv` 是 Python 3.3+ 的内置模块，而 `virtualenv` 是第三方工具，是 `venv` 的前身。对于现代 Python 开发，优先使用内置的 `venv`。