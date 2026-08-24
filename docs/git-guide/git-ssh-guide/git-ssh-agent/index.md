`ssh-agent` 是一个后台程序，用于保存私钥的解密结果（包括密码短语），使得用户无需重复输入密码。不同平台下启动和管理方式不同。

---

### Linux / macOS（Bash）

- **启动 agent**：

```bash
eval "$(ssh-agent -s)"
```

> 当关闭终端时，ssh-agent 的环境变量将会失效，需要重新启动。<br>
> 可以通过 `env | grep SSH_` 获取环境变量 `SSH_AUTH_SOCK` 和 `SSH_AGENT_PID` 重新 `export` 到下一个终端利用。


- **添加私钥**：

```bash
ssh-add ~/.ssh/id_ed25519
```

- **查看已加载的密钥**：

```bash
ssh-add -l
```

- **删除所有密钥**：

```bash
ssh-add -D
```

---

### Windows（PowerShell）

Windows 10/11 已内置 OpenSSH 客户端，ssh-agent 作为 Windows 服务运行，有两个方案可实现：

#### 方案一：使用 Git 自带的 SSH，参考 Linux / macOS（Bash）方案使用 `Git Bash` 即可（与 Linux/macOS 类似，终端关闭后环境变量失效）

#### 方案二：使用 Windows OpenSSH 客户端，需要使用 `PowerShell`（作为系统服务常驻，重启电脑后才会失效）

- **检查服务状态**：

```powershell
Get-Service ssh-agent
```

- **设置服务为手动启动并启动（需要管理员权限）**：

```powershell
Get-Service -Name ssh-agent | Set-Service -StartupType Manual
Start-Service ssh-agent
```

- **添加私钥**：

```powershell
ssh-add ~/.ssh/id_ed25519
```

- **让 Git 使用 Windows 系统 SSH**

在 PowerShell 中执行以下命令，告诉 Git 不要用自己的 SSH，改用Windows OpenSSH：

```powershell
git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
```
---

### 懒人版自助脚本

本脚本为 `bash` 脚本，用于自动启动 ssh-agent 并添加私钥，适用于 Linux / macOS 平台， Windows 平台需使用 Git Bash。<br>

> 需要使用 `source ./ssh-agent.sh` 启动，脚本会自动添加私钥并显示当前已加载的密钥。

```bash
#!/bin/bash

eval "$(ssh-agent -s)" > /dev/null

# 定义要添加的密钥路径（自行更改或添加）
keys=(
    "$HOME/.ssh/id_ed25519"
)

# 循环添加
for key in "${keys[@]}"; do
    if [[ -f "$key" ]]; then
        echo "添加 $(basename $(dirname $key)) 密钥..."
        ssh-add "$key" 2>/dev/null || echo "  添加失败"
    else
        echo "警告：文件 $key 不存在，已跳过"
    fi
done

# 显示当前已加载的密钥
echo "当前已加载密钥："
ssh-add -l || echo "（暂无密钥）"
```