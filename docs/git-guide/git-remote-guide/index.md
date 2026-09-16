本地仓库与远程仓库的协作是 Git 团队开发的核心。本文介绍远程地址的两种认证方式（HTTPS 与 SSH）、`git remote` 的管理，以及 `git pull`/`git push` 的日常推拉操作。

> Git 命令在各平台语法一致，下文示例统一以 `bash` 给出；Windows 平台建议在 `Git Bash` 中执行。

---

## 远程认证方式：HTTPS 与 SSH

远程仓库地址有两种协议可选，决定了认证方式与日常体验。以 GitHub 为例，两种地址形如：

```text
HTTPS:  https://github.com/<用户>/<仓库>.git
SSH  :  git@github.com:<用户>/<仓库>.git
```

### HTTPS

- **优点**：无需额外配置密钥，开箱即用；走标准 443 端口，几乎不受防火墙限制。
- **缺点**：每次推送/拉取都可能要求输入账号与口令。

**凭据缓存**：为避免反复输入，可启用凭据助手把口令保存一段时间或永久存储：

```bash
git config --global credential.helper cache        # 内存缓存，默认 15 分钟
git config --global credential.helper store        # 明文写入 ~/.git-credentials
```

> **重要**：GitHub 自 2021 年 8 月起不再接受账号密码进行 Git 操作，需改用 **Personal Access Token** 代替密码。在 GitHub Settings → Developer settings → Personal access tokens 生成后，推送时密码栏填入 PAT 即可。

### SSH

- **优点**：一次配置密钥后全程免密，安全性更高。
- **缺点**：需先生成并配置 SSH 密钥，较麻烦，可参考[此文档](https://xiao-blog.top/docs/article?id=git-guide&sub=git-ssh-guide&sub2=git-ssh-config)。

**两种方式切换**：若仓库当前用的是 HTTPS，想改用 SSH，用 `git remote set-url` 修改远程地址即可（后续有介绍）。

> 选择建议：个人开发、网络受限环境可先用 HTTPS；长期使用或需频繁推送，配置好 SSH 后切换到 SSH 更省心。

---

## 管理远程地址（git remote）

克隆仓库时 Git 会自动建立一个名为 `origin` 的远程别名，指向克隆来源。`git remote` 系列命令用于管理这些别名。

- **列出所有远程别名**：

```bash
git remote
```

- **查看别名与对应 URL**（同时显示 fetch 和 push 地址）：

```bash
git remote -v
```

- **添加远程**：

```bash
git remote add <别名> <URL>
```

- **修改远程地址**（常用于切换 HTTPS/SSH）：

```bash
git remote set-url <别名> <新URL>
```

- **重命名远程**：

```bash
git remote rename <旧别名> <新别名>
```

- **删除远程**：

```bash
git remote remove <别名>
```

- **查看远程详情**：

```bash
git remote show <别名>
```

> `origin` 只是约定俗成的默认别名，并非固定；一个本地仓库可同时关联多个远程（如 `origin` 指自己的 fork，`upstream` 指原仓库），配合 `git pull upstream main` 拉取上游更新。

---

## 推送更改（git push）

`git push` 把本地提交上传到远程分支。

- **普通推送**：

```bash
git push origin <分支名>
```

- **设置上游跟踪**：

```bash
git push -u origin <分支名>
```

`-u` 记录本地分支与远程分支的对应关系，是常用推送分支与地址的推荐写法。

- **推送所有分支**：

```bash
git push --all
```

- **推送标签**：

```bash
git push --tags
```

**推送被拒绝**：当远程已存在本地没有的新提交时，推送会被拒绝并提示 `non-fast-forward`。此时应先 `git pull` 同步远程更新，解决可能的冲突后再推送。

**强制推送**：

```bash
git push --force
```
> 普通 `--force` 会无条件覆盖，有冲掉他人提交的风险！

更安全的做法是使用 `--force-with-lease` 而不是 `--force` ，它会在远程被他人改动时拒绝推送。

> **警告**：强制推送会改写远程历史，在共享分支上应尽量避免，否则会让协作者的本地仓库出现冲突。

---

## 拉取更改（git pull）

`git pull` 的本质是 `git fetch` + `git merge`：先从远程下载更新，再合并到当前分支。

- **普通拉取**：

```bash
git pull origin <分支名>
```

- **变基式拉取**：以变基代替合并，保持线性提交历史、避免产生 merge commit：

```bash
git pull --rebase
```

**只下载不合并**：`fetch` 仅把远程更新取到本地，不改动工作区，比 `pull` 更安全——可先查看远程发生了什么再决定如何整合：

```bash
git fetch
git log origin/main # 查看远程 main 的新提交
```

确认无误后再 `git merge origin/main` 或 `git rebase origin/main`。

**处理合并冲突**：`pull` 时若本地与远程改动触及同一行，Git 会暂停合并并提示冲突文件。需手动打开这些文件，寻找 `<<<<<<<`、`=======`、`>>>>>>>` 标记，编辑保留正确内容后：

```bash
git add <冲突文件>
git commit # 完成合并提交
```

若想放弃本次合并，用 `git merge --abort` 回到合并前状态。

---

## 懒人版总结

一次完整的远程协作循环通常是：

```bash
git pull                  # 开始工作前先同步远程仓库
git add .                 # 编辑后暂存文件
git commit -m "说明"       # 提交
git push                  # 推送到远程
```

若推送被拒，说明远程有新提交，先 `git pull` 再 `git push` 即可。掌握 `remote`、`pull`、`push` 三组命令，便能顺畅地与远程仓库及协作者同步工作。