# Linux 部署、Cloudflare 与备份

## 1. 推荐环境

- Ubuntu 24.04 LTS
- 2 vCPU / 4 GB 内存起步
- PostgreSQL 16
- Docker Engine 与 Compose v2
- Nginx 1.24+
- Cloudflare DNS / CDN / WAF

低流量个人站点可先不部署 Redis。数据库和上传目录必须位于持久化卷。

## 2. 发布步骤

1. 准备域名和服务器，创建仅用于部署的低权限用户。
2. 复制 `.env.example` 为生产环境文件，生成至少 32 字节随机密钥。
3. 把 `example.com`、示例邮箱和昵称替换为真实值。
4. 构建并启动容器：`docker compose -f deploy/docker-compose.yml up -d --build`。
5. 执行迁移：`docker compose -f deploy/docker-compose.yml exec api alembic upgrade head`。
6. 将 `deploy/nginx.conf` 安装到 Nginx 站点配置并完成证书签发。
7. 检查首页、文章、项目、404、RSS、Sitemap、登录限流、上传限制和备份。

## 3. Cloudflare 建议

- DNS 记录开启代理，SSL 模式使用 `Full (strict)`。
- 开启 Always Use HTTPS、HTTP/3、Brotli 和自动压缩。
- `/assets/*` 缓存一年；HTML 尊重源站 Cache-Control；`/api/admin/*` 和登录接口绕过缓存。
- 配置 WAF 托管规则和 Bot Fight Mode；对 `/api/v1/auth/login` 建立速率限制。
- 不开启会改写 JavaScript 的旧式优化；发布后用真实设备验证页面。
- 配置主域名跳转与 HSTS，确认全部子域已支持 HTTPS 后再启用 includeSubDomains。

## 4. 日志与监控

- Nginx 访问日志按天轮转，保留 14 天。
- FastAPI JSON 日志保留 30 天，错误日志可推送到 Sentry 或 OpenTelemetry 后端。
- 监控首页、`/api/v1/health`、数据库连接、磁盘、证书到期和备份任务。
- 告警不包含 Token、Cookie、Markdown 正文或用户原始输入。

## 5. 备份与恢复

- 每日：`pg_dump --format=custom`，保留 14 份。
- 每周：数据库与媒体清单完整备份，保留 8 份。
- 每月：加密异地备份，保留 12 份。
- 媒体对象开启版本控制或生命周期策略；数据库备份与对象清单使用相同时间点标签。
- 每季度进行一次恢复演练，记录 RPO、RTO 和校验结果。

恢复流程：

1. 进入维护模式，停止写入；
2. 校验备份哈希并恢复到新数据库，不覆盖当前库；
3. 执行迁移兼容性检查和抽样数据校验；
4. 切换连接、执行烟雾测试；
5. 保留旧数据库，确认稳定后再按策略销毁。

## 6. 发布验证

- 公开页面状态码与 Canonical 正确；
- 管理页面未登录返回 401/重定向；
- HTTPS、CSP、HSTS、X-Content-Type-Options 和 Referrer-Policy 正确；
- 404 不返回 200；
- robots、sitemap 和 RSS 可访问；
- 数据库迁移为最新；
- 备份任务成功且可读取；
- 移动端导航、搜索和深浅色正常；
- Lighthouse 四项达到目标或记录例外。
