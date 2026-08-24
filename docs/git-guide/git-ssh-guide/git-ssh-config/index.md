在 Git 的日常使用中，SSH 协议是连接远程仓库最安全、最便捷的方式之一。通过 SSH 密钥认证，开发者可以免去每次 `push`/`pull` 时输入用户名和密码的麻烦，同时确保传输过程加密。

本文**专注于 SSH 客户端的配置**，涵盖密钥生成、配置文件编写、私钥权限设置以及常见问题的排查，并提供 `pwsh` 与 `bash` 下的具体操作命令，帮助开发者在任何平台上都能顺利完成 SSH 配置。由于配置操作比较麻烦，并无懒人版教程。

> 在 Windows 平台，请优先使用 `Git Bash` 来完成配置

---

## 生成 SSH 密钥对

无论使用哪种操作系统，生成密钥对的核心命令是一致的。推荐使用 Ed25519 算法：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

若系统不支持，可改用 RSA 4096：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

**交互提示处理**：
- 密钥保存路径：**建议使用默认路径**（`~/.ssh/id_ed25519`），这样后续无需显式指定密钥位置。
- 密码短语（Passphrase）：可选。设置后每次使用密钥需输入密码，增加安全性。

---

## 配置 SSH 客户端

通过 `~/.ssh/config` 文件（若不存在需创建）可以为不同主机指定认证方式、端口、密钥等参数，极大简化连接命令。

**基本语法如下**：

```text
Host <别名>
    HostName <真实域名或IP>
    User <登录用户名>
    Port <端口号>
    IdentityFile <私钥路径>
```

**常见写法如下**：

```text
Host github.com
    Hostname ssh.github.com
    User git
	IdentityFile ~/.ssh/github/id_ed25519
```

> 对于 `config` 文件，强烈建议在 Windows 平台依旧使用 `/` 而不是反斜杠 `\` ，否则可能导致路径解析错误！

---

## 私钥权限设置（至关重要）

SSH 客户端对私钥文件的权限有严格限制：**私钥只能被当前用户读取，任何其他用户或组都不能有任何权限**。权限设置不当会导致 `Permissions too open` 或 `Permission denied (publickey)` 错误。

> 下列命令中的密钥路径均为 `~/.ssh/id_ed25519`，需要自行更改！

### Linux / macOS

使用 `chmod` 命令：

```bash
chmod 600 ~/.ssh/id_ed25519
```

这会设置权限为 `-rw-------`（仅所有者可读可写）。

### Windows（PowerShell / CMD）

Windows 自带的 OpenSSH 同样要求严格权限，需要使用 `icacls` 工具进行细粒度控制。

**操作步骤（以管理员身份打开 PowerShell）**：

```powershell
icacls "C:\Users\username\.ssh\id_ed25519" /inheritance:r
icacls "C:\Users\username\.ssh\id_ed25519" /remove "BUILTIN\Administrators" "NT AUTHORITY\SYSTEM" "BUILTIN\Users" "Everyone"
icacls "C:\Users\username\.ssh\id_ed25519" /grant:r "%USERNAME%:R"
```
> **注意**：Windows 平台必须要使用全局绝对路径而不是 `~/.ssh/id_ed25519`，否则会报错。

**命令解释**：
- `/inheritance:r` —— 移除从父文件夹继承的所有权限。
- `/remove ...` —— 删除所有非当前用户的权限条目。
- `/grant:r "%USERNAME%:R"` —— 仅授予当前用户读取权限（`:R` 表示只读，`:F` 表示完全控制，但只读即足够）。

**验证权限**：

```powershell
icacls "C:\Users\username\.ssh\id_ed25519"
```

正确输出应**只有一行**，类似 `DESKTOP-XXX\username:(R)`。

---

## 将公钥添加到远程仓库平台

### 复制公钥内容

使用以下命令查看并复制公钥内容（Windows 平台执行该命令需要 `Git Bash`）：

```bash
cat ~/.ssh/id_ed25519.pub
```

> 注意：务必确认复制的是带 .pub 后缀的公钥文件，而非私钥文件。

### 添加到 GitHub

- 登录 GitHub，点击右上角头像，选择 Settings。
- 在左侧边栏中，点击 SSH and GPG keys。
- 点击 New SSH key 按钮。
- 在 Title 字段中输入一个描述性名称（如 “MySSHkey”）。
- 在 Key 字段中粘贴先前复制的公钥内容。
- 点击 Add SSH key 完成添加。

其他平台（如 GitLab、Gitee 等）的操作流程类似，通常在个人设置中的 “SSH Keys” 或 “SSH 公钥” 栏目下进行操作。

### 测试 SSH 连接

完成公钥添加后，可通过以下命令测试 SSH 连接是否配置成功：

```bash
ssh -T git@github.com
```

若配置正确，会看到类似以下输出：

```bash
Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 常见问题排查

### 1. Permission denied (publickey)

私钥权限设置不正确，导致 SSH 客户端无法读取私钥文件。

### 2. 首次连接的主机指纹确认（host key verification）

如果是第一次连接该主机，系统会提示确认主机指纹：

```bash
The authenticity of host 'github.com (IP ADDRESS)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
Are you sure you want to continue connecting (yes/no)?
```

此时应核对指纹是否与 GitHub 官方公布的指纹一致。确认无误后输入 yes 并回车。

### 3. Connection timed out

端口 22 被封锁，需要使用其他端口（如 443）连接，示例如下：

```text
Host github.com
    Hostname ssh.github.com
    User git
    Port 443
	IdentityFile ~/.ssh/github/id_ed25519
```