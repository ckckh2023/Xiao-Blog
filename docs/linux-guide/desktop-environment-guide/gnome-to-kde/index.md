本文介绍如何将 Linux 桌面环境从 **GNOME** 切换到 **KDE Plasma**；而对于我们前文安装的 Ubuntu 环境，这代表从 Ubuntu 换到 Kubuntu。

> [!TIP]
> 本文适用于想从 GNOME 切换到 KDE Plasma 的用户，如果 GNOME 已经符合你的口味，跳过即可。

---

## GNOME 与 KDE 的区别

GNOME 和 KDE 是 Linux 上最主流的两大桌面环境，设计理念截然不同：

| 对比项 | GNOME | KDE Plasma |
|--------|-------|------------|
| 设计理念 | 简洁、触控友好、键盘驱动 | 高度可定制、传统桌面范式 |
| 操作风格 | 类 macOS，顶栏 + Activities 概览 | 类 Windows，任务栏 + 开始菜单 |
| 定制能力 | 有限，需扩展 | 极强，几乎一切可调 |
| 资源占用 | 较低 | 略高 |
| 默认文件管理器 | Nautilus | Dolphin |
| 默认终端 | GNOME Terminal | Konsole |

> [!TIP]
> 如果你习惯 Windows 操作逻辑，并且想定制自己的桌面环境，KDE 绝对不错！还支持类似小红伞的动态壁纸。

---

## 前置准备

切换桌面环境是较大改动，动手前先做好准备：

```bash
sudo apt update && sudo apt full-upgrade -y # 更新系统到最新
```

- **备份重要数据**：切换桌面一般不影响用户文件，但卸载 GNOME 时有误删依赖的风险，建议备份用户文件夹下的重要配置和数据。
- **关闭正在运行的重要任务**：安装过程会重启显示管理器，当前用户会话会被强行中断。

---

## Ubuntu 换成 Kubuntu 的方式（仅适用于 Ubuntu 系统）

Ubuntu 官方 apt 仓库提供 `kubuntu-desktop` 元包，一条命令即可把 Ubuntu 转成完整的 Kubuntu 体验，无需重装系统。

### 安装 Kubuntu

```bash
sudo apt install kubuntu-desktop -y
```

安装过程中会弹出显示管理器选择界面：

```text
A display manager is a program that provides graphical login capabilities.
...
1. gdm3
2. sddm
(default: 2)
```

选择 **sddm**（KDE 默认的显示管理器）。SDDM 的登录界面与 KDE 风格一致，且对 KDE 会话支持更好。

> [!CAUTION]
> 若保留 gdm3，登录界面仍是 GNOME 风格，且部分 KDE 特性无法生效，都换到 KDE 了肯定建议选 SDDM。

### 重启并选择 KDE 会话

重启后在登录界面：

- 右上角点击会话类型选择菜单
- 选择 **Plasma (X11)** 或 **Plasma (Wayland)**
    > 如果你是 Ubuntu 24.04+，这里最好选择 `Wayland`。
- 输入密码登录，即进入 KDE Plasma 桌面

> [!TIP]
> Wayland 是新一代显示协议，更现代但部分老应用兼容性差；X11 兼容性最好，不确定就选 X11 即可。

### 卸载 GNOME

确认 KDE 一切正常后，可卸载 GNOME 释放空间：

```bash
sudo apt remove --purge ubuntu-desktop gdm3 gnome-shell gnome-session -y
sudo apt autoremove --purge -y
```

> [!WARNING]
> 卸载 GNOME 有风险！autoremove 可能误删 KDE 共用的底层库。执行前仔细看将要删除的包列表，若出现 `k*` 或 `plasma*` 包，立即中止（按 n）。不确定就保留 GNOME，双桌面共存完全可行，只是多占点空间。

### 清理残留

```bash
sudo apt autoremove --purge -y
sudo apt clean
```

---

## 通用办法（适用于任何系统环境）

若你不在 Ubuntu 上，或想要更可控的安装方式，可手动安装 KDE Plasma。

### 安装 KDE Plasma

按发行版选择命令：

| 发行版 | 命令 |
|--------|------|
| Debian/Ubuntu | `sudo apt install kde-plasma-desktop sddm -y` |
| Fedora | `sudo dnf install @kde-desktop sddm -y` |
| Arch Linux | `sudo pacman -S plasma sddm` |
| openSUSE | `sudo zypper install -t pattern kde kde_plasma` |

包说明：

- `kde-plasma-desktop`：最小化 KDE Plasma（仅桌面，不含 KDE 应用）
- `kubuntu-desktop`：完整 Kubuntu 体验（含所有 KDE 应用，体积大）
- `plasma`（Arch）：KDE Plasma 桌面

> [!TIP]
> 想要完整 KDE 应用套件（Dolphin、Konsole、Kate 等），Debian/Ubuntu 还需要装 `kde-standard`，Fedora 要用 `@kde-desktop`，Arch 则需要装 `kde-applications`。

### 配置显示管理器

KDE 推荐使用 SDDM。若系统当前是 GDM（GNOME）或 LightDM，切换到 SDDM：

```bash
# Debian/Ubuntu
sudo dpkg-reconfigure sddm
# 在弹出的界面选择 sddm

# Fedora
sudo systemctl disable gdm && sudo systemctl enable sddm

# Arch Linux
sudo systemctl enable sddm
```

### 选择 KDE 会话

重启后，在登录界面的会话选择菜单选 **Plasma (X11)** 或 **Plasma (Wayland)**，登录即进入 KDE。

---

## 切换后配置

### 主题与图标

KDE 的系统设置集中了所有定制选项：

- **外观** -> 全局主题：一键切换整体风格
- **外观** -> Plasma 主题：仅改桌面面板/窗口装饰
- **外观** -> 图标：切换图标集
- **窗口管理** -> 窗口规则：按应用定制窗口行为

推荐主题商店：[KDE Store](https://store.kde.org/)。

### 输入法

KDE 下推荐使用 fcitx5 输入法框架：

```bash
sudo apt install fcitx5 fcitx5-chinese-addons fcitx5-config-qt -y
```

在 KDE 系统设置 -> 输入设备 -> 虚拟键盘里选择 Fcitx 5，重新登录生效，可以看[这篇文章](https://xiao-blog.top/docs/article?id=linux-guide&sub=linux-install-guide&sub2=install-after-config)的内容寻找 Fcitx 5 的配置办法。

---

## 常见问题

### 登录界面没有 KDE 选项

原因：KDE 会话文件未正确安装，或显示管理器未识别。

```bash
# 确认会话文件存在
ls /usr/share/xsessions/ | grep plasma
# 应看到 plasma.desktop

# 若不存在需要重装
sudo apt install --reinstall kde-plasma-desktop
```

### 卸载 GNOME 后 KDE 异常

原因：`autoremove` 误删了 KDE 依赖的底层库。

```bash
sudo apt install --reinstall kubuntu-desktop # 重新安装 Kubuntu
```