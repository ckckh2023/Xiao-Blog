在 AI Agent 工具链的部署过程中，通过 npm 全局安装 CLI 包（如 `@deepseek-ai/dsh`）是常见操作。然而，由于操作系统安全策略与 npm 脚本执行机制的差异，开发者在 Windows 及 Linux（含 WSL）环境下常遭遇两类典型障碍：PowerShell 执行策略阻止脚本运行，以及 npm 的 `install-scripts` 安全机制跳过关键 postinstall 脚本。本文基于真实排错案例，系统阐述问题的成因、诊断方法及永久性解决方案，旨在为 AI 工程化实践提供稳健的跨平台安装指引。

---

### 引言
AI Agent 本地开发环境往往涉及多种依赖包的全局安装，以提供命令行接口、本地进程管理或原生绑定能力。`npm install -g` 虽简化了部署流程，但包内的安装后脚本可能触及系统安全边界。Windows 通过 PowerShell 执行策略限制脚本执行，而 npm 自 7.x 版本起引入 `allow-scripts` 白名单机制，默认拦截未授权的安装脚本。这两项设计虽出于安全考量，却常导致工具功能不全或运行时错误。本文将以 `@deepseek-ai/dsh` 的安装过程为例，分别阐述两类问题的诊断与修复步骤。

---

### Windows 环境下 PowerShell 的执行策略限制

在 Windows PowerShell 中执行 `npm install -g @deepseek-ai/dsh` 时，若系统执行策略为 `Restricted`，则任何 `.ps1` 脚本均被禁止运行。典型错误提示如下：
```
Get-ExecutionPolicy : Restricted
. : 因为在此系统上禁止运行脚本...
```

#### 根本原因
Windows 默认的 PowerShell 执行策略为 `Restricted`，仅允许交互式命令，拒绝所有脚本文件。npm 在安装某些包时可能调用 PowerShell 脚本（例如用于编译原生模块或配置环境），该调用将被操作系统直接阻断。

#### 诊断方法
以管理员或普通用户身份打开 PowerShell，执行：
```powershell
Get-ExecutionPolicy
```
若返回 `Restricted`，则确认为此问题。

#### 解决方法
- **临时生效（推荐用于单次安装）**  
  针对当前会话修改策略，关闭终端后自动恢复：
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope Process
  ```
  随后重新执行 `npm install -g` 即可。

- **永久生效（面向当前用户）**  
  若频繁安装类似工具，可为当前用户设置宽松策略：
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  输入 `Y` 确认修改。该策略允许运行本地脚本，远程下载的脚本需数字签名，兼顾安全与可用性。

- **永久生效（全局范围，需管理员权限）**  
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
  ```
  修改后可通过 `Get-ExecutionPolicy` 验证。

> **注意**：若在非个人环境，应遵循组织安全策略，避免盲目放宽至 `Unrestricted`。

---

### npm 的 install-scripts 白名单机制

在终端中执行 `npm install -g @deepseek-ai/dsh` 时，安装过程顺利完成（`added 530 packages`），但出现多处警告：
```
npm warn install-scripts 5 packages had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   @deepseek-ai/dsh-subprocess-local@0.1.0-rc.7 (postinstall: node scripts/ensure-spawn-helper.mjs)
...
npm warn install-scripts Run `npm install -g --allow-scripts=...` to allow these scripts once, or `npm config set allow-scripts=... --location=user` to allow them for all global installs.
```
若直接按提示执行带 `--allow-scripts` 的命令，可能触发 `ENOENT` 错误：
```
npm error code ENOENT
npm error path /home/user/package.json
```
原因是该命令缺少目标包名，npm 误以为要在当前目录安装本地包，而非全局已安装的包。

#### 根本原因
npm 自 v7 起引入 `allow-scripts` 配置，旨在防止第三方包在安装时自动执行可能危险的脚本。未列入白名单的包，其 `install`、`postinstall` 等脚本将被跳过。全局安装时，该配置默认为空，导致所有安装脚本均被阻塞。而 `--allow-scripts` 命令行参数需配合 `npm install` 或 `npm rebuild` 使用，若单独执行且未指定包名，npm 会尝试读取当前目录的 `package.json` 执行安装，从而引发文件找不到的错误。

#### 诊断方法
查看 npm 配置中 `allow-scripts` 的值：
```bash
npm config get allow-scripts --location=user
```
若为空或未包含所需包，则需添加。

#### 解决方法
**步骤一：将受阻包加入用户级白名单**  
执行以下命令，将五个包名以逗号分隔配置为允许脚本执行：
```bash
npm config set allow-scripts "@deepseek-ai/dsh-subprocess-local,koffi,node-pty,@google/genai,protobufjs" --location=user
```
该设置永久生效于当前用户的所有全局安装。

**步骤二：手动触发已安装包的脚本重建**  
由于初始安装时这些脚本已被跳过，需通过 `npm rebuild` 强制执行：
```bash
npm rebuild @deepseek-ai/dsh-subprocess-local koffi node-pty @google/genai protobufjs -g
```

也可以直接重新 `npm install -g`，npm 会自动检测并执行缺失的脚本。
此时 npm 将依据新的白名单配置，正常执行各包的安装后脚本。重建完成后，工具功能应完整可用。

---

通过上述步骤，开发者可顺利解决 Windows 环境下 PowerShell 执行策略限制及 npm 的 `install-scripts` 白名单机制问题，实现 AI Agent 工具链的跨平台部署。