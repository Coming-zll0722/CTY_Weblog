"""Run a real FastAPI -> React SSR smoke test with an isolated SQLite database."""

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import urlopen

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password
from app.db.base import Base
from app.models import Link, Post, Project, SiteSetting, User


async def initialize(database_url: str) -> None:
    engine = create_async_engine(database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        user = User(
            email="integration@example.com",
            password_hash=hash_password("integration-password-only"),
            display_name="集成测试",
            role="admin",
            is_active=True,
        )
        session.add(user)
        await session.flush()
        session.add(
            Post(
                title="跨栈集成文章",
                slug="full-stack-integration",
                summary="由真实 FastAPI 和临时数据库提供的跨栈集成验证内容。",
                content_md="# 跨栈集成",
                status="published",
                author_id=user.id,
                confidentiality_checked=True,
                published_at=datetime.now(UTC),
            )
        )
        session.add(
            Project(
                title="跨栈集成项目",
                slug="full-stack-project",
                summary="验证 React 服务端渲染可以读取真实 FastAPI 项目数据。",
                content_md="# 集成项目",
                status="active",
                owner_id=user.id,
                is_public=True,
                confidentiality_checked=True,
            )
        )
        session.add_all(
            [
                SiteSetting(
                    key="public.site_name",
                    value_json="跨栈集成工程笔记",
                    is_public=True,
                    updated_by=user.id,
                ),
                SiteSetting(
                    key="public.contact_email",
                    value_json="integration@example.com",
                    is_public=True,
                    updated_by=user.id,
                ),
                Link(
                    name="跨栈工程资料",
                    url="https://example.com/integration",
                    description="由真实 FastAPI 提供的友情链接。",
                    status="active",
                ),
            ]
        )
        await session.commit()
    await engine.dispose()


def wait_for_url(url: str, label: str) -> None:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.25)
    raise RuntimeError(f"{label} did not become healthy")


def stop_process(process: subprocess.Popen[bytes]) -> None:
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main() -> None:
    with tempfile.TemporaryDirectory(
        prefix="engineering-notes-integration-",
        ignore_cleanup_errors=True,
    ) as temporary:
        database_path = Path(temporary) / "integration.sqlite3"
        database_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
        asyncio.run(initialize(database_url))
        environment = os.environ.copy()
        environment.update(
            {
                "DATABASE_URL": database_url,
                "SECRET_KEY": "integration-only-secret-key-at-least-32-bytes",
                "API_BASE_URL": "http://127.0.0.1:8765/api/v1",
                "SITE_URL": "https://devlelin.xyz",
            }
        )
        hidden = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        server = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8765",
            ],
            cwd=BACKEND_ROOT,
            env=environment,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=hidden,
        )
        frontend: subprocess.Popen[bytes] | None = None
        try:
            wait_for_url("http://127.0.0.1:8765/api/v1/health", "temporary FastAPI server")
            npm = "npm.cmd" if os.name == "nt" else "npm"
            subprocess.run(
                [npm, "run", "build"],
                cwd=PROJECT_ROOT,
                env=environment,
                check=True,
            )
            subprocess.run(
                ["node", "tests/real-api-smoke.mjs"],
                cwd=PROJECT_ROOT,
                env=environment,
                check=True,
            )
            frontend = subprocess.Popen(
                [
                    "node",
                    "node_modules/vinext/dist/cli.js",
                    "start",
                    "--hostname",
                    "127.0.0.1",
                    "--port",
                    "8766",
                ],
                cwd=PROJECT_ROOT,
                env=environment,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=hidden,
            )
            wait_for_url("http://127.0.0.1:8766/", "Vinext production server")
            for route in (
                "/",
                "/articles/full-stack-integration",
                "/projects/full-stack-project",
                "/search?q=%E8%B7%A8%E6%A0%88",
                "/admin",
                "/robots.txt",
                "/sitemap.xml",
                "/rss.xml",
            ):
                with urlopen(f"http://127.0.0.1:8766{route}", timeout=5) as response:
                    body = response.read().decode("utf8")
                    if response.status != 200:
                        raise RuntimeError(f"Vinext route failed: {route}")
                    if route == "/" and (
                        "跨栈集成文章" not in body
                        or "https://devlelin.xyz" not in body
                    ):
                        raise RuntimeError("Vinext SSR did not include API content and formal origin")
                    if route in ("/robots.txt", "/sitemap.xml", "/rss.xml") and (
                        "https://devlelin.xyz" not in body
                        or "localhost" in body
                    ):
                        raise RuntimeError(f"SEO endpoint used the wrong origin: {route}")
        finally:
            if frontend is not None:
                stop_process(frontend)
            stop_process(server)
    temporary_path = Path(temporary)
    for _attempt in range(10):
        if not temporary_path.exists():
            break
        try:
            shutil.rmtree(temporary_path)
            break
        except PermissionError:
            time.sleep(0.25)
    if temporary_path.exists():
        raise RuntimeError(f"could not remove integration directory: {temporary_path}")


if __name__ == "__main__":
    main()
