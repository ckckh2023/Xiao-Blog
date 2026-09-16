本文介绍 Git 最基础的三项操作：**初始化仓库**（本地 `init` 与远程 `clone`）、**暂存更改**（`git add`）以及**提交记录**（`git commit`）。这三步构成了日常版本管理的最小闭环，初学者掌握它们即可完成绝大多数本地工作流。

> Git 命令在各平台语法一致，下文示例统一以 `bash` 给出；Windows 平台建议在 `Git Bash` 中执行，以避免 PowerShell 下部分符号的转义问题。

---

## 初始化仓库

创建一个受 Git 管理的仓库有两种常见起点：从零开始本地初始化，或从远程克隆一个已存在的仓库。

### 本地初始化（git init）

在目标目录下执行：

```bash
git init
```

该命令会在当前目录生成一个隐藏的 `.git` 目录，其中存放全部版本库元数据；原有文件不受影响，但此后该目录即被 Git 跟踪。

**指定初始分支名**：Git 默认分支历史上为 `master`，自 2.28 起可通过 `init.defaultBranch` 配置更改。若希望新建仓库直接以 `main` 为初始分支，有两种做法：

```bash
git init -b main
```

或一次性配置全局默认分支（之后所有 `git init` 都生效）：

```bash
git config --global init.defaultBranch main
```

**首次使用的身份配置**：提交记录会署名当前用户，若尚未全局配置过，需先设置：

```bash
git config --global user.name "你的名字"
git config --global user.email "your_email@example.com"
```

**关联远程仓库**：本地初始化的仓库默认没有远程，需手动关联一个远程地址后才能推送：

```bash
git remote add origin <仓库URL>
```

其中 `origin` 是远程的默认别名，`<仓库URL>` 可为 HTTPS 或 SSH 地址，关于远程地址请查看[此文档](https://xiao-blog.top/docs/article?id=git-guide&sub=git-remote-guide)。

### 克隆远程仓库（git clone）

若远程仓库已存在，直接克隆是最省事的方式——它会在当前目录下新建一个与仓库同名的子目录，并自动完成初始化、下载全部历史与设置 `origin`：

```bash
git clone <仓库URL>
```

**克隆到指定目录**：

```bash
git clone <仓库URL> <目标目录>
```

**仅克隆指定分支**：

```bash
git clone -b <分支名> <仓库URL>
```

**浅克隆**：只取最近一次提交，适用于只关心最新代码、不需要完整历史的场景（如 CI 拉取代码）：

```bash
git clone --depth 1 <仓库URL>
```

> `<仓库URL>` 可为 HTTPS 或 SSH 地址，关于远程地址请查看[此文档](https://xiao-blog.top/docs/article?id=git-guide&sub=git-remote-guide)。

---

## 暂存更改（git add）

Git 将文件分为三个区域：**工作区**（你编辑的文件）、**暂存区**（下次提交的快照）和**仓库区**（已提交的历史）。`git add` 的作用就是把工作区的变更放入暂存区。

### 优先 `add .`

最常用的做法是把当前目录下所有变更一次性暂存：

```bash
git add .
```

`.` 表示当前目录及其子目录下的全部改动（新增、修改、删除都会纳入）。这是日常最省事的写法，也是本文推荐的首选方式。

> 在旧版 Git 中，`git add .` 不会暂存已删除的文件，需用 `git add -A`。现代 Git 已统一行为，`git add .` 即可处理删除。

### 其他常用形式

- **暂存指定文件**：

```bash
git add <文件路径>
```

- **只更新已跟踪文件**（不包含新增的未跟踪文件）：

```bash
git add -u
```

- **交互式分块暂存**：逐块决定是否纳入，适合将一个大改动拆成多次提交：

```bash
git add -p
```

### 查看状态

暂存前后都可以用 `git status` 查看当前工作区与暂存区的差异：

```bash
git status
```

### 暂存忽略文件

若某些文件（如编译产物、依赖目录、密钥）不应进入版本库，在仓库根目录创建 `.gitignore` 文件列出忽略规则即可，`git add .` 会自动跳过它们。一般都含有：

```text
node_modules/
*.log
dist/
.env
```

---

## 提交更改（git commit）

`git commit` 把暂存区的快照固化成仓库区中的一条提交记录，这是版本管理真正"存档"的一步。

### 基本提交

```bash
git commit -m "提交说明"
```

`-m` 直接在命令行给出提交信息；若省略 `-m`，Git 会打开默认编辑器让你撰写多行信息。

**提交信息** 建议一行简明扼要，以动词开头、描述本次改动的目的，例如 `修复登录页空指针异常` 而非 `改了点东西`。若需多行，第一行作标题，空一行后写正文。

> 提交信息一定要规范！你回滚的时候会回来感谢我的[doge]。

### 跳过 add 直接提交已跟踪文件

对已跟踪文件的修改，可用 `-a` 跳过 `git add`，一步完成暂存并提交：

```bash
git commit -am "提交说明"
```

> `-a` 只对**已跟踪**文件的修改和删除生效，新增的未跟踪文件仍需先 `git add`。

### 修改最近一次提交

若提交后立刻发现说明写错了，可用 `--amend` 修正，而不必新增一条提交：

```bash
git commit --amend -m "修正后的提交说明"
```

若还漏了文件，先 `git add` 再 `--amend`：

```bash
git add <漏掉的文件>
git commit --amend --no-edit
```

`--no-edit` 表示沿用原提交信息不改。注意：`--amend` 会改写最近一次提交的哈希，**若该提交已推送到远程共享分支，应避免随意 amend**，否则他人拉取会冲突。

### 查看提交历史

```bash
git log
git log --oneline --graph ## 此为简洁视图，可以常用
```

`--oneline` 每条提交压成一行，`--graph` 以字符画出分支合并图，便于快速了解演进脉络。

---

## 懒人版总结

一次完整的本地工作流通常就是三步循环：

```bash
git add .
git commit -m "提交备注"
git push origin main
```

其中 `init`/`clone` 只在仓库起步时执行一次，`add` → `commit` 则是日常反复进行的节奏。掌握这三项即可独立完成本地的版本管理工作，后续的分支、合并、远程协作等进阶操作都建立在此基础上。