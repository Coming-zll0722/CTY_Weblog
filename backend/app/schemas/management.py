from datetime import date
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    description: str | None = None
    parent_id: UUID | None = None
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(
        default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100
    )
    description: str | None = None
    parent_id: UUID | None = None
    sort_order: int | None = None


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(
        default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100
    )


class TimelineCreate(BaseModel):
    event_date: date
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1)
    event_type: str = Field(min_length=1, max_length=50)
    is_public: bool = True
    sort_order: int = 0


class TimelineUpdate(BaseModel):
    event_date: date | None = None
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, min_length=1)
    event_type: str | None = Field(default=None, min_length=1, max_length=50)
    is_public: bool | None = None
    sort_order: int | None = None


class LinkCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=4, max_length=2048)
    description: str | None = None
    status: str = Field(default="active", pattern=r"^(active|hidden)$")
    sort_order: int = 0

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("友情链接必须使用完整的 HTTPS 地址")
        return value


class LinkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    url: str | None = Field(default=None, min_length=4, max_length=2048)
    description: str | None = None
    status: str | None = Field(default=None, pattern=r"^(active|hidden)$")
    sort_order: int | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("友情链接必须使用完整的 HTTPS 地址")
        return value


class SettingsUpdate(BaseModel):
    values: dict[str, Any]


class PageViewCreate(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content_type: str | None = Field(default=None, max_length=40)
    content_id: UUID | None = None

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if (
            not value.startswith("/")
            or value.startswith("//")
            or "?" in value
            or "#" in value
            or any(ord(character) < 32 for character in value)
        ):
            raise ValueError("analytics path must be a normalized path without query data")
        return value


class BackupCreate(BaseModel):
    mode: str = Field(default="full", pattern=r"^full$")


class BackupRestore(BaseModel):
    confirmation: str
