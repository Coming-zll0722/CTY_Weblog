import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import (
    OperationLog,
    PageView,
    SiteSetting,
    Timeline,
)

_settings = get_settings()
PUBLIC_SETTING_DEFAULTS: dict[str, Any] = {
    "public.site_name": "从头越.log",
    "public.author_name": "林序",
    "public.brand_mark": "LOG",
    "public.site_description": "记录技术实践、项目开发与持续学习。",
    "public.seo_description": (
        "从头越.log：记录嵌入式通信测试、自动化工具、"
        "软件架构与工程实践的个人技术博客。"
    ),
    "public.seo_keywords": [
        "嵌入式软件测试",
        "自动化测试",
        "TCP UDP",
        "CAN",
        "Python",
        "C++",
        "FPGA",
    ],
    "public.contact_email": _settings.public_contact_email or "",
    "public.github_url": _settings.public_github_url or "",
    "public.footer_note": "内容经过脱敏处理",
}
PUBLIC_SETTING_KEYS = frozenset(PUBLIC_SETTING_DEFAULTS)
PUBLIC_STRING_LIMITS = {
    "public.site_name": 100,
    "public.author_name": 80,
    "public.brand_mark": 6,
    "public.site_description": 300,
    "public.seo_description": 300,
    "public.contact_email": 254,
    "public.github_url": 2048,
    "public.footer_note": 160,
}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_public_setting(key: str, value: Any) -> None:
    default = PUBLIC_SETTING_DEFAULTS[key]
    if isinstance(default, str):
        limit = PUBLIC_STRING_LIMITS[key]
        optional = key in {"public.contact_email", "public.github_url"}
        if (
            not isinstance(value, str)
            or (not optional and not value.strip())
            or len(value) > limit
        ):
            raise AppError(
                422,
                "INVALID_PUBLIC_SETTING",
                f"{key} 必须是 1–{limit} 个字符的字符串。",
            )
        if key == "public.contact_email" and value and not EMAIL_PATTERN.fullmatch(value):
            raise AppError(422, "INVALID_PUBLIC_SETTING", "联系邮箱格式无效。")
        if key == "public.github_url" and value:
            parsed = urlsplit(value)
            if parsed.scheme != "https" or not parsed.netloc:
                raise AppError(
                    422,
                    "INVALID_PUBLIC_SETTING",
                    "GitHub 网址必须是完整的 HTTPS 地址。",
                )
    elif (
        not isinstance(value, list)
        or len(value) > 20
        or any(
            not isinstance(item, str) or not item.strip() or len(item) > 80
            for item in value
        )
    ):
        raise AppError(
            422,
            "INVALID_PUBLIC_SETTING",
            f"{key} 必须是最多 20 项的非空字符串列表。",
        )


class ManagementRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_records(
        self,
        model: type[Any],
        public_only: bool = False,
    ) -> list[Any]:
        statement = select(model).where(model.deleted_at.is_(None))
        if public_only and model is Timeline:
            statement = statement.where(Timeline.is_public.is_(True))
        order = getattr(model, "sort_order", None)
        if order is not None:
            statement = statement.order_by(order.asc(), model.created_at.desc())
        else:
            statement = statement.order_by(model.created_at.desc())
        return list((await self.session.scalars(statement)).all())

    async def create(
        self,
        model: type[Any],
        values: dict[str, Any],
        actor_id: UUID,
    ) -> Any:
        record = model(**values)
        self.session.add(record)
        await self._audit(actor_id, f"{model.__tablename__}.create", record)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "RESOURCE_CONFLICT", "名称、slug 或 URL 已存在。") from exc
        await self.session.refresh(record)
        return record

    async def update(
        self,
        model: type[Any],
        record_id: UUID,
        values: dict[str, Any],
        actor_id: UUID,
    ) -> Any:
        record = await self.session.scalar(
            select(model).where(model.id == record_id, model.deleted_at.is_(None))
        )
        if not record:
            raise AppError(404, "NOT_FOUND", "记录不存在。")
        for key, value in values.items():
            setattr(record, key, value)
        await self._audit(actor_id, f"{model.__tablename__}.update", record)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "RESOURCE_CONFLICT", "名称、slug 或 URL 已存在。") from exc
        await self.session.refresh(record)
        return record

    async def soft_delete(
        self,
        model: type[Any],
        record_id: UUID,
        actor_id: UUID,
    ) -> None:
        record = await self.session.scalar(
            select(model).where(model.id == record_id, model.deleted_at.is_(None))
        )
        if not record:
            raise AppError(404, "NOT_FOUND", "记录不存在。")
        record.deleted_at = datetime.now(UTC)
        await self._audit(actor_id, f"{model.__tablename__}.delete", record)
        await self.session.commit()

    async def public_settings(self) -> dict[str, Any]:
        rows = await self.session.execute(
            select(SiteSetting.key, SiteSetting.value_json).where(
                SiteSetting.is_public.is_(True),
                SiteSetting.key.in_(PUBLIC_SETTING_KEYS),
                SiteSetting.deleted_at.is_(None),
            )
        )
        values = dict(PUBLIC_SETTING_DEFAULTS)
        for key, value in rows:
            try:
                _validate_public_setting(key, value)
            except AppError:
                continue
            values[key] = value
        return values

    async def all_settings(self) -> dict[str, Any]:
        rows = await self.session.execute(
            select(SiteSetting.key, SiteSetting.value_json).where(
                SiteSetting.deleted_at.is_(None)
            )
        )
        return {key: value for key, value in rows}

    async def update_settings(
        self, values: dict[str, Any], actor_id: UUID
    ) -> dict[str, Any]:
        for key, value in values.items():
            if key.startswith("public.") and key not in PUBLIC_SETTING_KEYS:
                raise AppError(
                    422,
                    "UNKNOWN_PUBLIC_SETTING",
                    f"不支持公开设置项：{key}",
                )
            if key in PUBLIC_SETTING_KEYS:
                _validate_public_setting(key, value)
            setting = await self.session.scalar(
                select(SiteSetting).where(
                    SiteSetting.key == key, SiteSetting.deleted_at.is_(None)
                )
            )
            if setting:
                setting.value_json = value
                setting.is_public = key in PUBLIC_SETTING_KEYS
                setting.updated_by = actor_id
            else:
                self.session.add(
                    SiteSetting(
                        key=key,
                        value_json=value,
                        is_public=key in PUBLIC_SETTING_KEYS,
                        updated_by=actor_id,
                    )
                )
        self.session.add(
            OperationLog(
                actor_id=actor_id,
                action="settings.update",
                resource_type="site_settings",
                detail_json={"keys": sorted(values)},
            )
        )
        await self.session.commit()
        return await self.all_settings()

    async def analytics_overview(self) -> dict[str, int]:
        views = int((await self.session.scalar(select(func.count(PageView.id)))) or 0)
        visitors = int(
            (
                await self.session.scalar(
                    select(func.count(func.distinct(PageView.visitor_hash))).where(
                        PageView.visitor_hash.is_not(None)
                    )
                )
            )
            or 0
        )
        return {"views": views, "visitors": visitors}

    async def _audit(self, actor_id: UUID, action: str, record: Any) -> None:
        await self.session.flush()
        self.session.add(
            OperationLog(
                actor_id=actor_id,
                action=action,
                resource_type=record.__tablename__,
                resource_id=record.id,
                detail_json={},
            )
        )
