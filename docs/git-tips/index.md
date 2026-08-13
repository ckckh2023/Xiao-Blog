多人协作时难免遇到冲突，本文记录几种典型场景的处理方法。

## 1. 合并冲突（Merge Conflict）

执行 `git merge` 后若出现冲突，文件中会出现标记：

```
<<<<<<< HEAD
当前分支内容
=======
被合并分支内容
>>>>>>> feature/x
```

手动编辑保留正确内容后，执行 `git add` 再 `git commit` 完成合并。

## 2. 变基冲突（Rebase Conflict）

变基时遇到冲突，解决后需执行 `git rebase --continue`；若想放弃可使用 `git rebase --abort`。

## 3. 撤销已推送的提交

```sh
git revert <commit-id>
git push origin <branch>
```

> 注意：避免在公共分支使用 `git reset --hard` 或 `push --force`，以免覆盖他人提交。

## 4. 误删分支恢复

```sh
git reflog
git branch <new-branch> <commit-id>
```

## 5. cherry-pick 跨分支取提交

需要把某个提交单独应用到当前分支时：

```sh
git cherry-pick <commit-id>
```
