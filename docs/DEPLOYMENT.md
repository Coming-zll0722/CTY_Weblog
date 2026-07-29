# Ubuntu 24.04 生产部署、备份与回滚

正式环境为 `devlelin.xyz` → `111.229.86.99`，不使用 Cloudflare。应用目录固定为
`/opt/engineering-notes`。PostgreSQL 只加入 Docker 内部网络；FastAPI 和前端仅发布
到宿主机 `127.0.0.1`；只有宿主机 Nginx 监听公网 80/443。

## 1. 上线前置条件

1. 在 DNSPod 将根域名 A 记录指向 `111.229.86.99`，删除或停用当前 Cloudflare
   Anycast A/AAAA 记录。若需要 `www`，应先增加记录并同步调整 Nginx 和证书；当前
   配置只接受根域名。
2. 为部署人员配置 SSH 公钥登录。不要把私钥、密码或 Token 放进仓库。
3. 云防火墙和 UFW 只开放 SSH、80、443；不得开放 3000、5432、8000。
4. 确认 `/opt/engineering-notes` 的现有内容、Docker Volume 和最近备份。若已存在
   生产数据，不得重新初始化或删除 Volume。

推荐资源为 2 vCPU、4 GiB 内存和足够的独立备份空间。需要 Docker Engine 29、
Docker Compose Plugin、宿主机 Nginx、Certbot、Git 和 curl。

## 2. 首次安装

```bash
sudo install -d -m 0750 -o root -g root /opt/engineering-notes
sudo git clone <PRIVATE_REPOSITORY_URL> /opt/engineering-notes
cd /opt/engineering-notes/deploy
sudo cp .env.production.example .env
sudo chmod 600 .env
sudo editor .env
```

`.env` 只存在于服务器。必须替换数据库密码、应用密钥和管理员初始密码；正式地址
保持 `https://devlelin.xyz`，`API_ALLOWED_HOSTS` 必须保留内部服务名 `api`。可使用
以下方式在终端直接生成随机值，避免写入历史：

```bash
openssl rand -base64 48
```

首次构建并检查配置：

```bash
cd /opt/engineering-notes/deploy
docker compose config --quiet
docker compose build
docker compose up -d postgres migrate api web
docker compose ps
curl --fail http://127.0.0.1:8000/api/v1/health
curl --fail http://127.0.0.1:3000/
```

Compose 的依赖条件保证启动顺序为 PostgreSQL 健康 → Alembic 完成 → API 健康 →
前端健康。宿主机 Nginx启用后才对公网提供服务。

## 3. HTTPS 与 Nginx

确认 DNS 已从公网解析到本机后签发 Let's Encrypt 证书。首次签发时，如果 80 端口
已被 Nginx 占用且没有可用的 ACME 站点，短暂停止 Nginx：

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone \
  --domain devlelin.xyz \
  --email admin@lelin.dev \
  --agree-tos --no-eff-email
sudo systemctl start nginx
```

安装经过版本控制的站点和轮转规则：

```bash
cd /opt/engineering-notes/deploy
sudo cp nginx-host.conf /etc/nginx/sites-available/engineering-notes
sudo ln -sfn /etc/nginx/sites-available/engineering-notes \
  /etc/nginx/sites-enabled/engineering-notes
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp logrotate-engineering-notes /etc/logrotate.d/engineering-notes
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Nginx 配置完成 HTTPS 跳转、压缩、安全响应头、静态资源缓存和登录/访问统计限流。
访问日志只保留时间、请求 ID、方法、无查询字符串的路径、状态、字节数和耗时；
不记录 IP、Cookie、Token、Referer、User-Agent、正文或查询参数。

## 4. 初始化管理员

在服务器 `.env` 中设置一次性初始密码后执行：

```bash
cd /opt/engineering-notes/deploy
docker compose --profile tools run --rm init-admin
```

命令可重复执行且不会覆盖已存在用户。首次登录后立即修改密码；不要在终端输出、
聊天、文档或 Git 中记录密码。管理员邮箱默认由服务器环境设为 `admin@lelin.dev`。

## 5. 日常发布

先确认目录、数据库容器和持久卷状态：

```bash
cd /opt/engineering-notes
git status --short
cd deploy
docker compose ps
docker volume ls --filter name=engineering-notes
bash ./scripts/deploy.sh
```

`deploy.sh` 会在已有数据库上先生成自定义格式备份和 SHA-256，再构建镜像、运行迁移
并检查 API/前端健康。失败时只回退应用镜像，不降级迁移、不覆盖数据库文件。

查看服务和日志：

```bash
cd /opt/engineering-notes/deploy
docker compose ps
docker compose logs --since 30m --tail 200 api web migrate postgres
sudo journalctl -u nginx --since "30 minutes ago"
```

Compose 使用 `json-file` 轮转（每文件 10 MiB、保留 5 个），Nginx 日志每日轮转并
保留 14 期。排障输出不得复制包含凭据或个人信息的环境文件。

## 6. 备份与恢复演练

手工备份：

```bash
cd /opt/engineering-notes/deploy
bash ./scripts/backup.sh
```

备份保存在 `/opt/engineering-notes/var/backups`，权限为仅部署用户可读，并包含
`.sha256`。该目录必须按组织策略加密复制到异机或对象存储；Docker Volume 不是
异地备份。

先在临时、无网络、独立 Volume 的 PostgreSQL 容器验证恢复：

```bash
cd /opt/engineering-notes/deploy
bash ./scripts/restore-isolated.sh \
  /opt/engineering-notes/var/backups/engineering-notes-YYYYMMDDTHHMMSSZ.dump
```

脚本核验摘要、恢复 Alembic 版本和表数量，完成后只删除本次随机命名的临时容器与
临时 Volume。应用内恢复接口同样要求 `RESTORE_DATABASE_URL` 指向与生产库不同的
隔离数据库；禁止直接对生产数据库执行 `pg_restore --clean`。

真正的灾难恢复应在维护窗口中进行：停止写流量、再次备份当前库、创建新数据库或
新 Volume、完成隔离恢复及验收，再显式切换连接地址。不要原地覆盖生产库。

## 7. 应用回滚

发布脚本会输出 UTC 发布编号。只有相应的回滚镜像存在时才执行：

```bash
cd /opt/engineering-notes/deploy
bash ./scripts/rollback.sh YYYYMMDDTHHMMSSZ
```

回滚前仍会备份当前数据库；命令只切换 API/前端镜像，不恢复旧数据库、不执行
Alembic downgrade，也不触碰上传和备份 Volume。若新迁移与旧代码不向后兼容，
必须先制定前向修复迁移。

## 8. 上线验收

```bash
curl -I http://devlelin.xyz/
curl --fail https://devlelin.xyz/api/v1/health
curl --fail https://devlelin.xyz/robots.txt
curl --fail https://devlelin.xyz/sitemap.xml
curl --fail https://devlelin.xyz/rss.xml
curl -I https://devlelin.xyz/assets/
ss -lntp
docker compose ps
```

还需从公网访问首页、文章、项目、搜索和 `/admin`，检查 HTML canonical/SSR 内容、
TLS 证书、安全头、静态缓存；重启 API 后核验已上传文件；执行一次隔离恢复；最后
运行密钥扫描并确认 Git 不包含 `.env`、证书、上传、数据库或备份。
