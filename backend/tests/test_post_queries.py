"""Exercise the public query on both SQLite and an isolated PostgreSQL schema."""

import os
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models import Category, Post, PostTag, Tag, User


@pytest_asyncio.fixture(params=["sqlite", "postgresql"])
async def query_client(request, tmp_path):
    schema = None
    control = None
    if request.param == "postgresql":
        url = os.environ.get("TEST_POSTGRES_URL")
        if not url:
            pytest.skip("TEST_POSTGRES_URL must point to a disposable test database")
        schema = f"query_test_{uuid4().hex}"
        control = create_async_engine(url)
        async with control.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_async_engine(
            url, connect_args={"server_settings": {"search_path": schema}}
        )
    else:
        engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'queries.sqlite3'}")
    previous_overrides = app.dependency_overrides.copy()
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            user = User(email="query@example.com", password_hash="unused", display_name="测试")
            category = Category(name="通信笔记", slug="notes")
            tags = [Tag(name="TCP", slug="tcp"), Tag(name="TCP 实验", slug="tcp-lab")]
            session.add_all([user, category, *tags])
            await session.flush()
            now = datetime.now(UTC)
            rows = [
                (1, "TCP 笔记 A", "模拟说明", "published", now, None),
                (2, "TCP 笔记 B", "模拟说明", "published", now, None),
                (3, "解析实验", "TCP 增量解析", "published", now, None),
                (4, "标签匹配", "模拟说明", "published", now, None),
                (5, "TCP 草稿", "模拟说明", "draft", now, None),
                (6, "TCP 定时发布", "模拟说明", "published", now + timedelta(days=1), None),
                (7, "TCP 已删除", "模拟说明", "published", now, now),
            ]
            for number, title, summary, status, published, deleted in rows:
                session.add(Post(
                    id=UUID(int=number), title=title, slug=f"query-{number}", summary=summary,
                    content_md="# 模拟内容", status=status, author_id=user.id,
                    category_id=category.id, published_at=published, deleted_at=deleted,
                    confidentiality_checked=True,
                ))
            await session.flush()
            for number in range(1, 8):
                for tag in tags:
                    session.add(PostTag(post_id=UUID(int=number), tag_id=tag.id))
            await session.commit()

        async def override_session():
            async with factory() as session:
                yield session

        app.dependency_overrides[get_session] = override_session
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://testserver",
        ) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
        await engine.dispose()
        if control is not None:
            # Only the unique schema created above is removed, never public data.
            async with control.begin() as connection:
                await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            await control.dispose()


async def test_public_keyword_queries_rank_filter_and_paginate(query_client):
    async def query(**params):
        response = await query_client.get("/api/v1/posts", params=params)
        assert response.status_code == 200, response.text
        return response.json()

    for keyword in ["TCP", "tcp", " TCP "]:
        body = await query(q=keyword)
        assert [item["slug"] for item in body["data"]] == [
            "query-1", "query-2", "query-3", "query-4",
        ]
        assert body["meta"]["total"] == 4
    chinese = await query(q="笔记")
    assert chinese["meta"]["total"] == 4  # Title plus category matches.
    assert [item["slug"] for item in chinese["data"]][:2] == ["query-1", "query-2"]
    for params in [
        {"category": "notes"}, {"tag": "tcp"}, {"category": "notes", "tag": "tcp"},
    ]:
        pages = [await query(q="TCP", page=page, page_size=2, **params) for page in [1, 2]]
        assert all(page["meta"]["total"] == 4 for page in pages)
        assert [item["slug"] for page in pages for item in page["data"]] == [
            "query-1", "query-2", "query-3", "query-4",
        ]
    for params in [{"q": "无匹配结果"}, {"q": "TCP", "category": "missing"}]:
        empty = await query(**params)
        assert empty["data"] == []
        assert empty["meta"]["total"] == 0
    beyond = await query(q="TCP", page=3, page_size=2)
    assert beyond["data"] == []
    assert beyond["meta"]["total"] == 4
    assert (await query(q="   "))["meta"]["total"] == 4
