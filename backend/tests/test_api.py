from base64 import b64decode
from datetime import UTC, datetime
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.main import app
from app.models import Backup, User


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"status": "ok", "database": "ok"},
    }
    assert response.headers["x-content-type-options"] == "nosniff"


async def test_public_posts_hide_drafts(client: AsyncClient) -> None:
    response = await client.get("/api/v1/posts")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert [post["slug"] for post in body["data"]] == ["published-post"]


async def test_missing_post_uses_unified_error(client: AsyncClient) -> None:
    response = await client.get("/api/v1/posts/not-found")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "POST_NOT_FOUND"
    assert response.json()["error"]["request_id"]


async def test_login_sets_http_only_session_and_me(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@example.com",
            "password": "correct-horse-battery-staple",
        },
    )
    assert response.status_code == 200
    session_cookie = next(
        value for value in response.headers.get_list("set-cookie") if value.startswith("engineering_notes_session")
    )
    assert "HttpOnly" in session_cookie
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["data"]["role"] == "admin"
    async with app.state.test_session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "admin@example.com"))
        assert user is not None
        assert user.password_hash.startswith("$argon2id$")


async def test_login_failures_are_rate_limited(client: AsyncClient) -> None:
    settings = get_settings()
    for _attempt in range(settings.login_attempt_limit):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401
    limited = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "wrong-password"},
    )
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "RATE_LIMITED"


async def test_admin_writes_require_csrf(authenticated_client) -> None:
    client, _headers = authenticated_client
    response = await client.post(
        "/api/v1/admin/posts",
        json={
            "title": "缺少 CSRF",
            "slug": "missing-csrf",
            "summary": "这个请求必须因为没有 CSRF Header 而失败。",
            "content_md": "# 内容",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_INVALID"


async def test_non_admin_role_cannot_access_management(client: AsyncClient) -> None:
    async with app.state.test_session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "admin@example.com"))
        assert user is not None
        user.role = "viewer"
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@example.com",
            "password": "correct-horse-battery-staple",
        },
    )
    assert login.status_code == 200
    response = await client.get("/api/v1/admin/posts")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


async def test_post_crud_publish_and_optimistic_lock(authenticated_client) -> None:
    client, headers = authenticated_client
    created = await client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "新建文章",
            "slug": "new-post",
            "summary": "这是一篇验证真实数据库写入和发布工作流的新文章。",
            "content_md": "# 新建文章",
        },
    )
    assert created.status_code == 201
    post = created.json()["data"]
    denied = await client.post(
        f"/api/v1/admin/posts/{post['id']}/publish",
        headers=headers,
        json={"version": post["version"]},
    )
    assert denied.status_code == 409
    assert denied.json()["error"]["code"] == "CONFIDENTIALITY_CHECK_REQUIRED"

    updated = await client.patch(
        f"/api/v1/admin/posts/{post['id']}",
        headers=headers,
        json={
            "confidentiality_checked": True,
            "version": post["version"],
        },
    )
    assert updated.status_code == 200
    updated_post = updated.json()["data"]
    stale = await client.patch(
        f"/api/v1/admin/posts/{post['id']}",
        headers=headers,
        json={"title": "过期修改", "version": post["version"]},
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"
    published = await client.post(
        f"/api/v1/admin/posts/{post['id']}/publish",
        headers=headers,
        json={"version": updated_post["version"]},
    )
    assert published.status_code == 200
    assert published.json()["data"]["status"] == "published"
    public = await client.get("/api/v1/posts/new-post")
    assert public.status_code == 200


async def test_slug_conflict_pagination_and_soft_delete_restore(
    authenticated_client,
) -> None:
    client, headers = authenticated_client
    payload = {
        "title": "可恢复文章",
        "slug": "recoverable-post",
        "summary": "验证 slug 唯一约束、分页、软删除和恢复流程。",
        "content_md": "# 可恢复文章",
        "status": "published",
        "confidentiality_checked": True,
    }
    created = await client.post("/api/v1/admin/posts", headers=headers, json=payload)
    assert created.status_code == 201
    conflict = await client.post("/api/v1/admin/posts", headers=headers, json=payload)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "SLUG_CONFLICT"

    page = await client.get("/api/v1/posts", params={"page": 1, "page_size": 1})
    assert page.status_code == 200
    assert len(page.json()["data"]) == 1
    assert page.json()["meta"]["total"] >= 2

    post_id = created.json()["data"]["id"]
    deleted = await client.delete(f"/api/v1/admin/posts/{post_id}", headers=headers)
    assert deleted.status_code == 204
    assert (await client.get("/api/v1/posts/recoverable-post")).status_code == 404
    recycle_bin = await client.get(
        "/api/v1/admin/posts",
        params={"include_deleted": "true"},
    )
    recycled = next(item for item in recycle_bin.json()["data"] if item["id"] == post_id)
    assert recycled["deleted_at"] is not None
    restored = await client.post(
        f"/api/v1/admin/posts/{post_id}/restore",
        headers=headers,
    )
    assert restored.status_code == 200
    assert (await client.get("/api/v1/posts/recoverable-post")).status_code == 200


async def test_slug_change_records_frontend_redirect(authenticated_client) -> None:
    client, headers = authenticated_client
    created = await client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "永久链接文章",
            "slug": "original-stable-slug",
            "summary": "验证修改 slug 后仍保留指向前台新地址的永久重定向。",
            "content_md": "# 永久链接",
            "status": "published",
            "confidentiality_checked": True,
        },
    )
    post = created.json()["data"]
    updated = await client.patch(
        f"/api/v1/admin/posts/{post['id']}",
        headers=headers,
        json={"slug": "new-stable-slug", "version": post["version"]},
    )
    assert updated.status_code == 200
    moved = await client.get("/api/v1/posts/original-stable-slug")
    assert moved.status_code == 301
    assert moved.headers["location"] == "/articles/new-stable-slug"


async def test_search_covers_posts_and_projects(client: AsyncClient) -> None:
    response = await client.get("/api/v1/search", params={"q": "测试"})
    assert response.status_code == 200
    result_types = {item["type"] for item in response.json()["data"]["items"]}
    assert result_types == {"post", "project"}


async def test_public_project_detail_hides_private_projects(
    authenticated_client,
) -> None:
    client, headers = authenticated_client
    created = await client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "title": "内部项目",
            "slug": "private-project",
            "summary": "这个项目在明确公开以前不能从公共详情接口读取。",
            "status": "active",
            "is_public": False,
        },
    )
    assert created.status_code == 201
    response = await client.get("/api/v1/projects/private-project")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PROJECT_NOT_FOUND"


async def test_project_crud_media_relations_and_restore(authenticated_client) -> None:
    client, headers = authenticated_client
    png = b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    upload = await client.post(
        "/api/v1/admin/media",
        headers=headers,
        data={"alt_text": "项目架构截图"},
        files={"file": ("architecture.png", png, "image/png")},
    )
    media_id = upload.json()["data"]["id"]
    post_id = (await client.get("/api/v1/posts")).json()["data"][0]["id"]
    admin_posts = (await client.get("/api/v1/admin/posts")).json()["data"]
    draft_post_id = next(item["id"] for item in admin_posts if item["slug"] == "draft-post")
    created = await client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "title": "完整项目案例",
            "slug": "complete-project-case",
            "summary": "验证项目结构化字段、媒体、关联文章、编辑和恢复流程。",
            "status": "active",
            "is_public": True,
            "confidentiality_checked": True,
            "cover_media_id": media_id,
            "screenshot_media_ids": [media_id],
            "related_post_ids": [post_id, draft_post_id],
        },
    )
    assert created.status_code == 201
    project = created.json()["data"]
    assert set(project["related_post_ids"]) == {post_id, draft_post_id}
    public = await client.get("/api/v1/projects/complete-project-case")
    assert public.status_code == 200
    assert public.json()["data"]["cover"]["id"] == media_id
    assert public.json()["data"]["screenshots"][0]["alt_text"] == "项目架构截图"
    assert public.json()["data"]["related_posts"][0]["id"] == post_id
    assert public.json()["data"]["related_post_ids"] == [post_id]

    updated = await client.patch(
        f"/api/v1/admin/projects/{project['id']}",
        headers=headers,
        json={
            "outcomes_md": "建立了可复用的回归测试基线。",
            "version": project["version"],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["outcomes_md"].startswith("建立了")
    stale = await client.patch(
        f"/api/v1/admin/projects/{project['id']}",
        headers=headers,
        json={
            "outcomes_md": "这次写入使用了过期版本号。",
            "version": project["version"],
        },
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"
    deleted = await client.delete(
        f"/api/v1/admin/projects/{project['id']}",
        headers=headers,
    )
    assert deleted.status_code == 204
    assert (await client.get("/api/v1/projects/complete-project-case")).status_code == 404
    restored = await client.post(
        f"/api/v1/admin/projects/{project['id']}/restore",
        headers=headers,
    )
    assert restored.status_code == 200
    assert (await client.get("/api/v1/projects/complete-project-case")).status_code == 200


async def test_project_requires_confidentiality_review_before_publication(
    authenticated_client,
) -> None:
    client, headers = authenticated_client
    response = await client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "title": "待保密检查项目",
            "slug": "project-awaiting-confidentiality-review",
            "summary": "项目尚未完成发布前保密检查，因此不能进入公开页面。",
            "status": "active",
            "is_public": True,
            "confidentiality_checked": False,
        },
    )
    assert response.status_code == 422


async def test_upload_rejects_executable(authenticated_client) -> None:
    client, headers = authenticated_client
    response = await client.post(
        "/api/v1/admin/media",
        headers=headers,
        files={"file": ("danger.exe", b"MZ", "application/octet-stream")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UPLOAD_TYPE_DENIED"
    disguised = await client.post(
        "/api/v1/admin/media",
        headers=headers,
        files={"file": ("disguised.png", b"MZ executable", "image/png")},
    )
    assert disguised.status_code == 415
    assert disguised.json()["error"]["code"] == "UPLOAD_TYPE_DENIED"


async def test_upload_rejects_oversized_body(authenticated_client) -> None:
    client, headers = authenticated_client
    settings = get_settings()
    previous_limit = settings.max_upload_bytes
    settings.max_upload_bytes = 1
    try:
        response = await client.post(
            "/api/v1/admin/media",
            headers=headers,
            files={"file": ("large.png", b"xx", "image/png")},
        )
    finally:
        settings.max_upload_bytes = previous_limit
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "UPLOAD_TOO_LARGE"


async def test_valid_image_upload_is_persisted_and_served(authenticated_client) -> None:
    client, headers = authenticated_client
    png = b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    uploaded = await client.post(
        "/api/v1/admin/media",
        headers=headers,
        data={"alt_text": "单像素测试图片"},
        files={"file": ("pixel.png", png, "image/png")},
    )
    assert uploaded.status_code == 201
    media = uploaded.json()["data"]
    served = await client.get(f"/api/v1/media/{media['storage_key']}")
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"
    listing = await client.get("/api/v1/admin/media")
    assert listing.json()["data"][0]["alt_text"] == "单像素测试图片"


async def test_taxonomy_and_settings_management(authenticated_client) -> None:
    client, headers = authenticated_client
    category = await client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={
            "name": "自动化测试",
            "slug": "test-automation",
            "description": "测试工具与工作流。",
        },
    )
    assert category.status_code == 201
    public_categories = await client.get("/api/v1/categories")
    assert public_categories.json()["data"][0]["slug"] == "test-automation"
    tag = await client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "Python", "slug": "python"},
    )
    assert tag.status_code == 201
    tagged_post = await client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "标签检索示例",
            "slug": "tag-search-example",
            "summary": "正文和标题不含目标英文关键词，仅通过标签命中搜索。",
            "content_md": "# 标签检索",
            "status": "published",
            "confidentiality_checked": True,
            "category_id": category.json()["data"]["id"],
            "tag_ids": [tag.json()["data"]["id"]],
        },
    )
    assert tagged_post.status_code == 201
    tag_search = await client.get("/api/v1/search", params={"q": "Python"})
    assert tag_search.json()["data"]["items"][0]["slug"] == "tag-search-example"
    category_search = await client.get(
        "/api/v1/search",
        params={"q": "标签", "category": "test-automation"},
    )
    assert [item["slug"] for item in category_search.json()["data"]["items"]] == [
        "tag-search-example"
    ]
    settings = await client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "values": {
                "public.contact_email": "hello@example.com",
                "private.analytics_token": "never-public",
            }
        },
    )
    assert settings.status_code == 200
    public_settings = await client.get("/api/v1/settings/public")
    assert public_settings.json()["data"]["public.contact_email"] == "hello@example.com"
    assert "private.analytics_token" not in public_settings.json()["data"]
    assert public_settings.json()["data"]["public.site_name"] == "从头越.log"
    unknown_public = await client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"values": {"public.unsupported_secret": "must-not-be-exposed"}},
    )
    assert unknown_public.status_code == 422
    assert unknown_public.json()["error"]["code"] == "UNKNOWN_PUBLIC_SETTING"
    unsafe_url = await client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"values": {"public.github_url": "javascript:alert(1)"}},
    )
    assert unsafe_url.status_code == 422
    assert unsafe_url.json()["error"]["code"] == "INVALID_PUBLIC_SETTING"


async def test_timeline_and_link_full_management(authenticated_client) -> None:
    client, headers = authenticated_client
    timeline = await client.post(
        "/api/v1/admin/timelines",
        headers=headers,
        json={
            "event_date": "2026-07-24",
            "title": "完成全栈验证",
            "description": "完成真实前后端与迁移验证。",
            "event_type": "milestone",
            "is_public": False,
            "sort_order": 2,
        },
    )
    assert timeline.status_code == 201
    timeline_id = timeline.json()["data"]["id"]
    listing = await client.get("/api/v1/admin/timelines")
    assert listing.status_code == 200
    assert listing.json()["data"][0]["is_public"] is False
    changed = await client.patch(
        f"/api/v1/admin/timelines/{timeline_id}",
        headers=headers,
        json={"title": "完成全栈交付", "is_public": True},
    )
    assert changed.status_code == 200
    public = await client.get("/api/v1/timelines")
    assert public.json()["data"][0]["title"] == "完成全栈交付"

    unsafe_link = await client.post(
        "/api/v1/admin/links",
        headers=headers,
        json={"name": "不安全链接", "url": "javascript:alert(1)"},
    )
    assert unsafe_link.status_code == 422

    link = await client.post(
        "/api/v1/admin/links",
        headers=headers,
        json={
            "name": "工程资料",
            "url": "https://example.com/engineering",
            "description": "公开的工程资料入口。",
            "status": "active",
            "sort_order": 1,
        },
    )
    assert link.status_code == 201
    link_id = link.json()["data"]["id"]
    public_links = await client.get("/api/v1/links")
    assert public_links.json()["data"][0]["name"] == "工程资料"
    updated_link = await client.patch(
        f"/api/v1/admin/links/{link_id}",
        headers=headers,
        json={"status": "hidden"},
    )
    assert updated_link.status_code == 200
    assert updated_link.json()["data"]["status"] == "hidden"
    assert (await client.get("/api/v1/links")).json()["data"] == []
    assert (
        await client.delete(f"/api/v1/admin/links/{link_id}", headers=headers)
    ).status_code == 204
    assert (
        await client.delete(f"/api/v1/admin/timelines/{timeline_id}", headers=headers)
    ).status_code == 204


async def test_privacy_preserving_analytics(authenticated_client) -> None:
    client, _headers = authenticated_client
    accepted = await client.post(
        "/api/v1/analytics/views",
        json={"path": "/articles/published-post", "content_type": "post"},
    )
    assert accepted.status_code == 202
    overview = await client.get("/api/v1/admin/analytics/overview")
    assert overview.status_code == 200
    assert overview.json()["data"] == {"views": 1, "visitors": 1}
    rejected = await client.post(
        "/api/v1/analytics/views",
        json={"path": "/search?q=raw-personal-data"},
    )
    assert rejected.status_code == 422


async def test_backup_records_and_restore_guardrails(
    authenticated_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, headers = authenticated_client

    async def fake_create_backup(
        session: AsyncSession,
        actor_id: UUID,
    ) -> Backup:
        backup = Backup(
            status="completed",
            storage_key="test-backup.dump",
            size_bytes=4,
            checksum="0" * 64,
            completed_at=datetime.now(UTC),
            started_by=actor_id,
        )
        session.add(backup)
        await session.commit()
        await session.refresh(backup)
        return backup

    monkeypatch.setattr(
        "app.api.management.create_database_backup",
        fake_create_backup,
    )
    created = await client.post(
        "/api/v1/admin/backups",
        headers=headers,
        json={"mode": "full"},
    )
    assert created.status_code == 201
    backup_id = created.json()["data"]["id"]
    listing = await client.get("/api/v1/admin/backups")
    assert listing.json()["data"][0]["storage_key"] == "test-backup.dump"

    denied = await client.post(
        f"/api/v1/admin/backups/{backup_id}/restore",
        headers=headers,
        json={"confirmation": f"RESTORE {backup_id}"},
    )
    assert denied.status_code == 403

    async with app.state.test_session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "admin@example.com"))
        assert user is not None
        user.role = "super_admin"
        await session.commit()
    wrong_confirmation = await client.post(
        f"/api/v1/admin/backups/{backup_id}/restore",
        headers=headers,
        json={"confirmation": "RESTORE wrong-id"},
    )
    assert wrong_confirmation.status_code == 409
    assert (
        wrong_confirmation.json()["error"]["code"]
        == "RESTORE_CONFIRMATION_REQUIRED"
    )

    restored: list[UUID] = []

    async def fake_restore_backup(backup: Backup) -> None:
        restored.append(backup.id)

    monkeypatch.setattr(
        "app.api.management.restore_database_backup",
        fake_restore_backup,
    )
    accepted = await client.post(
        f"/api/v1/admin/backups/{backup_id}/restore",
        headers=headers,
        json={"confirmation": f"RESTORE {backup_id}"},
    )
    assert accepted.status_code == 202
    assert accepted.json()["data"]["accepted"] is True
    assert [str(value) for value in restored] == [backup_id]


async def test_change_password(authenticated_client) -> None:
    client, headers = authenticated_client
    changed = await client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": "correct-horse-battery-staple",
            "new_password": "a-new-correct-horse-battery-staple",
        },
    )
    assert changed.status_code == 204
    old_login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@example.com",
            "password": "correct-horse-battery-staple",
        },
    )
    assert old_login.status_code == 401
    new_login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@example.com",
            "password": "a-new-correct-horse-battery-staple",
        },
    )
    assert new_login.status_code == 200
