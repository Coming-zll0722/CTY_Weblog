from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=200)
    summary: str = Field(min_length=10, max_length=500)
    content_md: str = Field(min_length=1)
    category_id: UUID | None = None
    cover_media_id: UUID | None = None
    tag_ids: list[UUID] = Field(default_factory=list)
    status: str = Field(default="draft", pattern=r"^(draft|published|archived)$")
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=300)
    confidentiality_checked: bool = False


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    slug: str | None = Field(
        default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=200
    )
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    content_md: str | None = None
    category_id: UUID | None = None
    cover_media_id: UUID | None = None
    tag_ids: list[UUID] | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|published|archived)$")
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=300)
    confidentiality_checked: bool | None = None
    version: int = Field(ge=1)


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    slug: str
    summary: str
    content_md: str
    status: str
    category_id: UUID | None
    tags: list[str] = Field(default_factory=list)
    seo_title: str | None
    seo_description: str | None
    confidentiality_checked: bool
    version: int
    published_at: datetime | None
    updated_at: datetime


class PostPublish(BaseModel):
    version: int = Field(ge=1)
    publish_at: datetime | None = None

    @field_validator("publish_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("publish_at must include a timezone")
        return value
