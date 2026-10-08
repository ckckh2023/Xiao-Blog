本文介绍 Debian/Ubuntu 系统中 **apt 软件仓库的配置与管理方法**：软件源文件结构、更换国内镜像源、添加 PPA 与第三方源、GPG 密钥管理、软件包优先级控制，以及常见报错的排查思路。

> apt 是 Debian 系发行版（Debian、Ubuntu、Linux Mint 等）的包管理工具，底层依赖 dpkg 与软件源元数据。理解软件源的结构是后续安装驱动、开发库、第三方软件的基础。

---

## 软件源文件结构

> 软件源可以被视为软件包的下载地址，如果没有软件源，apt 仓库也失去了意义。

### 配置文件位置

Ubuntu 的软件源配置自 24.04 起改为新格式，旧版仍使用单一文件：

| 版本 | 文件路径 | 格式 |
| --- | --- | --- |
| Ubuntu 24.04+ | `/etc/apt/sources.list.d/ubuntu.sources` | deb822 新格式 |
| Ubuntu 22.04 及更早 | `/etc/apt/sources.list` | 传统单行格式 |

> [!TIP]
> 第三方源统一放在 `/etc/apt/sources.list.d/` 目录下，每个源一个 `.list` 或 `.sources` 文件，便于单独管理。

### 查看当前软件源

```bash
cat /etc/apt/sources.list.d/ubuntu.sources # 24.04+
cat /etc/apt/sources.list # 22.04 及更早
apt-cache policy # 查看所有源及优先级
```

> [!TIP]
> `apt-cache policy` 会列出每个仓库的 URL、组件与优先级，是排查源问题最实用的命令。

### 备份软件源

修改软件源前务必备份，以便随时回滚：

```bash
sudo cp /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak   # 24.04+
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak # 22.04 及更早
```

> [!TIP]
> 恢复时把 `.bak` 文件覆盖回去，再执行 `sudo apt update` 即可。

---

## 更换国内镜像源

国内访问 Ubuntu 官方源速度较慢，建议更换为国内镜像。以清华镜像为例：

### Ubuntu 24.04+

```bash
sudo sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources
sudo apt update
```

### Ubuntu 22.04 及更早

```bash
sudo sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list
sudo apt update
```

常用国内镜像：
- 清华：`https://mirrors.tuna.tsinghua.edu.cn/ubuntu` 
    > **警告**：现在不建议使用清华源，清华镜像源由于削减存储空间，已不再维护许多不常用的软件源。
- 阿里：`https://mirrors.aliyun.com/ubuntu`
- 中科大：`https://mirrors.ustc.edu.cn/ubuntu`
- 华为云：`https://repo.huaweicloud.com/ubuntu`

> [!CAUTION]
> 更换后务必执行 `sudo apt update` 使新源生效。若出现 Hash 校验失败，多为镜像同步未完成，可更换其他镜像或等待几小时后重试。

---

## PPA 仓库

PPA（Personal Package Archive）是 Launchpad 上的个人软件包仓库，常用于获取官方源中未收录或版本较旧的软件。

> [!WARNING]
> PPA 不建议在非 Ubuntu 系统上使用，因为 Ubuntu 的 PPA 仓库与 Launchpad 紧密绑定，其他发行版无法使用。

### 添加 PPA

```bash
sudo add-apt-repository ppa:mozillateam/ppa
sudo apt update
```

> `add-apt-repository` 会自动把源写入 `/etc/apt/sources.list.d/` 并导入对应的 GPG 密钥。若命令不存在，执行 `sudo apt install software-properties-common` 安装。

### 查看 PPA

```bash
ls /etc/apt/sources.list.d/       # 查看源文件
apt-cache policy                  # 查看源及优先级
```

### 移除 PPA

```bash
sudo add-apt-repository --remove ppa:mozillateam/ppa
sudo apt update
```

> 移除 PPA 不会卸载已通过该 PPA 安装的软件。若需同时降级回官方版本，可配合 `ppa-purge` 工具：`sudo apt install ppa-purge && sudo ppa-purge ppa:mozillateam/ppa`。

---

## 第三方源与 GPG 密钥

部分软件（如 Docker、Node.js、Chrome）提供独立的 apt 仓库，需手动添加源与 GPG 密钥。以 Docker 官方源为例：

### 添加 GPG 密钥

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

> [!TIP]
> Ubuntu 22.04 起推荐将密钥存放在 `/etc/apt/keyrings/` 目录，而非旧的 `/etc/apt/trusted.gpg.d/`，这样每个源使用独立密钥，安全性更高。

### 添加源文件

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
```

> `signed-by=` 指定该源使用的密钥文件，是新版 apt 推荐写法，能避免密钥混用导致的安全问题。

---

## 软件包优先级

当同一软件包存在于多个源时，apt 通过优先级（Pin-Priority）决定从哪个源安装。配置文件位于 `/etc/apt/preferences.d/` 目录下。

### 优先级含义

| 优先级 | 行为 |
| --- | --- |
| > 1000 | 即使版本更低也强制降级安装 |
| 990 - 1000 | 默认安装源（已安装软件的升级源） |
| 500 - 989 | 默认安装源（新软件的安装源） |
| 100 - 499 | 不会自动安装，但可手动指定安装 |
| < 0 | 拒绝安装该源中的包 |

### 配置示例

强制从 Mozilla PPA 安装 Firefox，避免被 Snap 版抢占，关于 Snap 软件包的移除教程可以看[此文档](https://xiao-blog.top/docs/article?id=linux-guide&sub=software-package-guide&sub2=snap-uninstall-guide)。

```bash
sudo tee /etc/apt/preferences.d/mozillateamppa > /dev/null << 'EOF'
Package: firefox*
Pin: release o=LP-PPA-mozillateam
Pin-Priority: 501
EOF
```

> 配置完成后用 `apt-cache policy firefox` 验证优先级是否生效，候选源（Candidate）应指向 Mozilla PPA。

---

## 常见软件源操作

### 更新软件源索引

```bash
sudo apt update # 仅刷新索引，不安装
sudo apt upgrade # 升级已安装的软件包
sudo apt full-upgrade # 升级并处理依赖关系变化
```

### 搜索与查看软件包

```bash
apt search <关键字> # 搜索软件包
apt show <包名> # 查看包详细信息
apt-cache policy <包名> # 查看包在各源中的版本与优先级
```

### 安装、卸载与清理

```bash
sudo apt install <包名> # 安装
sudo apt install --reinstall <包名> # 重新安装
sudo apt remove <包名> # 卸载（保留用户配置文件）
sudo apt purge <包名> # 卸载并清除用户配置文件
sudo apt autoremove --purge # 清理不再需要的依赖
```

---

## 常见问题排查

### Hash 校验失败

报 `Hash Sum mismatch` 通常由镜像同步未完成或本地缓存损坏导致。

```bash
sudo rm -rf /var/lib/apt/lists/*
sudo apt update
```

> [!TIP]
> 清空本地索引缓存后重新更新即可。若反复出现，建议更换镜像源。

### 源不可用或 404

报 `404 Not Found` 多为该源已停止维护或发行版版本不再支持。

### 依赖冲突

报 `Unable to correct problems, you have held broken packages` 说明多个源提供的版本互相冲突。

> 通过优先级配置强制指定来源，或临时禁用冲突源（把对应 `.list` 文件改名加 `.bak` 后缀）后再安装。
