由于 Snap 包管理器以及 Snap 包在 Ubuntu 预装且行为过于流氓，许多用户深受其扰。本文介绍在 Ubuntu 中**完全移除 Snap 软件包**的步骤：卸载已安装的 Snap 组件、阻止 apt 自动重装、以及用 apt/PPA 替代 Snap 版的软件商店与 Firefox。

> [!WARNING]
> 这些步骤会移除 Ubuntu 系统中的软件商店和 Firefox，执行前请确认已做好备份。

---

## 卸载 Snap 软件包

### 查看已安装的 Snap 包

```bash
snap list
```

> 输出包含 Firefox、软件商店、主题以及其它默认已安装的核心包。

### 按顺序移除 Snap 包

```bash
sudo snap remove --purge firefox
sudo snap remove --purge snap-store
sudo snap remove --purge gnome-3-38-2004
sudo snap remove --purge gtk-common-themes
sudo snap remove --purge snapd-desktop-integration
sudo snap remove --purge bare
sudo snap remove --purge core24 core20 core18 # 具体请看 snap list 列出的 core 版本
sudo snap remove --purge snapd
```

> [!IMPORTANT]
> 建议按上述顺序依次卸载，因为部分 Snap 包可能依赖其它 Snap 包导致 Snap 起死回生。

最后通过 apt 移除 Snap 服务：

```bash
sudo apt remove --autoremove snapd
```

---

## 清理 Snap 残留

移除 snapd 之后，磁盘上仍会留下大量残留：`/var/lib/snapd`、空的 `/snap` 与 `~/snap` 目录、以及 AppArmor 配置片段。

> [!CAUTION]
> 先卸载残留的 tmpfs 挂载点，否则后续 `rm -rf` 会因 `device busy` 失败。

```bash
sudo umount /run/snapd/ns # 卸载残留挂载点
sudo systemctl daemon-reload
sudo rm -rf /var/lib/snapd /var/cache/snapd /snap ~/snap /run/snapd /run/snapd.socket /run/snapd-snap.socket
sudo rm -f /etc/apparmor.d/usr.lib.snapd.snap-confine.real
sudo apt purge snapd # 清除 dpkg 中处于 rc 状态的残留配置
sudo apt autoremove --purge
```

> `/run` 是 tmpfs，其中的 socket 与目录在重启后本就会消失，一并删除是为了立即释放。

---

## 阻止 apt 自动重装 Snap

即使卸载了 Snap 包，若不关闭 `apt 触发器`，`sudo apt update` 会再次把 Snap 安装回来。在 `/etc/apt/preferences.d/` 下创建 apt 设置文件 `nosnap.pref` 即可关闭：

```bash
sudo tee /etc/apt/preferences.d/nosnap.pref > /dev/null << 'EOF'
Package: snapd
Pin: release a=*
Pin-Priority: -10
EOF
```

再次运行 `sudo apt update`，确保 Snap 彻底被移除。

> [!TIP]
> 建议长期保留 `nosnap.pref`，它不只拦截 snapd 自身，还能防止 Chrome、Edge、Steam 等第三方软件在升级时通过依赖把 snapd 重新拖回来。

---

## 替换 Snap 应用

### 安装 apt 版 GNOME 软件商店

```bash
sudo apt install --install-suggests gnome-software
```

> [!CAUTION]
> 必须使用 `--install-suggests` 参数，否则 Snap 又会被拉回来。

### 安装 apt 版 Firefox

```bash
sudo add-apt-repository ppa:mozillateam/ppa
sudo apt update
sudo apt install -t 'o=LP-PPA-mozillateam' firefox
```

为避免 apt update 再次安装 Snap 版 Firefox，创建优先级设置文件给予以上 PPA 超高优先权：

```bash
sudo tee /etc/apt/preferences.d/mozillateamppa > /dev/null << 'EOF'
Package: firefox*
Pin: release o=LP-PPA-mozillateam
Pin-Priority: 501
EOF
```

### 安装 Flatpak 版 Firefox

若不希望引入第三方 APT 源，也可以用 Flatpak 安装，装好后会直接出现在 GNOME 软件商店中。

```bash
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
sudo flatpak install flathub org.mozilla.firefox
```
