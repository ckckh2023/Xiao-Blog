Visual Studio Code 凭借其轻量、高扩展性和强大生态，已成为开发者最青睐的编辑器之一。然而，在长期使用过程中，插件冲突、设置混乱或同步异常等问题可能累积，导致编辑器行为不符合预期。许多开发者选择卸载重装，但会发现重装后旧有的配置、插件和缓存依然存在——这是因为 VS Code 将用户数据与应用程序本身分离存储，默认卸载程序并不会清除这些数据。

---
### VS Code 用户数据存储位置

VS Code 的用户数据主要存储在以下两个目录中：

1. **用户设置和扩展**：这些数据包括用户设置、扩展、代码片段、键盘快捷方式等。这些数据通常存储在用户的主目录下，具体路径如下：

   - **Windows**：`~/AppData/Roaming/Code`
   - **macOS**：`~/Library/Application Support/Code`
   - **Linux**：`~/.config/Code`

2. **缓存数据**：这些数据包括编译缓存、代码分析缓存、扩展缓存等。这些数据通常存储在用户的主目录下，均在 `~/.vscode` 目录中。

---

### VS code 设置文件位置

VS Code 的设置文件存储在用户的主目录下，具体路径如下：

- **Windows**：`~/AppData/Roaming/Code/User/settings.json`
- **macOS**：`~/Library/Application Support/Code/User/settings.json`
- **Linux**：`~/.config/Code/User/settings.json`

> 建议备份 `settings.json` ，以便在重装后快速恢复设置

---

### Q：我不知道 `~` 是什么意思

> 懒人版理解办法：在终端输入 `cd ~/AppData/Roaming/Code`，再输入 `pwd`，即可看到 `~/AppData/Roaming/Code` 的实际路径。

**A：** 在 Unix 和类 Unix 系统（比如 macOS 和 Linux）中，`~` 符号代表当前用户的主目录。例如，如果当前用户是 `ckckh2023`，那么 `~/AppData/Roaming/Code` 实际上是指 `/home/ckckh2023/AppData/Roaming/Code`。

**A：** 同理，在 Windows 系统中，`~` 符号同样代表当前用户的主目录。例如，如果当前用户是 `ckckh2023`，那么 `~/AppData/Roaming/Code` 实际上是指 `C:\Users\ckckh2023\AppData\Roaming\Code`。

这代表了，无论在哪个操作系统上，`~` 都是指当前用户的主目录，需牢记。
