在 Windows 平台上使用 AI 辅助开发工具（如代码补全、命令行生成或自主 Agent）时，用户经常遇到生成的命令无法在默认 shell（PowerShell）中直接执行的问题。调查表明，绝大多数 AI 模型的训练数据以 Unix/Linux 命令行语料为主，因此模型更倾向于输出符合 POSIX 标准的 shell 命令（如 `grep`、`sed`、`awk`、`find` 等）。而 Windows 内置的 PowerShell 尽管功能强大，但其语法和命令集与 POSIX 环境差异较大，导致频繁的兼容性错误，降低了开发效率。

---

## 推荐方案

为减少命令翻译和手动修正的时间，建议在 AI Agent 的系统提示词（System Prompt）或会话上下文中明确指定命令执行环境的优先级。经过验证，**优先使用 Git Bash，其次使用 PowerShell 7 (pwsh)** 的策略能有效覆盖绝大多数场景，兼顾兼容性与 Windows 原生功能。

---

### 推荐的系统提示词内容

```text
On Windows, prefer Git Bash for command execution.
If a command fails in Git Bash, retry using PowerShell 7 (pwsh).
```

若需要更详细的约束，可扩展为：

```text
On Windows, prefer Git Bash for command execution. 
Assume Git Bash is available in the system PATH. 
If a command fails in Git Bash, retry using PowerShell 7 (pwsh) with the appropriate syntax. 
For Windows-specific tasks (registry, COM, etc.), explicitly use pwsh -c "..." .
```

---

## 理由

1. **Git Bash 提供 POSIX 兼容层**  
   Git for Windows 所携带的 Git Bash 基于 MinGW 和 MSYS，提供了类 Unix 的 shell 环境和常用 GNU 工具集，绝大多数 AI 生成的命令无需修改即可在此环境中执行，极大降低了转换成本。

2. **PowerShell 7 作为可靠备选**  
   PowerShell 7 是跨平台、现代化的 shell，支持许多 Unix 命令的别名，但其行为仍存在差异。因此，仅在 Git Bash 不适用（例如需要调用 Windows API 或注册表操作）时，才切换到 PowerShell 7，且明确使用 `pwsh` 可执行文件以避免与旧版 Windows PowerShell 混淆。

3. **对齐 AI 训练数据分布**  
   明确告知 AI 执行环境偏好，可以引导模型优先输出与其训练语料更匹配的命令格式，从而提高首次生成的成功率，减少迭代修正次数。绝大多数开发者对 `bash` 环境非常熟悉，AI 模型在此环境下的命令生成准确率也更高。

---

## 操作步骤

1. **安装 Git for Windows**  
   可查看我的[分享页](https://xiao-blog.top/share/?type=software&name=git)，从[官方渠道](https://git-scm.com/install/windows)下载并安装 Git for Windows。安装过程中建议将 Git Bash 添加到系统 PATH（默认选项），以便在任意终端中直接调用 `bash` 或 `git` 命令。

2. **安装 PowerShell 7**  
   可查看我的[分享页](https://xiao-blog.top/share/?type=software&name=pwsh)，若未安装，请从 [Microsoft 官方](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows)下载最新版 PowerShell 7。安装后，确保 `pwsh.exe` 位于 PATH 中，以便通过命令行调用。

3. **配置 AI 工具的系统提示词**  
   > 懒人版教程：让 AI Agent 工具自主写入上述提示词，拒绝繁琐配置流程。
   - 对于 ChatGPT 或 Copilot，可将上述提示词放入“自定义指令”或“系统提示”区域。  
   - 对于 Cursor、Continue 等编辑器插件，可在项目规则文件（如 `.cursorrules`）中声明。  
   - 对于 AutoGPT 等自主 Agent，可在配置文件或启动参数中设定。

4. **验证环境**  
   在任意终端中执行 `git --version` 和 `pwsh --version` ，如有输出证明已经可用。

采用上述提示词后，AI 生成的命令将自动适配 Git Bash 语法，并在必要时提供 PowerShell 7 的备用方案。实测表明，常见的文件搜索、文本处理、进程管理、网络请求等任务，首次执行成功率可从不足 60% 提升至 90% 以上，显著降低手动干预成本。

---

## 注意事项

- 对于涉及 Windows 绝对路径（如 `C:\`）的命令，需注意 Git Bash 使用 `/c/` 格式，AI 若未适应，可要求其使用双反斜杠或正斜杠并加引号。
- 若项目包含跨平台脚本（如 `npm`），可额外提示 AI 优先使用项目定义的脚本，其次考虑 shell 命令。

---

**通过简单的提示词注入，Windows 用户可有效弥合 AI 模型命令生成与实际执行环境之间的鸿沟。**
该策略无需修改工具链，仅需一次配置，即可获得稳定、高效的命令执行体验。建议所有 Windows 开发者采纳此方案，并将其纳入团队 AI 使用规范。
