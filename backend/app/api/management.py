from datetime import UTC, date, datetime
from hashlib import sha256
from typing import Annotated, Any
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import admin_user, csrf_protected
from app.core.config import get_settings
from app.db.session import get_session
from app.models import Backup, Category, Link, OperationLog, PageView, Tag, Timeline, User
from app.repositories.management import ManagementRepository
from app.schemas.common import ApiResponse
from app.schemas.management import (
    BackupCreate,
    BackupRestore,
    CategoryCreate,
    CategoryUpdate,
    LinkCreate,
    LinkUpdate,
    PageViewCreate,
    SettingsUpdate,
    TagCreate,
    TagUpdate,
    TimelineCreate,
    TimelineUpdate,
)
from app.services.backups import create_database_backup, restore_database_backup
from app.services.content_cache import public_content_cache

public_router = APIRouter(tags=["taxonomy"])
admin_router = APIRouter(
    prefix="/admin",
    tags=["management"],
    dependencies=[Depends(csrf_protected)],
)


def record_dict(record: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: getattr(record, field) for field in fields}


def safe_public_url(value: str) -> bool:
    parsed = urlsplit(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


@public_router.get("/categories")
async def categories(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    async def load() -> ApiResponse[list[dict]]:
        records = await ManagementRepository(session).list_records(Category)
        return ApiResponse(
            data=[
                record_dict(item, ("id", "name", "slug", "description"))
                for item in records
            ]
        )

    return await public_content_cache.get_or_create(("categories",), load)


@public_router.get("/tags")
async def tags(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    async def load() -> ApiResponse[list[dict]]:
        records = await ManagementRepository(session).list_records(Tag)
        return ApiResponse(
            data=[record_dict(item, ("id", "name", "slug")) for item in records]
        )

    return await public_content_cache.get_or_create(("tags",), load)


@public_router.get("/links")
async def public_links(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    async def load() -> ApiResponse[list[dict]]:
        records = list(
            (
                await session.scalars(
                    select(Link)
                    .where(
                        Link.status == "active",
                        Link.deleted_at.is_(None),
                    )
                    .order_by(Link.sort_order.asc(), Link.created_at.asc())
                )
            ).all()
        )
        return ApiResponse(
            data=[
                record_dict(item, ("id", "name", "url", "description"))
                for item in records
                if safe_public_url(item.url)
            ]
        )

    return await public_content_cache.get_or_create(("links",), load)


@public_router.post("/analytics/views", status_code=status.HTTP_202_ACCEPTED)
async def record_view(
    payload: PageViewCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict[str, bool]]:
    client_host = request.client.host if request.client else "unknown"
    day = datetime.now(UTC).date().isoformat()
    visitor_hash = sha256(
        f"{get_settings().secret_key}:{client_host}:{day}".encode()
    ).hexdigest()
    referer = request.headers.get("referer")
    referer_host = None
    if referer:
        from urllib.parse import urlparse

        referer_host = urlparse(referer).hostname
    session.add(
        PageView(
            id=uuid4(),
            path=payload.path,
            content_type=payload.content_type,
            content_id=payload.content_id,
            visitor_hash=visitor_hash,
            referer_host=referer_host,
        )
    )
    await session.commit()
    return ApiResponse(data={"accepted": True})


@admin_router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).create(
        Category, payload.model_dump(), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "name", "slug", "description")))


@admin_router.patch("/categories/{record_id}")
async def update_category(
    record_id: UUID,
    payload: CategoryUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).update(
        Category, record_id, payload.model_dump(exclude_unset=True), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "name", "slug", "description")))


@admin_router.delete("/categories/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    record_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ManagementRepository(session).soft_delete(Category, record_id, user.id)


@admin_router.post("/tags", status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).create(Tag, payload.model_dump(), user.id)
    return ApiResponse(data=record_dict(record, ("id", "name", "slug")))


@admin_router.patch("/tags/{record_id}")
async def update_tag(
    record_id: UUID,
    payload: TagUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).update(
        Tag, record_id, payload.model_dump(exclude_unset=True), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "name", "slug")))


@admin_router.delete("/tags/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    record_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ManagementRepository(session).soft_delete(Tag, record_id, user.id)


@admin_router.post("/timelines", status_code=status.HTTP_201_CREATED)
async def create_timeline(
    payload: TimelineCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).create(
        Timeline, payload.model_dump(), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "event_date", "title", "description", "event_type", "is_public", "sort_order")))


@admin_router.get("/timelines")
async def list_admin_timelines(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    records = await ManagementRepository(session).list_records(Timeline)
    return ApiResponse(
        data=[
            record_dict(
                item,
                (
                    "id",
                    "event_date",
                    "title",
                    "description",
                    "event_type",
                    "is_public",
                    "sort_order",
                ),
            )
            for item in records
        ]
    )


@admin_router.patch("/timelines/{record_id}")
async def update_timeline(
    record_id: UUID,
    payload: TimelineUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).update(
        Timeline, record_id, payload.model_dump(exclude_unset=True), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "event_date", "title", "description", "event_type", "is_public", "sort_order")))


@admin_router.delete("/timelines/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timeline(
    record_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ManagementRepository(session).soft_delete(Timeline, record_id, user.id)


@admin_router.get("/links")
async def list_links(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    records = await ManagementRepository(session).list_records(Link)
    return ApiResponse(data=[record_dict(item, ("id", "name", "url", "description", "status", "sort_order")) for item in records])


@admin_router.post("/links", status_code=status.HTTP_201_CREATED)
async def create_link(
    payload: LinkCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).create(Link, payload.model_dump(), user.id)
    return ApiResponse(data=record_dict(record, ("id", "name", "url", "description", "status", "sort_order")))


@admin_router.patch("/links/{record_id}")
async def update_link(
    record_id: UUID,
    payload: LinkUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    record = await ManagementRepository(session).update(
        Link, record_id, payload.model_dump(exclude_unset=True), user.id
    )
    return ApiResponse(data=record_dict(record, ("id", "name", "url", "description", "status", "sort_order")))


@admin_router.delete("/links/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    record_id: UUID,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await ManagementRepository(session).soft_delete(Link, record_id, user.id)


@admin_router.get("/settings")
async def settings(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    return ApiResponse(data=await ManagementRepository(session).all_settings())


@admin_router.patch("/settings")
async def update_settings(
    payload: SettingsUpdate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    return ApiResponse(
        data=await ManagementRepository(session).update_settings(payload.values, user.id)
    )


@admin_router.get("/operation-logs")
async def operation_logs(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    records = list(
        (
            await session.scalars(
                select(OperationLog)
                .order_by(OperationLog.created_at.desc())
                .limit(100)
            )
        ).all()
    )
    return ApiResponse(
        data=[
            record_dict(
                item,
                ("id", "actor_id", "action", "resource_type", "resource_id", "created_at"),
            )
            for item in records
        ]
    )


@admin_router.get("/analytics/overview")
async def analytics(
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    return ApiResponse(
        data=await ManagementRepository(session).analytics_overview(date_from, date_to)
    )


@admin_router.get("/backups")
async def list_backups(
    _user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[list[dict]]:
    records = list(
        (
            await session.scalars(
                select(Backup)
                .where(Backup.deleted_at.is_(None))
                .order_by(Backup.created_at.desc())
                .limit(100)
            )
        ).all()
    )
    return ApiResponse(
        data=[
            record_dict(
                item,
                (
                    "id",
                    "status",
                    "storage_key",
                    "size_bytes",
                    "checksum",
                    "created_at",
                    "completed_at",
                ),
            )
            for item in records
        ]
    )


@admin_router.post("/backups", status_code=status.HTTP_201_CREATED)
async def create_backup(
    _payload: BackupCreate,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    backup = await create_database_backup(session, user.id)
    return ApiResponse(
        data=record_dict(
            backup,
            ("id", "status", "storage_key", "size_bytes", "checksum", "completed_at"),
        )
    )


@admin_router.post("/backups/{backup_id}/restore", status_code=status.HTTP_202_ACCEPTED)
async def restore_backup(
    backup_id: UUID,
    payload: BackupRestore,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict[str, bool]]:
    if user.role != "super_admin":
        from app.core.errors import AppError

        raise AppError(403, "FORBIDDEN", "只有超级管理员可以恢复备份。")
    if payload.confirmation != f"RESTORE {backup_id}":
        from app.core.errors import AppError

        raise AppError(409, "RESTORE_CONFIRMATION_REQUIRED", "恢复确认短语不正确。")
    backup = await session.get(Backup, backup_id)
    if not backup or backup.status != "completed":
        from app.core.errors import AppError

        raise AppError(404, "BACKUP_NOT_FOUND", "可恢复的备份不存在。")
    await restore_database_backup(backup)
    return ApiResponse(data={"accepted": True})
