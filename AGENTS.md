# Repository Guidelines

## Project Structure & Module Organization

This repository combines a Vinext/Next.js frontend with FastAPI.

- `app/` contains routed pages, metadata endpoints, and the admin entry.
- `components/` holds reusable React UI, including `components/admin/`.
- `lib/` and `data/` contain frontend helpers and profile data.
- `backend/app/` is organized by responsibility: `api/`, `core/`, `db/`, `models/`, `repositories/`, `schemas/`, and `services/`.
- `backend/alembic/` contains PostgreSQL migrations.
- Frontend tests live in `tests/`; backend tests live in `backend/tests/`.
- Static assets belong in `public/`, deployment files in `deploy/`, and technical documentation in `docs/`.

Use the `@/` alias for imports rooted at the frontend repository root.

## Build, Test, and Development Commands

Use Node.js 22.13+, Python 3.12, and PostgreSQL 16.

- `npm ci` installs the locked frontend dependencies.
- `npm run dev` starts the frontend locally.
- `npm run build` creates the production build.
- `npm run lint` runs the Next.js ESLint rules.
- `npm run typecheck` performs strict TypeScript checking.
- `npm test` runs type checks, a production build, render/bundle tests, and Vitest.
- `docker compose -f deploy/compose.dev.yml up -d` starts PostgreSQL.
- From `backend/`, `python -m pip install -e ".[dev]"` installs API tooling.
- From `backend/`, `uvicorn app.main:app --reload --port 8000` runs the API.
- From `backend/`, `python -m pytest` and `python -m ruff check app tests` validate backend changes.

## Coding Style & Naming Conventions

TypeScript is strict. Use two-space indentation, double quotes, and semicolons. Name React components and files in PascalCase (`MarkdownContent.tsx`); use camelCase for functions and variables. Python uses four spaces, type annotations, snake_case modules/functions, PascalCase classes, and Ruff's 100-character line limit. Keep API routes thin; place persistence and business logic in repositories and services.

## Testing Guidelines

Use Vitest with Testing Library for `*.test.ts`/`*.test.tsx`, Node's runner for `*.test.mjs`, and pytest for `backend/tests/test_*.py`. Add regression tests to the relevant suite. There is no fixed coverage threshold; cover changed behavior, error paths, authorization, and rendered output. Run focused tests during development and all checks before submission.

## Commit & Pull Request Guidelines

History uses concise, imperative subjects (for example, `Build professional engineering notes site`). Keep commits focused. Pull requests should explain the change and validation, link issues, call out migrations or configuration changes, and include screenshots for UI work.

## Security & Configuration

Copy `.env.example` files locally; never commit secrets, uploads, backups, certificates, or real user data. Review `docs/SECURITY.md` before changing authentication, publishing, media handling, or backup behavior.

---

# 仓库指南

## 项目结构与模块组织

本仓库由 Vinext/Next.js 前端和 FastAPI 后端组成。

- `app/` 包含路由页面、元数据端点和管理入口。
- `components/` 存放可复用的 React UI，包括 `components/admin/`。
- `lib/` 和 `data/` 存放前端辅助代码与个人资料数据。
- `backend/app/` 按职责划分为 `api/`、`core/`、`db/`、`models/`、`repositories/`、`schemas/` 和 `services/`。
- `backend/alembic/` 包含 PostgreSQL 数据库迁移。
- 前端测试位于 `tests/`，后端测试位于 `backend/tests/`。
- 静态资源、部署文件和技术文档分别位于 `public/`、`deploy/` 和 `docs/`。

从前端仓库根目录导入模块时，请使用 `@/` 别名。

## 构建、测试与开发命令

请使用 Node.js 22.13+、Python 3.12 和 PostgreSQL 16。

- `npm ci`：按照锁定文件安装前端依赖。
- `npm run dev`：在本地启动前端。
- `npm run build`：创建生产构建。
- `npm run lint`：运行 Next.js ESLint 规则。
- `npm run typecheck`：执行严格的 TypeScript 类型检查。
- `npm test`：依次运行类型检查、生产构建、渲染/包体积测试和 Vitest。
- `docker compose -f deploy/compose.dev.yml up -d`：启动 PostgreSQL。
- 在 `backend/` 中运行 `python -m pip install -e ".[dev]"`：安装 API 开发工具。
- 在 `backend/` 中运行 `uvicorn app.main:app --reload --port 8000`：启动 API。
- 在 `backend/` 中运行 `python -m pytest` 和 `python -m ruff check app tests`：检查后端改动。

## 编码风格与命名约定

TypeScript 启用严格模式。使用两个空格缩进、双引号和分号。React 组件及其文件使用 PascalCase（如 `MarkdownContent.tsx`），函数和变量使用 camelCase。Python 使用四个空格缩进和类型注解；模块及函数使用 snake_case，类使用 PascalCase，并遵守 Ruff 的 100 字符行宽限制。API 路由应保持精简，持久化与业务逻辑应放入 repositories 和 services。

## 测试指南

`*.test.ts`/`*.test.tsx` 使用 Vitest 和 Testing Library，`*.test.mjs` 使用 Node 测试运行器，`backend/tests/test_*.py` 使用 pytest。回归测试应加入对应测试套件。目前没有固定的覆盖率门槛，但应覆盖改动行为、错误路径、权限控制和渲染输出。开发时运行针对性测试，提交前运行全部检查。

## 提交与拉取请求指南

历史提交使用简洁的祈使句主题，例如 `Build professional engineering notes site`。每次提交应聚焦单一改动。拉取请求应说明改动内容和验证方式、关联相关问题、指出数据库迁移或配置变更，并为 UI 改动附上截图。

## 安全与配置

请在本地复制 `.env.example`，切勿提交密钥、上传文件、备份、证书或真实用户数据。修改身份验证、内容发布、媒体处理或备份行为前，请阅读 `docs/SECURITY.md`。
