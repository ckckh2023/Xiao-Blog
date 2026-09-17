**WSL**（Windows Subsystem for Linux）是 Windows 10/11 内置的 Linux 兼容子系统，允许在 Windows 中直接运行 Linux 二进制程序，无需虚拟机或双系统。本文以 **Ubuntu** 为例，介绍 WSL 的安装与使用。

WSL 有两个版本：
- **WSL 1**：通过翻译层实现 Linux 系统调用，文件系统性能好，但兼容性有限（不支持 Docker 等）。
- **WSL 2**：基于轻量级虚拟机运行完整 Linux 内核，兼容性完整，是当前**默认推荐**版本。

---

## 环境要求

- Windows 10 版本 2004（Build 19041）及以上，或 Windows 11；
- BIOS 启用**虚拟化**（Intel VT-x / AMD-V），在任务管理器 → 性能 → CPU 中应显示`虚拟化: 已启用`；
- 是 64 位系统（应该都是吧）。

---

## 安装 Ubuntu WSL

在 Windows 功能启用`适用于 Linux 的 Windows 子系统` 和 `虚拟机平台` 两项内容，保存并重启电脑：

<img src="Windows 功能.png">

以**管理员身份**打开 PowerShell 或 CMD，执行：

```powershell
wsl --install
```

该命令会自动完成以下操作：
- 下载并安装 WSL 2 内核
- 下载并安装**默认 Linux 发行版 Ubuntu**

安装完成后，首次启动 Ubuntu 会要求设置用户名和密码。

> 此用户即为 WSL 内的默认用户，拥有 sudo 权限，与 Windows 账户无关；

> 输入密码时会发现无法显示密码，这是正常的保证安全的措施（Ubuntu 26.04 已经正式变成了 * 这样的密文）。

如需安装特定版本：

```powershell
wsl --list --online # 查看可用发行版列表

wsl --install -d Ubuntu-26.04 # 安装指定发行版
```

---

## 基本使用

### 启动与退出

```powershell
wsl # 启动默认发行版

wsl -d Ubuntu-24.04 # 启动指定发行版
```

在 WSL 终端内输入 `exit` 或 `Ctrl+D` 退出。

### 常用管理命令

| 命令 | 作用 |
| :--- | :--- |
| `wsl --list --verbose` | 列出已安装发行版及其 WSL 版本与运行状态 |
| `wsl --shutdown` | 关闭所有正在运行的 WSL 实例 |
| `wsl --terminate -d Ubuntu` | 关闭指定发行版 |
| `wsl --set-default -d Ubuntu` | 设置默认发行版 |
| `wsl --update` | 更新 WSL 内核 |
| `wsl --unregister -d Ubuntu` | 卸载发行版 |

> 可以使用我[分享页](https://xiao-blog.top/share/?type=software&name=wsl)的开源项目 WSL Dashboard 管理，图形界面更方便。

---

## 文件系统互访

WSL2 与 Windows 文件系统相互可见，但跨系统访问性能有差异。

### WSL 访问 Windows 文件

Windows 的 C 盘挂载在 `/mnt/c/`：

```bash
cd /mnt/c/ # 此为 Windows 的 C 盘文件
```

> **性能提示**：在 WSL 内操作Windows 文件系统性能较差，**开发项目应放在 WSL 原生文件系统**（如 `~/projects/`）内，性能可接近原生 Linux。

### Windows 访问 WSL 文件

在资源管理器地址栏输入 `\\wsl$\Ubuntu\` 或使用新版路径 `\\wsl.localhost\Ubuntu\`。

> 可直接用 Windows 程序打开 WSL 内的项目文件，但是依旧会有性能问题。

### 用 VSCode 连接 WSL

- 在 Windows 端 VSCode 安装 WSL 扩展，WSL 端无需任何操作；
- 在 WSL 终端内项目目录执行 `code .` 或 `code <项目路径>`；
- 此时VSCode 将以 WSL 作为远程环境打开项目，终端、扩展、调试均在 Linux 侧运行，文件为原生 Linux 路径，性能最佳。

---

## 配置文件

### Windows 全局配置

位于 Windows 内 `~/.wslconfig`，控制所有 WSL2 实例的全局行为：

```ini
[wsl2]
memory=8GB          # 限制 WSL 可用最大内存
processors=4        # 限制可用 CPU 核心数
swap=4GB            # 交换空间大小
localhostForwarding=true  # 允许 Windows 访问 WSL 内监听的服务端口
```

修改后需执行 `wsl --shutdown` 使 WSL 重启生效。

### Linux 侧单实例配置

位于 WSL 内 `/etc/wsl.conf`，控制单个 WSL 行为：

```ini
[boot]
systemd=true       # 启用 systemd（WSL 0.67.6+ 支持，Ubuntu 22.04+ 默认启用）

[automount]
enabled=true       # 自动挂载 Windows 盘符到 /mnt/
options="metadata,umask=22,fmask=11"  # 挂载选项，metadata 允许 Linux 权限位

[network]
generateResolvConf=true  # 自动生成 /etc/resolv.conf
```

修改后需 `wsl --terminate -d <发行版>` 再重启该实例。

> **systemd 启用后**可使用 `systemctl` 管理服务，一般在 Docker、nginx、Redis 等开发环境有较大用处。

---

## 网络与端口

WSL2 默认通过 NAT 网络访问外网，拥有独立 IP，与 Windows 主机不同网段。

### 端口转发

- WSL 内监听的服务（如 `python -m http.server 8000`）默认可通过 Windows 端 `localhost:8000` 访问。
- Windows 端的服务，WSL 内可通过 Windows 主机 IP 访问（`cat /etc/resolv.conf` 中的 nameserver 通常即主机 IP）。

---

## 常见问题

- **`wsl --install` 报错 0x800701bc**：WSL2 内核未安装或版本过旧，执行 `wsl --update`。
- **时间不同步**：WSL2 长时间挂起后系统时间会偏移，执行 `wsl --shutdown` 重启即可同步，或在 WSL 内 `sudo hwclock -s`。
- **Docker 与 WSL 冲突**：Windows 端 Docker Desktop 会自动创建 `docker-desktop` 等 WSL 发行版，卸载 Docker Desktop 后可用 `wsl --unregister -d docker-desktop` 清理残留。