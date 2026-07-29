import argparse
import asyncio
from datetime import UTC, date, datetime

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Category,
    Post,
    PostTag,
    Project,
    ProjectTag,
    SiteSetting,
    Tag,
    Timeline,
    User,
)
from app.repositories.management import PUBLIC_SETTING_DEFAULTS


async def create_admin() -> User:
    settings = get_settings()
    if not settings.initial_admin_email or not settings.initial_admin_password:
        raise SystemExit(
            "Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before creating the administrator."
        )
    if len(settings.initial_admin_password) < 12:
        raise SystemExit("INITIAL_ADMIN_PASSWORD must contain at least 12 characters.")
    async with SessionLocal() as session:
        user = await session.scalar(
            select(User).where(User.email == settings.initial_admin_email.lower())
        )
        if not user:
            user = User(
                email=settings.initial_admin_email.lower(),
                password_hash=hash_password(settings.initial_admin_password),
                display_name="站点管理员",
                role=settings.initial_admin_role,
                is_active=True,
            )
            session.add(user)
            await session.flush()
            await session.commit()
        return user


async def seed() -> None:
    await create_admin()
    settings = get_settings()
    async with SessionLocal() as session:
        user = await session.scalar(
            select(User).where(User.email == settings.initial_admin_email.lower())
        )
        if user is None:
            raise SystemExit("Administrator initialization did not complete.")
        category = await session.scalar(
            select(Category).where(Category.slug == "test-tools")
        )
        if not category:
            category = Category(
                name="测试工具开发",
                slug="test-tools",
                description="测试平台、自动化工具与工程化工作流。",
            )
            session.add(category)
        tags: dict[str, Tag] = {}
        for name, slug in (("Python", "python"), ("TCP", "tcp"), ("FastAPI", "fastapi")):
            tag = await session.scalar(select(Tag).where(Tag.slug == slug))
            if not tag:
                tag = Tag(name=name, slug=slug)
                session.add(tag)
            tags[slug] = tag
        await session.flush()
        existing_post = await session.scalar(
            select(Post).where(Post.slug == "tcp-udp-test-platform-design")
        )
        if not existing_post:
            existing_post = Post(
                title="从协议分析到自动化执行：网络测试工具的设计方法",
                slug="tcp-udp-test-platform-design",
                summary="拆解 TCP/UDP 测试工具如何组织连接、数据帧、断言、日志与报告。",
                content_md=(
                    "# 从协议分析到自动化执行\n\n"
                    "网络通信工具进入稳定测试流程后，需要同时处理会话隔离、"
                    "消息边界、异常复现和结果复核。\n\n"
                    "## 目标与边界\n\n"
                    "- 统一连接、发送、接收与关闭能力。\n"
                    "- 同时保存原始数据、解析结果和断言。\n"
                    "- 使用分层测试验证正常、超时、断连和校验错误。\n"
                ),
                status="published",
                author_id=user.id,
                category_id=category.id,
                confidentiality_checked=True,
                published_at=datetime.now(UTC),
            )
            session.add(existing_post)
            await session.flush()
        for slug in ("python", "tcp"):
            exists = await session.scalar(
                select(PostTag.post_id).where(
                    PostTag.post_id == existing_post.id,
                    PostTag.tag_id == tags[slug].id,
                )
            )
            if not exists:
                session.add(PostTag(post_id=existing_post.id, tag_id=tags[slug].id))
        existing_project = await session.scalar(
            select(Project).where(Project.slug == "protocol-test-platform")
        )
        if not existing_project:
            existing_project = Project(
                title="嵌入式通信协议自动化测试平台",
                slug="protocol-test-platform",
                summary="面向多类通信接口的可配置测试执行平台，统一用例、数据帧、设备适配、断言与报告。",
                content_md="# 嵌入式通信协议自动化测试平台",
                background_md="重复联调流程缺少统一执行入口和可追溯结果。",
                problem_md="不同协议和设备驱动的调用方式差异较大。",
                role_md="需求分析、架构设计、核心开发与测试验证。",
                architecture_md="交互层、应用层、领域层和基础设施层。",
                outcomes_md="建立统一执行模型。",
                confidentiality_note="示例使用模拟协议与脱敏数据。",
                status="active",
                is_public=True,
                owner_id=user.id,
                started_at=date(2025, 1, 1),
                confidentiality_checked=True,
                featured=True,
            )
            session.add(existing_project)
            await session.flush()
        for slug in ("python", "fastapi"):
            exists = await session.scalar(
                select(ProjectTag.project_id).where(
                    ProjectTag.project_id == existing_project.id,
                    ProjectTag.tag_id == tags[slug].id,
                )
            )
            if not exists:
                session.add(
                    ProjectTag(project_id=existing_project.id, tag_id=tags[slug].id)
                )
        if not await session.scalar(select(Timeline.id).limit(1)):
            session.add_all(
                [
                    Timeline(
                        event_date=date(2026, 7, 1),
                        title="系统化沉淀",
                        description="建立个人技术档案，研究 AI 辅助测试与 FPGA。",
                        event_type="growth",
                    ),
                    Timeline(
                        event_date=date(2025, 1, 1),
                        title="工具平台化",
                        description="将零散脚本组织为可配置、可追溯的通信测试工具。",
                        event_type="project",
                    ),
                ]
            )
        for key, value in PUBLIC_SETTING_DEFAULTS.items():
            if not await session.scalar(select(SiteSetting.id).where(SiteSetting.key == key)):
                session.add(
                    SiteSetting(
                        key=key,
                        value_json=value,
                        is_public=True,
                        updated_by=user.id,
                    )
                )
        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(prog="engineering-notes")
    parser.add_argument("command", choices=["create-admin", "seed"])
    args = parser.parse_args()
    if args.command == "create-admin":
        asyncio.run(create_admin())
    elif args.command == "seed":
        asyncio.run(seed())


if __name__ == "__main__":
    main()
