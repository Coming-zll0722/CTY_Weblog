# 验收记录（2026-07-28）

## 结论

应用代码、生产构建、真实 FastAPI → React SSR、从空 PostgreSQL 升级到最新迁移、
数据库备份和隔离恢复均已通过本机验收。生产 Compose、Nginx、CI 和运维脚本已按
Ubuntu 24.04 / Docker 29 目标完成，但本机没有 Docker CLI，生产服务器也未提供
可用 SSH 公钥认证，因此容器构建、真实 HTTPS 和公网隔离尚不能判定通过。

## 实际执行结果

| 验收项 | 结果 |
|---|---|
| `npm ci` | 通过；首次受 Windows 共享 npm 缓存 `EPERM` 影响失败，改用隔离临时缓存后原命令成功安装 816 个包 |
| `npm run lint` | 通过 |
| `npm run typecheck` | 通过 |
| `npm test` | 通过；6 项 Node SSR/安全/预算测试 + 8 项 Vitest 组件测试 |
| `python -m pytest` | 通过，31 项 |
| `python -m ruff check app tests` | 通过 |
| `python tests/run_full_stack_smoke.py` | 通过；真实 FastAPI、SQLite、Vinext build 和 `vinext start` |
| 空 PostgreSQL → Alembic head | 通过，到 `20260728_04` |
| `pg_dump` → 第二个隔离数据库 `pg_restore` | 通过，迁移版本与表结构已核对 |
| Python 生产锁 `--require-hashes --dry-run` | 通过 |
| `npm audit --omit=dev --audit-level=high` | 通过，0 个已知漏洞 |
| CI/Compose YAML 解析 | 通过 |
| Git diff 空白错误检查 | 通过 |
| 私钥、常见云密钥和被跟踪运行数据扫描 | 未发现 |
| `docker compose config/build/up/ps` | 未执行成功：当前 Windows 主机没有 Docker CLI |

## 功能证据

- 公开页面覆盖首页、文章、分类、标签、搜索、项目、技术栈、时间线、关于和联系。
- 跨栈烟雾测试实际访问首页、文章、项目、搜索、管理入口、robots、Sitemap 和 RSS。
- 首页 SSR HTML 包含真实 FastAPI 测试数据；SEO 端点只包含
  `https://devlelin.xyz`，不包含 localhost。
- Markdown 使用 GFM、代码高亮、KaTeX、Mermaid、目录、阅读时间、阅读进度和图片
  灯箱；渲染测试确认原始可执行 HTML 不进入输出。
- 管理接口和 UI 覆盖文章、项目、分类、标签、媒体、链接、时间线、设置、统计、
  操作日志、备份和密码修改。
- 文章和项目公开均要求保密确认；数据库约束阻止未确认项目公开。草稿、归档、
  软删除、恢复、乐观锁和 slug 重定向由 API 测试覆盖。
- JWT issuer/audience、Argon2id、HttpOnly/Secure Cookie、CSRF、角色鉴权、客户端与
  账号双维度登录限流、上传校验、Trusted Host 和脱敏日志已实现。
- 业务内容只有 FastAPI + SQLAlchemy + PostgreSQL 一套数据源；Drizzle/D1 模板代码
  已移除。`.openai/hosting.json` 仅作为既有 Sites 关联元数据保留。

## 部署配置证据

- PostgreSQL 无 `ports`，只位于内部网络；API 和 Web 只发布到
  `127.0.0.1:8000/3000`。
- PostgreSQL、API、Web 和可选容器 Nginx 均有健康检查、重启策略、日志轮转和资源
  上限；应用容器只读、非 root、移除 Linux capabilities。
- 启动依赖为 PostgreSQL 健康 → Alembic → API 健康 → Web 健康 → Nginx。
- 上传、数据库和应用备份使用独立持久卷。宿主发布脚本在更新前备份；失败只回滚
  API/Web 镜像，不降级数据库。
- Nginx 使用正式域名和 Let's Encrypt 路径，提供 HTTPS 跳转、压缩、安全响应头、
  静态资源缓存及登录/统计限流；访问日志不记录 IP、查询字符串、Cookie、Token、
  Referer、User-Agent 或正文。

## 当前生产阻塞

- `devlelin.xyz` 仍解析到 Cloudflare Anycast：`104.21.62.11`、
  `172.67.217.170`，没有指向 `111.229.86.99`；HTTPS 当前返回 Cloudflare 530。
- `www.devlelin.xyz` 没有 DNS 记录；当前配置只使用根域名。
- `root@111.229.86.99` 的非交互 SSH 登录返回
  `Permission denied (publickey,password)`。
- `111.229.86.99:80` 从验收主机不可达，需确认服务和云防火墙。

解决 DNS、SSH 和公网端口后，必须在服务器执行 Compose 构建/启动、Let's Encrypt
签发、上传重启持久性、隔离恢复及完整公网响应头复验，才能将生产验收标记为通过。
