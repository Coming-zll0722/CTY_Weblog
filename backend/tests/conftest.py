from datetime import UTC, datetime

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models import Post, Project, User
from app.services.auth import _attempts


@pytest_asyncio.fixture
async def client(tmp_path):
    _attempts.clear()
    get_settings().upload_root = tmp_path / "uploads"
    get_settings().backup_root = tmp_path / "backups"
    database_path = tmp_path / "test.sqlite3"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with session_factory() as session:
        user = User(
            email="admin@example.com",
            password_hash=hash_password("correct-horse-battery-staple"),
            display_name="管理员",
            role="admin",
            is_active=True,
        )
        session.add(user)
        await session.flush()
        session.add_all(
            [
                Post(
                    title="已发布文章",
                    slug="published-post",
                    summary="这是一篇用于接口测试的已发布文章摘要。",
                    content_md="# 已发布文章",
                    status="published",
                    author_id=user.id,
                    confidentiality_checked=True,
                    published_at=datetime.now(UTC),
                ),
                Post(
                    title="草稿文章",
                    slug="draft-post",
                    summary="这是一篇不应出现在公开列表中的草稿。",
                    content_md="# 草稿",
                    status="draft",
                    author_id=user.id,
                ),
                Project(
                    title="测试平台",
                    slug="test-platform",
                    summary="用于验证项目公开接口和统一搜索的工程项目。",
                    content_md="# 测试平台",
                    status="active",
                    is_public=True,
                    confidentiality_checked=True,
                    owner_id=user.id,
                ),
            ]
        )
        await session.commit()

    async def override_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.state.test_session_factory = session_factory
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()
    del app.state.test_session_factory
    await engine.dispose()
    _attempts.clear()


@pytest_asyncio.fixture
async def authenticated_client(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@example.com",
            "password": "correct-horse-battery-staple",
        },
    )
    assert response.status_code == 200
    csrf_token = response.json()["data"]["csrf_token"]
    return client, {"X-CSRF-Token": csrf_token}
