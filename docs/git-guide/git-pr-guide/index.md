本文介绍 **Pull Request（PR）** 的概念与完整工作流，涵盖 fork 与同仓两种协作模式、分支创建与推送、在 GitHub 上发起与评审 PR、合并策略选择、fork 场景下的上游同步以及常见问题排查。PR 是团队协作与开源贡献的核心机制，掌握它即可顺畅地向他人仓库或团队主分支贡献代码。

> 下文以 GitHub 界面为例说明 PR 操作，Git 命令部分统一以 `bash` 给出；Windows 平台建议在 `Git Bash` 中执行。

> [!TIP]
> GitLab 称同一概念为 **Merge Request（MR）**，流程类似。

---

## 什么是 Pull Request

PR 的本质是**一次请求目标仓库拉取我的分支的提议**。即贡献者在自己的分支上完成改动后，发起一个 PR 指向目标分支，请求维护者审查、合并。

PR 提供了以下内容：

- **代码评审**：逐行评论、提出修改建议、标记更改。
- **持续集成触发**：CI 在 PR 上自动跑测试，通过后才允许合并。
- **讨论留痕**：所有讨论与决策记录在 PR 中，便于追溯。
- **合并入口**：评审通过后一键合并到目标分支。

两种典型发起场景：

| 场景 | 说明 | 是否需 fork |
| --- | --- | --- |
| **同仓 PR** | 自己有仓库写权限，从特性分支 PR 到 `main` | 否 |
| **fork PR** | 向他人开源仓库贡献，先 fork 再 PR | 是 |

---

## 团队内部协作

适用于自己有仓库直接写权限的场景，例如公司团队项目、个人维护的多分支项目。

### 创建特性分支

从最新的 `main` 切出分支，命名建议带前缀以便识别：

```bash
git checkout main
git pull origin main
git checkout -b feature/add-login-page
```

### 开发并推送

```bash
git add .
git commit -m "新增登录页面"
git push -u origin feature/add-login-page
```

`-u` 设置上游跟踪，之后 `git push` 无需再指定分支。

### 在 GitHub 上发起 PR

推送后，打开仓库网页，GitHub 会显示一个黄色提示条 `Compare & pull request`，点击即可进入 PR 创建页。也可手动从 `Pull requests` → `New pull request` 进入。

填写要点：

- **base 分支**：被合并的目标分支。
- **compare 分支**：自己的特性分支。
- **标题**：简明描述本次改动，建议遵循约定式提交前缀。
- **描述**：说明改动动机、实现思路、测试方式。
- **评审人**：指定审查者，会发送通知。
- **标签**：按团队约定打标签，如 `needs-review`、`bug`。

点击 `Create pull request` 即完成发起。

### 评审与修改

评审人在 PR 页面可：

- **逐行评论**：在 `Files changed` 标签页点击某行右侧 `+` 添加评论。
- **提出建议**：评论框点 `{}` 图标插入代码块，维护者可一键 `Commit suggestion` 直接采纳。
- **提交评审结论**：右上角 `Review changes` → 选择 `Comment`、`Approve`、`Request changes`。

若评审选择 `Request changes`，贡献者只需在本地同一分支继续提交并推送，PR 会自动更新。

---

## 向他人仓库贡献

适用于无直接写权限的开源贡献场景。

### Fork 仓库

在目标仓库网页右上角点击 `Fork`，会在自己账号下生成一份同名仓库。fork 后的远程地址形如 `https://github.com/<你的用户名>/<仓库>.git`。

### 克隆 fork 并配置上游

```bash
git clone https://github.com/<你的用户名>/<仓库>.git
cd <仓库>
git remote add upstream https://github.com/<原仓库所有者>/<仓库>.git
git remote -v
```

`origin` 指自己的 fork，`upstream` 指原仓库。

### 同步上游并切分支

开始工作前，先把上游最新改动取到本地：

```bash
git checkout main
git fetch upstream
git merge upstream/main # 或 git rebase upstream/main
git push origin main # 把更新同步到自己的 fork
```

再切特性分支：

```bash
git checkout -b fix/typo-in-readme
```

### 开发、推送、发起 PR

```bash
git add .
git commit -m "docs: 修正 README 拼写错误"
git push -u origin fix/typo-in-readme
```

推送后，进入**自己 fork 的仓库页面**，GitHub 会提示 `Compare & pull request`。确认 PR 的 base 仓库是**原仓库**，compare 仓库是自己 fork 的分支，填写信息后提交即完成。

---

## 合并策略

评审通过后，维护者选择合并方式，GitHub 提供三种策略。

| 策略 | 效果 | 适用场景 |
| --- | --- | --- |
| **Create a merge commit** | 保留特性分支全部提交，并新增一条 merge commit | 一般团队协作，希望保留完整分支历史 |
| **Squash and merge** | 把特性分支所有提交压成一条，合并到目标分支 | 特性分支提交杂乱，希望主分支历史简洁 |
| **Rebase and merge** | 把特性分支提交逐个"嫁接"到目标分支顶端，无 merge commit | 希望线性历史且保留每个提交 |

> 选 `Squash and merge` 时，合并提交信息默认汇总各提交标题，可在合并前编辑为一条规范信息。

合并后，特性分支可删除。GitHub 提供 `Delete branch` 按钮，本地清理用：

```bash
git branch -d feature/add-login-page # 删本地分支
git push origin --delete feature/add-login-page # 删远程分支
```

---

## fork 场景下的上游同步

fork 之后，自己的 `main` 不会自动跟随原仓库更新。每次开始新贡献前都应同步。

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```
也可以在 GitHub 网页上点 `Sync fork` 一键同步。

> [!CAUTION]
> 所有改动都应放在特性分支，`main` 只用于镜像上游，你**不应在 `main` 上直接开发**。

---

## 常见问题与排查

### 推送被拒：`non-fast-forward`

特性分支落后于目标分支的最新提交。先同步再推送：

```bash
git fetch origin
git rebase origin/main # 或 git merge origin/main
git push
```

### PR 显示冲突

目标分支与特性分支改动触及同一行。在本地解决：

```bash
git fetch origin
git merge origin/main # 合并目标分支到特性分支
# 手动编辑冲突文件，保留正确内容
git add <冲突文件>
git commit
git push
```

或用 rebase 方式：

```bash
git fetch origin
git rebase origin/main
# 解决冲突后
git rebase --continue
git push --force-with-lease
```

> [!WARNING]
> rebase 后历史改写，推送需 `--force-with-lease` 而不是 `--force`。

---

## 最小流程总结

同仓 PR 最小流程如下：

```bash
git checkout -b feature/xxx # 切特性分支
git add . && git commit -m "feat: xxx"
git push -u origin feature/xxx # 推送
# 网页流程发起 PR
```

fork PR 最小流程如下：

```bash
git remote add upstream <原仓库URL>
git fetch upstream && git checkout main && git merge upstream/main
git checkout -b fix/xxx
git add . && git commit -m "fix: xxx"
git push -u origin fix/xxx
# 网页流程发起 PR
```