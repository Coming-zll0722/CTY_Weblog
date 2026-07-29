# 边界工程志

面向长期维护的个人技术博客、工程实践档案和内容管理系统。内容聚焦嵌入式通信、测试自动化、软件工具、数字系统、AI 辅助工程与部署实践。

## 当前能力

- React 19、TypeScript、Vinext/Vite 服务端渲染前台。
- 首页、文章、分类、标签、搜索、项目、技术栈、时间线、关于、联系、404、500、RSS、Sitemap 和 robots。
- 数据库 Markdown 内容，支持 GFM、Prism 常用语言代码高亮与复制、KaTeX、Mermaid、自动目录、阅读进度和图片放大。
- FastAPI、SQLAlchemy 2、Pydantic 2、Alembic 和 PostgreSQL。
- 管理员登录、HttpOnly Cookie、CSRF、角色验证、登录限制和修改密码。
- 文章/项目 CRUD、草稿、发布保密检查、软删除、恢复、乐观锁和 slug 301 记录。
- 分类、标签、时间线、友情链接、媒体、设置、操作日志、匿名访问统计和 PostgreSQL 备份 API。
- 网站/SEO 设置由数据库驱动页眉、页脚、联系入口和全局元数据；公开接口仅返回固定白名单字段。
- Windows 本地开发，以及 Linux、Docker Compose、Nginx、HTTPS 的生产配置。

完整审计见 [docs/AUDIT_2026-07-24.md](docs/AUDIT_2026-07-24.md)，本轮验收证据见 [docs/ACCEPTANCE_2026-07-28.md](docs/ACCEPTANCE_2026-07-28.md)。

## 目录

```text
app/                  公开页面、管理入口、RSS、Sitemap
components/           UI、Markdown、搜索和管理工作台
lib/                  前端 API 与 Markdown 辅助
backend/app/
  api/                路由和权限依赖
  core/               配置、安全、错误
  db/                 数据库会话与基类
  models/             SQLAlchemy 模型
  repositories/       数据访问
  schemas/            Pydantic 输入输出
  services/           认证、媒体与备份服务
backend/alembic/      PostgreSQL 迁移
deploy/               开发/生产 Compose、Dockerfile、Nginx
docs/                 架构、安全、部署和内容规范
```

## Windows 本地开发

要求：Node.js 22.13+、Python 3.12、Docker Desktop（仅用于 PostgreSQL）。

### 1. 启动 PostgreSQL

```powershell
docker compose -f deploy/compose.dev.yml up -d
```

### 2. 启动后端

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --require-hashes -r requirements-dev.lock
python -m pip install --no-deps -e .
Copy-Item .env.example .env
alembic upgrade head
engineering-notes seed
uvicorn app.main:app --reload --port 8000
```

首次运行前编辑 `backend/.env`：

- `DATABASE_URL=postgresql+asyncpg://engineering_notes:development-only-password@localhost:5432/engineering_notes`
- 用本地随机值替换 `SECRET_KEY`。
- 用本地管理员邮箱和至少 12 位密码替换 `INITIAL_ADMIN_EMAIL`、`INITIAL_ADMIN_PASSWORD`。

`engineering-notes seed` 可重复运行，不会重复创建示例内容。接口文档位于 `http://localhost:8000/docs`。
种子命令也会创建可在后台“设置与运维”中修改的站点名称、作者、SEO 描述、关键词、邮箱和 GitHub 等公开默认值。

### 3. 启动前端

在新的 PowerShell 窗口：

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

访问 `http://localhost:3000`，管理入口为 `http://localhost:3000/admin`。

如果 PowerShell 禁止执行 `npm.ps1`，使用 `npm.cmd` 运行相同命令，或按组织策略调整当前用户的脚本执行权限。

## 测试与质量检查

```powershell
npm ci
npm run lint
npm run typecheck
npm test

cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe tests\run_full_stack_smoke.py
.\.venv\Scripts\python.exe tests\run_postgres_migration_smoke.py
```

`npm test` 会先执行严格 TypeScript 检查，再构建 Vinext Worker，并执行服务端渲染、RSS、Markdown 安全、构建预算和浏览器组件测试。后端 API、生产配置与部署配置测试使用独立 SQLite 数据库；正式迁移仍以 PostgreSQL 为权威目标。

`backend/requirements.lock` 和 `backend/requirements-dev.lock` 由 Python 3.12 的
`pip-tools` 生成，固定直接及传递依赖并校验包哈希。更新依赖时执行：

```powershell
cd backend
.\.venv\Scripts\python.exe -m piptools compile --generate-hashes --strip-extras --output-file=requirements.lock pyproject.toml
.\.venv\Scripts\python.exe -m piptools compile --generate-hashes --strip-extras --allow-unsafe --extra=dev --output-file=requirements-dev.lock pyproject.toml
```

跨栈烟雾测试命令会在系统临时目录创建隔离数据库、仅在 `127.0.0.1:8765` 启动短时 FastAPI 服务，并验证真实 API 内容进入 React SSR；退出时停止服务并清理临时目录。

PostgreSQL 迁移烟雾测试需要本机 `initdb`、`pg_ctl`、`createdb`、`psql`、`pg_dump` 和 `pg_restore`；找不到时可设置 `POSTGRES_BIN`。它创建隔离临时集群并迁移到最新版本，再将自定义格式备份恢复到第二个隔离数据库并核对 Alembic 版本，不连接现有数据库。

## Docker 集成与生产部署

开发数据库配置：

```bash
docker compose -f deploy/compose.dev.yml config
```

生产配置：

```bash
cd deploy
cp .env.production.example .env.production
# 编辑所有占位值，并准备 certs/fullchain.pem 与 certs/privkey.pem
docker compose --env-file .env.production -f compose.prod.yml config
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.prod.yml up -d
```

推荐由宿主机 Nginx 暴露 80/443；前端和 FastAPI 仅绑定回环地址，PostgreSQL 只位于内部网络。可选的容器 Nginx profile 用于完整路由验证。启动顺序为 PostgreSQL 健康检查、Alembic 迁移、API、前端、Nginx。

正式环境不使用 Cloudflare。DNS、Let's Encrypt、日志、备份、隔离恢复和不降级数据库的镜像回滚步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 配置与安全

- 不提交 `.env`、真实密钥、数据库文件、上传文件、证书或备份。
- 管理会话使用短期 HttpOnly Cookie；写请求校验 CSRF。
- 发布文章前必须勾选保密检查，工作案例必须使用脱敏、模拟或重绘资料。
- 图片会校验扩展名、MIME、文件头、大小和尺寸，并使用随机存储名。
- 本地/Docker Volume 存储通过 `MediaStorage` 边界实现，当前生产环境只使用持久化 Docker Volume。
- 数据库备份使用 `pg_dump` 自定义格式并记录 SHA-256；恢复仅允许超级管理员并要求精确确认短语。

详细清单见 [docs/SECURITY.md](docs/SECURITY.md)。

## 数据源与历史托管元数据

正式业务数据只有一套：FastAPI → SQLAlchemy → PostgreSQL。前端的
`data/profile.ts` 仅保存非敏感的个人展示文案，不是内容数据库。旧模板中的
Drizzle、D1 示例和绑定已删除，不参与构建或运行。

`.openai/hosting.json` 是既有 Sites 项目的历史托管元数据，为避免破坏关联而保留，
但不属于 `devlelin.xyz` 的生产部署，也不承载文章、项目或管理数据。正式系统部署
在 `/opt/engineering-notes`，由宿主机 Nginx 和 Let's Encrypt 提供 HTTPS。
