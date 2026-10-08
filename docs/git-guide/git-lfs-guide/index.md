本文介绍 **Git LFS**（Large File Storage）的用途与工作原理，并给出安装初始化、跟踪规则配置、日常推拉、克隆含 LFS 仓库以及将已有大文件迁移至 LFS 的完整流程。Git LFS 用于解决 Git 在管理大型二进制文件时仓库体积膨胀的问题，是游戏开发、机器学习、多媒体项目中的常见补丁。

> Git LFS 命令在各平台语法一致，下文示例统一以 `bash` 给出；Windows 平台建议在 `Git Bash` 中执行。

---

## 为什么需要 Git LFS

Git 对每个文件都保存完整历史快照，二进制文件稍有改动就会再存一份全量数据，无法像文本文件那样做差分压缩。若仓库中存在数百兆的模型或视频，几次提交后 `.git` 目录就会变得很大，克隆、推送、拉取都会变得很慢。

Git LFS 的思路是：**仓库里只存一个轻量的指针文件**，真正的二进制内容存放在 LFS 服务器上。本地工作区里仍是真实文件，可正常编辑；只有 `commit` 时才把大文件上传到 LFS 服务器，并在 Git 仓库里留下指针。

Git LFS 非常适用以下场景：

- 单文件超过 10MB 的二进制资源，如模型、视频、音频等。
- 频繁改动导致 `.git` 体积失控的文件。
- 需要保留历史但又不希望克隆拉取全量历史的场景。

---

## 安装与初始化

Git LFS 是独立于 Git 的扩展，需单独安装。

**Windows**：可在[官方网站](https://git-lfs.github.com/)下载，安装后自动写入 `git lfs` 子命令。

> 若已经在使用 Git for Windows 的较新版本，通常**已内置 LFS**。

**Linux（Debian/Ubuntu）**：

```bash
sudo apt install git-lfs
```

**macOS（Homebrew）**：

```bash
brew install git-lfs
```

安装完成后，需执行一次全局初始化：

```bash
git lfs install
```

> 该命令会在全局 `~/.gitconfig` 中写入必要的 filter 配置，使后续所有仓库都能识别 LFS 指针。

---

## 配置跟踪规则

LFS 不会自动接管任何文件，需显式声明哪些路径走 LFS 通道。命令为：

```bash
git lfs track "<匹配规则>"
```

匹配语法与 `.gitignore` 一致，支持通配符。常见写法：

```bash
git lfs track "*.psd"          # 所有 PSD 文件
git lfs track "models/*.bin"   # models 目录下的 .bin 文件
git lfs track "assets/**"      # assets 目录下全部文件
git lfs track "*.mp4" "*.zip"  # 一次跟踪多种类型
```

执行后会在仓库根目录生成一个 `.gitattributes` 文件，如下所示

```text
*.psd filter=lfs diff=lfs merge=lfs -text
models/*.bin filter=lfs diff=lfs merge=lfs -text
```

> [!IMPORTANT]
> `.gitattributes` 本身必须被 Git 跟踪并提交，否则他人克隆后 LFS 规则不生效：

```bash
git add .gitattributes
git commit -m "配置 LFS 跟踪规则"
```

查看当前跟踪规则：

```bash
git lfs track
```

查看已被 LFS 接管的文件：

```bash
git lfs ls-files
```

---

## 日常使用

配置好规则后，工作流与普通 Git 完全一致。`add`、`commit`、`push` 不需要任何特殊参数，LFS filter 会自动在背后处理。

```bash
git add models/weights.bin
git commit -m "更新模型权重"
git push origin main
```

推送时，Git 会先把大文件上传到 LFS 服务器，再向 Git 仓库推送指针提交。若大文件较多或较大，推送耗时主要花在 LFS 上传上。

**查看 LFS 文件状态**：

```bash
git lfs ls-files # 列出当前 LFS 跟踪的文件
git lfs ls-files --size # 额外显示文件大小
```

**手动拉取 LFS 内容**：

```bash
git lfs pull
git lfs fetch # 仅下载到本地缓存，不写入工作区
git lfs checkout # 把指针文件替换为真实内容
```

---

## 状态查看与配置管理

LFS 的运行依赖若干 Git 配置项，日常使用中常需查看当前状态、调整端点或清理重复配置，本节给出常用命令与配置项含义。

### 查看 LFS 状态

| 用途 | 命令 |
| --- | --- |
| LFS 环境与端点信息 | `git lfs env` |
| 当前仓库 LFS 状态 | `git lfs status` |
| 已跟踪的 LFS 文件 | `git lfs ls-files` |
| 当前跟踪规则 | `git lfs track` |

`git lfs env` 是排查 LFS 行为最直接的命令，会打印解析出的端点、认证方式、本地存储路径等，能一眼看出 LFS 实际指向哪个服务器。

### 查看 LFS 相关配置

LFS 配置散落在 Git 的多级配置文件中，可用 `grep` 过滤：

```bash
git config -l | grep lfs          # 所有层级的 lfs 配置
git config --local -l | grep lfs  # 仅当前仓库
git config --global -l | grep lfs # 仅全局
```

PowerShell 下用 `Select-String` 代替 `grep`：

```powershell
git config -l | Select-String lfs
```

### LFS 端点配置（lfs.url）

默认情况下，LFS 端点**跟随 `origin` 远程地址**自动推导，无需手动设置。仅当需要把 LFS 指向与 Git 仓库不同的服务器时，才需要显式配置。

> [!CAUTION]
> 这里有坑，当不存在 `origin` 远程源且有多个远程源时，LFS 文件系统可能因此混乱，需要手动配置。

```bash
git config --local lfs.url https://example.com/.../info/lfs
```

若发现 LFS 总是连到错误的服务器（如历史遗留的硬编码端点），先确认 `lfs.url` 在哪一层配置里。

```bash
git config --local --get lfs.url
git config --global --get lfs.url
```

确认后删除对应层的配置即可恢复默认跟随 `origin` 的行为。

```bash
git config --local --unset lfs.url # 本地层
git config --global --unset lfs.url # 全局层
```

删除后用 `git lfs env` 确认端点已指向当前 `origin` 的 LFS 地址。

### 常见 LFS 配置项释义

查看配置时常会见到以下条目，均属正常，一般无需手动维护：

- `lfs.repositoryformatversion=0`：仓库启用 LFS 的标记，**不可删除**，否则 LFS 失效。
- `lfs.<URL>.access=basic`：LFS 对各远程仓库的认证方式缓存，按远程地址分桶存储。删除后下次推拉会自动重建，无需手动清理。
- `filter.lfs.clean` / `filter.lfs.smudge`：LFS filter 钩子，由 `git lfs install` 写入，使 Git 在 `add`/`checkout` 时自动在指针与真实内容之间转换。

---

## 克隆含 LFS 的仓库

正常 `git clone` 即会自动拉取 LFS 文件。

```bash
git clone <仓库URL>
```

若只想取代码、暂不下载大文件，可禁用 smudge filter，之后需要时再使用 `git lfs pull` 补拉即可。

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone <仓库URL>
```

许多开发者会使用**浅克隆**来克隆仓库。浅克隆会省略历史记录，但 LFS 文件仍会自动拉取，因为 Git LFS 会忽略浅克隆的 `--depth` 参数。

```bash
git clone --depth 1 <仓库URL>
```

---

## 迁移已有大文件到 LFS

若仓库中已经提交了大文件，事后想改用 LFS 管理，需要重写历史。推荐使用官方的 `git lfs migrate` 命令。

**仅迁移当前分支的新提交**：

```bash
git lfs migrate import --include="*.psd" --no-rewrite
```

> `--no-rewrite` 会把现有大文件转交给 LFS，并产生一条新提交，不触动已有历史。

**重写全部历史**：

```bash
git lfs migrate import --include="*.psd"
```

执行后所有历史提交中匹配 `*.psd` 的文件都会被替换为 LFS 指针，`.git` 体积会显著下降。

> [!WARNING]
> 此操作会改写历史，**若仓库已推送且有人协作，必须通知所有协作者重新克隆**，否则会出现哈希不一致。

迁移完成后，本地旧的对象仍占用空间，可清理：

```bash
git reflog expire --expire=now --all
git gc --prune=now
```

---

## 服务端限制与注意事项

各 LFS 服务端（GitHub、GitLab、Bitbucket 等）对 LFS 均有配额与单文件大小限制，使用前应了解所在平台的策略。

**自建 LFS 服务器**：若不愿受限于平台配额，可自建 LFS 后端，通过 `git config -f .lfsconfig lfs.url <自定义URL>` 指向。

**LFS 指针文件的特征**：被 LFS 接管的文件在 Git 中表现为一个文本指针，形如：

```text
version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab293d2c4f7d8e3f2c9b1a5e8d2f0c6b3a9e7d4c1b8a5e2d9c6b3
size 12345678
```

若克隆后看到大文件内容是这种三行文本，说明 LFS 未正确拉取，执行 `git lfs pull` 即可。
