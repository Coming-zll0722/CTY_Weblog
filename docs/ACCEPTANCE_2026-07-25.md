# 需求—证据验收矩阵（2026-07-25）

本文记录本轮实现完成后的可复现证据。状态分为：

- **通过**：已由实际运行的测试、构建或集成烟雾测试验证。
- **静态通过**：配置与约束已由解析测试验证，但当前主机缺少对应运行时。
- **待 Docker 复验**：只有容器运行时能够完成的最终集成项。

## 1. 范围与技术路线

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| 保留 React、TypeScript、Vinext/Vite 与 SSR | 通过 | `package.json`、`vite.config.ts`；`npm test` 的服务端渲染测试与 `npm run build` |
| FastAPI、SQLAlchemy 2、Pydantic 2、Alembic、PostgreSQL | 通过 | `backend/pyproject.toml`、`backend/app/`、`backend/alembic/`；真实 PostgreSQL 迁移烟雾测试 |
| 不再以 `data/site.ts` 提供生产内容 | 通过 | 原文件已删除；`lib/api.ts` 与所有公开内容页从 FastAPI 读取 |
| 保留 Git 与 Sites 配置，不推送、不部署 | 通过 | `.openai/hosting.json` 无差异；本轮没有 commit、push 或部署操作 |

## 2. 公开页面与内容体验

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| 首页 | 通过 | `app/page.tsx`；SSR 测试验证简介、方向、技能、项目、学习内容与联系入口 |
| 文章列表与详情 | 通过 | `app/articles/`；API 分页、分类、标签及详情 SSR |
| 分类与分类详情 | 通过 | `app/categories/` |
| 标签与标签详情 | 通过 | `app/tags/` |
| 搜索 | 通过 | `app/search/page.tsx`、`components/SearchClient.tsx`；组件与 API 测试 |
| 项目列表与详情 | 通过 | `app/projects/`；结构化字段、截图、关联文章及外部链接 |
| 技术栈、时间线、关于与联系模块 | 通过 | `app/stack/`、`app/timeline/`、`app/about/`、`components/SiteFrame.tsx` |
| 404 与服务器错误页 | 通过 | `app/not-found.tsx`、`app/error.tsx` |
| RSS、Sitemap、robots.txt | 通过 | `app/rss.xml/route.ts`、`app/sitemap.ts`、`app/robots.ts`；SSR/RSS 测试 |
| 响应式与深浅色模式 | 通过 | `app/globals.css`、`components/SiteFrame.tsx`；浏览器组件测试 |

## 3. 文章、Markdown 与 SEO

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| Markdown 原文、草稿/发布/归档、分类、标签、封面与 SEO 字段 | 通过 | `Post` 模型、Pydantic schema、迁移、内容 API 与管理表单 |
| GFM、Prism、KaTeX、Mermaid、代码复制、图片灯箱 | 通过 | `components/MarkdownContent.tsx`、`MermaidBlock.tsx`、`CopyableCode.tsx`、`ZoomableImage.tsx`；SSR 与组件测试 |
| Markdown XSS 防护 | 通过 | `rehype-sanitize`；SSR 测试验证脚本及可执行 HTML 不进入输出 |
| 目录、阅读进度与阅读时间 | 通过 | `lib/markdown.ts`、`ReadingProgress.tsx`、文章详情 |
| 上一篇、下一篇、相关文章与永久链接 | 通过 | 文章详情页及公开内容 API |
| 发布前保密检查 | 通过 | 仓储层强制检查，API 测试覆盖拒绝与成功发布 |
| 乐观锁、软删除/恢复、slug 301 记录 | 通过 | 内容仓储、`redirects` 表与 API 测试 |
| 动态 metadata、canonical、Open Graph、JSON-LD | 通过 | 根布局、文章/项目详情与站点设置 API；SSR 测试 |
| 首屏包体与重型模块按需加载 | 通过 | 2 项包体预算测试；共享首屏图谱不含管理台、Markdown 与 Mermaid，Markdown 动态块约 163 KB gzip |

## 4. 项目与管理后台

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| 项目全部指定字段 | 通过 | `Project` 模型和 schema 包含背景、问题、职责、架构、功能、难点、方案、成果、计划、链接、状态、时间、封面、截图、排序、精选与保密说明；标签作为技术栈 |
| 项目—文章、项目—标签、项目—媒体关联 | 通过 | `project_posts`、`project_tags`、`project_media` 迁移、仓储与 API 测试 |
| 登录、退出、当前用户、修改密码 | 通过 | 认证 API、管理 UI 与后端测试 |
| 文章 CRUD、发布、恢复、实时预览与草稿自动保存 | 通过 | `components/admin/ContentManagers.tsx` 与内容 API |
| 项目、分类、标签、时间线、媒体、链接、设置与 SEO 管理 | 通过 | `components/admin/`、管理 API 与 API/组件测试 |
| 操作日志、匿名统计、备份记录与恢复保护 | 通过 | 管理 API、服务与测试；恢复限超级管理员且要求精确确认短语 |
| 管理 UI 避免超大单组件 | 通过 | 管理台拆分为壳层、内容、管理、运维及共享模块 |

## 5. 后端、数据库与安全

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| 指定 17 类数据库实体 | 通过 | `backend/app/models/entities.py` 包含 users、posts、categories、tags、post_tags、projects、project_tags、project_posts、timelines、media_files、site_settings、links、operation_logs、comments、page_views、redirects、backups；另含 project_media |
| UUID、UTC 时间、创建/更新时间、软删除、唯一约束、外键与索引 | 通过 | 基类、模型与 3 个 Alembic 版本；真实 PostgreSQL 迁移通过 |
| 分页、避免 N+1、数据库健康检查 | 通过 | 仓储批量关联查询、分页 API、`SELECT 1` 健康检查及测试 |
| 标题/摘要/标签/分类/项目搜索、分页、排序、高亮与无结果建议 | 通过 | 独立搜索服务、`ILIKE`/`pg_trgm` 索引、搜索 UI 与测试 |
| Argon2id、HttpOnly/Secure/SameSite Cookie、CSRF | 通过 | 安全与认证模块、生产配置验证及 API 测试 |
| 登录失败限制、服务端角色鉴权、不记录秘密、不用 localStorage 保存长期令牌 | 通过 | 认证依赖、中间件、管理 UI 与测试 |
| 统一响应、错误码、请求 ID、结构化日志 | 通过 | common schema、全局异常处理和请求上下文中间件 |
| Python 生产代码完整类型注解 | 通过 | AST 审计无缺失；Ruff 通过 |
| 核心接口无 501 占位 | 通过 | 生产源码扫描无 501/TODO/FIXME/NotImplemented；审计文档中仅保留修改前历史记录 |

## 6. 媒体、备份与恢复

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| 大小、扩展名、MIME、文件头与真实图片解析 | 通过 | `backend/app/services/media.py`；合法、超限、伪装可执行文件测试 |
| 随机文件名、路径穿越防护、尺寸/校验和/替代文本 | 通过 | `backend/app/services/storage.py`、媒体模型与测试 |
| JPEG、PNG、WebP、AVIF 与对象存储边界 | 通过 | 媒体服务和 `MediaStorage` 协议；本地卷实现可替换为 S3/R2 |
| PostgreSQL 自定义格式备份与恢复 | 通过 | 备份服务和 API 保护测试；隔离 PostgreSQL 上实际执行 `pg_dump`、`pg_restore` 并核对 Alembic 版本 |
| 上传与备份不进入 Git | 通过 | `.gitignore`、`.dockerignore`；运行时目录未被跟踪 |

## 7. 本地开发与生产部署

| 要求 | 状态 | 证据 |
| --- | --- | --- |
| Windows 前后端开发步骤 | 通过 | `README.md` 可复制的 PowerShell 步骤与示例环境文件 |
| 开发/生产 Compose、环境示例与持久卷 | 静态通过 | `deploy/compose.dev.yml`、`compose.prod.yml`、环境示例；YAML 解析测试 |
| 多阶段前端镜像与非 root API/前端镜像 | 静态通过 | 两个 Dockerfile；部署约束测试 |
| 健康检查、启动顺序、迁移、重启与日志限制 | 静态通过 | 生产 Compose；部署约束测试 |
| Nginx 路由、HTTPS、Cloudflare Full (strict)、缓存、gzip 与安全头 | 静态通过 | `deploy/nginx*.conf`、`docs/DEPLOYMENT.md`；部署约束测试 |
| 日志轮转、备份/恢复、发布后检查与回滚 | 静态通过 | `deploy/logrotate-engineering-notes` 与部署文档 |
| Compose config/build、容器 Nginx 路由与容器生产健康 | **待 Docker 复验** | 当前 Windows 主机没有 Docker、Podman、nerdctl 或可用 WSL 发行版；未伪造运行结果 |

## 8. 本机实际验收结果

| 命令或场景 | 结果 |
| --- | --- |
| `npm ci` | 通过，干净安装 828 个包 |
| `npm run lint` | 通过 |
| `npm test` | 通过：严格类型、生产构建、4 项 SSR、2 项包体预算、8 项组件测试 |
| `npm run build` | 通过 |
| `python -m pip install -e ".[dev]"` | 通过 |
| `python -m pytest -q` | 通过，26 项 |
| `python -m ruff check app tests` | 通过 |
| `python -m pip check` | 通过，无依赖冲突 |
| FastAPI → React SSR | 通过，真实 HTTP API 数据进入 Vinext 服务端渲染 |
| PostgreSQL `alembic upgrade head` | 通过，隔离 PostgreSQL 18 到 `20260724_03` |
| PostgreSQL 备份 → 第二数据库恢复 | 通过，实际 `pg_dump`/`pg_restore` 并核对版本 |
| `npm audit --omit=dev --registry=https://registry.npmjs.org` | 通过，0 个生产依赖漏洞 |
| Docker 三条最终验收命令 | 未运行：主机无容器运行时 |

## 9. 唯一剩余环境复验

在安装并启动 Docker 的机器上执行：

```bash
docker compose -f deploy/compose.dev.yml config

cd deploy
cp .env.production.example .env.production
# 将所有占位符改为本地临时值，并准备测试证书
docker compose --env-file .env.production -f compose.prod.yml config
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.prod.yml --profile container-nginx up -d
```

随后检查首页、`/api/v1/health`、`/api/` 反向代理、静态资源缓存和 HTTPS 安全响应头。该复验不需要也不应使用真实生产秘密。
