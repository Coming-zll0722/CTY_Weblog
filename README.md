# 林序 · 工程笔记

个人技术博客、工程项目展示平台与长期技术档案。网站聚焦嵌入式通信接口测试、自动化测试工具、软件架构、FPGA 学习与工程实践。

## 项目状态

当前仓库包含：

- 可部署的 React / TypeScript 前台：多页面、响应式、深浅色、文章、项目、技术栈、时间线、搜索、RSS、Sitemap 和 SEO 元数据。
- FastAPI 后端骨架：认证、文章、项目、分类、标签、时间线、搜索、上传、设置、统计与备份接口边界。
- PostgreSQL 数据模型与 Alembic 基线迁移。
- 前后端基础自动化测试。
- 完整的产品、架构、数据库、接口、部署、安全和运营文档。

管理后台的可视化编辑器、真实对象存储上传、全文搜索索引、评论审核与生产监控属于第二阶段；接口与数据结构已预留。

## 技术方案

前台使用 React 19、TypeScript、Vinext / Vite 和 CSS Design Tokens。公开内容由服务端生成，避免首屏加载大量 JavaScript，并保留良好的 SEO 能力。后端使用 Python 3.12、FastAPI、SQLAlchemy 2、Pydantic 2、Alembic 和 PostgreSQL。生产环境通过 Nginx 将 `/api` 转发到 FastAPI，静态与服务端页面由前台服务提供。

选择前后端分离，是为了让内容展示、后台写作和后续工具服务保持独立演进。当前 Sites 版本发布公开前台；自有 Linux 环境可按 `deploy/` 中的配置部署完整前后端。

## 本地开发

### 前台

要求 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

### 后端

要求 Python 3.12、PostgreSQL 16。

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Linux / macOS 激活命令为 `source .venv/bin/activate`。接口文档位于 `http://localhost:8000/docs`。

### 测试

```bash
npm test
cd backend
pytest
```

## 配置

前台公开配置通过部署环境设置。后端从 `backend/.env` 读取数据库、JWT、CORS、文件大小和日志配置。请复制 `.env.example`，不要提交真实密钥。

## 内容写作

文章元数据建议包含 `title`、`slug`、`summary`、`category`、`tags`、`published_at`、`updated_at`、`seo_title` 和 `seo_description`。正文使用 Markdown 存储，渲染前必须经过 HTML 白名单清洗。

推荐文章结构：

1. 问题背景
2. 目标与边界
3. 环境说明
4. 方案分析
5. 实现过程
6. 核心代码
7. 测试验证
8. 遇到的问题与解决方法
9. 最终结果
10. 总结与后续优化

## 部署

完整 Linux 部署步骤见 [部署文档](docs/DEPLOYMENT.md)，Nginx 示例见 `deploy/nginx.conf`，容器编排见 `deploy/docker-compose.yml`。

上线前必须替换示例域名、邮箱与昵称，并执行安全检查清单。

## 文档索引

- [需求与实施方案](docs/IMPLEMENTATION_PLAN.md)
- [系统、数据与接口设计](docs/ARCHITECTURE.md)
- [部署与备份](docs/DEPLOYMENT.md)
- [安全与保密清单](docs/SECURITY.md)
- [内容运营体系](docs/CONTENT_SYSTEM.md)

## 许可与保密

示例内容仅用于个人技术档案。工作相关内容应使用脱敏数据、模拟协议、虚构名称和重新绘制的图表，禁止发布客户信息、内部代码、真实测试数据、网络地址、账号、未授权截图或可反推出单位内部结构的信息。
