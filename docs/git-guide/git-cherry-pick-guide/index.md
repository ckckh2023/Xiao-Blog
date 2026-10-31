本文介绍用 **`git cherry-pick` 重建分支** ：能允许我们从一段历史中挑选部分提交、按需重新组装成一条干净的新历史，再替换原分支。非常适用于回退到某个旧提交，但中间有几个提交想保留这类 `reset` 与 `revert` 都不方便处理的场景。

> [!TIP]
> `cherry-pick` 的本质是把指定提交所引入的改动当作一个补丁，重新应用到当前分支顶端，生成一条新提交。

---

## 适用场景

三种需求对应不同的工具：

| 需求 | 合适工具 | 说明 |
| --- | --- | --- |
| 回退到某提交，其后的提交**全部丢弃** | `git reset --hard` | 最简单，但无法保留中间任何提交 |
| 反转**最近一次**提交的改动 | `git revert` | 新增一条反向提交，不改写历史 |
| 回退到某提交，但**中间有若干提交要保留** | `git cherry-pick` | 可任意挑选、重排历史的方法 |

---

## 识别保留与丢弃的提交

先用 `--reverse` 按时间从旧到新列出目标回退点之后的所有提交：

```bash
git log --reverse --pretty=format:"%h | %ci | %s" <回退点>..HEAD
```

> [!CAUTION]
> `git log` 默认从新到旧输出，直接读容易把顺序看反，而cherry-pick 必须按从旧到新的顺序，最好加 `--reverse`。

再用 `git show --stat` 逐个查看候选提交改了哪些文件，判断保留与丢弃之间是否存在依赖：

```bash
git show --stat <提交哈希>
```

> [!WARNING]
> 若某保留提交改动的文件，恰好是被丢弃提交建立的，cherry-pick 时会冲突，需要手动处理！

---

## 打安全标签（可选）

重建会改写历史，动手前先使用 `git tag pre-rebuild HEAD` 给当前 HEAD 打标签作为保险。

> [!TIP]
> 万一结果不满意，随时可以 `git reset --hard pre-rebuild` 来回到原状。

---

## 基于回退点建新分支并 cherry-pick

```bash
# 基于回退点创建新分支
git checkout -b rebuild-branch <回退点>

# 按时间从旧到新顺序，依次 cherry-pick 要保留的提交
git cherry-pick <保留1> <保留2> <保留3> ...
```

一次 `cherry-pick` 可传入多个提交，Git 会按给定顺序逐个应用。

若中途冲突，Git 会暂停并提示，解决后：

```bash
git add <冲突文件>
git cherry-pick --continue
```

想放弃本次 cherry-pick 回到暂停前状态，使用 `git cherry-pick --abort` 即可，不过你得重新来了。

---

## 验证新历史

```bash
git log --oneline -<保留数量+1>
```

逐条核对：提交数量是否等于保留数量、每个提交的改动文件是否与原提交一致：

```bash
git show --stat <新提交哈希>
```

> [!WARNING]
> 务必核对提交数量，数量对不上时不要进入下一步！

---

## 替换主分支

确认新分支无误后，就可以用它替换主分支了：

```bash
git branch -m main main-backup # 把旧 main 改名 main-backup
git branch -m rebuild-branch main # 把新分支改名为 main
```

若当前正处在 `rebuild-branch` 上，第二条可省略原名，简写为 `git branch -m main`。

---

## 推送到远端

新 `main` 与远端历史已分叉，普通的 `push` 会被拒。需强制推送：

```bash
git push --force-with-lease origin main
```

> [!CAUTION]
> 用 `--force-with-lease` 而非 `--force`，因为前者在远端被他人更新过时会拒绝推送，防止覆盖协作者的新提交，后者就是无脑覆盖。

推送后的遗留分支就可以使用 `git branch -d <分支名>`（普通删除）或 `git branch -D <分支名>`（强制删除）清理了。

---

## 常见问题与排查

### `branch named 'main' already exists`

漏了`把旧 main 分支`那一步，这样会导致 `main` 分支被占用无法改名。

> 如果你想了解远程仓库相关知识，也许[此文档](https://xiao-blog.top/docs/article?id=git-guide&sub=git-remote-guide)对你还有点帮助。