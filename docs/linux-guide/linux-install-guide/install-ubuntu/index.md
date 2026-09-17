本文以 **Ubuntu** 为例，介绍在实体机上安装 Linux 的完整流程。Ubuntu 是基于 Debian 的主流桌面 Linux 发行版，软件生态完善、社区活跃，适合作为开发与日常使用的主力系统。

---

## 下载 Ubuntu 镜像

- **官方下载**：访问 [Ubuntu 官方下载页](https://ubuntu.com/download/desktop)，选择 LTS（长期支持）版本。LTS 版本每两年发布一次，提供 5 年安全更新，推荐生产与日常使用。
- **国内镜像加速**：官方源在国内下载速度较慢，可使用国内镜像站：
    [阿里源](https://mirrors.aliyun.com/ubuntu-releases/) | [中科大源](https://mirrors.ustc.edu.cn/ubuntu-releases/)

下载得到 `.iso` 镜像文件后，可以使用以下命令校验文件完整性校验 SHA256 值，确保文件完整无损：

```bash
sha256sum ubuntu-24.04-desktop-amd64.iso
```

> 将输出与官方公布的 SHA256 校验值比对，一致即可。

---

## 制作启动 U 盘

将 `.iso` 镜像写入 U 盘，制作可引导的安装介质。

### Windows 平台

1. 从我的[分享页](https://xiao-blog.top/share/?type=other&name=rufus)或 [Rufus 官网](https://rufus.ie/)下载并运行。
2. 插入 U 盘（空间需要 ≥ 8GB）。
3. 配置选项：
    - **设备**：选择你的 U 盘
    - **引导类型选择**：点击"选择"，选中下载的 `.iso` 文件
    - **分区类型**：GPT（UEFI 启动，现代电脑均推荐）/ MBR（Legacy BIOS 启动，适用于十多年前的老电脑）
    - **目标系统类型**：UEFI（或 BIOS）
4. 点击"开始"，等待写入完成。

> U 盘原数据会被清空，请提前备份 U 盘数据。

### Linux / macOS 平台

```bash
lsblk # 查看 U 盘设备名

sudo umount <设备名>* # 卸载 U 盘

sudo dd if=ubuntu-24.04-desktop-amd64.iso of=<设备名> bs=4M status=progress # 写入镜像
 
sync # 处理并弹出
```

> **注意**：`of=` 必须指向 U 盘整盘设备（如 `/dev/sdb`），**不是分区**（如 `/dev/sdb1`），否则无法引导。并且写错设备会覆盖对应磁盘的所有数据，务必通过 `lsblk` 确认设备名。

---

## 从 U 盘启动

- 将 U 盘插入目标机器，开机时需快速按相关案按键进入 BIOS（常见为 `F2`、`F12`、`Del`，因主板而异）。
- 在 BIOS 启动菜单中选择 U 盘项提升至最顶（UEFI 模式下 U 盘启动项通常带 `UEFI:` 前缀，有 `Hard Driver` 等字符）。
- 进入 Ubuntu 安装界面后，选择 `Try or Install Ubuntu`。

**这里有几个坑点，一定要注意！**：
- Windows 用户需要在控制面版关掉 `快速启动`，尤其是想装 Windows 与 Linux 双系统的，因为它在关机时并没有完全关机（嗯对并没有真关机）。
- Windows 用户如果给磁盘启用了 BitLocker 锁，需要先进行解锁，否则会出现数据丢失问题（如果你不需要 Windows 数据可忽略）。
- BIOS 设置内最好关闭 `Secure Boot`，否则可能出现引导错误问题。
- 如果电脑有核显，请在设置选择只启用核显或者自动切换，否则可能因为独显驱动不兼容导致界面黑屏等问题。

---

## 安装流程

进入图形安装界面后，按以下步骤操作：

- **语言选择**：选择简体中文即可；
- **键盘布局**：根据实际键盘选择，一般不需要过多设置；
- **安装类型**：
    - **Erase disk and install Ubuntu**：清盘安装，将整块磁盘交给 Ubuntu。
    - **Install alongside Windows**：与 Windows共存，自动分区，保留原系统。
    - **Something else**：手动分区方案，推荐能力更强的用户使用。
- **手动分区（后续补教程，建议使用前两种安装类型）**：

    | 挂载点 | 大小 | 文件系统 | 用途 |
    | :--- | :--- | :--- | :--- |
    | `/boot/efi` | 512MB | EFI System Partition | EFI 引导分区|
    | `/` | 30GB+ | ext4 | 根分区，系统文件 |

    > **双系统注意**：EFI 分区若已存在（例如 Windows 创建），**不要新建**，直接挂载到 `/boot/efi` 即可，避免破坏原引导。

- **时区**：选择你所在的时区（如 Asia/Shanghai）。
- **用户信息**：填写用户名、主机名、密码，密码会在许多情况用到！
- **安装**，等待安装完成，提示重启并拔出 U 盘（重启按钮按下后建议立刻拔出 U 盘）。

---

## 常见问题

- **Q：黑屏 / 无法进入图形界面**
    - **A**：多为显卡驱动问题。
    - **解决方法**：重启后在 BIOS 只使用核显或者自动切换显卡模式重新进入安装流程。
- **Q：无法连接至无线网络**：
    - **A**：无线网卡驱动缺失。
    - **解决方法**：先用有线网络或手机 USB 共享网络联网，再通过 `sudo ubuntu-drivers autoinstall` 安装驱动。
- **Q：双系统时间不一致**：
    - **A**：Windows 默认将硬件时钟当作本地时间，而 Ubuntu 当作 UTC 标准时间（我们都知道我们的时区是 UTC + 8）。
    - **解决方法**：Windows 中以管理员身份打开 CMD，复制并运行以下命令`Reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1 /f`。
- **Q：GRUB 未出现双系统菜单**：
    - **A**：GRUB 未检测到 Windows 引导项。
    - **解决方法**：在 Ubuntu 中执行 `sudo update-grub`，自动检测并添加 Windows 启动项。