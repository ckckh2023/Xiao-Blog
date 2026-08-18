> 本文面向网络学习者与开发者，仅介绍Clash Verge Rev 客户端的通用使用方法。  
> 请将代理用于合法场景，例如管理自己的服务器、企业内网访问、开发调试等，并遵守当地法律法规。

---

## 工具简介

Clash Verge Rev 是一个跨平台的 Clash 图形化客户端，支持 Windows、macOS、Linux。它基于 Clash 内核，提供配置管理、节点选择、规则分流、系统代理等功能。

> 使用前请确认你拥有代理服务器的合法使用权，并遵守所在地法律法规。

--- 
## 安装

你可以在我的[分享页](https://xiao-blog.top/share/?type=software&name=clash)找到它，按照流程下载安装即可。

> Windows 用户懒人版教程可[点此](https://gh-proxy.com/https://github.com/clash-verge-rev/clash-verge-rev/releases/download/v2.5.2/Clash.Verge_2.5.2_x64-setup.exe)下载安装

安装完成后启动软件。

--- 
## 导入配置文件

Clash Verge Rev 需要一份 YAML 格式的配置文件，其中包含代理节点、代理组和规则。

进入“配置”页面，可以选择：

- **从 URL 导入**：粘贴配置文件链接（例如企业或服务商提供的`合法`配置地址）。
    > 订阅链接通常由你的服务商提供，是一个 https:// 开头的链接，必须为`合法`链接

- **从本地文件导入**：选择已有的 YAML 文件。

一个最小配置文件结构如下（仅展示字段结构，请替换为你的合法服务器信息）：

```yaml
proxies:
  - name: "example"
    type: ss
    server: your-server.example.com
    port: 8388
    cipher: aes-256-gcm
    password: "your-password"

proxy-groups:
  - name: "PROXY"
    type: select
    proxies:
      - "example"
      - "DIRECT"

rules:
  - DOMAIN-SUFFIX,example.com,PROXY
  - MATCH,DIRECT
```

--- 
## 选择代理节点或策略组

在“代理”页面，可以看到配置文件中定义的代理组。点击策略组可以选择要使用的节点，或选择 `DIRECT` 直连。

常见策略组类型：

- **select**：手动选择节点。
- **url-test**：自动选择延迟最低的节点。
- **fallback**：自动选择可用节点。

--- 
## 开启系统代理

在首页的网络设置中打开“系统代理”开关。开启后，系统的 HTTP/HTTPS 流量会按照规则转发到代理服务器。

> 虚拟网卡模式介绍：让所有应用（包括命令行、游戏、UWP 应用等）都走代理，但不会影响系统设置。
> 正常情况下不需要开启，除非你的系统代理设置有问题。

代理模式通常有三种：

- **规则模式**：按配置文件中的规则分流。
- **全局模式**：所有流量都走代理。
- **直连模式**：所有流量直连，不走代理。

---

## 验证与关闭

开启系统代理后，可以访问返回 IP 的网站确认出口 IP 是否变化，或查看 Clash Verge Rev 的连接日志排查问题。

不需要代理时，请关闭“系统代理”开关，避免影响正常网络。

> 请务必在合法、合规的前提下使用，遵守法律法规。