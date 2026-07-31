from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.content_library import LEGACY_PROTOCOL_PROJECT, seed_content_library
from app.db.base import Base
from app.models import Category, Post, Project, ProjectPost, Tag, Timeline, User


async def _database(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'content.sqlite3'}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return engine, session_factory


async def test_content_library_is_complete_and_idempotent(tmp_path) -> None:
    engine, session_factory = await _database(tmp_path)
    try:
        async with session_factory() as session:
            owner = User(
                email="content-owner@example.com",
                password_hash="unused-in-content-test",
                display_name="内容维护者",
                role="admin",
                is_active=True,
            )
            session.add(owner)
            await session.flush()

            first = await seed_content_library(session, owner.id)
            second = await seed_content_library(session, owner.id)

            assert first.categories_created == 5
            assert first.tags_created == 15
            assert first.posts_created == 12
            assert first.projects_created == 4
            assert first.timelines_created == 6
            assert second.categories_created == 0
            assert second.tags_created == 0
            assert second.posts_created == 0
            assert second.projects_created == 0
            assert second.projects_upgraded == 0
            assert second.timelines_created == 0

            assert await session.scalar(select(func.count(Category.id))) == 5
            assert await session.scalar(select(func.count(Tag.id))) == 15
            assert await session.scalar(select(func.count(Post.id))) == 12
            assert await session.scalar(select(func.count(Project.id))) == 4
            assert await session.scalar(select(func.count(Timeline.id))) == 6
            assert (
                await session.scalar(
                    select(func.count(Post.id)).where(Post.status == "published")
                )
                == 4
            )
            assert (
                await session.scalar(
                    select(func.count(Project.id)).where(Project.is_public.is_(True))
                )
                == 4
            )

            cty_log = await session.scalar(
                select(Project).where(Project.slug == "cty-log-technical-archive")
            )
            assert cty_log is not None
            assert (
                await session.scalar(
                    select(func.count(ProjectPost.post_id)).where(
                        ProjectPost.project_id == cty_log.id
                    )
                )
                == 3
            )
    finally:
        await engine.dispose()


async def test_content_library_upgrades_only_the_known_legacy_project(tmp_path) -> None:
    engine, session_factory = await _database(tmp_path)
    try:
        async with session_factory() as session:
            owner = User(
                email="legacy-owner@example.com",
                password_hash="unused-in-content-test",
                display_name="内容维护者",
                role="admin",
                is_active=True,
            )
            session.add(owner)
            await session.flush()
            legacy = Project(
                title="嵌入式通信协议自动化测试平台",
                slug="protocol-test-platform",
                status="active",
                owner_id=owner.id,
                started_at=date(2025, 1, 1),
                is_public=True,
                confidentiality_checked=True,
                featured=True,
                **LEGACY_PROTOCOL_PROJECT,
            )
            custom_post = Post(
                title="用户已经修改的标题",
                slug="tcp-message-boundaries",
                summary="这段摘要由用户维护，内容导入不能覆盖它。",
                content_md="# 用户内容",
                status="draft",
                author_id=owner.id,
            )
            session.add_all([legacy, custom_post])
            await session.commit()

            result = await seed_content_library(session, owner.id)
            await session.refresh(legacy)
            await session.refresh(custom_post)

            assert result.projects_created == 3
            assert result.projects_upgraded == 1
            assert legacy.status == "持续迭代"
            assert "Execution engine" in legacy.architecture_md
            assert custom_post.title == "用户已经修改的标题"
            assert custom_post.content_md == "# 用户内容"
    finally:
        await engine.dispose()
