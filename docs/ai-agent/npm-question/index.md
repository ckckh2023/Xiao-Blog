在 AI Agent 本地开发环境的部署过程中，通过 `Npm 包管理器` 全局安装 CLI 工具或插件是常见操作。但是由于操作系统安全策略与包管理器自身的脚本执行、依赖版本控制机制的差异，开发者在系统环境下常遭遇多种障碍导致安装或卸载失败，下文专指本站配置 `DeepSeek Harness` 可能出现的问题。

> 其他 Agent 也很容易触发，也可以参考，不过很多都把环境打包进去了。

---

### Windows 环境下 PowerShell 的执行策略限制

在 Windows PowerShell 中执行 `npm install -g @deepseek-ai/dsh` 时，若系统执行策略为 `Restricted`，则任何 `.ps1` 脚本均被禁止运行。典型错误提示如下：

```powershell
Get-ExecutionPolicy : Restricted
. : 因为在此系统上禁止运行脚本...
```

#### 根本原因

Windows 默认的 PowerShell 执行策略为 `Restricted`，即只允许交互式命令，拒绝所有脚本文件。

#### 解决方法

- **面向当前用户**  

  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

  输入 `Y` 确认修改。该策略允许运行本地脚本，远程下载的脚本需数字签名，一般情况下够用。

- **面向所有用户**

  > 需先以管理员权限打开终端！

  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
  ```

  修改后可通过 `Get-ExecutionPolicy` 验证。

> **注意**：若在非个人环境，应遵循组织安全策略，避免盲目放宽至 `Unrestricted`。

---

### Npm 的 install-scripts 白名单机制

在终端中执行 `npm install -g xxx` 时，安装过程顺利完成（`added xxx packages`），但出现多处警告：

```bash
npm warn install-scripts 5 packages had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   @deepseek-ai/dsh-subprocess-local@0.1.0-rc.7 (postinstall: node scripts/ensure-spawn-helper.mjs)
...
npm warn install-scripts Run `npm install -g --allow-scripts=...` to allow these scripts once, or `npm config set allow-scripts=... --location=user` to allow them for all global installs.
```

#### 根本原因

Npm 引入了 `allow-scripts` 配置，旨在防止第三方包在安装时自动执行可能危险的脚本。未列入白名单的包，其 `install`、`postinstall` 等脚本将被跳过。

全局安装时，该配置默认为空，导致所有安装脚本均被阻塞。而 `--allow-scripts` 命令行参数需配合 `npm install` 或 `npm rebuild` 使用，若单独执行且未指定包名，npm 会尝试读取当前目录的 `package.json` 执行安装，从而引发文件找不到的错误。

#### 诊断方法

查看 npm 配置中 `allow-scripts` 的值：

```bash
npm config get allow-scripts --location=user
```

若为空或未包含所需包，则需添加。

#### 解决方法

**步骤一：将受阻包加入用户级白名单**  

执行以下命令，将相关包名以逗号分隔配置为允许脚本执行：

```bash
npm config set allow-scripts "pnpm,@deepseek-ai/dsh-subprocess-local,koffi,node-pty,@google/genai,protobufjs,@opencode/cli" --location=user
```

该设置永久生效于当前用户的所有全局安装。

> 如果你的 `allow-scripts` 有值，记得把这些值加进去，因为该配置不是增加值而是覆盖值。。。

**步骤二：手动触发已安装包的脚本重建**  

由于初始安装时这些脚本已被跳过，需重新 `npm install -g @deepseek-ai/dsh`，npm 会自动检测并执行缺失的脚本。

> 此时 npm 将依据新的白名单配置，正常执行各包的安装后脚本。重新安装完成后，工具功能应完整可用。

---

### Pnpm 的 minimumReleaseAge 供应链安全策略

除了 npm 自身的安装脚本限制，**pnpm** 引入了一项供应链安全策略：`minimumReleaseAge`。该策略要求依赖包的发布时间必须早于设定阈值，否则 pnpm 拒绝解析或安装该版本。

> 这在 Agent 工具链中同样常见，尤其是当开发者尝试**卸载**或**更新**某个插件时，若该插件版本太新，可能触发如下错误：

```bash
✗ Lockfile failed supply-chain policy check
[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] 
  dshmarket@1.19.0 was published at 2026-08-23T06:00:15.000Z,
  within the minimumReleaseAge cutoff (2026-08-23T01:01:17.695Z)
```

#### 根本原因

pnpm v10.16.0+ 引入了 `minimumReleaseAge` 配置，在 v11 中默认值为 `1440`。该策略旨在降低刚刚发布的恶意版本被安装的风险。当锁文件 `pnpm-lock.yaml` 中记录的包发布时间未达到阈值时，pnpm 会拦截并报错，阻止安装或卸载操作。

#### 诊断方法

检查项目根目录或配置目录下的 `pnpm-workspace.yaml` 文件，查看是否有 `minimumReleaseAge` 字段：

```yaml
# pnpm-workspace.yaml
minimumReleaseAge: 1440
```

若未显式配置，则使用 pnpm 默认值，也可通过 `pnpm config get minimumReleaseAge` 查看。

> 注意该配置仅在 `pnpm-workspace.yaml` 中生效，不适用 `.npmrc`。

#### 解决方法如下

**方法一：修改 `pnpm-workspace.yaml` 关闭或调低阈值**  

在项目根目录（或插件配置目录，如 `~/.dsh/profiles/web`）下编辑 `pnpm-workspace.yaml`，将 `minimumReleaseAge` 设为 `0` 以关闭策略，或设为更短时间：

```yaml
# pnpm-workspace.yaml
minimumReleaseAge: 0
```

保存后重新执行 `pnpm install` 或 `pnpm remove` 即可。

**方法二：直接操作包文件绕过 pnpm**  

若 pnpm 命令持续受阻，可直接从 `package.json` 中删除目标依赖，并删除 `node_modules` 中对应目录，随后重新安装：

```bash
sed -i '/"dshmarket"/d' package.json
rm -rf node_modules/dshmarket
rm -f pnpm-lock.yaml
pnpm install
```

这样可彻底移除问题包，且不触发策略检查。（

> 此方法有风险，建议优先使用方法一！

#### 补充：为特定包设置例外

如果希望大部分依赖保持延迟，仅允许某个内部包或紧急修复版本立即安装，可使用 `minimumReleaseAgeExclude`：

```yaml
# pnpm-workspace.yaml
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  # 允许内部所有包
  - "@your-company/*"
  # 仅允许该特定版本
  - "dshmarket@1.19.0"
```