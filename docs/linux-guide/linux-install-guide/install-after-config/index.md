本文介绍 Linux 系统安装完成后的**初步配置**：查看硬件与驱动状态、管理内核模块、配置模块加载行为、固件与签名、以及常见硬件（显卡、无线网卡）的配置要点。**驱动的具体安装方式（apt 仓库、源码编译等）将在其他文档专门介绍**。

> Linux 系统内的大量内容涉及命令行，建议设置快捷键 `Super + T` 快速启动终端！

---

## 系统更新

```bash
sudo apt update
sudo apt upgrade -y
```

> 此配置可以确保系统内核、固件、驱动等处于最新状态，减少后续问题，关于apt仓库的我的文档[点此]()查看。

---

## 软件源配置

国内访问 Ubuntu 官方源速度较慢，有需要可更换为国内镜像源。

> **Ubuntu 24.04 起采用新格式 `/etc/apt/sources.list.d/ubuntu.sources`**，旧版仍是 `/etc/apt/sources.list`，此处使用 24.04+。

```bash
sudo cp /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak
sudo sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources
sudo apt update
```

> 其他可选镜像：阿里 `https://mirrors.aliyun.com/ubuntu`、中科大 `https://mirrors.ustc.edu.cn/ubuntu`。更换后务必执行 `sudo apt update` 使新源生效。

> 清华源由于削减镜像存储份额导致**许多镜像可能无法下载**，如发现软件包缺失请不要犹豫，直接更换镜像源！

---

## 显卡驱动

### 判断显卡类型

```bash
lspci | grep -i vga
```

> Intel 核显与 AMD 显卡使用预装的开源驱动性能已经很好不需要多余配置，AMD 独显安装官方闭源驱动使用 ROCm 的教程后续出。

> 如果你拥有 Nvidia 独显，这将是 `最难` 配置的步骤。

### 安装方法

- **图形界面**

打开“软件和更新 → 附加驱动”，选择推荐的 NVIDIA 驱动，点击应用更改，然后重启。

> 此方法可能不生效，如果不生效请尝试下个方法。

- **命令行（Ubuntu 版本）**

```bash
sudo apt update
ubuntu-drivers devices
sudo ubuntu-drivers autoinstall
```

> 如果你开启了 `Secure Boot`，命令执行完会出现蓝色界面提示使用 MOK 密钥签名，此时你只需输入你自己设置的密码，重启后会出现蓝色界面，选`Enroll MOK`，输入刚才的密码即可安装成功。

- **直接安装开发包**

```bash
sudo apt update
sudo apt install nvidia-driver-565-open
```

`-open` 后缀为 NVIDIA 开源内核模块版，同时拉入运行 CUDA 程序所需的用户态库，无需再单独装 CUDA 运行时。若要编译开发，再 `sudo apt install cuda-toolkit` 即可。

**注意几个坑点**：

- 包名中的版本号按需替换，可用 `apt search 'nvidia-driver-.*-open'` 查看可用版本；
- Secure Boot 场景同样需要 MOK 签名；
- 建议优先使用 `open` 版本保证能驱动，后续可装闭源版。

无论什么办法，只要重启后输入 `nvidia-smi`，终端输出能看到显卡型号、驱动版本、显存信息，就代表安装成功。

---

## 系统设置

### 中文输入法

Ubuntu 24.04+ 推荐使用 **fcitx5** 框架：

```bash
sudo apt install fcitx5 fcitx5-chinese-addons fcitx5-config-qt
```

安装后注销重新登录，在「设置 → 区域与语言」中将输入法框架切换为 Fcitx 5，再运行 `fcitx5-configtool` 添加拼音输入法。默认使用 `Ctrl + Space` 切换中英文。

> 若托盘未显示输入法图标，检查环境变量是否设置了 `GTK_IM_MODULE=fcitx`、`QT_IM_MODULE=fcitx`、`XMODIFIERS=@im=fcitx`，新版 fcitx5 通常会自动配置。

### 双系统时间不对

Windows 把硬件时钟当作本地时间，Linux 当作 UTC，导致装双系统后切换系统时间会差 8 小时。最简单的解决方法是让 Linux 也使用本地时间：

```bash
sudo timedatectl set-local-rtc 1
```

> 也可以在 Windows 中以管理员身份打开 CMD，复制并运行以下命令 `Reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1 /f` 运行即可恢复正常。

---

## 防火墙

Ubuntu 默认自带 **UFW**，**有需要**可以设置，命令简单：

```bash
sudo ufw allow ssh # 启用该端口才可以被 SSH 连接
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

---

## 可选常用软件

这些是一些命令行工具，你也可以去我的[分享页](https://xiao-blog.top/share/)寻找好用的 Linux 桌面应用。

```bash
sudo apt install git curl vim # 此为一般常用工具等，后续更新
```

