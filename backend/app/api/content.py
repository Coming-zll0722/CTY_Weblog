from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from app.api.dependencies import admin_user, csrf_protected
from app.core.errors import AppError
from app.db.session import get_session
from app.models import MediaFile, OperationLog, Timeline, User
from app.repositories.content import ContentRepository
from app.schemas.common import ApiResponse, PageMeta, PageResponse
from app.schemas.post import PostCreate, PostPublish, PostUpdate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.media import ensure_variant, store_image
from app.services.search import search_content
from app.services.storage import get_media_storage
from app.services.content_cache import public_content_cache

router = APIRouter(tags=["content"])


@router.get("/posts")
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    category: str | None = Query(None, max_length=100),
    tag: str | None = Query(None, max_length=100),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[dict]:
    async def load() -> PageResponse[dict]:
        items, total = await ContentRepository(session).list_posts(
            page, page_size, q, category, tag
        )
        return PageResponse(
            data=items, meta=PageMeta(page=page, page_size=page_size, total=total)
        )

    return await public_content_cache.get_or_create(
        ("posts", page, page_size, q, category, tag), load
    )


@router.get("/posts/{slug}")
async def get_post(
    slug: str, session: AsyncSession = Depends(get_session)
) -> ApiResponse[dict]:
    async def load() -> ApiResponse[dict]:
        return ApiResponse(data=await ContentRepository(session).get_post(slug))

    return await public_content_cache.get_or_create(("post", slug), load)


@router.get("/posts/{slug}/context")
async def get_post_context(
    slug: str, session: AsyncSession = Depends(get_session)
) -> ApiResponse[dict]:
    async def load() -> ApiResponse[dict]:
        return ApiResponse(data=await ContentRepository(session).get_post_context(slug))

    return await public_content_cache.get_or_create(("post-context", slug), load)


@router.get("/projects")
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[dict]:
    async def load() -> PageResponse[dict]:
        items, total = await ContentRepository(session).list_projects(page, page_size, q)
        return PageResponse(
            data=items, meta=PageMeta(page=page, page_size=page_size, total=total)
        )

    return await public_content_cache.get_or_create(
        ("projects", page, page_size, q), load
    )


@router.get("/projects/{slug}")
async def get_project(
    slug: str, session: AsyncSession = Depends(get_session)
) -> ApiResponse[dict]:
    async def load() -> ApiResponse[dict]:
        return ApiResponse(data=await ContentRepository(session).get_project(slug))

    return await public_content_cache.get_or_create(("project", slug), load)


@router.get("/timelines")
async def list_timeline(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    async def load() -> ApiResponse[list[dict]]:
        events = list(
            (
                await session.scalars(
                    select(Timeline)
                    .where(Timeline.is_public.is_(True), Timeline.deleted_at.is_(None))
                    .order_by(Timeline.event_date.desc(), Timeline.sort_order.asc())
                )
            ).all()
        )
        return ApiResponse(
            data=[
                {
                    "id": event.id,
                    "event_date": event.event_date,
                    "title": event.title,
                    "description": event.description,
                    "event_type": event.event_type,
                }
                for event in events
            ]
        )

    return await public_content_cache.get_or_create(("timeline",), load)


@router.get("/media/{storage_key}")
async def media_file(
    storage_key: str,
    width: int | None = Query(None),
    image_format: str | None = Query(None, alias="format", pattern=r"^(webp|avif)$"),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    media = await session.scalar(
        select(MediaFile).where(
            MediaFile.storage_key == storage_key,
            MediaFile.deleted_at.is_(None),
        )
    )
    if not media:
        raise AppError(404, "MEDIA_NOT_FOUND", "图片不存在。")
    source = get_media_storage().resolve(storage_key)
    if source is None:
        raise AppError(404, "MEDIA_NOT_FOUND", "图片不存在。")
    selected_source = source
    selected_type = media.mime_type
    if width in {480, 960, 1440} and image_format:
        variant = await ensure_variant(storage_key, source, width, image_format)
        if variant:
            selected_source = variant
            selected_type = f"image/{image_format}"
    return FileResponse(
        selected_source,
        media_type=selected_type,
        filename=None,
        content_disposition_type="inline",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Vary": "Accept",
        },
    )


@router.get("/search")
async def search(
    q: str = Query(min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    category: str | None = Query(None, max_length=100),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    async def load() -> ApiResponse[dict]:
        return ApiResponse(
            data=await search_content(session, q, page, page_size, category)
        )

    return await public_content_cache.get_or_create(
        ("search", q.casefold(), page, page_size, category), load, ttl_seconds=60
    )


admin_router = APIRouter(
    prefix="/admin",
    tags=["admin content"],
    dependencies=[Depends(csrf_protected)],
)


async def _audit(
    session: AsyncSession,
    user: User,
    action: str,
    resource_type: str,
    resource_id: UUID,
) -> None:
    session.add(
        OperationLog(
            actor_id=user.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail_json={},
        )
    )
    await session.commit()


@admin_router.get("/posts")
async def admin_list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_deleted: bool = Query(False),
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[dict]:
    items, total = await ContentRepository(session).list_posts(
        page,
        page_size,
        include_unpublished=True,
        include_deleted=include_deleted,
    )
    return PageResponse(
        data=items, meta=PageMeta(page=page, page_size=page_size, total=total)
    )


@admin_router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).create_post(payload, user.id)
    await _audit(session, user, "posts.create", "posts", item["id"])
    return ApiResponse(data=item)


@admin_router.patch("/posts/{post_id}")
async def update_post(
    post_id: UUID,
    payload: PostUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).update_post(post_id, payload)
    await _audit(session, user, "posts.update", "posts", post_id)
    return ApiResponse(data=item)


@admin_router.post("/posts/{post_id}/publish")
async def publish_post(
    post_id: UUID,
    payload: PostPublish,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).publish_post(
        post_id, payload.version, payload.publish_at
    )
    await _audit(session, user, "posts.publish", "posts", post_id)
    return ApiResponse(data=item)


@admin_router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ContentRepository(session).soft_delete_post(post_id)
    await _audit(session, user, "posts.delete", "posts", post_id)


@admin_router.post("/posts/{post_id}/restore")
async def restore_post(
    post_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).restore_post(post_id)
    await _audit(session, user, "posts.restore", "posts", post_id)
    return ApiResponse(data=item)


@admin_router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).create_project(payload, user.id)
    await _audit(session, user, "projects.create", "projects", item["id"])
    return ApiResponse(data=item)


@admin_router.get("/projects")
async def admin_list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_deleted: bool = Query(False),
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[dict]:
    items, total = await ContentRepository(session).list_projects(
        page,
        page_size,
        include_unpublished=True,
        include_deleted=include_deleted,
    )
    return PageResponse(
        data=items, meta=PageMeta(page=page, page_size=page_size, total=total)
    )


@admin_router.patch("/projects/{project_id}")
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).update_project(project_id, payload)
    await _audit(session, user, "projects.update", "projects", project_id)
    return ApiResponse(data=item)


@admin_router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ContentRepository(session).soft_delete_project(project_id)
    await _audit(session, user, "projects.delete", "projects", project_id)


@admin_router.post("/projects/{project_id}/restore")
async def restore_project(
    project_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    item = await ContentRepository(session).restore_project(project_id)
    await _audit(session, user, "projects.restore", "projects", project_id)
    return ApiResponse(data=item)


@admin_router.post("/media", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    alt_text: str | None = Form(default=None, max_length=300),
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    media = await store_image(session, file, user.id, alt_text)
    await _audit(session, user, "media_files.create", "media_files", media.id)
    return ApiResponse(
        data={
            "id": media.id,
            "storage_key": media.storage_key,
            "original_name": media.original_name,
            "mime_type": media.mime_type,
            "size_bytes": media.size_bytes,
            "width": media.width,
            "height": media.height,
            "alt_text": media.alt_text,
        }
    )


@admin_router.get("/media")
async def list_media(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    records = list(
        (
            await session.scalars(
                select(MediaFile)
                .where(MediaFile.deleted_at.is_(None))
                .order_by(MediaFile.created_at.desc())
                .limit(200)
            )
        ).all()
    )
    return ApiResponse(
        data=[
            {
                "id": item.id,
                "storage_key": item.storage_key,
                "original_name": item.original_name,
                "mime_type": item.mime_type,
                "size_bytes": item.size_bytes,
                "width": item.width,
                "height": item.height,
                "alt_text": item.alt_text,
            }
            for item in records
        ]
    )


@admin_router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    media = await session.scalar(
        select(MediaFile).where(
            MediaFile.id == media_id,
            MediaFile.deleted_at.is_(None),
        )
    )
    if not media:
        raise AppError(404, "MEDIA_NOT_FOUND", "图片不存在。")
    media.deleted_at = datetime.now(UTC)
    await session.commit()
    await _audit(session, user, "media_files.delete", "media_files", media_id)
