本文以 Ubuntu 22.04 + Nginx 环境为例，介绍如何使用 **Let's Encrypt** 为网站免费申请 SSL 证书。全程免费，证书有效期 90 天，自动续期，仅需一次配置。

> [!CAUTION]
> 本教程主要适用于 Ubuntu Linux + Nginx + 公网 IP + 域名 DNS 直连该 IP 的环境。其他场景请见文末的 `适用场景` 章节。

---

## 什么是 SSL 证书

当用户访问 `http://你的域名` 时，所有数据以明文传输，任何中间节点都能窃听甚至篡改内容，而 SSL 证书的作用是在浏览器和服务器之间建立加密通道，把 `http` 变成 `https`。

> [!TIP]
> SSL 能提升网站的权威性，提升搜索引擎排名，如果你想向大众开放你的站点，这是不可避免的。

过去申请 SSL 证书需要付费找 CA 机构，还流程繁琐。`Let's Encrypt` 是一个免费、自动化、开放的证书颁发机构，通过 `certbot` 工具可以一行命令完成申请、部署和自动续期。

---

## 前置准备

| 准备项 | 说明 |
|--------|------|
| 一台公网服务器 | 本文以 Ubuntu 22.04 为例 |
| 一个域名 | 需要 DNS 已解析到你的服务器 IP |
| 开放 80 和 443 端口 | 同时括服务器防火墙和云安全组 |

此外你需要能操作服务器命令行（root 或 sudo 权限），并拥有域名的 DNS 管理权限。

---

## 安装所需软件

需要两个软件：Nginx（反向代理工具）和 Certbot（证书申请工具）。

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

- `nginx`：Web 服务器的反向代理工具，负责接收 HTTPS 请求并转发给后端应用
- `certbot`：Let's Encrypt 官方客户端，负责申请和续期证书
- `python3-certbot-nginx`：certbot 的 Nginx 插件，能自动修改 Nginx 配置

安装完成后验证，有输出即可：

```bash
nginx -v
certbot --version
```

---

## 配置 Nginx

在申请证书之前，Nginx 需要先能通过 HTTP（80 端口）响应请求，同时 Let's Encrypt 会通过访问 `http://你的域名/.well-known/acme-challenge/xxx` 来验证你确实拥有该域名。

可以使用如下命令创建配置文件：

```bash
sudo tee /etc/nginx/sites-available/myapp.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

> [!CAUTION]
> `your-domain.com` 需要换成你自己的域名；`http://127.0.0.1:8000` 为代理目标地址，需要根据你的实际后端服务调整。

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/myapp.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t # 测试配置语法
sudo systemctl restart nginx
```

---

## 确认域名解析和端口放行

在申请证书前，必须确保外部能访问到你的服务器。

### 配置 DNS 解析

需要先通过 `curl -s ifconfig.me` 获取服务器公网 IP，再在你的域名 DNS 管理平台添加 A 记录：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | `@` 或具体子域名 | 服务器公网 IP |


### 放行防火墙端口

检查本机防火墙，一般都是已经放行的：

```bash
sudo ufw status
# 如果是 active，放行端口：
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

> [!CAUTION]
> 重点检查云安全组！这是最容易被忽略的一层，一定要放行 TCP 80 与 TCP 443！

### 验证外部可达

```bash
# DNS 是否指向正确 IP
dig your-domain.com +short
# 本机 Nginx 是否响应
curl -I http://localhost
# 外网是否能访问
curl -I http://your-domain.com
```

- 如果返回 `502 Bad Gateway`，说明 Nginx 正常但后端应用没启动。但是这不影响申请证书，certbot 会临时修改 Nginx 配置来响应验证请求。
- 如果超时或连接拒绝，说明端口没放行或 DNS 没生效，这时需要先解决再继续。

---

## 申请 SSL 证书

执行以下命令：

```bash
sudo certbot --nginx -d your-domain.com # 此处 your-domain.com 改成你的域名！
```

> [!TIP]
> 如果不想提供邮箱，可以在命令最后加 `--register-unsafely-without-email`。

按提示操作：

```text
Please read the Terms of Service...
(Y)es/(N)o: y # 同意条款
Enter email address (used for renewal notifications): # 输入邮箱
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/your-domain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/your-domain.com/privkey.pem
This certificate expires on 2026-10-01. # 90 天后到期
```

certbot 会自动完成以下工作：

- 向 `Let's Encrypt` 申请证书
- 将证书保存到 `/etc/letsencrypt/live/your-domain.com/`
- 自动修改 Nginx 配置，添加 443 SSL server 块
- 自动添加 80 → 443 的重定向
- 设置自动续期的定时任务


---

## 完善 Nginx 配置

certbot 自动生成的 443 配置是最小化的，实际使用中通常需要补充一些参数。完整的生产配置如下：

```bash
sudo tee /etc/nginx/sites-available/myapp.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri; # HTTP 强制跳转 HTTPS
}
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    # certbot 自动生成的 SSL 配置
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
    # 需要手动补充的配置
    # 上传大文件时必须调大（默认为 1MB）
    client_max_body_size 100m;
    # 后端处理耗时较长时调大（默认为 60s）
    proxy_read_timeout  3600s;
    proxy_send_timeout  3600s;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo nginx -t && sudo systemctl reload nginx
```

关键参数说明：

| 参数 | 默认值 | 何时需要修改 |
|------|--------|-------------|
| `client_max_body_size` | 1MB | 有文件上传功能时需设为略大于最大上传体积 |
| `proxy_read_timeout` | 60s | 后端有耗时操作时需要调大 |
| `proxy_set_header X-Forwarded-Proto` | — | 让后端知道原始请求是 HTTP 还是 HTTPS |

---

## 验证与自动续期

### 验证证书生效

```bash
# 命令行验证
curl https://your-domain.com
# 查看证书信息
sudo certbot certificates
```

浏览器访问 `https://your-domain.com`，应显示为 `https`。

### 确认自动续期

`Let's Encrypt` 证书有效期 90 天，但是 certbot 安装时已自动创建续期定时任务：

```bash
# 查看定时任务状态
sudo systemctl status certbot.timer
# 应显示 active (waiting)
# 手动模拟测试续期流程
sudo certbot renew --dry-run
# 显示 Congratulations 即正常
```

> 非常方便且无需任何额外配置，证书到期前 30 天会自动续期并重载 Nginx。

---

## 常见问题排查

### Timeout during connect

```text
Detail: Fetching http://your-domain.com/.well-known/acme-challenge/xxx: Timeout during connect
```

**原因**：`Let's Encrypt` 验证服务器无法从公网访问你的 80 端口。

### 413 Request Entity Too Large

**原因**：上传文件超过 Nginx 的 `client_max_body_size` 限制。

> 在 Nginx 配置中调大 `client_max_body_size 100m;` 即可，可以继续从 `100m` 调大到 `1g`等。

### 504 Gateway Timeout

**原因**：后端处理时间超过 Nginx 的 `proxy_read_timeout`。调大超时时间：

> 在 Nginx 配置中调大 `proxy_read_timeout 3600s; proxy_send_timeout 3600s;` 即可，可以继续从 `3600s` 调大。

---

## 方案对比

其实也可以去使用 Cloudflare SSL 证书，但是更麻烦且需要手续：

| 对比项 | Let's Encrypt | Cloudflare Origin Certificate |
|--------|--------------|------------------------------|
| 费用 | 免费 | 免费 |
| 有效期 | 90 天（自动续期） | 15 年 |
| 上传限制 | 无 | 100MB（免费计划） |
| 需开放端口 | 80 + 443 | 仅 443 |
| DDoS 防护 | 无 | 有（Cloudflare 边缘） |
| 配置难度 | 低（全自动） | 中（手动复制证书） |
| 适合场景 | 需要大文件上传、直连源站 | 需要边缘防护、文件较小 |

> [!TIP]
> 对于有文件上传需求、简单配置服务器的场景，`Let's Encrypt` 更合适。

---

## 懒人总结

> [!IMPORTANT]
> 噢不不不，干这个活一点也不懒人，请自己对着文章慢慢操作。

---

## 适用场景

**适用：**
- 在 Linux 服务器上的部署站点
- 使用 Nginx 作为 Web 服务器或反向代理
- 服务器有公网 IP，且域名 DNS 直接解析到该 IP

**前提条件：**
- 拥有服务器权限（root 或 sudo 权限）
- 拥有域名并能管理其 DNS 记录
- 服务器或云安全组 80/443 端口能对公网开放