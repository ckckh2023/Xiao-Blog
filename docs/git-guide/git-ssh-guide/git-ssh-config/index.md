`ssh-agent` 是一个后台程序，用于保存私钥的解密结果（包括密码短语），使得用户无需重复输入密码。不同平台下启动和管理方式不同。

### Linux / macOS（Bash）

- **启动 agent**：

```bash
eval "$(ssh-agent -s)"
```

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

### Windows（PowerShell）

Windows 10/11 已内置 OpenSSH 客户端，ssh-agent 作为 Windows 服务运行。

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

**注意**：若在 Windows 下使用 **Git Bash**，其环境模拟 Linux，可直接使用 `eval "$(ssh-agent -s)"` 方式，但Windows 原生服务持久性更好。
